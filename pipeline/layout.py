"""Seeded 3D layout, plus a separate higher-dimensional clustering space.

Cluster names are top terms from the members. Naming them with a model is
still an open decision, so the label source is a placeholder.
"""

from __future__ import annotations

import hashlib
from collections import Counter, defaultdict

import numpy as np

from pipeline.config import CLUSTER, LAYOUT_SEED, LAYOUT_UMAP
from pipeline.text import tokens

SEED = LAYOUT_SEED


def reduce_to_3d(matrix: np.ndarray, seed: int = SEED) -> np.ndarray:
    count = matrix.shape[0]
    if count < 4:
        return _svd3(matrix)
    settings = dict(LAYOUT_UMAP)
    settings["n_neighbors"] = min(int(settings["n_neighbors"]), count - 1)
    settings["random_state"] = seed
    return _umap(matrix, settings, seed)


def _svd3(matrix: np.ndarray) -> np.ndarray:
    centered = matrix - matrix.mean(axis=0, keepdims=True)
    _, _, vt = np.linalg.svd(centered, full_matrices=False)
    projected = centered @ vt[:3].T
    if projected.shape[1] < 3:
        pad = np.zeros((projected.shape[0], 3 - projected.shape[1]))
        projected = np.concatenate([projected, pad], axis=1)
    return projected


def _transform(source: np.ndarray, target: np.ndarray):
    from scipy.linalg import orthogonal_procrustes

    src_mean = source.mean(axis=0)
    tgt_mean = target.mean(axis=0)
    rotation, _ = orthogonal_procrustes(source - src_mean, target - tgt_mean)
    return src_mean, tgt_mean, rotation


def _apply(point: np.ndarray, transform) -> np.ndarray:
    src_mean, tgt_mean, rotation = transform
    return (point - src_mean) @ rotation + tgt_mean


def place(ids: list[str], matrix: np.ndarray, hashes: dict[str, str], previous, pinned: set[str], seed: int = SEED) -> dict[str, list[float]]:
    np.random.seed(seed)
    raw = reduce_to_3d(matrix, seed)
    pos = {ids[index]: raw[index].astype(np.float64) for index in range(len(ids))}
    if "origin:tyler" not in pos:
        raise RuntimeError("layout requires the Tyler origin node")

    if previous is not None:
        shared = [item for item in ids if item in previous["nodes"]]
        if len(shared) >= 2:
            source_rows = []
            target_rows = []
            for item in shared:
                source_rows.append(pos[item])
                target_rows.append(np.asarray(previous["nodes"][item]["pos"], dtype=np.float64))
                if item in pinned:
                    # Pinned nodes count double as anchors.
                    source_rows.append(pos[item])
                    target_rows.append(np.asarray(previous["nodes"][item]["pos"], dtype=np.float64))
            transform = _transform(np.vstack(source_rows), np.vstack(target_rows))
            for item in ids:
                pos[item] = _apply(pos[item], transform)
        for item in ids:
            prior = previous["nodes"].get(item)
            if prior is not None and prior.get("textHash") == hashes[item]:
                pos[item] = np.asarray(prior["pos"], dtype=np.float64)

    origin = pos["origin:tyler"]
    for item in ids:
        pos[item] = pos[item] - origin

    placed = {}
    for item in ids:
        placed[item] = [0.0 if (value := float(f"{float(coord):.6f}")) == 0 else value for coord in pos[item]]
    placed["origin:tyler"] = [0.0, 0.0, 0.0]
    return placed


def cluster_nodes(
    ids: list[str],
    matrix: np.ndarray,
    positions: dict[str, list[float]],
    plain: dict[str, str],
    types: dict[str, str] | None = None,
) -> tuple[list[dict], dict[str, str | None], dict[str, str | None]]:
    """Cluster every point except the origin.

    HDBSCAN runs on a higher-dimensional UMAP of the embeddings, not on the
    3D layout. Noise points are then soft-assigned to the nearest core
    centroid and flagged.
    """
    from sklearn.cluster import HDBSCAN

    excluded = set(CLUSTER["exclude_types"])
    usable = [item for item in ids if (types or {}).get(item, "") not in excluded and not item.startswith("origin:")]
    cluster_of: dict[str, str | None] = {item: None for item in ids}
    membership: dict[str, str | None] = {item: None for item in ids}
    if len(usable) < int(CLUSTER["min_cluster_size"]):
        return [], cluster_of, membership

    index = {item: position for position, item in enumerate(ids)}
    rows = np.asarray([matrix[index[item]] for item in usable], dtype=np.float64)
    norms = np.linalg.norm(rows, axis=1, keepdims=True)
    rows = rows / np.clip(norms, 1e-12, None)
    space = _cluster_space(rows)
    labels = HDBSCAN(
        min_cluster_size=int(CLUSTER["min_cluster_size"]),
        min_samples=int(CLUSTER["min_samples"]),
        metric=CLUSTER["hdbscan_metric"],
        cluster_selection_method=CLUSTER["cluster_selection_method"],
        copy=True,
        n_jobs=1,
    ).fit_predict(space)

    groups: dict[int, list[str]] = defaultdict(list)
    noise: list[str] = []
    for item, label in zip(usable, labels):
        if int(label) < 0:
            noise.append(item)
        else:
            groups[int(label)].append(item)
    cores = [sorted(members) for members in groups.values()]
    if not cores:
        return [], cluster_of, membership

    point = {item: space[position] for position, item in enumerate(usable)}
    centroids = [np.mean([point[item] for item in members], axis=0) for members in cores]
    soft_of: dict[str, int] = {}
    if CLUSTER["soft_assign_noise"]:
        for item in noise:
            distances = [float(np.linalg.norm(point[item] - centroid)) for centroid in centroids]
            chosen = min(
                range(len(cores)),
                key=lambda slot: (float(f"{distances[slot]:.6f}"), tuple(cores[slot])),
            )
            soft_of[item] = chosen

    clusters = []
    for slot, members in enumerate(cores):
        soft_members = sorted(item for item, owner in soft_of.items() if owner == slot)
        all_members = sorted([*members, *soft_members])
        digest = hashlib.sha256("\n".join(all_members).encode("utf-8")).hexdigest()[:8]
        cluster_id = f"cluster:{digest}"
        centroid_raw = np.mean([positions[item] for item in all_members], axis=0)
        centroid = [0.0 if (value := float(f"{float(coord):.6f}")) == 0 else value for coord in centroid_raw]
        clusters.append(
            {
                "id": cluster_id,
                "memberIds": all_members,
                "softMemberIds": soft_members,
                "centroid": centroid,
                "label": _cluster_label(all_members, plain),
                "labelSource": "placeholder",
            }
        )
        for item in members:
            cluster_of[item] = cluster_id
            membership[item] = "core"
        for item in soft_members:
            cluster_of[item] = cluster_id
            membership[item] = "soft"
    clusters.sort(key=lambda item: item["id"])
    return clusters, cluster_of, membership


def _cluster_space(matrix: np.ndarray) -> np.ndarray:
    count = matrix.shape[0]
    settings = {
        "n_components": min(int(CLUSTER["n_components"]), max(2, count - 2)),
        "n_neighbors": min(int(CLUSTER["n_neighbors"]), count - 1),
        "min_dist": float(CLUSTER["min_dist"]),
        "metric": CLUSTER["metric"],
        "init": CLUSTER["init"],
        "random_state": int(CLUSTER["random_state"]),
        "n_jobs": 1,
    }
    return _umap(matrix, settings, int(CLUSTER["random_state"]))


def _umap(matrix: np.ndarray, settings: dict, seed: int) -> np.ndarray:
    import umap

    reducer = umap.UMAP(
        n_components=int(settings["n_components"]),
        n_neighbors=int(settings["n_neighbors"]),
        min_dist=float(settings["min_dist"]),
        metric=settings["metric"],
        init=settings["init"],
        random_state=seed,
        transform_seed=seed,
        n_jobs=1,
        verbose=False,
        low_memory=False,
    )
    return np.asarray(reducer.fit_transform(matrix), dtype=np.float64)


def _cluster_label(members: list[str], plain: dict[str, str]) -> str:
    counts: Counter[str] = Counter()
    for item in members:
        counts.update(set(tokens(plain.get(item, ""))))
    ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    terms = [term for term, _ in ranked[:3]]
    if terms:
        return " · ".join(terms)
    return " · ".join(members[:3])
