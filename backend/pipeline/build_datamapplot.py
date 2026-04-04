"""
Generate interactive Datamapplot HTML from UMAP coordinates and subreddit labels.
"""

import sqlite3
import os
import sys
import numpy as np
import datamapplot

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import POSTS_DB, UMAP_COORDS_NPY, STATIC_DIR

SUBREDDIT_COLORS = {
    'Anarchism': '#dc2626',
    'socialism': '#ef4444',
    'democrats': '#3b82f6',
    'Liberal': '#60a5fa',
    'politics': '#8b5cf6',
    'PoliticalDiscussion': '#a78bfa',
    'neoliberal': '#6366f1',
    'worldpolitics': '#14b8a6',
    'Conservative': '#f97316',
    'Republican': '#ea580c',
}


def build_datamapplot():
    print("Loading UMAP coordinates...")
    coords = np.load(UMAP_COORDS_NPY)
    print(f"  Shape: {coords.shape}")

    print("Loading post metadata...")
    conn = sqlite3.connect(POSTS_DB)
    rows = conn.execute("SELECT id, subreddit, title FROM posts ORDER BY rowid").fetchall()
    conn.close()

    labels = np.array([r[1] for r in rows])
    hover_text = [f"r/{r[1]}: {r[2][:100]}" for r in rows]

    print(f"  {len(labels)} posts, {len(set(labels))} unique labels")

    os.makedirs(STATIC_DIR, exist_ok=True)
    output_path = os.path.join(STATIC_DIR, 'datamapplot.html')

    print("Generating interactive plot...")
    fig = datamapplot.create_interactive_plot(
        coords,
        labels,
        hover_text=hover_text,
        label_color_map=SUBREDDIT_COLORS,
        darkmode=False,
        enable_search=True,
        width="100%",
        height=800,
    )

    fig.save(output_path)
    print(f"Saved to: {output_path}")
    print("Done!")


if __name__ == '__main__':
    build_datamapplot()
