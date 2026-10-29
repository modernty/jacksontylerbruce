"""SHA-256 digests checked before public text is written.

Digests are lowercase hex. The matcher hashes tokens; this module stores no source terms.
BLOCKLIST is the full set. PUBLISHED is the subset checked on every public file.
"""

import hashlib
import re

_TOKEN = re.compile(r"[a-z0-9]+")
_URL = re.compile(r"https?://[^\s<>\"']+", re.IGNORECASE)

BLOCKLIST = frozenset({
    "1b0b7e51ee5d8e25cc87c83d5b4fbe933d91e1a70f7ee27d98be29c348b04950",
    "1b112ee7d79cd37d93b3938f69b6d8209990b9dd96994a26e62d76ed1a34cca9",
    "71d7575667922ac5c970baaee34eedd23815ef5a0608db867cd49a9c25686577",
    "8be464106f2d6f1eabe7ff36c3e84d5eae6c5c24870887d7155640193af12545",
    "94cf3858beeb446a763d03b7d9180263e88cee425868a4bfca826879e16457a3",
    "c0fa256940a6b1be495b94822c9622931bfcd11dd42e818c600ec36aade2af1a",
    "e342afe5bdfedc90c2531e69ffa98768427d86212deab8abd2818da8997b5b13",
})

PUBLISHED = frozenset({
    "71d7575667922ac5c970baaee34eedd23815ef5a0608db867cd49a9c25686577",
    "8be464106f2d6f1eabe7ff36c3e84d5eae6c5c24870887d7155640193af12545",
    "94cf3858beeb446a763d03b7d9180263e88cee425868a4bfca826879e16457a3",
    "c0fa256940a6b1be495b94822c9622931bfcd11dd42e818c600ec36aade2af1a",
    "e342afe5bdfedc90c2531e69ffa98768427d86212deab8abd2818da8997b5b13",
})


def _host_labels(url: str) -> list[str]:
    rest = url.split("://", 1)[1]
    host = rest.split("/", 1)[0].split("?", 1)[0].split("#", 1)[0]
    host = host.rsplit("@", 1)[-1]
    if host.startswith("["):
        return []
    host = host.split(":", 1)[0]
    return [label for label in host.lower().split(".") if label]


def candidate_terms(text: str) -> set[str]:
    """Lowercase tokens, whole hostname labels, and joins of two adjacent tokens."""
    pieces = _TOKEN.findall(text.lower())
    terms = set(pieces)
    terms.update(left + right for left, right in zip(pieces, pieces[1:]))
    for url in _URL.findall(text):
        for label in _host_labels(url):
            terms.add(label)
            label_pieces = _TOKEN.findall(label)
            terms.update(label_pieces)
            terms.update(left + right for left, right in zip(label_pieces, label_pieces[1:]))
    terms.discard("")
    return terms


def _digest(term: str) -> str:
    return hashlib.sha256(term.encode("utf-8")).hexdigest()


def contains_blocked(text: str, digests: frozenset[str] | None = None) -> bool:
    banned = BLOCKLIST if digests is None else digests
    if not text or not banned:
        return False
    return any(_digest(term) in banned for term in candidate_terms(text))
