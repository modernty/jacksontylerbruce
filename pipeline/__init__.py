"""Local semantic-map build. Imported before numpy so thread caps stick."""

import os
from pathlib import Path

os.environ.setdefault("PYTHONHASHSEED", "0")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("NUMBA_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

_ROOT = Path(__file__).resolve().parents[1]
ROOT_MODELS = _ROOT / "data" / "engine" / "models"
os.environ.setdefault("HF_HOME", str(ROOT_MODELS))
os.environ.setdefault("HUGGINGFACE_HUB_CACHE", str(ROOT_MODELS))
