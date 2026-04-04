"""
Pre-compute topic clusters using KMeans on embedding space.
Generates cluster assignments for multiple k values and labels via TF-IDF.
"""

import json
import sqlite3
import os
import sys
import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import silhouette_score

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import POSTS_DB, EMBEDDINGS_NPY, POST_IDS_JSON, PRECOMPUTED_K_VALUES


def get_cluster_labels(texts, labels, n_clusters):
    """Generate a short label for each cluster using top TF-IDF terms."""
    cluster_labels = {}
    for cluster_id in range(n_clusters):
        cluster_texts = [t for t, l in zip(texts, labels) if l == cluster_id]
        if not cluster_texts:
            cluster_labels[cluster_id] = f"Cluster {cluster_id}"
            continue

        tfidf = TfidfVectorizer(max_features=1000, stop_words='english', max_df=0.9)
        try:
            tfidf_matrix = tfidf.fit_transform(cluster_texts)
            feature_names = tfidf.get_feature_names_out()
            mean_tfidf = tfidf_matrix.mean(axis=0).A1
            top_indices = mean_tfidf.argsort()[-5:][::-1]
            top_terms = [feature_names[i] for i in top_indices]
            cluster_labels[cluster_id] = ', '.join(top_terms)
        except Exception:
            cluster_labels[cluster_id] = f"Cluster {cluster_id}"

    return cluster_labels


def precompute_clusters():
    print(f"Loading embeddings from: {EMBEDDINGS_NPY}")
    embeddings = np.load(EMBEDDINGS_NPY)

    with open(POST_IDS_JSON, 'r') as f:
        post_ids = json.load(f)

    conn = sqlite3.connect(POSTS_DB)
    texts = [row[0] for row in conn.execute(
        "SELECT combined_text FROM posts ORDER BY rowid"
    ).fetchall()]

    # Clear old assignments
    conn.execute("DELETE FROM cluster_assignments")
    conn.commit()

    for k in PRECOMPUTED_K_VALUES:
        print(f"\nClustering with k={k}...")
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(embeddings)

        if k > 1:
            sil = silhouette_score(embeddings, labels, sample_size=min(5000, len(embeddings)))
            print(f"  Silhouette score: {sil:.4f}")

        cluster_labels = get_cluster_labels(texts, labels, k)

        # Store in DB
        rows = []
        for post_id, label in zip(post_ids, labels):
            rows.append((post_id, k, int(label), cluster_labels[label]))

        conn.executemany(
            "INSERT INTO cluster_assignments (post_id, k, cluster_id, cluster_label) VALUES (?, ?, ?, ?)",
            rows
        )
        conn.commit()

        # Print cluster summary
        for cid in range(k):
            count = sum(1 for l in labels if l == cid)
            print(f"  Cluster {cid} ({count} posts): {cluster_labels[cid]}")

    conn.close()
    print("\nDone! All cluster assignments saved to posts.db")


if __name__ == '__main__':
    precompute_clusters()
