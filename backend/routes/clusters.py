"""
Clustering endpoints - topic clusters with tunable k.
"""

import sqlite3
import json
import numpy as np
from flask import Blueprint, request, jsonify, current_app
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.feature_extraction.text import TfidfVectorizer

from config import PRECOMPUTED_K_VALUES, MAX_K, MIN_K, UMAP_COORDS_NPY

clusters_bp = Blueprint('clusters', __name__)


@clusters_bp.route('/clusters')
def get_clusters():
    k = request.args.get('k', 8, type=int)

    # Clamp k to valid range
    original_k = k
    k = max(MIN_K, min(MAX_K, k))
    was_clamped = (k != original_k)

    conn = sqlite3.connect(current_app.config['db_path'])
    post_ids = current_app.config['post_ids']

    # Check if pre-computed
    if k in PRECOMPUTED_K_VALUES:
        rows = conn.execute(
            "SELECT post_id, cluster_id, cluster_label FROM cluster_assignments WHERE k = ? ORDER BY rowid",
            (k,)
        ).fetchall()

        if rows:
            clusters = {}
            for post_id, cluster_id, label in rows:
                if cluster_id not in clusters:
                    clusters[cluster_id] = {'id': cluster_id, 'label': label, 'post_ids': []}
                clusters[cluster_id]['post_ids'].append(post_id)

            # Get top posts per cluster
            for cid in clusters:
                pids = clusters[cid]['post_ids'][:5]
                placeholders = ','.join(['?' for _ in pids])
                top = conn.execute(f"""
                    SELECT id, title, subreddit, score FROM posts
                    WHERE id IN ({placeholders}) ORDER BY score DESC
                """, pids).fetchall()
                clusters[cid]['size'] = len(clusters[cid]['post_ids'])
                clusters[cid]['top_posts'] = [
                    {'id': t[0], 'title': t[1], 'subreddit': t[2], 'score': t[3]} for t in top
                ]
                del clusters[cid]['post_ids']

            conn.close()
            result = {
                'clusters': list(clusters.values()),
                'k': k,
            }
            if was_clamped:
                result['warning'] = f'Requested k={original_k} was clamped to {k} (valid range: {MIN_K}-{MAX_K})'
            return jsonify(result)

    # Compute on-the-fly for non-cached k
    embeddings = current_app.config['embeddings']

    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)

    # Get texts for labeling
    texts = [r[0] for r in conn.execute("SELECT combined_text FROM posts ORDER BY rowid").fetchall()]

    # Generate labels
    clusters = {}
    for i in range(k):
        cluster_texts = [t for t, l in zip(texts, labels) if l == i]
        if not cluster_texts:
            label = f"Cluster {i}"
        else:
            try:
                tfidf = TfidfVectorizer(max_features=500, stop_words='english', max_df=0.9)
                mat = tfidf.fit_transform(cluster_texts)
                terms = tfidf.get_feature_names_out()
                mean_vals = mat.mean(axis=0).A1
                top_idx = mean_vals.argsort()[-5:][::-1]
                label = ', '.join([terms[j] for j in top_idx])
            except Exception:
                label = f"Cluster {i}"

        cluster_post_ids = [post_ids[j] for j in range(len(labels)) if labels[j] == i]
        pids_sample = cluster_post_ids[:5]
        placeholders = ','.join(['?' for _ in pids_sample])
        top = conn.execute(f"""
            SELECT id, title, subreddit, score FROM posts
            WHERE id IN ({placeholders}) ORDER BY score DESC
        """, pids_sample).fetchall()

        clusters[i] = {
            'id': i,
            'label': label,
            'size': len(cluster_post_ids),
            'top_posts': [{'id': t[0], 'title': t[1], 'subreddit': t[2], 'score': t[3]} for t in top]
        }

    conn.close()

    result = {
        'clusters': list(clusters.values()),
        'k': k,
    }
    if was_clamped:
        result['warning'] = f'Requested k={original_k} was clamped to {k} (valid range: {MIN_K}-{MAX_K})'

    return jsonify(result)


@clusters_bp.route('/clusters/embeddings')
def get_cluster_embeddings():
    """Return UMAP 2D coordinates with cluster assignments for scatter plot."""
    k = request.args.get('k', 8, type=int)
    k = max(MIN_K, min(MAX_K, k))

    try:
        umap_coords = np.load(UMAP_COORDS_NPY)
    except FileNotFoundError:
        return jsonify({'error': True, 'message': 'UMAP coordinates not found'}), 500

    post_ids = current_app.config['post_ids']

    conn = sqlite3.connect(current_app.config['db_path'])

    # Get cluster assignments
    if k in PRECOMPUTED_K_VALUES:
        rows = conn.execute(
            "SELECT post_id, cluster_id FROM cluster_assignments WHERE k = ? ORDER BY rowid",
            (k,)
        ).fetchall()
        cluster_map = {r[0]: r[1] for r in rows}
    else:
        embeddings = current_app.config['embeddings']
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(embeddings)
        cluster_map = {post_ids[i]: int(labels[i]) for i in range(len(labels))}

    # Get post titles and subreddits
    titles = conn.execute("SELECT id, title, subreddit FROM posts ORDER BY rowid").fetchall()
    title_map = {r[0]: (r[1], r[2]) for r in titles}
    conn.close()

    points = []
    for i, pid in enumerate(post_ids):
        if i < len(umap_coords):
            title, sub = title_map.get(pid, ('', ''))
            points.append({
                'x': float(umap_coords[i][0]),
                'y': float(umap_coords[i][1]),
                'cluster': cluster_map.get(pid, -1),
                'post_id': pid,
                'title': title[:80],
                'subreddit': sub
            })

    return jsonify({'points': points, 'k': k})
