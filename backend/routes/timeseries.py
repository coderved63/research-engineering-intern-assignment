"""
Time-series endpoints - post volume and engagement over time.
"""

import sqlite3
from flask import Blueprint, request, jsonify, current_app

timeseries_bp = Blueprint('timeseries', __name__)


def get_date_format(granularity):
    if granularity == 'day':
        return '%Y-%m-%d'
    elif granularity == 'month':
        return '%Y-%m'
    else:
        return '%Y-%W'


@timeseries_bp.route('/posts')
def posts_over_time():
    granularity = request.args.get('granularity', 'week')
    subreddits = request.args.get('subreddit', '')
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')

    date_fmt = get_date_format(granularity)

    conn = sqlite3.connect(current_app.config['db_path'])

    query = f"SELECT strftime('{date_fmt}', created_date) as period, subreddit, COUNT(*) as count FROM posts WHERE 1=1"
    params = []

    if subreddits:
        sub_list = [s.strip() for s in subreddits.split(',')]
        placeholders = ','.join(['?' for _ in sub_list])
        query += f" AND subreddit IN ({placeholders})"
        params.extend(sub_list)

    if start_date:
        query += " AND created_date >= ?"
        params.append(start_date)

    if end_date:
        query += " AND created_date <= ?"
        params.append(end_date)

    query += " GROUP BY period, subreddit ORDER BY period"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    series = [{'date': r[0], 'subreddit': r[1], 'count': r[2]} for r in rows]

    # Generate LLM summary
    from services.llm_service import generate_timeseries_summary
    sub_list = [s.strip() for s in subreddits.split(',')] if subreddits else None
    summary = generate_timeseries_summary(series, 'post count', granularity, sub_list)

    return jsonify({'series': series, 'granularity': granularity, 'summary': summary})


@timeseries_bp.route('/engagement')
def engagement_over_time():
    granularity = request.args.get('granularity', 'week')
    metric = request.args.get('metric', 'score')
    subreddits = request.args.get('subreddit', '')

    date_fmt = get_date_format(granularity)

    if metric not in ('score', 'num_comments', 'upvote_ratio'):
        metric = 'score'

    conn = sqlite3.connect(current_app.config['db_path'])

    query = f"""
        SELECT strftime('{date_fmt}', created_date) as period, subreddit,
        AVG({metric}) as avg_metric, COUNT(*) as count
        FROM posts WHERE 1=1
    """
    params = []

    if subreddits:
        sub_list = [s.strip() for s in subreddits.split(',')]
        placeholders = ','.join(['?' for _ in sub_list])
        query += f" AND subreddit IN ({placeholders})"
        params.extend(sub_list)

    query += " GROUP BY period, subreddit ORDER BY period"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    series = [{'date': r[0], 'subreddit': r[1], 'avg': round(r[2], 2), 'count': r[3]} for r in rows]

    # Generate LLM summary
    from services.llm_service import generate_timeseries_summary
    sub_list = [s.strip() for s in subreddits.split(',')] if subreddits else None
    summary = generate_timeseries_summary(series, f'average {metric}', granularity, sub_list)

    return jsonify({'series': series, 'metric': metric, 'granularity': granularity, 'summary': summary})


@timeseries_bp.route('/topics')
def topics_over_time():
    k = request.args.get('k', 8, type=int)
    granularity = request.args.get('granularity', 'week')

    k = max(2, min(50, k))
    date_fmt = get_date_format(granularity)

    conn = sqlite3.connect(current_app.config['db_path'])

    rows = conn.execute(f"""
        SELECT strftime('{date_fmt}', p.created_date) as period,
               c.cluster_label as topic, COUNT(*) as count
        FROM posts p
        JOIN cluster_assignments c ON p.id = c.post_id
        WHERE c.k = ?
        GROUP BY period, topic
        ORDER BY period
    """, (k,)).fetchall()
    conn.close()

    series = [{'date': r[0], 'topic': r[1], 'count': r[2]} for r in rows]

    return jsonify({'series': series, 'k': k, 'granularity': granularity})


@timeseries_bp.route('/ask', methods=['POST'])
def ask_about_chart():
    """Answer a follow-up question about a chart's data."""
    data = request.get_json() or {}
    question = data.get('question', '').strip()
    context = data.get('context', '').strip()

    if not question:
        return jsonify({'answer': 'Please ask a question about the data.'})

    from services.llm_service import answer_chart_question
    answer = answer_chart_question(question, context)

    return jsonify({'answer': answer})
