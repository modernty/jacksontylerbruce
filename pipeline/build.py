"""Build public/map.json from the typed seed.

One command, from the repo root:

    uv run python -m pipeline.build
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata as metadata
import json
import math
from pathlib import Path

import numpy as np

from pipeline.catalog import (
    CONTENT_DIR,
    CatalogError,
    export_public,
    load_catalog,
    scan_public,
    validate,
)
from pipeline.embed import MODEL_ID, MODEL_REVISION, embed_texts
from pipeline.graph import (
    EXPLICIT_WEIGHT,
    KNN_K,
    KNN_MIN_SIMILARITY,
    SEMANTIC_WEIGHT_SCALE,
    build_edges,
)
from pipeline.config import CLUSTER, CLUSTER_NOISE_LIMIT, LAYOUT_SEED, LAYOUT_UMAP
from pipeline.layout import SEED, cluster_nodes, place
from pipeline.schema import MapDocument
from pipeline.text import plain_text, render, text_hash

ROOT = Path(__file__).resolve().parents[1]
MAP_PATH = ROOT / "public" / "map.json"
NODES_PATH = ROOT / "data" / "engine" / "nodes.json"
CACHE_PATH = ROOT / "data" / "engine" / "embedding-cache.json"
EMBEDDINGS_PATH = ROOT / "data" / "engine" / "embeddings.bin"


def _version(name: str) -> str:
    try:
        return metadata.version(name)
    except metadata.PackageNotFoundError:
        return "not-installed"


def params() -> dict:
    return {
        "umap": dict(LAYOUT_UMAP),
        "procrustes": "orthogonal",
        "unchangedNodes": "keep previous position",
        "hdbscan": {
            **CLUSTER,
            "input": "umap-of-embeddings",
            "labelSource": "placeholder",
            "noiseLimit": CLUSTER_NOISE_LIMIT,
            "layoutSeed": LAYOUT_SEED,
        },
        "knn": {
            "k": KNN_K,
            "min_similarity": KNN_MIN_SIMILARITY,
            "explicitWeight": EXPLICIT_WEIGHT,
            "semanticWeightScale": SEMANTIC_WEIGHT_SCALE,
        },
        "floatPrecision": 6,
        "embeddingOrder": "sorted-node-id",
        "versions": {
            "numpy": _version("numpy"),
            "scipy": _version("scipy"),
            "scikit-learn": _version("scikit-learn"),
            "umap-learn": _version("umap-learn"),
            "sentence-transformers": _version("sentence-transformers"),
            "torch": _version("torch"),
            "pydantic": _version("pydantic"),
        },
    }


def _content_hash(texts: dict[str, str]) -> str:
    payload = "\n".join(f"{key}\n{texts[key]}" for key in sorted(texts))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _read_previous(path: Path | None):
    if path is None or not path.exists():
        return None
    document = json.loads(path.read_text(encoding="utf-8"))
    return {
        "hash": document.get("hash"),
        "alignedTo": document.get("alignedTo"),
        "nodes": {node["id"]: node for node in document.get("nodes", [])},
    }


def _sanitize(value):
    if isinstance(value, float):
        if not math.isfinite(value):
            raise CatalogError([f"non-finite float {value}"])
        rounded = float(f"{value:.6f}")
        return 0.0 if rounded == 0 else rounded
    if isinstance(value, np.floating):
        return _sanitize(float(value))
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, dict):
        return {key: _sanitize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize(item) for item in value]
    if value is None or isinstance(value, (str, int, bool)):
        return value
    raise CatalogError([f"cannot serialize {type(value).__name__}"])


def dump_json(path: Path, data) -> str:
    text = json.dumps(
        _sanitize(data),
        indent=2,
        ensure_ascii=False,
        sort_keys=True,
        allow_nan=False,
    )
    text += "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return text


def _map_node(
    entity: dict,
    digest: str,
    pos: list[float],
    cluster_id: str | None,
    membership: str | None,
) -> dict:
    node = {
        "archived": bool(entity.get("archived")),
        "body": entity.get("body") or "",
        "clusterId": cluster_id,
        "confidential": False,
        "id": entity["id"],
        "label": entity["label"],
        "pos": pos,
        "slug": entity["slug"],
        "summary": entity.get("summary") or "",
        "textHash": digest,
        "type": entity["type"],
        "visible": True,
    }
    if membership:
        node["clusterMembership"] = membership
    if entity["type"] == "origin":
        node["title"] = entity["title"]
    if entity["type"] == "project":
        node["clientIds"] = entity["clientIds"]
        node["disciplineIds"] = entity["disciplineIds"]
        node["featured"] = bool(entity.get("featured"))
        node["ideaIds"] = entity["ideaIds"]
        node["patternIdeaIds"] = entity.get("patternIdeaIds") or []
        node["toolIds"] = entity["toolIds"]
        node["weight"] = entity["weight"]
        if entity.get("status"):
            node["status"] = entity["status"]
        if entity.get("patterns"):
            node["patterns"] = entity["patterns"]
        for key in ("year", "role", "demo", "preview", "url", "metrics", "teamSize"):
            value = entity.get(key)
            if value not in (None, ""):
                node[key] = value
        if entity.get("aliases"):
            node["aliases"] = entity["aliases"]
        if entity.get("awards"):
            node["awards"] = entity["awards"]
        if entity.get("staffing"):
            node["staffing"] = entity["staffing"]
    if entity["type"] == "client" and entity.get("aliases"):
        node["aliases"] = entity["aliases"]
    return node


def _facets(public: dict) -> list[dict]:
    projects = public["projects"]
    facets = []
    groups = (
        ("client", public["clients"]),
        ("tool", public["tools"]),
        ("discipline", public["disciplines"]),
        ("idea", public["ideas"]),
    )
    key = {
        "client": "clientIds",
        "tool": "toolIds",
        "discipline": "disciplineIds",
        "idea": "ideaIds",
    }
    for kind, rows in groups:
        field = key[kind]
        for row in rows:
            facets.append(
                {
                    "id": row["id"],
                    "kind": kind,
                    "slug": row["slug"],
                    "label": row["label"],
                    "projectIds": sorted(
                        project["id"] for project in projects if row["id"] in project[field]
                    ),
                }
            )
    years: dict[str, list[str]] = {}
    for project in projects:
        year = project.get("year") or ""
        if not year:
            continue
        years.setdefault(year, []).append(project["id"])
    for year, members in years.items():
        slug = "".join(char.lower() if char.isalnum() else "-" for char in year).strip("-")
        facets.append(
            {
                "id": f"year:{slug}",
                "kind": "year",
                "slug": slug,
                "label": year,
                "projectIds": sorted(members),
            }
        )
    facets.sort(key=lambda item: item["id"])
    return facets


def _counts(entities: list[dict], edges: list[dict], clusters: list[dict], placeholders: int) -> dict:
    counts = {
        "clusters": len(clusters),
        "edges": len(edges),
        "nodes": len(entities),
        "origin": 0,
        "placeholders": placeholders,
    }
    for entity in entities:
        counts[entity["type"] + "s"] = counts.get(entity["type"] + "s", 0) + 1
    if "origins" in counts:
        counts["origin"] = counts.pop("origins")
    return counts


def build_map(
    content_dir: Path | None = None,
    map_path: Path = MAP_PATH,
    nodes_path: Path = NODES_PATH,
    cache_path: Path | None = CACHE_PATH,
    embeddings_path: Path | None = EMBEDDINGS_PATH,
    previous_map_path: Path | None = None,
    model=None,
    embed_fn=None,
) -> dict:
    catalog = load_catalog(content_dir)
    report = validate(catalog)
    if report.errors:
        raise CatalogError(report.errors)
    public = export_public(catalog)
    labels = {item["id"]: item["label"] for item in public["entities"]}
    texts = {item["id"]: render(item, labels) for item in public["entities"]}
    hashes = {key: text_hash(value) for key, value in texts.items()}
    if embed_fn is not None:
        vectors = embed_fn(texts)
    else:
        vectors = embed_texts(texts, cache_path, model=model)

    content_hash = _content_hash(texts)
    previous = _read_previous(previous_map_path)
    if previous is None:
        aligned_to = None
    elif previous.get("hash") == content_hash:
        aligned_to = previous.get("alignedTo")
    else:
        aligned_to = previous.get("hash")

    ids = sorted(texts)
    matrix = np.asarray([vectors[item] for item in ids], dtype=np.float64)
    pinned = {item.target for item in catalog.overrides if item.op == "pin"}
    positions = place(ids, matrix, hashes, previous, pinned, SEED)
    plain = {item["id"]: plain_text(item) for item in public["entities"]}
    types = {item["id"]: item["type"] for item in public["entities"]}
    clusters, cluster_of, membership = cluster_nodes(ids, matrix, positions, plain, types)
    edges = build_edges(public["entities"], vectors, public["relations"])
    nodes = [
        _map_node(
            item,
            hashes[item["id"]],
            positions[item["id"]],
            cluster_of[item["id"]],
            membership[item["id"]],
        )
        for item in public["entities"]
    ]
    nodes.sort(key=lambda item: item["id"])
    counts = _counts(public["entities"], edges, clusters, report.placeholder_count)
    clustered = [node for node in nodes if node["type"] != "origin"]
    counts["clusterNoise"] = sum(1 for node in clustered if not node.get("clusterId"))
    counts["clusterSoft"] = sum(1 for node in clustered if node.get("clusterMembership") == "soft")
    document = {
        "alignedTo": aligned_to,
        "builtAt": content_hash,
        "clusters": clusters,
        "counts": counts,
        "edges": edges,
        "facets": _facets(public),
        "hash": content_hash,
        "model": MODEL_ID,
        "modelRevision": MODEL_REVISION,
        "nodes": nodes,
        "params": params(),
        "placeholderCount": report.placeholder_count,
        "seed": SEED,
        "version": 1,
    }
    MapDocument.model_validate(document)
    rendered_nodes = {
        "clients": public["clients"],
        "disciplines": public["disciplines"],
        "ideas": public["ideas"],
        "origin": public["origin"],
        "placeholderCount": report.placeholder_count,
        "projects": public["projects"],
        "relations": public["relations"],
        "tools": public["tools"],
        "version": 1,
    }
    map_text = json.dumps(_sanitize(document), indent=2, ensure_ascii=False, sort_keys=True, allow_nan=False) + "\n"
    nodes_text = json.dumps(
        _sanitize(rendered_nodes), indent=2, ensure_ascii=False, sort_keys=True, allow_nan=False
    ) + "\n"
    problems = scan_public(map_text) + scan_public(nodes_text)
    if problems:
        raise CatalogError(problems)

    map_path.parent.mkdir(parents=True, exist_ok=True)
    nodes_path.parent.mkdir(parents=True, exist_ok=True)
    map_path.write_text(map_text, encoding="utf-8")
    nodes_path.write_text(nodes_text, encoding="utf-8")
    if embeddings_path is not None:
        embeddings_path.parent.mkdir(parents=True, exist_ok=True)
        with embeddings_path.open("wb") as handle:
            np.save(handle, matrix.astype(np.float32))
    return document


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Build the portfolio semantic map.")
    parser.add_argument("--content", type=Path, default=CONTENT_DIR)
    parser.add_argument("--map", type=Path, default=MAP_PATH)
    parser.add_argument("--nodes", type=Path, default=NODES_PATH)
    parser.add_argument("--cache", type=Path, default=CACHE_PATH)
    parser.add_argument("--embeddings", type=Path, default=EMBEDDINGS_PATH)
    parser.add_argument("--previous", type=Path, default=None)
    args = parser.parse_args(argv)
    previous = args.previous
    if previous is None and args.map.exists():
        previous = args.map
    document = build_map(
        content_dir=args.content,
        map_path=args.map,
        nodes_path=args.nodes,
        cache_path=args.cache,
        embeddings_path=args.embeddings,
        previous_map_path=previous,
    )
    counts = document["counts"]
    print(f"model: {document['model']}@{document['modelRevision']}")
    print(f"hash: {document['hash']}")
    print(f"placeholders: {document['placeholderCount']}")
    print(
        "nodes: {nodes}  projects: {projects}  ideas: {ideas}  tools: {tools}  "
        "clients: {clients}  disciplines: {disciplines}  origin: {origin}".format(**counts)
    )
    sizes = ", ".join(str(len(cluster["memberIds"])) for cluster in document["clusters"])
    print(f"edges: {counts['edges']}")
    print(
        f"clusters: {counts['clusters']} sizes=[{sizes}] "
        f"noise={counts['clusterNoise']} soft={counts['clusterSoft']}"
    )
    print(f"wrote {args.map}")


if __name__ == "__main__":
    main()
