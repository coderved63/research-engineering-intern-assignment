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
    sub_period_totals = {}  # {sub: {period: count}}
    for item in series_data:
        date = item.get('date', '')
        count = item.get('count', item.get('avg', 0))
        sub = item.get('subreddit', '')
        period_totals[date] = period_totals.get(date, 0) + count
        sub_totals[sub] = sub_totals.get(sub, 0) + count
        if sub not in sub_period_totals:
            sub_period_totals[sub] = {}
        sub_period_totals[sub][date] = sub_period_totals[sub].get(date, 0) + count

    periods = sorted(period_totals.keys())
    if not periods:
        return "No data available for this selection."

    peak_period = max(period_totals, key=period_totals.get)
    peak_val = period_totals[peak_period]
    lowest_period = min(period_totals, key=period_totals.get)
    lowest_val = period_totals[lowest_period]
    top_sub = max(sub_totals, key=sub_totals.get) if sub_totals else "N/A"
    top_3_subs = sorted(sub_totals.items(), key=lambda x: -x[1])[:3]
    bottom_3_subs = sorted(sub_totals.items(), key=lambda x: x[1])[:3]

    # Compute first half vs second half average
    mid = len(periods) // 2
    first_half_avg = sum(period_totals[p] for p in periods[:mid]) / max(mid, 1)
    second_half_avg = sum(period_totals[p] for p in periods[mid:]) / max(len(periods) - mid, 1)
    pct_change = ((second_half_avg - first_half_avg) / max(first_half_avg, 1)) * 100

    # Find which subreddit had the biggest spike near the peak
    peak_contributors = sorted(
        [(s, sub_period_totals[s].get(peak_period, 0)) for s in sub_period_totals],
        key=lambda x: -x[1]
    )[:3]

    total_volume = sum(period_totals.values())
    avg_per_period = total_volume / max(len(periods), 1)

    prompt = f"""Write a detailed 5-6 sentence plain-language summary explaining this time-series chart to someone who cannot read charts. The reader should understand the trend, the key shifts, who drove the activity, and what the data reveals — purely from your summary.

IMPORTANT: The dataset covers Reddit posts from July 2024 to February 2025 ONLY. Do NOT mention any dates outside this range. Trump's inauguration was on January 20, 2025.

CHART CONTEXT
What the chart shows: {metric} per {granularity}, {sub_filter}
Period covered: {periods[0]} to {periods[-1]}
Number of {granularity}s shown: {len(periods)}
Total volume across the entire period: {total_volume:.0f}
Average per {granularity}: {avg_per_period:.1f}

KEY POINTS
Lowest point: {lowest_period} with {lowest_val:.0f}
Highest point: {peak_period} with {peak_val:.0f}
Starting value: {period_totals.get(periods[0], 0):.0f}
Ending value: {period_totals.get(periods[-1], 0):.0f}
First half average: {first_half_avg:.1f}
Second half average: {second_half_avg:.1f}
Change between halves: {pct_change:+.0f}%

SUBREDDIT BREAKDOWN
Top 3 subreddits by total volume: {', '.join([f'r/{s} ({v:.0f})' for s, v in top_3_subs])}
Bottom 3 subreddits: {', '.join([f'r/{s} ({v:.0f})' for s, v in bottom_3_subs])}
Top 3 subreddits driving the peak at {peak_period}: {', '.join([f'r/{s} ({v:.0f})' for s, v in peak_contributors])}

INSTRUCTIONS
- Write 5 to 6 sentences, in plain English, no markdown, no bullet points.
- Sentence 1: Describe the overall shape of the trend (was it flat, growing, falling, spiky?) and the magnitude of change between halves.
- Sentence 2: Pinpoint the peak moment and explain what subreddits drove it.
- Sentence 3: Compare the most active and least active subreddits — what does this say about which communities dominated the conversation?
- Sentence 4: Mention any clear inflection point (e.g. activity surge after January 20, 2025 inauguration).
- Sentence 5-6: End with a takeaway — what does this trend reveal about how these communities discussed events during this period?
- Use ONLY the numbers provided above. Do not invent any numbers, dates, or subreddit names.
- Do NOT start with "The chart shows" or "This data shows". State findings directly.
- Be analytical, like a journalist writing for a non-technical audience."""

    result = _call_llm(prompt, max_tokens=500)
    if result:
        return result

    # Fallback: richer rule-based summary
    direction = "rose sharply" if pct_change > 30 else "declined" if pct_change < -30 else "stayed relatively stable"
    return (
        f"Activity {direction} over the {len(periods)} {granularity}s shown, with the average shifting from "
        f"{first_half_avg:.0f} in the first half to {second_half_avg:.0f} in the second half ({pct_change:+.0f}%). "
        f"The peak occurred at {peak_period} with {peak_val:.0f} — driven primarily by "
        f"{', '.join([f'r/{s}' for s, _ in peak_contributors[:2]])}. "
        f"Across the entire period, r/{top_sub} dominated with {sub_totals.get(top_sub, 0):.0f} total, "
        f"while r/{bottom_3_subs[0][0]} contributed only {bottom_3_subs[0][1]:.0f}. "
        f"This concentration suggests conversation during this period was unevenly distributed across communities."
    )


def generate_search_response(query, results, history=None):
    """Generate a conversational response for search results."""
    if not results:
        prompt = f"""The user searched for "{query}" in a dataset of Reddit posts from 10 politically associated subreddits, but no strong matches were found.
Write a brief, helpful response (2 sentences max) acknowledging this and suggesting what they could try instead. Be specific to political topics relevant to the 2024 US election and 2025 transition."""

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

    prompt = f"""You are an analyst for a research dashboard tracing narratives across Reddit communities. The user searched for: "{query}"

Here are the top 10 most relevant Reddit posts from a dataset of 8,799 posts across 10 subreddits (July 2024 - Feb 2025) collected for their political associations:

{results_context}

Subreddit distribution in results: {sub_counts}

Write a detailed 4-5 sentence analytical response answering the user's query based on this data. Structure it like this:
- Open with a direct answer to "{query}" based on what the results show
- Describe which communities are most engaged with this topic and how the distribution skews
- Highlight one or two specific posts that best illustrate the finding (cite post titles)
- Note any contrast or pattern across communities (e.g., "left-leaning subs frame it differently from right-leaning")
- End with a takeaway or what's notable about this finding

Use ONLY the data above. Be specific with subreddit names, post titles, and counts. Do NOT use markdown headers or bullet points — write flowing prose."""

    result = _call_llm(prompt, max_tokens=450)
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

    prompt = f"""The user searched for "{query}" in a dataset of Reddit posts from 10 politically associated subreddits and got these top results:

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
    prompt = f"""Write a plain-text executive summary (NO markdown, NO headers, NO #, NO bullet points) for an investigative reporting dashboard tracing narratives across 10 Reddit communities collected for their political associations.

Dataset: {stats['total_posts']} Reddit posts from {stats['total_authors']} authors
Subreddits: {', '.join([f"r/{s['name']} ({s['count']})" for s in stats['subreddits']])}
Date range: {stats['date_range']['start']} to {stats['date_range']['end']}
Top news sources: {', '.join([f"{d['domain']} ({d['count']} shares)" for d in stats['top_domains'][:8]])}
Network: {stats['network_stats']['num_nodes']} connected authors, {stats['network_stats']['num_edges']} edges, {stats['network_stats']['num_components']} separate components

Write exactly 4 substantial paragraphs (3-4 sentences each), plain text only:

Paragraph 1 — Setting the stage:
Describe what this dataset captures and why the time period (July 2024 to February 2025) matters historically. Reference the 2024 US presidential election and the January 20, 2025 inauguration of Trump's second term. Mention that the 10 subreddits were collected for their political associations and span the full political spectrum. Flag the important methodological constraint: the dataset has uneven time coverage — only r/Liberal covers all 7 months, while several subreddits are only sampled over the final weeks.

Paragraph 2 — The uneven inauguration surge:
Explain that within r/Liberal (the one subreddit with full pre-and-post inauguration data), daily posting rose 247% after January 20, 2025 — from 3.5 posts/day to 12 posts/day. r/Anarchism saw a smaller 71% bump, while r/socialism stayed essentially flat and r/worldpolitics actually declined. The reaction to the new administration was concentrated in liberal/mainstream-left communities, not uniform across the political spectrum. This is the most analytically interesting time-based finding in the dataset.

Paragraph 3 — Media ecosystem fragmentation:
Use the top news sources data to show how different subreddits share fundamentally different sources. For example, r/Conservative shares breitbart.com and foxnews.com, while r/politics shares nytimes.com and theguardian.com. Reference at least 4 specific domains by name with their share counts. This is a sign of isolated information ecosystems.

Paragraph 4 — Network structure:
Explain what {stats['network_stats']['num_components']} disconnected components in a {stats['network_stats']['num_nodes']}-node network reveals about cross-community dialogue. Most communities operate in isolation, but ~87 cross-community authors act as bridges. Comment on what this fragmentation means for the spread of narratives.

Do NOT use any markdown formatting. Do NOT start with "Executive Summary" or any title. Write each paragraph as a standalone block separated by a blank line."""

    result = _call_llm(prompt, max_tokens=700)
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
        f"across 10 subreddits collected for their political associations, spanning {stats['date_range']['start']} to {stats['date_range']['end']}. "
        f"The period covers the 2024 US presidential election through the first weeks of the new administration. "
        f"Top shared news sources include {', '.join([d['domain'] for d in stats['top_domains'][:3]])}."
    )


def generate_cluster_summary(clusters, k):
    """Generate a summary of the clustering results."""
    cluster_desc = "\n".join([
        f"- Cluster {c['id']} ({c['size']} posts): {c['label']}"
        for c in sorted(clusters, key=lambda x: -x['size'])[:10]
    ])

    prompt = f"""Write a detailed plain-text analysis (NO markdown, NO headers, NO #) of these topic clusters from a Reddit dataset (8,799 posts, 10 subreddits collected for their political associations, July 2024 to February 2025, covering the 2024 US election and 2025 presidential transition).

{k} clusters were created using KMeans on 384-dimensional sentence embeddings. Here are the largest clusters:
{cluster_desc}

Write 5 to 6 sentences covering:
1. What are the dominant themes that emerge across the largest clusters? Name at least 3 specific clusters by their keywords.
2. Which clusters reflect election-period concerns (campaigns, voting, candidates) versus post-inauguration governance (executive orders, immigration, federal workforce)?
3. Are there any surprising or unexpected clusters — small ones, or topics that wouldn't normally appear in politically associated subreddits?
4. What does the distribution of cluster sizes tell us — are a few topics dominating the conversation, or is the conversation spread evenly across many topics?
5. End with a takeaway about what these communities were discussing during this seven-month window.

Use specific cluster keywords, exact post counts, and percentages where relevant. Do NOT use markdown, bullet points, or headers — write flowing analytical prose."""

    result = _call_llm(prompt, max_tokens=500)
    if result:
        import re
        cleaned = re.sub(r'^#{1,4}\s+.*$', '', result, flags=re.MULTILINE).strip()
        return cleaned.replace('**', '')
    return None


def generate_network_summary(stats):
    """Generate a summary of the network analysis."""
    num_nodes = stats.get('num_nodes', 0)
    num_edges = stats.get('num_edges', 0)
    num_components = stats.get('num_components', 0)
    num_communities = stats.get('num_communities', 'unknown')
    density = stats.get('density', 'unknown')
    largest = stats.get('largest_component_size', 'unknown')

    prompt = f"""Write a detailed plain-text analysis (NO markdown, NO headers, NO #) of this author interaction network built from a Reddit dataset (8,799 posts, 10 subreddits collected for their political associations, July 2024 to February 2025).

The network is built from three signal types: crosspost links (weight 3.0), shared URL co-sharing (weight 2.0), and co-subreddit activity (weight 1.0). The [deleted] meta-author is excluded to prevent false super-connections.

NETWORK STATS
Total connected authors (nodes): {num_nodes}
Total interaction edges: {num_edges}
Disconnected components: {num_components}
Communities detected (Louvain algorithm): {num_communities}
Network density: {density}
Largest connected component size: {largest}

Write 5 to 6 sentences covering:
1. What does {num_components} disconnected components in a {num_nodes}-node network reveal about how fragmented or unified author interaction is across these Reddit communities?
2. What does the density of {density} tell us about how interconnected authors are in absolute terms? (Density of 1.0 would mean every author interacts with every other; density near 0 means very sparse interaction.)
3. What do the {num_communities} Louvain communities suggest — are these likely subreddit-aligned communities or do they cross subreddit boundaries?
4. The largest connected component contains {largest} authors. What does the gap between this and total nodes ({num_nodes}) say about the structure of cross-community interaction?
5. End with a takeaway: what does this network structure imply about the spread of narratives between politically diverse Reddit communities?

Use specific numbers throughout. Do NOT use markdown, bullet points, or headers — write flowing analytical prose."""

    result = _call_llm(prompt, max_tokens=500)
    if result:
        import re
        cleaned = re.sub(r'^#{1,4}\s+.*$', '', result, flags=re.MULTILINE).strip()
        return cleaned.replace('**', '')
    return None


def generate_comparison_summary(sub1, sub2):
    """Generate an analytical comparison between two subreddits."""
    sub1_domains = ', '.join([f"{d['domain']} ({d['count']})" for d in sub1['top_domains'][:5]])
    sub2_domains = ', '.join([f"{d['domain']} ({d['count']})" for d in sub2['top_domains'][:5]])
    sub1_topics = '; '.join([t['label'] for t in sub1['top_topics'][:3]])
    sub2_topics = '; '.join([t['label'] for t in sub2['top_topics'][:3]])
    sub1_top_author = sub1['top_authors'][0] if sub1['top_authors'] else None
    sub2_top_author = sub2['top_authors'][0] if sub2['top_authors'] else None

    prompt = f"""Write a detailed plain-text analytical comparison (NO markdown, NO headers, NO #) of two Reddit subreddits from a dataset of 8,799 posts (10 subreddits collected for their political associations, July 2024 to February 2025, covering the 2024 US election and 2025 inauguration).

SUBREDDIT 1: r/{sub1['name']}
- Total posts: {sub1['total_posts']}
- Unique authors: {sub1['unique_authors']}
- Average upvotes per post: {sub1['avg_score']}
- Average comments per post: {sub1['avg_comments']}
- Top news sources shared: {sub1_domains}
- Top discussion topics: {sub1_topics}
- Most active author: {f"u/{sub1_top_author['author']} ({sub1_top_author['count']} posts)" if sub1_top_author else 'N/A'}

SUBREDDIT 2: r/{sub2['name']}
- Total posts: {sub2['total_posts']}
- Unique authors: {sub2['unique_authors']}
- Average upvotes per post: {sub2['avg_score']}
- Average comments per post: {sub2['avg_comments']}
- Top news sources shared: {sub2_domains}
- Top discussion topics: {sub2_topics}
- Most active author: {f"u/{sub2_top_author['author']} ({sub2_top_author['count']} posts)" if sub2_top_author else 'N/A'}

Write 4 paragraphs (3-4 sentences each) covering:

Paragraph 1 — Engagement comparison:
Compare total post counts, unique authors, average upvotes, and average comments. Which community is more active? Which gets more engagement per post? What does the ratio of authors to posts tell us about whether discussion is concentrated in a few hands or distributed widely?

Paragraph 2 — Information ecosystem:
Compare the news sources each community shares. Are they reading the same outlets, or completely different ones? Cite at least 3 specific domains by name. What does this tell us about the information ecosystems each community is plugged into?

Paragraph 3 — Topical focus:
Compare the dominant topics in each community. Are they discussing the same events from different angles, or are they focused on entirely different concerns? Reference specific topic keywords from the data.

Paragraph 4 — The takeaway:
What's the most striking difference between these two communities? Is there evidence of narrative divergence, echo chambers, or shared concerns? End with a concrete observation that a journalist could use as the seed for a story.

Use ONLY the data above. Be specific with numbers and names. Do NOT use markdown formatting — write flowing analytical prose."""

    result = _call_llm(prompt, max_tokens=700)
    if result:
        import re
        cleaned = re.sub(r'^#{1,4}\s+.*$', '', result, flags=re.MULTILINE).strip()
        return cleaned.replace('**', '')
    return None


def generate_embeddings_summary(stats):
    """Generate a plain-language summary explaining what the embedding visualization shows."""
    subreddit_list = ', '.join([f"r/{s['name']} ({s['count']})" for s in stats.get('subreddits', [])[:10]])

    prompt = f"""Write a plain-text 4-paragraph explanation (NO markdown, NO headers, NO #) helping a non-technical reader understand what they are looking at in an interactive embedding visualization.

CONTEXT
The visualization shows all 8,799 Reddit posts as dots on a 2D map. Posts that are semantically similar (discuss similar topics in similar ways) are placed near each other. Posts that are different are far apart. The map was created using all-MiniLM-L6-v2 sentence embeddings (384 dimensions per post) reduced to 2D using UMAP. Each post is colored by which subreddit it came from.

DATASET
{stats.get('total_posts', 8799)} posts across these 10 subreddits collected for their political associations: {subreddit_list}
Time period: July 2024 to February 2025 (covering the 2024 US election and 2025 Trump inauguration)

WRITE 4 PARAGRAPHS

Paragraph 1 — What you're looking at:
Explain that this is a "map of meaning" — each dot is a post, and dots near each other talk about similar things. Don't use jargon like "embedding space" or "vector dimensions." Use the metaphor of a city map where similar buildings (posts) cluster into neighborhoods (topics).

Paragraph 2 — How to read it:
Explain that distinct clumps of dots are topic clusters that emerged automatically — no one labeled them, the AI just grouped posts that talked about similar things. Mention that the colors show which subreddit each post is from, so you can see whether different communities cluster separately or mix together. Tell the reader to look for: tight clumps (focused topics), sparse areas (unique posts), and surprising overlaps (posts from opposing political subreddits ending up near each other).

Paragraph 3 — What this reveals about how the communities talk:
Discuss what an embedding map of these Reddit communities can reveal. For example: posts about Trump's executive orders form one neighborhood, posts about anarchist theory form another, posts about election results form yet another. Communities that share vocabulary will overlap in space, while ideologically distant ones stay apart. The biggest insight from this kind of visualization is finding "bridges" — posts where different political camps unexpectedly land near each other.

Paragraph 4 — How to use it:
Tell the reader to use the search bar inside the map to find specific topics (e.g. searching "immigration" highlights all immigration-related posts). Encourage them to zoom into a clump to read individual post titles and see what defines that neighborhood.

Use plain conversational English a curious newspaper reader would understand. Do NOT use markdown."""

    result = _call_llm(prompt, max_tokens=700)
    if result:
        import re
        cleaned = re.sub(r'^#{1,4}\s+.*$', '', result, flags=re.MULTILINE).strip()
        return cleaned.replace('**', '')
    return None


def answer_chart_question(question, data_context):
    """Answer a user's follow-up question about a specific chart's data."""
    prompt = f"""You are analyzing a chart from a Reddit research dashboard (8,799 posts from 10 subreddits collected for their political associations, Jul 2024 - Feb 2025).

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
