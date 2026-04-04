"""
Reduce 384-dim embeddings to 2D using UMAP for visualization.
"""

import os
import sys
import numpy as np
import umap

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import EMBEDDINGS_NPY, UMAP_COORDS_NPY


def reduce_dimensions():
    print(f"Loading embeddings from: {EMBEDDINGS_NPY}")
    embeddings = np.load(EMBEDDINGS_NPY)
    print(f"Shape: {embeddings.shape}")

    print("Running UMAP (n_components=2, n_neighbors=15, min_dist=0.1, metric=cosine)...")
    reducer = umap.UMAP(
        n_components=2,
        n_neighbors=15,
        min_dist=0.1,
        metric='cosine',
        random_state=42
    )
    coords = reducer.fit_transform(embeddings)

    coords = coords.astype(np.float32)
    print(f"UMAP output shape: {coords.shape}")

    np.save(UMAP_COORDS_NPY, coords)
    print(f"Saved to: {UMAP_COORDS_NPY}")
    print("Done!")


if __name__ == '__main__':
    reduce_dimensions()
