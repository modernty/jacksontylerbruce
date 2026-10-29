"""Local embeddings. No API calls.

The model revision is pinned. Vectors are rounded so a cache hit and a fresh
encode produce the same map.
"""

from __future__ import annotations

import json
from pathlib import Path

from pipeline.text import text_hash

MODEL_ID = "BAAI/bge-small-en-v1.5"
MODEL_REVISION = "5c38ec7c405ec4b44b94cc5a9bb96e735b38267a"


def load_model():
    import torch
    from huggingface_hub import snapshot_download
    from sentence_transformers import SentenceTransformer

    torch.set_num_threads(1)
    torch.manual_seed(42)
    path = snapshot_download(MODEL_ID, revision=MODEL_REVISION)
    model = SentenceTransformer(path, device="cpu")
    model.eval()
    return model


def _round_vector(row) -> list[float]:
    return [0.0 if (value := float(f"{float(item):.6f}")) == 0 else value for item in row]


def encode(model, texts: list[str]) -> list[list[float]]:
    raw = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=False,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    return [_round_vector(row) for row in raw]


def embed_texts(texts: dict[str, str], cache_path: Path | None, model=None) -> dict[str, list[float]]:
    hashes = {key: text_hash(value) for key, value in texts.items()}
    cached: dict[str, list[float]] = {}
    if cache_path is not None and cache_path.exists():
        payload = json.loads(cache_path.read_text(encoding="utf-8"))
        if payload.get("model") == MODEL_ID and payload.get("revision") == MODEL_REVISION:
            cached = payload.get("entries") or {}

    missing = [key for key in sorted(texts) if hashes[key] not in cached]
    if missing:
        if model is None:
            model = load_model()
        order = sorted(texts)
        vectors = encode(model, [texts[key] for key in order])
        cached = {hashes[key]: vector for key, vector in zip(order, vectors)}
        if cache_path is not None:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_text(
                json.dumps(
                    {"model": MODEL_ID, "revision": MODEL_REVISION, "entries": cached},
                    indent=2,
                    ensure_ascii=False,
                    sort_keys=True,
                )
                + "\n",
                encoding="utf-8",
            )
    return {key: cached[hashes[key]] for key in texts}
