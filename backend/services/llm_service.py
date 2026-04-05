"""
LLM service using Google Generative AI (Gemma 3 27B).
Handles dynamic summaries, chatbot responses, and follow-up query generation.
Includes in-memory caching to minimize API calls.
"""

import os
import hashlib
import google.generativeai as genai

# Simple in-memory cache
_cache = {}
_configured = False


def _ensure_configured():
    """Configure API on first use, not on import."""
    global _configured
    if _configured:
        return
    api_key = os.environ.get('GEMINI_API_KEY', '')
    if api_key:
        genai.configure(api_key=api_key)
        _configured = True


def _get_cache_key(prompt):
    return hashlib.md5(prompt.encode()).hexdigest()


def _call_llm(prompt, max_tokens=500):
    """Call the LLM with caching and error handling."""
    cache_key = _get_cache_key(prompt)
    if cache_key in _cache:
        return _cache[cache_key]

    _ensure_configured()
    api_key = os.environ.get('GEMINI_API_KEY', '')
    if not api_key:
        return None

    model_name = os.environ.get('GEMINI_MODEL', 'gemma-3-27b-it')
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=0.3,
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

    sub_filter = f"filtered to r/{', r/'.join(subreddits)}" if subreddits else "across all 10 subreddits"

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
    lowest_period = min(period_totals, key=period_totals.get)
    lowest_val = period_totals[lowest_period]
    top_sub = max(sub_totals, key=sub_totals.get) if sub_totals else "N/A"
    top_3_subs = sorted(sub_totals.items(), key=lambda x: -x[1])[:3]

    prompt = f"""Write a 2-3 sentence plain-language summary explaining this chart to someone who cannot read charts. They should understand the key trend just by reading your summary.

IMPORTANT: The dataset covers Reddit posts from July 2024 to February 2025 ONLY. Do NOT mention any dates outside this range.

What the chart shows: {metric} per {granularity}, {sub_filter}
Period covered: {periods[0]} to {periods[-1]}
Number of {granularity}s shown: {len(periods)}
Lowest point: {lowest_period} with {lowest_val:.0f}
Highest point: {peak_period} with {peak_val:.0f}
Top 3 subreddits by volume: {', '.join([f'r/{s} ({v:.0f})' for s, v in top_3_subs])}
Starting value: {period_totals.get(periods[0], 0):.0f}
Ending value: {period_totals.get(periods[-1], 0):.0f}

Rules:
- State findings directly, do NOT say "the chart shows" or "the data shows"
- Use ONLY the numbers provided above — do not invent or hallucinate any numbers
- Explain what happened in simple terms a journalist could use
- Mention at least one specific subreddit name and one specific number"""

    result = _call_llm(prompt, max_tokens=200)
    if result:
        return result

    # Fallback: rule-based summary
    change_pct = ((period_totals.get(periods[-1], 0) - period_totals.get(periods[0], 1)) / max(period_totals.get(periods[0], 1), 1)) * 100
    direction = "increased" if change_pct > 0 else "decreased"
    return (
        f"Activity {direction} from {period_totals.get(periods[0], 0):.0f} to {period_totals.get(periods[-1], 0):.0f} "
        f"over the period ({periods[0]} to {periods[-1]}). "
        f"The peak occurred at {peak_period} with {peak_val:.0f} {metric}. "
        f"r/{top_sub} was the most active subreddit with {sub_totals.get(top_sub, 0):.0f} total."
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
    prompt = f"""Write a plain-text summary (NO markdown, NO headers, NO #, NO bullet points with *) for a political discourse dashboard.

Dataset: {stats['total_posts']} Reddit posts from {stats['total_authors']} authors
Subreddits: {', '.join([f"r/{s['name']} ({s['count']})" for s in stats['subreddits']])}
Date range: {stats['date_range']['start']} to {stats['date_range']['end']}
Top news sources: {', '.join([f"{d['domain']} ({d['count']} shares)" for d in stats['top_domains'][:5]])}
Network: {stats['network_stats']['num_nodes']} connected authors, {stats['network_stats']['num_components']} separate components

Write exactly 3 short paragraphs, plain text only:
1. What this dataset is and why the time period matters (2024 election + 2025 transition)
2. One specific insight: which communities share which news sources (give exact names and numbers)
3. One specific insight: what the fragmented network (72 components) tells us about cross-community dialogue

Do NOT use any markdown formatting. Do NOT start with "Executive Summary" or any title. Just write the paragraphs directly."""

    result = _call_llm(prompt, max_tokens=300)
    if result:
        # Strip any markdown the LLM might still add
        cleaned = result.strip()
        for prefix in ['## Executive Summary', '# Executive Summary', '## Summary', '# Summary',
                       'Executive Summary:', 'Summary:', '**Executive Summary**']:
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip()
        # Remove markdown headers
        import re
        cleaned = re.sub(r'^#{1,4}\s+.*$', '', cleaned, flags=re.MULTILINE).strip()
        # Remove bold markers
        cleaned = cleaned.replace('**', '')
        return cleaned

    return (
        f"This dataset captures {stats['total_posts']} posts from {stats['total_authors']} authors "
        f"across 10 politically diverse subreddits, spanning {stats['date_range']['start']} to {stats['date_range']['end']}. "
        f"The period covers the 2024 US presidential election through the first weeks of the new administration. "
        f"Top shared news sources include {', '.join([d['domain'] for d in stats['top_domains'][:3]])}."
    )


def generate_cluster_summary(clusters, k):
    """Generate a summary of the clustering results."""
    cluster_desc = "\n".join([
        f"- Cluster {c['id']} ({c['size']} posts): {c['label']}"
        for c in sorted(clusters, key=lambda x: -x['size'])[:10]
    ])

    prompt = f"""Write a plain-text summary (NO markdown, NO headers, NO #) analyzing these topic clusters from Reddit political discourse data (8,799 posts, 10 subreddits, Jul 2024 - Feb 2025).

{k} clusters were created using KMeans. Here are the largest ones:
{cluster_desc}

Write 2-3 sentences explaining: what are the dominant topics, which topics overlap or are surprising, and what this tells us about what Reddit was discussing during this period. Use specific cluster names and numbers. Do NOT use markdown formatting."""

    result = _call_llm(prompt, max_tokens=200)
    if result:
        import re
        cleaned = re.sub(r'^#{1,4}\s+.*$', '', result, flags=re.MULTILINE).strip()
        return cleaned.replace('**', '')
    return None


def generate_network_summary(stats):
    """Generate a summary of the network analysis."""
    prompt = f"""Write a plain-text summary (NO markdown, NO headers, NO #) analyzing this author interaction network from Reddit political discourse data.

Network stats: {stats['num_nodes']} connected authors, {stats['num_edges']} edges, {stats['num_components']} disconnected components, {stats.get('num_communities', 'unknown')} communities detected.
Density: {stats.get('density', 'unknown')}

Write 2-3 sentences explaining: what does the high number of components mean (fragmentation), what does the density tell us about how connected authors are, and what this implies about cross-community interaction on Reddit. Use specific numbers. Do NOT use markdown formatting."""

    result = _call_llm(prompt, max_tokens=200)
    if result:
        import re
        cleaned = re.sub(r'^#{1,4}\s+.*$', '', result, flags=re.MULTILINE).strip()
        return cleaned.replace('**', '')
    return None


def answer_chart_question(question, data_context):
    """Answer a user's follow-up question about a specific chart's data."""
    prompt = f"""You are analyzing a chart from a Reddit political discourse dashboard (8,799 posts from 10 subreddits, Jul 2024 - Feb 2025).

Chart data and context:
{data_context}

User question: "{question}"

Answer in 2-3 sentences using SPECIFIC numbers and subreddit names from the data above. Do not be vague — cite actual counts, dates, and subreddit names. If the question is not about the data (e.g., "who is trump?"), briefly answer from general knowledge but redirect to what the data shows about that topic."""

    result = _call_llm(prompt, max_tokens=200)
    if result:
        return result

    return "I couldn't generate an answer for this question. Try rephrasing or ask in the SearchAI page for a broader analysis."


def translate_query(query, source_lang):
    """Translate a non-English query to English."""
    prompt = f"""Detect the language of the following text and translate it accurately to English. Return ONLY the English translation, nothing else. Do not add any explanation or prefix.

Text: {query}"""

    result = _call_llm(prompt, max_tokens=100)
    if result:
        # Clean any prefix the model might add
        for prefix in ['Translation:', 'English:', 'Translated:', 'English translation:']:
            if result.lower().startswith(prefix.lower()):
                result = result[len(prefix):].strip()
        # Remove quotes if wrapped
        result = result.strip('"').strip("'")
        return result
    return query  # Return original if translation fails
