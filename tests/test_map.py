import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
import pytest

from pipeline.blocklist import PUBLISHED, contains_blocked
from pipeline.catalog import CONTENT_DIR
from pipeline.build import MAP_PATH, build_map
from pipeline.config import CLUSTER_COUNT_RANGE, CLUSTER_NOISE_LIMIT

HIDDEN_IDS = ("idea:directing-agents", "tool:r3f", "tool:embeddings")


def _fake_embed(texts: dict[str, str]) -> dict[str, list[float]]:
    vectors = {}
    for key, text in texts.items():
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        vec = rng.normal(size=32)
        vec = vec / np.linalg.norm(vec)
        vectors[key] = [float(f"{float(item):.6f}") for item in vec]
    return vectors


def _build(tmp: Path, content: Path | None = None, previous: Path | None = None, embed_fn=_fake_embed):
    return build_map(
        content_dir=content or CONTENT_DIR,
        map_path=tmp / "map.json",
        nodes_path=tmp / "nodes.json",
        cache_path=tmp / "cache.json",
        embeddings_path=tmp / "embeddings.bin",
        previous_map_path=previous,
        embed_fn=embed_fn,
    )


def _copy_content(tmp: Path) -> Path:
    dest = tmp / "content"
    shutil.copytree(CONTENT_DIR, dest)
    return dest


def test_fake_build_shape_origin_edges_and_exclusion(tmp_path: Path):
    document = _build(tmp_path)
    text = (tmp_path / "map.json").read_text(encoding="utf-8")
    nodes = json.loads((tmp_path / "nodes.json").read_text(encoding="utf-8"))
    assert "NEEDS TYLER" not in text
    assert not contains_blocked(text, PUBLISHED)
    assert "product designer" not in text.lower()
    assert "graduat" not in text.lower()
    for hidden in HIDDEN_IDS:
        assert hidden not in text
        assert hidden not in json.dumps(nodes)

    origin = next(node for node in document["nodes"] if node["id"] == "origin:tyler")
    assert origin["pos"] == [0.0, 0.0, 0.0]
    assert origin["title"] == "Designer / Design Director"
    assert origin["label"] == "Tyler Jackson, Designer / Design Director"
    assert document["model"] == "BAAI/bge-small-en-v1.5"
    assert document["seed"] == 42
    assert document["hash"]
    assert document["builtAt"] == document["hash"]

    assert document["edges"]
    assert all(edge["reason"].strip() for edge in document["edges"])
    assert all(edge["source"] == "computed" for edge in document["edges"])
    manual = [
        edge
        for edge in document["edges"]
        if edge["kind"] == "manual"
        and {edge["from"], edge["to"]} == {"project:usm-milan-2025", "project:usm-venice-2025"}
    ]
    assert len(manual) == 1
    assert "Venice" in manual[0]["reason"]
    explicit = [edge for edge in document["edges"] if edge["kind"] != "semantic"]
    semantic = [edge for edge in document["edges"] if edge["kind"] == "semantic"]
    if semantic:
        assert max(edge["weight"] for edge in explicit) > max(edge["weight"] for edge in semantic)

    ids = {node["id"] for node in document["nodes"]}
    for edge in document["edges"]:
        assert edge["from"] in ids
        assert edge["to"] in ids
    print(
        "FAKE_COUNTS "
        f"nodes={document['counts']['nodes']} edges={document['counts']['edges']} "
        f"clusters={document['counts']['clusters']} placeholders={document['placeholderCount']}"
    )


def test_determinism_and_procrustes_stability(tmp_path: Path):
    first = _build(tmp_path / "a")
    second = _build(tmp_path / "b")
    assert (tmp_path / "a" / "map.json").read_bytes() == (tmp_path / "b" / "map.json").read_bytes()

    again = _build(tmp_path / "c", previous=tmp_path / "a" / "map.json")
    assert (tmp_path / "c" / "map.json").read_bytes() == (tmp_path / "a" / "map.json").read_bytes()

    content = _copy_content(tmp_path)
    projects_path = content / "projects.json"
    projects = json.loads(projects_path.read_text(encoding="utf-8"))
    changed = None
    for project in projects:
        if project["slug"] == "intuit":
            project["summary"] = project["summary"] + " Extra sentence about the wallet flow."
            changed = "project:intuit"
    assert changed
    projects_path.write_text(json.dumps(projects), encoding="utf-8")
    moved = _build(tmp_path / "d", content=content, previous=tmp_path / "a" / "map.json")

    before = {node["id"]: node for node in first["nodes"]}
    after = {node["id"]: node for node in moved["nodes"]}
    assert before[changed]["textHash"] != after[changed]["textHash"]
    width = _width(before)
    threshold = 0.02 * width
    worst = 0.0
    for node_id, node in before.items():
        if node_id == changed or node_id not in after:
            continue
        worst = max(worst, _distance(node["pos"], after[node_id]["pos"]))
    print(f"PROCRUSTES worst={worst:.6f} width={width:.6f} threshold={threshold:.6f}")
    assert worst <= threshold + 1e-9
    assert after["origin:tyler"]["pos"] == [0.0, 0.0, 0.0]


def _width(nodes: dict) -> float:
    coords = [node["pos"] for node in nodes.values()]
    spans = []
    for axis in range(3):
        column = [point[axis] for point in coords]
        spans.append(max(column) - min(column))
    return max(spans) or 1.0


def _distance(left, right) -> float:
    return float(sum((a - b) ** 2 for a, b in zip(left, right)) ** 0.5)


def assert_cluster_band(document: dict) -> None:
    low, high = CLUSTER_COUNT_RANGE
    clusters = document["clusters"]
    assert low <= len(clusters) <= high
    nodes = [node for node in document["nodes"] if node["type"] != "origin"]
    noise = [node for node in nodes if not node.get("clusterId")]
    assert len(noise) / len(nodes) < CLUSTER_NOISE_LIMIT
    origin = next(node for node in document["nodes"] if node["id"] == "origin:tyler")
    assert origin.get("clusterId") is None
    assert origin.get("clusterMembership") is None
    for cluster in clusters:
        assert cluster["labelSource"] == "placeholder"
        assert origin["id"] not in cluster["memberIds"]
        for member in cluster["softMemberIds"]:
            node = next(item for item in document["nodes"] if item["id"] == member)
            assert node["clusterMembership"] == "soft"
            assert node["clusterId"] == cluster["id"]
    print(
        "CLUSTERS "
        f"count={len(clusters)} "
        f"sizes={[len(cluster['memberIds']) for cluster in clusters]} "
        f"noise={len(noise)} soft={document['counts'].get('clusterSoft')}"
    )


def test_overmatch_has_no_explicit_edges_to_other_clients(tmp_path: Path):
    document = _build(tmp_path)
    project_id = "project:overmatch-ai"
    client_id = "client:overmatch-ai"
    types = {node["id"]: node["type"] for node in document["nodes"]}
    explicit = {"client", "tool", "discipline", "idea", "manual"}
    idea_reasons = []
    for edge in document["edges"]:
        if edge["kind"] not in explicit:
            continue
        ends = {edge["from"], edge["to"]}
        if project_id not in ends and client_id not in ends:
            continue
        if ends == {project_id, client_id}:
            assert edge["kind"] == "client"
            continue
        if project_id in ends:
            other = (ends - {project_id}).pop()
            assert types[other] == "idea"
            assert edge["kind"] == "idea"
            idea_reasons.append(edge["reason"])
            continue
        raise AssertionError(edge)
    assert any("Dynamic objective-specific plans" in reason for reason in idea_reasons)
    assert any("Trust and verifiable reasoning" in reason for reason in idea_reasons)
    node = next(item for item in document["nodes"] if item["id"] == project_id)
    assert not contains_blocked(json.dumps(node))
    assert node["summary"].startswith("Sample work in progress:")


def test_published_map_cluster_band():
    document = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    assert_cluster_band(document)


@pytest.fixture(scope="session")
def real_model():
    from pipeline.embed import load_model

    return load_model()


def test_real_model_is_deterministic_and_stable(tmp_path: Path, real_model):
    def embed(texts):
        from pipeline.embed import embed_texts

        return embed_texts(texts, cache_path=None, model=real_model)

    first_dir = tmp_path / "real-a"
    second_dir = tmp_path / "real-b"
    first = build_map(
        map_path=first_dir / "map.json",
        nodes_path=first_dir / "nodes.json",
        cache_path=None,
        embeddings_path=first_dir / "embeddings.bin",
        previous_map_path=None,
        embed_fn=embed,
    )
    second = build_map(
        map_path=second_dir / "map.json",
        nodes_path=second_dir / "nodes.json",
        cache_path=None,
        embeddings_path=second_dir / "embeddings.bin",
        previous_map_path=None,
        embed_fn=embed,
    )
    assert (first_dir / "map.json").read_bytes() == (second_dir / "map.json").read_bytes()

    content = _copy_content(tmp_path)
    projects = json.loads((content / "projects.json").read_text(encoding="utf-8"))
    for project in projects:
        if project["slug"] == "novart":
            project["summary"] = project["summary"] + " One added public sentence."
    (content / "projects.json").write_text(json.dumps(projects), encoding="utf-8")
    moved = build_map(
        content_dir=content,
        map_path=tmp_path / "real-c" / "map.json",
        nodes_path=tmp_path / "real-c" / "nodes.json",
        cache_path=None,
        embeddings_path=tmp_path / "real-c" / "embeddings.bin",
        previous_map_path=first_dir / "map.json",
        embed_fn=embed,
    )
    before = {node["id"]: node["pos"] for node in first["nodes"]}
    after = {node["id"]: node["pos"] for node in moved["nodes"]}
    width = _width({key: {"pos": value} for key, value in before.items()})
    worst = max(
        _distance(before[key], after[key])
        for key in before
        if key != "project:novart" and key in after
    )
    print(
        "REAL_COUNTS "
        f"nodes={first['counts']['nodes']} edges={first['counts']['edges']} "
        f"clusters={first['counts']['clusters']} placeholders={first['placeholderCount']} "
        f"projects={first['counts']['projects']} ideas={first['counts']['ideas']} "
        f"tools={first['counts']['tools']} clients={first['counts']['clients']} "
        f"disciplines={first['counts']['disciplines']} origin={first['counts']['origin']}"
    )
    print(f"REAL_PROCRUSTES worst={worst:.6f} width={width:.6f}")
    assert worst <= 0.02 * width + 1e-9
    assert after["origin:tyler"] == [0.0, 0.0, 0.0]
    assert any(edge["kind"] == "semantic" for edge in first["edges"])
    assert_cluster_band(first)
    assert second["hash"] == first["hash"]
