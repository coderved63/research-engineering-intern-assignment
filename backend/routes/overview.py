"""
Overview / stats endpoints.
"""

import sqlite3
from flask import Blueprint, jsonify, current_app

overview_bp = Blueprint('overview', __name__)


@overview_bp.route('/overview/stats')
def get_stats():
    conn = sqlite3.connect(current_app.config['db_path'])

    total_posts = conn.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
    total_authors = conn.execute("SELECT COUNT(DISTINCT author) FROM posts").fetchone()[0]

    date_range = conn.execute(
        "SELECT MIN(created_date), MAX(created_date) FROM posts"
    ).fetchone()

    subreddit_counts = conn.execute(
        "SELECT subreddit, COUNT(*) as count FROM posts GROUP BY subreddit ORDER BY count DESC"
    ).fetchall()

    top_domains = conn.execute("""
        SELECT domain, COUNT(*) as count FROM posts
        WHERE domain NOT LIKE 'self.%' AND domain != '' AND domain != 'i.redd.it' AND domain != 'v.redd.it'
        GROUP BY domain ORDER BY count DESC LIMIT 15
    """).fetchall()

    top_authors = conn.execute("""
        SELECT author, COUNT(*) as count FROM posts
        WHERE author != '[deleted]'
        GROUP BY author ORDER BY count DESC LIMIT 10
    """).fetchall()

    score_stats = conn.execute("""
        SELECT MIN(score), MAX(score), AVG(score), COUNT(*) FROM posts
    """).fetchone()

    conn.close()

    graph_stats = current_app.config['graph_data'].get('stats', {})

    stats = {
        'total_posts': total_posts,
        'total_authors': total_authors,
        'date_range': {'start': date_range[0], 'end': date_range[1]},
        'subreddits': [{'name': s[0], 'count': s[1]} for s in subreddit_counts],
        'top_domains': [{'domain': d[0], 'count': d[1]} for d in top_domains],
        'top_authors': [{'author': a[0], 'count': a[1]} for a in top_authors],
        'score_stats': {
            'min': score_stats[0],
            'max': score_stats[1],
            'avg': round(score_stats[2], 1),
        },
        'network_stats': graph_stats
    }

    # Generate LLM executive summary
    from services.llm_service import generate_overview_summary
    stats['executive_summary'] = generate_overview_summary(stats)

    return jsonify(stats)
