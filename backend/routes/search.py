"""
Semantic search and chatbot endpoint.
Embeds user query, finds similar posts via cosine similarity, returns ranked results.
"""

import sqlite3
import numpy as np
from flask import Blueprint, request, jsonify, current_app

search_bp = Blueprint('search', __name__)


def detect_language(text):
    """Detect language of input text. Returns language code."""
    try:
        from langdetect import detect
        return detect(text)
    except Exception:
        return 'en'


@search_bp.route('/search', methods=['POST'])
def search():
    data = request.get_json() or {}
    query = data.get('message', '').strip()
    limit = data.get('limit', 20)

    # Edge case: empty query
    if not query:
        return jsonify({
            'answer': 'Please type a question to explore the dataset.',
            'results': [],
            'follow_up_queries': [
                'What topics dominated after the inauguration?',
                'How do left and right subreddits differ?',
                'Which accounts are most influential?'
            ],
            'query_language': 'en',
            'was_translated': False
        })

    # Edge case: very short query
    if len(query) < 3:
        conn = sqlite3.connect(current_app.config['db_path'])
        top_posts = conn.execute("""
            SELECT id, title, selftext, subreddit, author, score, num_comments, created_date
            FROM posts ORDER BY score DESC LIMIT ?
        """, (limit,)).fetchall()
        conn.close()

        results = [{
            'id': p[0], 'title': p[1], 'selftext': p[2][:200],
            'subreddit': p[3], 'author': p[4], 'score': p[5],
            'num_comments': p[6], 'date': p[7], 'similarity': None
        } for p in top_posts]

        return jsonify({
            'answer': f'Your query "{query}" is too short for semantic search. Here are the most popular posts instead.',
            'results': results,
            'follow_up_queries': [
                'What are the main topics in this dataset?',
                'Show me posts about immigration policy',
                'How did communities react to the inauguration?'
            ],
            'query_language': 'en',
            'was_translated': False
        })

    # Detect language
    lang = detect_language(query)
    was_translated = False
    original_query = query

    # For non-English queries, translate to English first
    if lang != 'en':
        was_translated = True
        from services.llm_service import translate_query
        translated = translate_query(query, lang)
        if translated and translated != query:
            query = translated

    # Embed the query
    model = current_app.config['embed_model']
    query_embedding = model.encode([query], normalize_embeddings=True)[0]

    # Cosine similarity (embeddings are already L2-normalized)
    embeddings = current_app.config['embeddings']
    similarities = embeddings @ query_embedding

    # Get top results
    top_indices = np.argsort(similarities)[::-1][:limit]
    post_ids = current_app.config['post_ids']

    result_ids = [post_ids[i] for i in top_indices]
    result_scores = [float(similarities[i]) for i in top_indices]

    # Fetch post details from DB
    conn = sqlite3.connect(current_app.config['db_path'])
    placeholders = ','.join(['?' for _ in result_ids])
    rows = conn.execute(f"""
        SELECT id, title, selftext, subreddit, author, score, num_comments, created_date, permalink
        FROM posts WHERE id IN ({placeholders})
    """, result_ids).fetchall()
    conn.close()

    # Build results dict keyed by id for ordering
    post_map = {r[0]: r for r in rows}

    results = []
    for pid, sim in zip(result_ids, result_scores):
        if pid in post_map:
            p = post_map[pid]
            results.append({
                'id': p[0], 'title': p[1], 'selftext': p[2][:300],
                'subreddit': p[3], 'author': p[4], 'score': p[5],
                'num_comments': p[6], 'date': p[7], 'permalink': p[8],
                'similarity': round(sim, 4)
            })

    # Generate LLM response and follow-ups
    from services.llm_service import generate_search_response, generate_follow_up_queries
    answer = generate_search_response(original_query, results)
    follow_ups = generate_follow_up_queries(original_query, results)

    response = {
        'answer': answer,
        'results': results,
        'follow_up_queries': follow_ups[:3],
        'query_language': lang,
        'was_translated': was_translated
    }

    if was_translated:
        response['translation_note'] = f'Query detected as {lang}. Results are from English-language posts.'

    return jsonify(response)
