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

    # Edge case: conversational/greeting queries
    greetings = [
        'hello', 'hi', 'hey', 'greetings', 'good morning', 'good evening', 'sup', 'yo',
        'hola', 'bonjour', 'hallo', 'ciao', 'namaste', 'salaam', 'ola', 'konnichiwa',
        'howdy', 'whats up', "what's up", 'wassup', 'heya', 'hii', 'hiii', 'helloo',
    ]
    meta_queries = [
        'what is this', 'what does this do', 'help', 'how does this work', 'explain',
        'what can i do', 'what can you do', 'who are you', 'what are you',
    ]

    query_lower = query.lower().strip('?!. ')
    if query_lower in greetings:
        return jsonify({
            'answer': 'Hey! I can help you explore a dataset of 8,799 Reddit posts from 10 subreddits (July 2024 - Feb 2025). Ask me anything about how these communities discussed events, what news they shared, or how they overlap.',
            'results': [],
            'follow_up_queries': [
                'What topics dominated after the inauguration?',
                'How do conservative and liberal communities differ?',
                'Which accounts bridge multiple communities?'
            ],
            'query_language': 'en',
            'was_translated': False
        })

    if query_lower in meta_queries or any(m in query_lower for m in meta_queries):
        return jsonify({
            'answer': 'This is a semantic search chatbot over 8,799 Reddit political posts. You can ask questions in natural language and I will find the most relevant posts by meaning, not just keywords. I can also answer in multiple languages. Try asking about specific topics like immigration, elections, or political ideology.',
            'results': [],
            'follow_up_queries': [
                'Show me posts about government surveillance',
                'How did Reddit react to the 2025 inauguration?',
                'What are the most controversial posts?'
            ],
            'query_language': 'en',
            'was_translated': False
        })

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
        return jsonify({
            'answer': f'Your query "{query}" is too short for meaningful semantic search. Try a longer, more descriptive query to get relevant results.',
            'results': [],
            'follow_up_queries': [
                'What topics dominated after the inauguration?',
                'How do conservative and liberal communities differ?',
                'Show me posts about immigration policy'
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

    # Check if results are meaningful (similarity threshold)
    top_similarity = results[0]['similarity'] if results else 0
    is_low_quality = top_similarity < 0.45

    # Generate LLM response and follow-ups
    from services.llm_service import generate_search_response, generate_follow_up_queries

    if is_low_quality:
        answer = (
            f"No strong matches found for \"{original_query}\". "
            f"The highest similarity score was only {top_similarity:.0%}, which suggests this topic "
            f"isn't well-represented in the dataset. Try searching for topics like immigration, "
            f"Trump policies, elections, or political ideology."
        )
        follow_ups = [
            'What topics are most discussed in this dataset?',
            'How do left and right communities differ?',
            'Show me the most controversial posts'
        ]
    else:
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
        response['translation_note'] = f'Non-English query detected and translated. Results are from English-language posts.'

    return jsonify(response)


@search_bp.route('/search/timeseries', methods=['POST'])
def search_timeseries():
    """Return time-series distribution of posts matching a semantic search query."""
    from datetime import datetime
    from collections import Counter

    data = request.get_json() or {}
    query = data.get('message', '').strip()
    granularity = data.get('granularity', 'week')
    threshold = data.get('threshold', 0.30)
    threshold = max(0.15, min(0.60, threshold))

    empty = {'series': [], 'granularity': granularity, 'total_matching': 0, 'threshold_used': threshold}

    if not query or len(query) < 3:
        return jsonify(empty)

    # Check for greetings/meta queries — no time-series for those
    query_lower = query.lower().strip('?!. ')
    greetings = [
        'hello', 'hi', 'hey', 'greetings', 'good morning', 'good evening', 'sup', 'yo',
        'hola', 'bonjour', 'hallo', 'ciao', 'namaste', 'salaam', 'ola', 'konnichiwa',
        'howdy', 'whats up', "what's up", 'wassup', 'heya', 'hii', 'hiii', 'helloo',
    ]
    meta_queries = [
        'what is this', 'what does this do', 'help', 'how does this work', 'explain',
        'what can i do', 'what can you do', 'who are you', 'what are you',
    ]
    if query_lower in greetings or query_lower in meta_queries or any(m in query_lower for m in meta_queries):
        return jsonify(empty)

    # Detect language and translate if needed
    lang = detect_language(query)
    if lang != 'en':
        from services.llm_service import translate_query
        translated = translate_query(query, lang)
        if translated and translated != query:
            query = translated

    # Embed and compute similarities
    model = current_app.config['embed_model']
    query_embedding = model.encode([query], normalize_embeddings=True)[0]
    embeddings = current_app.config['embeddings']
    similarities = embeddings @ query_embedding

    # Get all posts above threshold
    matching_indices = np.where(similarities >= threshold)[0]

    # Cap at top 500 by similarity
    if len(matching_indices) > 500:
        top_500 = np.argsort(similarities)[::-1][:500]
        matching_indices = top_500

    post_ids = current_app.config['post_ids']
    matching_ids = [post_ids[i] for i in matching_indices]

    if not matching_ids:
        return jsonify(empty)

    # Fetch dates from DB
    conn = sqlite3.connect(current_app.config['db_path'])
    placeholders = ','.join(['?' for _ in matching_ids])
    rows = conn.execute(
        f"SELECT id, subreddit, created_date FROM posts WHERE id IN ({placeholders})",
        matching_ids
    ).fetchall()
    conn.close()

    # Group by period and subreddit
    date_formats = {'day': '%Y-%m-%d', 'week': '%Y-%W', 'month': '%Y-%m'}
    fmt = date_formats.get(granularity, '%Y-%W')

    counts = Counter()
    for _, subreddit, created_date in rows:
        try:
            dt = datetime.strptime(created_date, '%Y-%m-%d')
            period = dt.strftime(fmt)
            counts[(period, subreddit)] += 1
        except (ValueError, TypeError):
            continue

    series = [{'date': k[0], 'subreddit': k[1], 'count': v} for k, v in sorted(counts.items())]

    return jsonify({
        'series': series,
        'granularity': granularity,
        'total_matching': len(matching_ids),
        'threshold_used': threshold
    })
