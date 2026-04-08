"""
Overview / stats endpoints.
"""

import sqlite3
from flask import Blueprint, jsonify, current_app, request

overview_bp = Blueprint('overview', __name__)


VALID_SUBREDDITS = {
    'Anarchism', 'socialism', 'democrats', 'Liberal', 'politics',
    'PoliticalDiscussion', 'neoliberal', 'worldpolitics', 'Conservative', 'Republican'
}


def _get_subreddit_stats(conn, subreddit):
    """Fetch comprehensive stats for one subreddit."""
    # Basic counts
    counts = conn.execute("""
        SELECT COUNT(*) as total,
               COUNT(DISTINCT author) as authors,
               AVG(score) as avg_score,
               AVG(num_comments) as avg_comments,
               MAX(score) as max_score,
               SUM(score) as total_score
        FROM posts WHERE subreddit = ?
    """, (subreddit,)).fetchone()

    # Top news domains
    top_domains = conn.execute("""
        SELECT domain, COUNT(*) as count FROM posts
        WHERE subreddit = ?
          AND domain NOT LIKE 'self.%'
          AND domain != ''
          AND domain != 'i.redd.it'
          AND domain != 'v.redd.it'
          AND domain != 'reddit.com'
        GROUP BY domain ORDER BY count DESC LIMIT 10
    """, (subreddit,)).fetchall()

    # Top authors
    top_authors = conn.execute("""
        SELECT author, COUNT(*) as count, AVG(score) as avg_score
        FROM posts
        WHERE subreddit = ? AND author != '[deleted]'
        GROUP BY author ORDER BY count DESC LIMIT 10
    """, (subreddit,)).fetchall()

    # Top topics from k=15 cluster assignments
    top_topics = conn.execute("""
        SELECT c.cluster_label, COUNT(*) as count
        FROM posts p
        JOIN cluster_assignments c ON p.id = c.post_id
        WHERE p.subreddit = ? AND c.k = 15
        GROUP BY c.cluster_label
        ORDER BY count DESC
        LIMIT 5
    """, (subreddit,)).fetchall()

    # Top posts (highest scoring)
    top_posts = conn.execute("""
        SELECT id, title, score, author, permalink, created_date
        FROM posts
        WHERE subreddit = ?
        ORDER BY score DESC LIMIT 5
    """, (subreddit,)).fetchall()

    # Time series — weekly post volume
    timeseries = conn.execute("""
        SELECT strftime('%Y-%W', created_date) as week, COUNT(*) as count
        FROM posts WHERE subreddit = ?
        GROUP BY week ORDER BY week
    """, (subreddit,)).fetchall()

    # Date range for this subreddit — important because the dataset has uneven
    # time coverage across subreddits (some span 7 months, some span 1 week)
    date_range = conn.execute("""
        SELECT MIN(created_date), MAX(created_date) FROM posts WHERE subreddit = ?
    """, (subreddit,)).fetchone()

    return {
        'name': subreddit,
        'total_posts': counts[0],
        'unique_authors': counts[1],
        'avg_score': round(counts[2], 1) if counts[2] else 0,
        'avg_comments': round(counts[3], 1) if counts[3] else 0,
        'max_score': counts[4] or 0,
        'total_score': counts[5] or 0,
        'date_range': {
            'start': date_range[0] if date_range and date_range[0] else None,
            'end': date_range[1] if date_range and date_range[1] else None,
        },
        'top_domains': [{'domain': d[0], 'count': d[1]} for d in top_domains],
        'top_authors': [
            {'author': a[0], 'count': a[1], 'avg_score': round(a[2], 1) if a[2] else 0}
            for a in top_authors
        ],
        'top_topics': [{'label': t[0], 'count': t[1]} for t in top_topics],
        'top_posts': [
            {'id': p[0], 'title': p[1], 'score': p[2], 'author': p[3],
             'permalink': p[4], 'date': p[5]}
            for p in top_posts
        ],
        'timeseries': [{'date': t[0], 'count': t[1]} for t in timeseries],
    }


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


@overview_bp.route('/compare')
def compare_subreddits():
    """Compare two subreddits side by side."""
    sub1 = request.args.get('sub1', 'Conservative')
    sub2 = request.args.get('sub2', 'socialism')

    # Validate inputs
    if sub1 not in VALID_SUBREDDITS or sub2 not in VALID_SUBREDDITS:
        return jsonify({
            'error': True,
            'message': f'Invalid subreddit. Must be one of: {", ".join(sorted(VALID_SUBREDDITS))}'
        }), 400

    if sub1 == sub2:
        return jsonify({
            'error': True,
            'message': 'Please select two different subreddits to compare.'
        }), 400

    conn = sqlite3.connect(current_app.config['db_path'])
    sub1_stats = _get_subreddit_stats(conn, sub1)
    sub2_stats = _get_subreddit_stats(conn, sub2)
    conn.close()

    # Generate comparison summary via LLM
    from services.llm_service import generate_comparison_summary
    summary = generate_comparison_summary(sub1_stats, sub2_stats)

    return jsonify({
        'sub1': sub1_stats,
        'sub2': sub2_stats,
        'summary': summary,
    })


@overview_bp.route('/embeddings/summary')
def embeddings_summary():
    """Return an AI-generated explanation of the embedding visualization."""
    conn = sqlite3.connect(current_app.config['db_path'])
    total_posts = conn.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
    subreddit_counts = conn.execute(
        "SELECT subreddit, COUNT(*) as count FROM posts GROUP BY subreddit ORDER BY count DESC"
    ).fetchall()
    conn.close()

    stats = {
        'total_posts': total_posts,
        'subreddits': [{'name': s[0], 'count': s[1]} for s in subreddit_counts],
    }

    from services.llm_service import generate_embeddings_summary
    summary = generate_embeddings_summary(stats)

    return jsonify({'summary': summary})
