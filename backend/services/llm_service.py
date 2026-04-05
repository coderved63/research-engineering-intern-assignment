"""
LLM service using Google Generative AI (Gemma 3 27B).
Handles dynamic summaries, chatbot responses, and follow-up query generation.
Includes in-memory caching to minimize API calls.
"""

import os
import hashlib
import google.generativeai as genai

# Configure on import
api_key = os.environ.get('GEMINI_API_KEY', '')
model_name = os.environ.get('GEMINI_MODEL', 'gemma-3-27b-it')

if api_key:
    genai.configure(api_key=api_key)

# Simple in-memory cache
_cache = {}


def _get_cache_key(prompt):
    return hashlib.md5(prompt.encode()).hexdigest()


def _call_llm(prompt, max_tokens=500):
    """Call the LLM with caching and error handling."""
    cache_key = _get_cache_key(prompt)
    if cache_key in _cache:
        return _cache[cache_key]

    if not api_key:
        return None

    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=0.7,
            )
        )
        result = response.text.strip()
        _cache[cache_key] = result
        return result
    except Exception as e:
        print(f"LLM error: {e}")
        return None


def generate_timeseries_summary(series_data, metric, granularity, subreddits=None):
    """Generate a plain-language summary for a time-series chart."""
    if not series_data:
        return "No data available for this selection."

    # Build a concise data description for the LLM
    sub_filter = f"filtered to {', '.join(subreddits)}" if subreddits else "across all subreddits"

    # Aggregate totals per period
    period_totals = {}
    sub_totals = {}
    for item in series_data:
        date = item.get('date', '')
        count = item.get('count', item.get('avg', 0))
        sub = item.get('subreddit', '')
        period_totals[date] = period_totals.get(date, 0) + count
        sub_totals[sub] = sub_totals.get(sub, 0) + count

    periods = sorted(period_totals.keys())
    if not periods:
        return "No data available for this selection."

    peak_period = max(period_totals, key=period_totals.get)
    peak_val = period_totals[peak_period]
    top_sub = max(sub_totals, key=sub_totals.get) if sub_totals else "N/A"

    prompt = f"""You are analyzing Reddit political discourse data. Write a 2-3 sentence summary of this time-series data for a non-technical audience.

Data: {metric} per {granularity}, {sub_filter}
Time range: {periods[0]} to {periods[-1]}
Total data points: {len(periods)} {granularity}s
Peak {granularity}: {peak_period} with {peak_val:.0f}
Most active subreddit: r/{top_sub} ({sub_totals.get(top_sub, 0):.0f} total)
First period value: {period_totals.get(periods[0], 0):.0f}
Last period value: {period_totals.get(periods[-1], 0):.0f}

Write a concise, insightful summary. Mention specific dates, subreddits, and numbers. Do NOT say "the chart shows" or "the data shows" — just state the findings directly. Focus on trends, spikes, or notable patterns."""

    result = _call_llm(prompt, max_tokens=200)
    if result:
        return result

    # Fallback: rule-based summary
    change = period_totals.get(periods[-1], 0) - period_totals.get(periods[0], 0)
    direction = "increased" if change > 0 else "decreased"
    return (
        f"Activity {direction} over the period from {periods[0]} to {periods[-1]}. "
        f"The peak occurred during {peak_period} with {peak_val:.0f} {metric}. "
        f"r/{top_sub} was the most active subreddit."
    )


def generate_search_response(query, results, history=None):
    """Generate a conversational response for search results."""
    if not results:
        prompt = f"""The user searched for "{query}" in a dataset of Reddit political posts, but no strong matches were found.
Write a brief, helpful response (2 sentences max) acknowledging this and suggesting what they could try instead. Be specific to political discourse topics."""

        result = _call_llm(prompt, max_tokens=100)
        return result or f'No strong matches found for "{query}". Try searching for specific political topics like immigration, tariffs, or executive orders.'

    # Build context from top results
    results_context = "\n".join([
        f"- r/{r['subreddit']}: \"{r['title']}\" (score: {r['score']}, similarity: {r.get('similarity', 'N/A')})"
        for r in results[:10]
    ])

    sub_counts = {}
    for r in results[:10]:
        sub_counts[r['subreddit']] = sub_counts.get(r['subreddit'], 0) + 1

    prompt = f"""You are an analyst for a political discourse research dashboard. The user searched for: "{query}"

Here are the top 10 most relevant Reddit posts from a dataset of 8,799 posts across 10 political subreddits (July 2024 - Feb 2025):

{results_context}

Subreddit distribution in results: {sub_counts}

Write a 2-3 sentence analytical response summarizing what the data shows about "{query}". Be specific — mention subreddit names, post counts, and any patterns you notice (e.g., which communities discuss this topic most, what framing they use). Do NOT just list the results."""

    result = _call_llm(prompt, max_tokens=250)
    if result:
        return result

    # Fallback
    top_subs = ', '.join([f"r/{s} ({c})" for s, c in sorted(sub_counts.items(), key=lambda x: -x[1])])
    return (
        f"Found {len(results)} relevant posts for \"{query}\". "
        f"Top results come from: {top_subs}. "
        f"The highest-scoring result is \"{results[0]['title'][:80]}\" from r/{results[0]['subreddit']}."
    )


def generate_follow_up_queries(query, results):
    """Generate 2-3 follow-up query suggestions."""
    if not results:
        return [
            "What topics dominated after the inauguration?",
            "How do conservative and liberal communities differ?",
            "Which accounts bridge multiple communities?"
        ]

    results_context = "\n".join([
        f"- r/{r['subreddit']}: \"{r['title'][:60]}\""
        for r in results[:5]
    ])

    prompt = f"""The user searched for "{query}" in a Reddit political discourse dataset and got these top results:

{results_context}

Suggest exactly 3 follow-up questions the user might want to explore next. Each should be:
- Related but different from the original query
- Specific enough to get useful results
- Written as a natural question

Return ONLY the 3 questions, one per line, no numbering or bullets."""

    result = _call_llm(prompt, max_tokens=150)
    if result:
        lines = [l.strip().strip('-').strip('•').strip('1234567890.').strip()
                 for l in result.strip().split('\n') if l.strip()]
        if len(lines) >= 2:
            return lines[:3]

    # Fallback
    subs = list(set(r['subreddit'] for r in results[:5]))
    follow_ups = []
    if len(subs) >= 2:
        follow_ups.append(f"How do r/{subs[0]} and r/{subs[1]} discuss this differently?")
    follow_ups.append(f"What are the most debated topics in r/{results[0]['subreddit']}?")
    follow_ups.append("Show me the most controversial posts on this topic")
    return follow_ups[:3]


def generate_overview_summary(stats):
    """Generate an executive summary for the overview page."""
    prompt = f"""You are writing a brief executive summary for a political discourse analysis dashboard.

Dataset: {stats['total_posts']} Reddit posts from {stats['total_authors']} authors
Subreddits: {', '.join([f"r/{s['name']} ({s['count']})" for s in stats['subreddits']])}
Date range: {stats['date_range']['start']} to {stats['date_range']['end']}
Top news sources shared: {', '.join([d['domain'] for d in stats['top_domains'][:5]])}
Network: {stats['network_stats']['num_nodes']} connected authors, {stats['network_stats']['num_components']} components

Write a 3-4 sentence executive summary that a journalist could use. Highlight what makes this dataset interesting — the political diversity, the time period (covering the 2024 US election and 2025 transition of power), and what kinds of analysis are possible. Be concise and analytical, not promotional."""

    result = _call_llm(prompt, max_tokens=250)
    if result:
        return result

    return (
        f"This dataset captures {stats['total_posts']} posts from {stats['total_authors']} authors "
        f"across 10 politically diverse subreddits, spanning {stats['date_range']['start']} to {stats['date_range']['end']}. "
        f"The period covers the 2024 US presidential election through the first weeks of the new administration. "
        f"Top shared news sources include {', '.join([d['domain'] for d in stats['top_domains'][:3]])}."
    )


def translate_query(query, source_lang):
    """Translate a non-English query to English."""
    prompt = f"""Translate the following text from {source_lang} to English. Return ONLY the translated text, nothing else.

Text: {query}"""

    result = _call_llm(prompt, max_tokens=100)
    if result:
        # Clean any prefix the model might add
        for prefix in ['Translation:', 'English:', 'Translated:']:
            if result.startswith(prefix):
                result = result[len(prefix):].strip()
        return result
    return query  # Return original if translation fails
