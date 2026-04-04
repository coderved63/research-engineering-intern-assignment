"""
Generate sentence embeddings for all posts using all-MiniLM-L6-v2.
Outputs embeddings.npy and post_ids.json.
"""

import json
import sqlite3
import os
import sys
import numpy as np
from sentence_transformers import SentenceTransformer

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import POSTS_DB, EMBEDDINGS_NPY, POST_IDS_JSON, EMBEDDING_MODEL


def generate_embeddings():
    print(f"Loading model: {EMBEDDING_MODEL}")
    model = SentenceTransformer(EMBEDDING_MODEL)

    print(f"Reading posts from: {POSTS_DB}")
    conn = sqlite3.connect(POSTS_DB)
    rows = conn.execute("SELECT id, combined_text FROM posts ORDER BY rowid").fetchall()
    conn.close()

    post_ids = [r[0] for r in rows]
    texts = [r[1] for r in rows]

    print(f"Encoding {len(texts)} posts...")
    embeddings = model.encode(texts, batch_size=256, show_progress_bar=True, normalize_embeddings=True)

    embeddings = np.array(embeddings, dtype=np.float32)
    print(f"Embeddings shape: {embeddings.shape}")

    os.makedirs(os.path.dirname(EMBEDDINGS_NPY), exist_ok=True)
    np.save(EMBEDDINGS_NPY, embeddings)
    print(f"Saved embeddings to: {EMBEDDINGS_NPY}")

    with open(POST_IDS_JSON, 'w') as f:
        json.dump(post_ids, f)
    print(f"Saved post IDs to: {POST_IDS_JSON}")

    print("Done!")


if __name__ == '__main__':
    generate_embeddings()
