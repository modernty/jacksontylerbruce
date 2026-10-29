"""kNN similarity edges plus the explicit relation edges.

Explicit edges use a higher weight than semantic ones. Every edge carries
a reason written from the data, not from a language model.
"""

from __future__ import annotations

from collections import Counter, defaultdict

import numpy as np

from pipeline.text import plain_text, tokens

KNN_K = 4
KNN_MIN_SIMILARITY = 0.5
EXPLICIT_WEIGHT = 1.0
SEMANTIC_WEIGHT_SCALE = 0.5

# Sample work may link to its own client and to ideas. It does not get
# explicit edges to other clients' projects. Semantic neighbours still do.
NO_PROJECT_PROJECT_EDGES = {"project:overmatch-ai"}


def build_edges(entities: list[dict], vectors: dict[str, list[float]], relations: list[dict]) -> list[dict]:
    labels = {item["id"]: item["label"] for item in entities}
    ids = [item["id"] for item in entities]
    matrix = np.asarray([vectors[item] for item in ids], dtype=np.float64)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    normal = matrix / np.clip(norms, 1e-12, None)
    similarity = normal @ normal.T

    documents = {item["id"]: tokens(plain_text(item)) for item in entities}
    document_frequency: Counter[str] = Counter()
    for words in documents.values():
        document_frequency.update(set(words))

    index = {item: position for position, item in enumerate(ids)}
    pending: dict[tuple[str, str, str], dict] = {}

    def add(kind: str, left: str, right: str, reason: str, sim: float, weight: float) -> None:
        if left == right or left not in index or right not in index:
            return
        a, b = sorted((left, right))
        key = (kind, a, b)
        slot = pending.get(key)
        rounded = float(f"{float(sim):.6f}")
        rounded_weight = float(f"{float(weight):.6f}")
        if slot is None:
            pending[key] = {
                "reasons": [reason],
                "similarity": rounded,
                "weight": rounded_weight,
            }
            return
        if reason not in slot["reasons"]:
            slot["reasons"].append(reason)
        slot["similarity"] = max(slot["similarity"], rounded)
        slot["weight"] = max(slot["weight"], rounded_weight)

    def cosine(left: str, right: str) -> float:
        return float(similarity[index[left], index[right]])

    projects = [item for item in entities if item["type"] == "project"]
    facet_keys = (
        ("clientIds", "client", "client: {name}", "same client: {name}"),
        ("toolIds", "tool", "uses tool: {name}", "same tool: {name}"),
        ("disciplineIds", "discipline", "discipline: {name}", "same discipline: {name}"),
        ("ideaIds", "idea", "idea: {name}", "same idea: {name}"),
    )
    for key, kind, direct_reason, shared_reason in facet_keys:
        buckets: dict[str, list[str]] = defaultdict(list)
        for project in projects:
            for facet_id in project.get(key) or []:
                if facet_id not in labels:
                    continue
                name = labels[facet_id]
                add(
                    kind,
                    project["id"],
                    facet_id,
                    direct_reason.format(name=name),
                    cosine(project["id"], facet_id),
                    EXPLICIT_WEIGHT,
                )
                buckets[facet_id].append(project["id"])
        for facet_id, members in buckets.items():
            name = labels[facet_id]
            ordered = sorted(set(members))
            for i, left in enumerate(ordered):
                for right in ordered[i + 1 :]:
                    if left in NO_PROJECT_PROJECT_EDGES or right in NO_PROJECT_PROJECT_EDGES:
                        continue
                    add(
                        kind,
                        left,
                        right,
                        shared_reason.format(name=name),
                        cosine(left, right),
                        EXPLICIT_WEIGHT,
                    )

    for relation in relations:
        add(
            relation["kind"],
            relation["from"],
            relation["to"],
            relation["reason"],
            cosine(relation["from"], relation["to"]),
            EXPLICIT_WEIGHT,
        )

    for row, left in enumerate(ids):
        order = np.argsort(-similarity[row], kind="mergesort")
        kept = 0
        for column in order:
            if column == row:
                continue
            sim = float(similarity[row, column])
            if sim < KNN_MIN_SIMILARITY:
                break
            right = ids[int(column)]
            shared = set(documents[left]) & set(documents[right])
            ranked = sorted(shared, key=lambda term: (document_frequency[term], term))[:3]
            if ranked:
                reason = "shared themes: " + ", ".join(ranked)
            else:
                reason = f"nearest neighbours by embedding similarity ({sim:.2f})"
            add("semantic", left, right, reason, sim, sim * SEMANTIC_WEIGHT_SCALE)
            kept += 1
            if kept >= KNN_K:
                break

    edges = []
    for (kind, left, right), slot in pending.items():
        reason = "; ".join(sorted(slot["reasons"]))
        edges.append(
            {
                "id": f"{kind}:{left}:{right}",
                "from": left,
                "to": right,
                "kind": kind,
                "weight": slot["weight"],
                "similarity": slot["similarity"],
                "reason": reason,
                "source": "computed",
            }
        )
    edges.sort(key=lambda item: item["id"])
    return edges
