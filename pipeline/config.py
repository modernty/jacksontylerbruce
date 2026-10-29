"""Build parameters. The 3D layout and the cluster space are separate reductions."""

LAYOUT_SEED = 42

# 3D map. Not used for clustering.
LAYOUT_UMAP = {
    "n_components": 3,
    "n_neighbors": 8,
    "min_dist": 0.1,
    "metric": "cosine",
    "init": "pca",
    "random_state": LAYOUT_SEED,
    "n_jobs": 1,
}

# Chosen after a seeded sweep (see the phase notes). Clustering runs in this
# space, then HDBSCAN. The origin is left out. Leftover noise is soft-assigned
# to the nearest core centroid.
CLUSTER = {
    "space": "umap",
    "n_components": 15,
    "n_neighbors": 12,
    "min_dist": 0.1,
    "metric": "cosine",
    "init": "pca",
    "random_state": LAYOUT_SEED,
    # 4 split into 11 clusters after the Overmatch idea links. 5 stays in range.
    "min_cluster_size": 5,
    "min_samples": 1,
    "cluster_selection_method": "eom",
    "hdbscan_metric": "euclidean",
    "exclude_types": ["origin"],
    "soft_assign_noise": True,
}

# Published clusters should land in this band, with little leftover noise.
CLUSTER_COUNT_RANGE = (5, 9)
CLUSTER_NOISE_LIMIT = 0.10
