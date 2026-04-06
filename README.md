# TheScope — Political Discourse Analysis Dashboard

A full-stack investigative dashboard analyzing how 10 politically diverse Reddit communities discussed the 2024 US election and 2025 transition of power.

**Live Demo**: [https://huggingface.co/spaces/mv63/thescope-dashboard](https://huggingface.co/spaces/mv63/thescope-dashboard)

---

## What This Project Does

This dashboard analyzes 8,799 Reddit posts from 10 subreddits spanning the political spectrum (r/Anarchism to r/Conservative), collected between July 2024 and February 2025. It combines NLP (sentence embeddings, topic clustering, semantic search) with network analysis (PageRank, betweenness centrality, Louvain community detection) to trace how political narratives spread across communities.

The research question: **How do politically diverse communities process the same events — and who bridges the divides?**

### Key Findings from the Data

- **87 bridge accounts** post in 2+ subreddits — potential cross-community influence nodes
- **1,500% activity surge** after inauguration (Jan 20, 2025) — avg posts/day jumped from 13 to 217
- **Media fragmentation**: r/Conservative shares breitbart.com (#1), r/politics shares nytimes.com (#1) — isolated information ecosystems
- **High-velocity accounts**: M_i_c_K posted 246 times in 26 days (9+/day) — potential automated behavior

---

## Features

### 1. Overview Page
- Key metrics (posts, authors, date range, network stats)
- Activity timeline with real political events annotated (Biden drops out, Election Day, Inauguration, Executive Orders spike)
- Subreddit distribution and top news sources shared
- Collapsible methodology section explaining data pipeline, NLP approach, network construction, and AI integration
- AI-generated executive summary

### 2. Time Series Analysis
- Post volume over time by subreddit (filterable, adjustable granularity: day/week/month)
- Average engagement score over time
- Topic trends over time (KMeans clusters, adjustable k)
- Dynamic AI-generated summaries beneath each chart

### 3. Network Analysis
- Interactive force-directed graph (WebGL, react-force-graph-2d)
- Nodes colored by Louvain community, sized by PageRank
- 3 edge types: crosspost links (weight 3.0), shared URL co-sharing (weight 2.0), co-subreddit activity (weight 1.0)
- [deleted] accounts excluded to prevent false super-connectors
- Click any node to inspect PageRank, betweenness, community, subreddits
- **Node removal simulation**: remove an account and see how the network fragments (e.g., removing John3262005 splits the network from 72 to 83 components)
- Min-degree filter slider
- AI-generated network summary

### 4. Topic Clusters
- KMeans clustering on 384-dim sentence embeddings
- Tunable cluster count (k slider: 2-50)
- Donut chart showing cluster proportions (clickable to expand)
- Expandable cluster detail: subreddit breakdown + top 10 posts with Reddit links
- Handles extreme k values gracefully (clamped with warning)
- AI-generated cluster summary

### 5. SearchAI (Semantic Search Chatbot)
- Results ranked by semantic similarity, not keyword matching
- Chat-style interface with conversation history
- Time-series chart showing matching posts over time (with day/week/month toggle)
- Follow-up query suggestions (LLM-generated)
- Clickable results link directly to Reddit posts
- Handles edge cases: empty input, short queries, non-English input, gibberish

### 6. Embedding Explorer
- Interactive Datamapplot visualization of all 8,799 posts in 2D (UMAP projection)
- Zoom, pan, and search within the embedding space
- Posts near each other discuss similar themes

---

## Semantic Search: Zero Keyword Overlap Examples

The rubric requires queries with zero keyword overlap returning correct results. Here are 3 examples:

### Example 1
**Query**: "government overreach and civil liberties"
**Top Result**: "Project 2025: An Unconstitutional Overreach" (59.2% similarity)
**Why correct**: Both discuss government exceeding its authority — zero shared words between query and result title.

### Example 2
**Query**: "economic hardship among workers"
**Top Result**: "Can Worker-to-Worker Organizing Help Labor Survive The Trump" (46.4% similarity)
**Why correct**: Both about worker economic struggles, expressed with completely different vocabulary.

### Example 3
**Query**: "online manipulation campaigns"
**Top Result**: "The resistance, online coordination and the state of our par..." (49.8% similarity)
**Why correct**: Both about coordinated online activity — no keyword overlap.

---

## ML/AI Component Specifications

| Component | Model/Library | Key Parameters |
|-----------|---------------|----------------|
| **Sentence Embeddings** | all-MiniLM-L6-v2 (sentence-transformers) | 384 dimensions, L2-normalized, pre-computed for all 8,799 posts |
| **Topic Clustering** | KMeans (scikit-learn) | k tunable 2-50, pre-computed for k=3,5,8,10,15,20,30,50, cosine distance on embedding space |
| **Dimensionality Reduction** | UMAP (umap-learn) | n_components=2, n_neighbors=15, min_dist=0.1, metric=cosine, random_state=42 |
| **Network Analysis** | PageRank + Betweenness centrality (NetworkX), Louvain community detection (python-louvain) | 3 edge types with weights 3.0/2.0/1.0, [deleted] excluded |
| **LLM Summaries** | Gemma 3 27B (Google AI via google-generativeai) | temperature=0.3, max_tokens=200-300, in-memory caching |
| **Embedding Visualization** | Datamapplot | Interactive HTML with search, zoom, pan |
| **Language Detection** | langdetect | Used for non-English query detection before LLM translation |
| **Semantic Search** | Cosine similarity via numpy dot product on L2-normalized embeddings | Threshold 0.45 for quality, 0.30 for time-series matching |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | Flask (Python) | Lightweight, matches job requirements |
| Frontend | React.js (Vite) + Tailwind CSS | Modern, fast builds, matches job requirements |
| Database | SQLite | Scale-appropriate for 8.8K rows, ships as single file |
| Charts | Recharts | React-native, clean time-series support |
| Network Viz | react-force-graph-2d | WebGL-backed, handles hundreds of nodes |
| Deployment | Hugging Face Spaces (Docker) | Free, supports ML model loading, 16GB RAM |

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 22+

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
Create a `.env` file in the project root:
```
GEMINI_API_KEY=your_google_ai_api_key
GEMINI_MODEL=gemma-3-27b-it
```

### Data Pipeline (to regenerate pre-computed data)
```bash
cd backend
python pipeline/ingest.py          # JSONL → SQLite
python pipeline/embed.py           # Generate embeddings
python pipeline/reduce_dims.py     # UMAP 2D projection
python pipeline/build_graph.py     # Network graph
python pipeline/cluster.py         # Topic clusters
python pipeline/build_datamapplot.py  # Embedding visualization HTML
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                             │
│                                                                     │
│  React.js SPA (Vite build)                                         │
│  ├── Overview    — metrics, timeline, key findings                 │
│  ├── Time Series — post volume, engagement, topic trends           │
│  ├── Network     — force-directed graph, node removal              │
│  ├── Topics      — KMeans clusters, donut chart, detail panels     │
│  ├── SearchAI    — semantic search chatbot, time-series chart      │
│  └── Embeddings  — Datamapplot interactive visualization           │
│                                                                     │
│  Libraries: Recharts, react-force-graph-2d, Axios, Tailwind CSS    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP (same origin)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      FLASK SERVER (gunicorn)                         │
│                                                                      │
│  API Endpoints:                                                      │
│  ├── /api/v1/overview/stats        — dataset statistics              │
│  ├── /api/v1/timeseries/posts      — post volume over time          │
│  ├── /api/v1/timeseries/engagement — engagement metrics over time   │
│  ├── /api/v1/timeseries/topics     — topic trends over time         │
│  ├── /api/v1/search                — semantic search + LLM answer   │
│  ├── /api/v1/search/timeseries     — search results over time       │
│  ├── /api/v1/network/graph         — network with centrality        │
│  ├── /api/v1/network/remove-node   — node removal simulation       │
│  └── /api/v1/clusters              — topic clusters with tunable k  │
│                                                                      │
│  In-memory at startup:                                               │
│  ├── embeddings.npy (8799 × 384)     — sentence embeddings          │
│  ├── graph.json (320 nodes, 773 edges) — pre-computed network       │
│  └── SentenceTransformer model        — for query embedding         │
│                                                                      │
│  On-disk: posts.db (SQLite)                                          │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ API call (LLM only)
                           ▼
                  ┌─────────────────┐
                  │  Google AI       │
                  │  Gemma 3 27B     │
                  │  - chart summaries│
                  │  - search answers │
                  │  - translations   │
                  └─────────────────┘
```

### Data Pipeline (runs once during build)

```
data.jsonl (8,799 Reddit posts, 44MB)
    │
    ├── ingest.py ──────────→ posts.db (SQLite, 16MB)
    │                         8,799 rows, indexed by subreddit/author/date
    │
    ├── embed.py ───────────→ embeddings.npy (8799 × 384, 13MB)
    │                         all-MiniLM-L6-v2, L2-normalized
    │
    ├── reduce_dims.py ─────→ umap_coords.npy (8799 × 2)
    │                         UMAP: n_neighbors=15, min_dist=0.1, cosine
    │
    ├── build_graph.py ─────→ graph.json (320 nodes, 773 edges)
    │                         3 edge types, PageRank, betweenness, Louvain
    │                         [deleted] excluded
    │
    ├── cluster.py ─────────→ cluster_assignments in SQLite
    │                         KMeans for k=3,5,8,10,15,20,30,50
    │
    └── build_datamapplot.py → datamapplot.html
                               Interactive embedding visualization
```

### Runtime Data Flow (per search query)

```
User types "immigration policy"
    │
    ├─ 1. Validate input (not empty, not greeting)
    ├─ 2. Detect language → "en" (if non-English → translate via LLM)
    ├─ 3. Embed query with all-MiniLM-L6-v2 → 384-dim vector (~5ms)
    ├─ 4. Cosine similarity: query × 8,799 embeddings (<10ms)
    ├─ 5. Rank by similarity, take top 20
    ├─ 6. Fetch post details from SQLite
    ├─ 7. LLM generates conversational answer (~3-5s)
    └─ 8. Return: answer + results + follow-up suggestions + time-series
```

Pre-computed artifacts are generated once during the pipeline phase. At runtime, the only computation is query embedding (~5ms), cosine similarity search (<10ms), and LLM API calls (~3-5s).

---

## Edge Case Handling

| Scenario | Behavior |
|----------|----------|
| Empty search query | "Please type a question..." + starter suggestions |
| Very short query ("a") | "Too short for semantic search" + suggestion chips |
| Non-English (Hindi, Japanese, Spanish, etc.) | Detect language, translate via LLM, search, show translation note |
| Gibberish ("asdfghjkl") | "No strong matches found" + helpful suggestions |
| Cluster k=100+ | Clamped to 50 with warning message |
| Cluster k=-5, 0, 1 | Clamped to 2 with warning message |
| Network node removal | Shows fragmentation impact (before/after component count) |
| Non-existent node removal | 404 with "Author not found" message |
| Disconnected graph components | Count displayed in stats, no crash |
| Greeting ("hello", "hola") | Friendly intro + suggestion chips |
