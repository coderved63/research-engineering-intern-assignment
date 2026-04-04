import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

# Paths to pre-computed artifacts
POSTS_DB = os.path.join(DATA_DIR, 'posts.db')
EMBEDDINGS_NPY = os.path.join(DATA_DIR, 'embeddings.npy')
UMAP_COORDS_NPY = os.path.join(DATA_DIR, 'umap_coords.npy')
POST_IDS_JSON = os.path.join(DATA_DIR, 'post_ids.json')
GRAPH_JSON = os.path.join(DATA_DIR, 'graph.json')

# Source data
DATA_JSONL = os.path.join(os.path.dirname(BASE_DIR), 'data.jsonl')

# LLM Configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemma-3-27b-it')

# Embedding model
EMBEDDING_MODEL = 'all-MiniLM-L6-v2'
EMBEDDING_DIM = 384

# Clustering
PRECOMPUTED_K_VALUES = [3, 5, 8, 10, 15, 20, 30, 50]
MAX_K = 50
MIN_K = 2
