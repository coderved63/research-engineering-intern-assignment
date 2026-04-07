# AI-Assisted Development — Prompt Log

I used Claude (Anthropic) as a coding assistant during this project, primarily for performance optimization, edge case discovery, unfamiliar library APIs, LLM prompt iteration, and debugging deployment issues. Below is the sequential log of every AI-assisted prompt with brief notes describing what stage the project was at when each prompt was made.

---

### Stage 1: Data Pipeline

The first work was setting up the data pipeline — parsing 8,799 Reddit posts from JSONL into SQLite, generating sentence embeddings, running UMAP dimensionality reduction, and constructing the network graph. Most of this was straightforward, but the network graph required careful handling of three different edge types and the exclusion of meta-authors like `[deleted]`.

## Prompt 1
**Component**: Network graph — shared URL edges (`backend/pipeline/build_graph.py`)
**Prompt**: "Write the shared URL edge logic for a NetworkX graph: for each external URL posted by 2+ authors, create edges between all author pairs with weight 2.0. Filter out internal Reddit domains."
**Issue**: Output included `self.*` and `i.redd.it` as "shared URLs" — would create thousands of false connections between unrelated authors who just happened to post images.
**Fix**: Added domain filtering for `self.*`, `reddit.com`, `i.redd.it`, `v.redd.it`. Also excluded `[deleted]` (appears in 9/10 subreddits) to prevent a false super-connector node dominating all centrality metrics.

---

After the network graph was generated (320 nodes, 773 edges, 72 components), the next step was the topic clustering pipeline — KMeans with TF-IDF labels for each cluster.

## Prompt 2
**Component**: KMeans cluster labeling (`backend/pipeline/cluster.py`)
**Prompt**: "Pre-compute KMeans cluster assignments for k = [3, 5, 8, 10, 15, 20, 30, 50]. For each cluster, extract top TF-IDF terms as a label."
**Issue**: TF-IDF used default settings, so cluster labels included common words like "the", "is", "and" — making them uninformative ("the, is, trump, people, and").
**Fix**: Added `stop_words='english'` and `max_df=0.9` to filter overly common terms. Labels improved to descriptive terms like "trump, tariffs, china, canada, trade".

---

### Stage 2: Backend API

With all pre-computed artifacts in place (`posts.db`, `embeddings.npy`, `graph.json`, `umap_coords.npy`), the next phase was building the Flask API layer — endpoints for time-series, semantic search, network graph, and clusters. The semantic search endpoint was the most performance-sensitive part.

## Prompt 3
**Component**: Cosine similarity optimization (`backend/routes/search.py`)
**Prompt**: "My semantic search loops through 8,799 embeddings computing cosine similarity one-by-one with scipy. Takes ~200ms per query. How can I vectorize this?"
**Issue**: AI suggested `scipy.spatial.distance.cdist` — computes a full pairwise distance matrix, overkill when only one query vs all posts is needed.
**Fix**: Since embeddings are L2-normalized at pre-computation time, cosine similarity equals the dot product. Replaced with `similarities = embeddings @ query_vec.T` — single numpy operation. Search dropped from ~200ms to <10ms.

---

The rubric specifically mentions stress-testing search with edge cases: empty queries, very short queries, non-English input. The next prompt was about anticipating what else could break.

## Prompt 4
**Component**: Search edge case handling (`backend/routes/search.py`)
**Prompt**: "What edge cases should I handle for semantic search? I handle empty queries already. What else could break during stress testing?"
**Issue**: AI recommended `polyglot` for language detection — requires system-level ICU dependencies that won't install in Docker. Also threw exceptions on single-character inputs.
**Fix**: Switched to `langdetect` (pure Python). Added: short query handling with suggestions, non-English translation via the LLM before embedding, and a 0.45 similarity threshold below which the system returns "no strong matches" instead of fabricating analysis on irrelevant results.

---

The network endpoint needed to support node removal — the rubric explicitly says they will test "what does your graph look like with a highly connected node removed?"

## Prompt 5
**Component**: Network node removal endpoint (`backend/routes/network.py`)
**Prompt**: "Add GET /api/v1/network/remove-node/:author that removes a node from the graph, recomputes connected components, and returns before/after stats with an impact description."
**Issue**: Reconstructed the entire NetworkX graph from JSON on every call (~100ms overhead). Crashed with 500 error when the author didn't exist — no validation.
**Fix**: Cache base graph in memory at startup. Use `G.copy()` and remove from the copy (never mutate original). Return 404 with clear message if author not found. Impact description includes specific numbers: "Removing John3262005 fragmented the network: components 72 → 83."

---

The rubric also requires a tunable cluster count parameter and explicitly mentions testing extreme values.

## Prompt 6
**Component**: Clustering API with tunable k (`backend/routes/clusters.py`)
**Prompt**: "Implement GET /api/v1/clusters?k=N that returns pre-computed cluster assignments for cached k values, or runs KMeans on-the-fly for non-cached values."
**Issue**: No validation on k parameter — passing k=0, k=-5, or k=10000 either crashed KMeans or returned meaningless results.
**Fix**: Clamp k to [2, 50]. If outside range, return clamped value with a warning message in the response. Pre-computed k values load from SQLite instantly; non-cached values compute in <1s.

---

### Stage 3: LLM Integration

With the data endpoints working, the next phase was integrating Google's Gemma 3 27B for dynamic chart summaries (the rubric requires plain-language summaries beneath each time-series plot, generated dynamically from actual data).

## Prompt 7
**Component**: LLM prompt engineering (`backend/services/llm_service.py`)
**Prompt**: "My chart summaries are too vague — they say 'The chart shows posts over time.' I need them to mention specific subreddit names, dates, and numbers. Here's the data I'm passing: [peak period, top subs, start/end values]. Rewrite the system prompt."
**Issue**: Model (Gemma 3 27B) hallucinated dates outside the dataset range (e.g., "June 2025" when data ends in February 2025) and returned markdown headers like `## Executive Summary`.
**Fix**: Added hard constraints: "Dataset covers July 2024 to February 2025 ONLY. Do NOT mention dates outside this range." and "NO markdown, NO headers." Reduced temperature from 0.7 to 0.3. Added backend post-processing to strip remaining markdown.

---

After the prompt engineering was working in standalone tests, the LLM started silently failing when called through Flask — fallback templates appeared instead of real summaries.

## Prompt 8
**Component**: LLM API initialization bug (`backend/services/llm_service.py`)
**Prompt**: "LLM summaries work in standalone test but silently fall back to template summaries when running through Flask. Google AI calls fail with no error. What's happening?"
**Issue**: The module read `os.environ.get('GEMINI_API_KEY')` at import time, but Flask loads `.env` during `create_app()` — after imports. Key was always empty when `genai.configure()` ran.
**Fix**: Changed to lazy initialization with `_ensure_configured()` that runs on the first LLM call, not at import. Classic Flask app factory pitfall — module-level code runs before the app context exists.

---

### Stage 4: Frontend

With the backend stable, the next phase was the React frontend — six pages (Overview, Time Series, Network, Topics, SearchAI, Embeddings), shared layout, and interactive charts. Most of the React work used standard patterns, but the network graph was the first time using `react-force-graph-2d`.

## Prompt 9
**Component**: React force-directed graph rendering (`frontend/src/pages/Network.jsx`)
**Prompt**: "Using react-force-graph-2d with 320 nodes. Default rendering shows all node labels at every zoom level — unreadable. How do I use the nodeCanvasObject callback to show labels only when zoomed in past a threshold?"
**Issue**: Custom rendering worked, but the graph started in one corner instead of centering, and the force simulation ran indefinitely consuming CPU.
**Fix**: Added `zoomToFit(400, 50)` with setTimeout after layout settles to auto-center. Set `cooldownTicks={200}` to stop simulation after convergence. Labels only appear at `globalScale > 5` for high-degree nodes.

---

The time-series page used Recharts, which had its own quirks around missing data points and chart annotations.

## Prompt 10
**Component**: Recharts time-series configuration (`frontend/src/pages/TimeSeries.jsx`)
**Prompt**: "Recharts LineChart drops lines to zero when a subreddit has no posts in a given week, creating misleading spikes. How to skip the gap? Also, how to add ReferenceLine annotations for political events?"
**Issue**: `connectNulls` fixed the gap issue, but ReferenceLine event labels overlapped when multiple events were close together on the x-axis.
**Fix**: Used `position='top'` with 10px font for labels. Accepted some overlap as unavoidable — hover tooltips provide full labels anyway.

---

After basic search was working, I added a feature where the search results would also show a time-series chart of how matching posts trended over time. This required deciding between modifying the existing endpoint or creating a new one.

## Prompt 11
**Component**: Search time-series feature design (`backend/routes/search.py`, `frontend/src/components/common/SearchTrendChart.jsx`)
**Prompt**: "I need to show a time-series chart of posts matching a semantic search query in the search results. Should I modify the existing /search endpoint to also return time-series data, or create a separate endpoint?"
**Issue**: AI suggested modifying `/search` to include time-series data — would block the entire response on time-series computation, doubling perceived latency.
**Fix**: Created separate `/search/timeseries` endpoint. Frontend fires both requests with `Promise.allSettled` — search results appear as soon as the LLM responds, chart fills in independently. Used a lower similarity threshold (0.30) for time-series to capture more posts.

---

The Topics page had a donut chart and cluster cards, but they were initially static. The next step was making them interactive with expandable detail views.

## Prompt 12
**Component**: Cluster expandable detail panels (`frontend/src/pages/Clusters.jsx`)
**Prompt**: "I have a donut chart and cluster cards. Want clicking either to expand a detail panel showing subreddit breakdown bars and top 10 posts with Reddit links. How to handle state and auto-scroll?"
**Issue**: Click handler used the array index from the Recharts payload, but segments were sorted by size — index didn't match the cluster ID. The expanded panel also appeared off-screen.
**Fix**: Changed click handler to use `data.id` directly from the payload. Added `scrollIntoView({ behavior: 'smooth' })` with a 100ms setTimeout for the panel to render first. Non-selected segments dim to 30% opacity for visual focus.

---

### Stage 5: UI Polish

With all features functional, the next phase was visual polish — switching from a plain sidebar layout to a glassmorphic top navbar with a dark/light mode toggle, adding the gradient background, and refining typography. The dark mode CSS was the trickiest part.

## Prompt 13
**Component**: Dark mode CSS overrides (`frontend/src/index.css`)
**Prompt**: "I have a dark/light mode toggle that adds a 'dark-mode' class to a container div. My cards use Tailwind bg-white/70. How do I override these in dark mode without modifying every component?"
**Issue**: AI suggested Tailwind's `dark:` prefix — doesn't work because our dark mode is class-based on a child container, not the `<html>` element.
**Fix**: Used plain CSS overrides targeting `.dark-mode .bg-white\/70 { background: rgba(20, 20, 25, 0.8) !important; }` with escaped forward slash. Also added overrides for Recharts text, tooltips, and grid lines.

---

The Embeddings page needed a Datamapplot HTML file generated from the UMAP coordinates with a custom color palette matching the political spectrum.

## Prompt 14
**Component**: Datamapplot generation (`backend/pipeline/build_datamapplot.py`)
**Prompt**: "Generate an interactive Datamapplot HTML from UMAP coordinates with subreddit labels and a custom color palette matching the political spectrum (reds for right-leaning, blues for left-leaning, purples for mixed)."
**Issue**: Used `point_size` parameter that doesn't exist in the current Datamapplot API — function signature had changed between versions.
**Fix**: Checked the actual function signature with `help(datamapplot.create_interactive_plot)`. Removed unsupported parameters and used `label_color_map` to map subreddit names to political-spectrum colors.

---

### Stage 6: Narrative & Verification

The final feature work was adding the narrative content — the methodology section, key findings panel, and contextual explanations on each page. Before publishing any statistics on the dashboard, every claim needed to be verified against the actual database.

## Prompt 15
**Component**: Key findings data verification (`frontend/src/pages/Overview.jsx`)
**Prompt**: "Write SQL queries to verify these claims against the database before I hardcode them: activity surge % after inauguration, bridge account count, M_i_c_K's posting frequency, and top news domains per subreddit."
**Issue**: Verification queries were correct, but they revealed the original estimates were wrong — "340% surge" (actual: 1,500%) and "M_i_c_K posted 246 times in 7 months" (actual: 26 days = 9.46/day).
**Fix**: Corrected every claim with verified numbers. Lesson: never display estimated numbers on a dashboard that evaluators will scrutinize. Every statistic shown is now backed by a verified database query.

---

### Stage 7: Deployment

With everything stress-tested and working locally, the last step was deploying to a public URL. The first attempt on Render.com failed, leading to a switch to Hugging Face Spaces.

## Prompt 16
**Component**: Deployment configuration (`Dockerfile`)
**Prompt**: "Configure a Dockerfile for Hugging Face Spaces — Python 3.11, Node.js 22, build the React frontend, run the data pipeline during Docker build, serve with gunicorn on port 7860."
**Issue**: Initial deployment on Render.com failed with out-of-memory on the 512MB free tier — sentence-transformer model (~90MB) plus embeddings (13MB) plus Flask overhead exceeded the limit.
**Fix**: Switched to Hugging Face Spaces (16GB RAM on Docker free tier). Restructured Dockerfile to run the full pipeline during Docker build so large pre-computed files don't need to be committed (avoiding GitHub fork LFS restrictions).
