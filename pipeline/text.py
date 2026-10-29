"""One text template for every node.

The field order is fixed. A blank value means the seed was empty or still
says NEEDS TYLER. The hash is of this text, so a position change means the
text changed.
"""

from __future__ import annotations

import hashlib
import re

TEMPLATE_KEYS = (
    "type",
    "label",
    "title",
    "summary",
    "body",
    "year",
    "role",
    "staffing",
    "archived",
    "clients",
    "disciplines",
    "tools",
    "ideas",
    "awards",
    "metrics",
    "aliases",
)

_TOKEN = re.compile(r"[a-z0-9][a-z0-9+'-]*")
STOPWORDS = {
    "a",
    "an",
    "the",
    "of",
    "and",
    "or",
    "to",
    "for",
    "in",
    "on",
    "with",
    "from",
    "by",
    "at",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "this",
    "that",
    "it",
    "its",
    "their",
    "his",
    "her",
    "our",
    "into",
    "over",
    "without",
    "within",
    "across",
    "per",
    "not",
    "than",
    "then",
    "also",
    "its",
    "via",
}


def render(entity: dict, labels: dict[str, str]) -> str:
    fields = {
        "type": entity.get("type") or "",
        "label": entity.get("label") or "",
        "title": entity.get("title") or "",
        "summary": entity.get("summary") or "",
        "body": entity.get("body") or "",
        "year": entity.get("year") or "",
        "role": entity.get("role") or "",
        "staffing": entity.get("staffing") or "",
        "archived": "archived" if entity.get("archived") else "",
        "clients": ", ".join(labels[item] for item in entity.get("clientIds") or []),
        "disciplines": ", ".join(labels[item] for item in entity.get("disciplineIds") or []),
        "tools": ", ".join(labels[item] for item in entity.get("toolIds") or []),
        "ideas": ", ".join(labels[item] for item in entity.get("ideaIds") or []),
        "awards": entity.get("awardsText") or "",
        "metrics": entity.get("metrics") or "",
        "aliases": ", ".join(entity.get("aliases") or []),
    }
    return "".join(f"{key}: {fields[key]}\n" for key in TEMPLATE_KEYS)


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def plain_text(entity: dict) -> str:
    parts = [
        entity.get("label") or "",
        entity.get("summary") or "",
        entity.get("role") or "",
        entity.get("metrics") or "",
        entity.get("awardsText") or "",
        " ".join(entity.get("aliases") or []),
    ]
    return " ".join(part for part in parts if part)


def tokens(text: str) -> list[str]:
    found = []
    for token in _TOKEN.findall(text.lower()):
        if len(token) < 2 or token in STOPWORDS or token.isdigit():
            continue
        found.append(token)
    return found
