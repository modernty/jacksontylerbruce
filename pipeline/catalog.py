"""Load the typed seed, validate it, and build the public export.

Hidden and confidential rows stay in the seed so the exclusion test has
something to drop. Placeholder strings stay in the seed too; the public
export treats them as missing.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from pydantic import TypeAdapter

from pipeline.blocklist import BLOCKLIST, PUBLISHED, contains_blocked
from pipeline.schema import (
    Client,
    Discipline,
    Idea,
    Origin,
    Override,
    Project,
    Relation,
    Tool,
)

ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT / "content"
PLACEHOLDER = "NEEDS TYLER"

# Any spelling of the title: spaces, hyphens, or closed up, singular or plural.
FORBIDDEN_TITLE = re.compile(r"product[\s-]*designers?", re.IGNORECASE)
TEAM_PHRASING = re.compile(r"my team|design team|\bthe team\b", re.IGNORECASE)
GRADUATION = re.compile(r"graduat", re.IGNORECASE)
YEAR_RANGE = re.compile(
    r"^(\d{4})(?:\s*[\u2010\u2011\u2012\u2013\u2014-]\s*(\d{4}))?$"
)
MONTH_POINT = re.compile(r"^(\d{4})-(\d{2})$")
YEAR_POINT = re.compile(r"^(\d{4})$")

# Tyler confirmed these overlaps. They are real and must not be reported
# as date errors. Same-client overlaps are allowed separately.
CONFIRMED_OVERLAPS = (
    frozenset({"project:novart", "project:jet-protocol"}),
    frozenset({"project:chatter", "project:model-playground"}),
)

ORIGIN_TITLE = "Designer / Design Director"
ALLOWED_TITLES = {"Designer", "Design Director", ORIGIN_TITLE}


class CatalogError(Exception):
    def __init__(self, errors: list[str]):
        super().__init__("\n".join(errors))
        self.errors = errors


@dataclass
class Catalog:
    projects: list[Project]
    clients: list[Client]
    tools: list[Tool]
    ideas: list[Idea]
    disciplines: list[Discipline]
    origin: Origin
    relations: list[Relation]
    overrides: list[Override]


@dataclass
class Validation:
    errors: list[str] = field(default_factory=list)
    placeholder_count: int = 0
    overlaps: list[tuple[str, str]] = field(default_factory=list)


def _read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_catalog(content_dir: Path | None = None) -> Catalog:
    directory = content_dir or CONTENT_DIR
    return Catalog(
        projects=TypeAdapter(list[Project]).validate_python(_read(directory / "projects.json")),
        clients=TypeAdapter(list[Client]).validate_python(_read(directory / "clients.json")),
        tools=TypeAdapter(list[Tool]).validate_python(_read(directory / "tools.json")),
        ideas=TypeAdapter(list[Idea]).validate_python(_read(directory / "ideas.json")),
        disciplines=TypeAdapter(list[Discipline]).validate_python(
            _read(directory / "disciplines.json")
        ),
        origin=Origin.model_validate(_read(directory / "origin.json")),
        relations=TypeAdapter(list[Relation]).validate_python(_read(directory / "relations.json")),
        overrides=TypeAdapter(list[Override]).validate_python(_read(directory / "overrides.json")),
    )


def _strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from _strings(item)
    elif isinstance(value, (list, tuple)):
        for item in value:
            yield from _strings(item)


def count_placeholders(catalog: Catalog) -> int:
    payload = {
        "projects": [item.model_dump() for item in catalog.projects],
        "clients": [item.model_dump() for item in catalog.clients],
        "tools": [item.model_dump() for item in catalog.tools],
        "ideas": [item.model_dump() for item in catalog.ideas],
        "disciplines": [item.model_dump() for item in catalog.disciplines],
        "origin": catalog.origin.model_dump(),
        "relations": [item.model_dump(by_alias=True) for item in catalog.relations],
        "overrides": [item.model_dump() for item in catalog.overrides],
    }
    return sum(1 for text in _strings(payload) if PLACEHOLDER in text)


def clean_text(value: str | None) -> str | None:
    """A field that still says NEEDS TYLER is missing, not copy."""
    if value is None or PLACEHOLDER in value:
        return None
    return value


def is_public(item) -> bool:
    return bool(item.visible) and not bool(item.confidential)


def _point(value: str | None, *, end: bool) -> float | None:
    if value is None or PLACEHOLDER in value:
        return None
    month = MONTH_POINT.fullmatch(value.strip())
    if month:
        year = int(month.group(1))
        number = int(month.group(2))
        if not 1 <= number <= 12:
            return None
        # End is the close of that month. Start is the open of it.
        return year + (number / 12.0 if end else (number - 1) / 12.0)
    year = YEAR_POINT.fullmatch(value.strip())
    if year:
        number = int(year.group(1))
        return float(number + 1) if end else float(number)
    return None


def span_of(project) -> tuple[float, float] | None:
    """Inclusive-exclusive year span. Month precision wins over a year label."""
    if getattr(project, "start", None) or getattr(project, "end", None):
        start = _point(project.start, end=False)
        end = _point(project.end, end=True)
        if start is None and project.start is None and project.year:
            parsed = span_of_year(project.year)
            start = parsed[0] if parsed else None
        if end is None and project.end is None and project.year:
            parsed = span_of_year(project.year)
            end = parsed[1] if parsed else None
        if start is None or end is None or end <= start:
            return None
        return (start, end)
    return span_of_year(getattr(project, "year", None))


def span_of_year(year: str | None) -> tuple[float, float] | None:
    if year is None or PLACEHOLDER in year:
        return None
    match = YEAR_RANGE.fullmatch(year.strip())
    if not match:
        return None
    start = int(match.group(1))
    end = int(match.group(2) or match.group(1))
    if end < start:
        return None
    return (float(start), float(end) + 1.0)


def overlapping_pairs(projects) -> list[tuple[object, object]]:
    dated = []
    for project in projects:
        if not is_public(project):
            continue
        span = span_of(project)
        if span is not None:
            dated.append((project, span))
    found = []
    for index, (left, left_span) in enumerate(dated):
        for right, right_span in dated[index + 1 :]:
            if left_span[0] < right_span[1] and right_span[0] < left_span[1]:
                found.append((left, right))
    found.sort(key=lambda pair: (pair[0].id, pair[1].id))
    return found


def _client_ids(project) -> set[str]:
    return set(project.clientIds)


def pair_allowed(left, right, extra_allow: set[frozenset[str]] | None = None) -> bool:
    ids = frozenset({left.id, right.id})
    if ids in CONFIRMED_OVERLAPS or (extra_allow and ids in extra_allow):
        return True
    left_clients = _client_ids(left)
    right_clients = _client_ids(right)
    if left_clients & right_clients:
        return True
    chatter = "client:chatter"
    lazarus = "client:lazarus"
    if (chatter in left_clients and lazarus in right_clients) or (
        lazarus in left_clients and chatter in right_clients
    ):
        return True
    nax = "client:nax-group"
    jet = "client:jet"
    if (nax in left_clients and jet in right_clients) or (
        jet in left_clients and nax in right_clients
    ):
        return True
    return False


def overlap_errors(projects, *, strict: bool, extra_allow: set[frozenset[str]] | None = None) -> list[str]:
    """Strict mode flags cross-client overlaps that Tyler has not allowed.

    The production validator does not fail the build on other coarse
    overlaps (a year label is not a conflict). It does fail if a confirmed
    pair is missing or is itself flagged.
    """
    if not strict:
        return []
    errors = []
    for left, right in overlapping_pairs(projects):
        if pair_allowed(left, right, extra_allow):
            continue
        errors.append(f"date overlap {left.id} {right.id}")
    return errors


def _index(items) -> dict[str, object]:
    found = {}
    for item in items:
        if item.id in found:
            raise CatalogError([f"duplicate id {item.id}"])
        found[item.id] = item
    return found


def validate(catalog: Catalog) -> Validation:
    result = Validation(placeholder_count=count_placeholders(catalog))
    by_id: dict[str, object] = {}
    groups = (
        catalog.projects,
        catalog.clients,
        catalog.tools,
        catalog.ideas,
        catalog.disciplines,
    )
    try:
        for group in groups:
            by_id.update(_index(group))
    except CatalogError as exc:
        result.errors.extend(exc.errors)
        return result
    if catalog.origin.id in by_id:
        result.errors.append("origin id collides with another row")
    by_id[catalog.origin.id] = catalog.origin

    if catalog.origin.title not in ALLOWED_TITLES:
        result.errors.append(
            f"origin title {catalog.origin.title!r} is not an allowed title"
        )
    if catalog.origin.title != ORIGIN_TITLE:
        result.errors.append(
            f"origin title must be {ORIGIN_TITLE!r}, got {catalog.origin.title!r}"
        )
    if FORBIDDEN_TITLE.search(catalog.origin.title) or FORBIDDEN_TITLE.search(catalog.origin.label):
        result.errors.append("origin title uses the forbidden wording")
    if not catalog.origin.visible or catalog.origin.confidential:
        result.errors.append("origin must be visible and not confidential")
    for withheld in catalog.origin.withheld:
        if withheld.public:
            result.errors.append(f"withheld field {withheld.field} is marked public")

    clients = {item.id for item in catalog.clients}
    tools = {item.id for item in catalog.tools}
    ideas = {item.id for item in catalog.ideas}
    disciplines = {item.id for item in catalog.disciplines}

    def require(ids, pool, project_id, label):
        for ref in ids:
            if ref not in pool:
                result.errors.append(f"{project_id} {label} {ref} does not exist")

    for project in catalog.projects:
        require(project.clientIds, clients, project.id, "client")
        require(project.toolIds, tools, project.id, "tool")
        require(project.ideaIds, ideas, project.id, "idea")
        require(project.patternIdeaIds, ideas, project.id, "pattern idea")
        require(project.disciplineIds, disciplines, project.id, "discipline")

    for relation in catalog.relations:
        if relation.from_ not in by_id or relation.to not in by_id:
            result.errors.append(f"relation {relation.id} points at a missing id")
        if not relation.reason.strip():
            result.errors.append(f"relation {relation.id} has an empty reason")

    for override in catalog.overrides:
        if override.target not in by_id:
            result.errors.append(f"override {override.id} target {override.target} is missing")

    seed_payload = {
        "projects": [item.model_dump() for item in catalog.projects],
        "clients": [item.model_dump() for item in catalog.clients],
        "tools": [item.model_dump() for item in catalog.tools],
        "ideas": [item.model_dump() for item in catalog.ideas],
        "disciplines": [item.model_dump() for item in catalog.disciplines],
        "relations": [item.model_dump(by_alias=True) for item in catalog.relations],
        "origin_public_fields": {
            "title": catalog.origin.title,
            "label": catalog.origin.label,
            "summary": catalog.origin.summary,
            "body": catalog.origin.body,
        },
    }
    blob = json.dumps(seed_payload, ensure_ascii=False)
    if FORBIDDEN_TITLE.search(blob):
        result.errors.append("seed contains the forbidden title")
    if contains_blocked(blob, PUBLISHED):
        result.errors.append("seed contains a blocked term")
    if TEAM_PHRASING.search(blob):
        result.errors.append("seed contains team phrasing that Tyler removed")

    public = export_public(catalog)
    featured = next((item for item in public["projects"] if item.get("featured")), None)
    if featured is not None:
        clients = [item for item in public["clients"] if item["id"] in featured["clientIds"]]
        if contains_blocked(json.dumps({"project": featured, "clients": clients}), BLOCKLIST):
            result.errors.append("featured project contains a blocked term")

    pairs = overlapping_pairs(catalog.projects)
    result.overlaps = [(left.id, right.id) for left, right in pairs]
    found = {frozenset(pair) for pair in result.overlaps}
    strict = overlap_errors(catalog.projects, strict=True)
    for confirmed in CONFIRMED_OVERLAPS:
        if confirmed not in found:
            result.errors.append(
                "confirmed date overlap is missing: " + ", ".join(sorted(confirmed))
            )
        for message in strict:
            left, right = sorted(confirmed)
            if left in message and right in message:
                result.errors.append(f"confirmed date overlap was flagged: {message}")
    return result


def _awards_text(awards) -> str:
    parts = []
    for award in awards:
        piece = award.name
        if award.year is not None:
            piece += f" ({award.year})"
        piece += f", credit {award.credit}"
        parts.append(piece)
    return "; ".join(parts)


def _staffing(project: Project) -> str:
    note = clean_text(project.teamNote)
    if note:
        return note
    if isinstance(project.teamSize, int):
        return str(project.teamSize)
    return ""


def published_sections(project) -> list[dict]:
    """Public section copy. Placeholder text is omitted, wording is unchanged."""
    rows = []
    for section in project.sections:
        title = clean_text(section.title)
        body = clean_text(section.body)
        if not title or not body:
            continue
        rows.append({"id": section.id, "title": title, "body": body})
    return rows


def _base(**values) -> dict:
    values.setdefault("title", "")
    values.setdefault("summary", "")
    values.setdefault("body", "")
    values.setdefault("year", "")
    values.setdefault("role", "")
    values.setdefault("staffing", "")
    values.setdefault("archived", False)
    values.setdefault("clientIds", [])
    values.setdefault("toolIds", [])
    values.setdefault("ideaIds", [])
    values.setdefault("disciplineIds", [])
    values.setdefault("awards", [])
    values.setdefault("awardsText", "")
    values.setdefault("metrics", "")
    values.setdefault("aliases", [])
    values.setdefault("weight", None)
    values.setdefault("demo", None)
    values.setdefault("preview", None)
    values.setdefault("url", None)
    values.setdefault("teamSize", None)
    return values


def export_public(catalog: Catalog) -> dict:
    """Public rows only. Placeholder copy is blank. Dangling hidden ids are removed."""
    public_clients = [item for item in catalog.clients if is_public(item)]
    public_tools = [item for item in catalog.tools if is_public(item)]
    public_ideas = [item for item in catalog.ideas if is_public(item)]
    public_disciplines = [item for item in catalog.disciplines if is_public(item)]
    public_projects = [item for item in catalog.projects if is_public(item)]
    ids = {item.id for item in public_clients}
    ids.update(item.id for item in public_tools)
    ids.update(item.id for item in public_ideas)
    ids.update(item.id for item in public_disciplines)
    ids.update(item.id for item in public_projects)
    if is_public(catalog.origin):
        ids.add(catalog.origin.id)

    def keep(refs: list[str]) -> list[str]:
        return [ref for ref in refs if ref in ids]

    projects = []
    featured_first = sorted(public_projects, key=lambda item: (not item.featured, -item.weight, item.id))
    for project in featured_first:
        awards = [award.model_dump() for award in project.awards]
        idea_ids = keep(project.ideaIds)
        for pattern_id in keep(project.patternIdeaIds):
            if pattern_id not in idea_ids:
                idea_ids.append(pattern_id)
        projects.append(
            _base(
                id=project.id,
                notionId=project.notionId,
                type="project",
                slug=project.slug,
                name=project.name,
                label=project.name,
                summary=clean_text(project.summary) or "",
                body=clean_text(project.body) or "",
                year=clean_text(project.year) or "",
                role=clean_text(project.role) or "",
                staffing=_staffing(project),
                archived=project.archived,
                status=clean_text(project.status) or "",
                featured=project.featured,
                clientIds=keep(project.clientIds),
                toolIds=keep(project.toolIds),
                ideaIds=idea_ids,
                patternIdeaIds=keep(project.patternIdeaIds),
                disciplineIds=keep(project.disciplineIds),
                awards=awards,
                awardsText=_awards_text(project.awards),
                metrics=clean_text(project.metrics) or "",
                visuals=clean_text(project.visuals) or "",
                patterns=clean_text(project.patterns) or "",
                aliases=list(project.aliases),
                weight=project.weight,
                demo=clean_text(project.demo),
                preview=clean_text(project.preview),
                url=clean_text(project.url),
                teamSize=project.teamSize if isinstance(project.teamSize, int) else None,
                sections=published_sections(project),
                visible=True,
                confidential=False,
            )
        )

    clients = []
    for client in sorted(public_clients, key=lambda item: item.id):
        summary = client.clientType
        if client.aliases:
            summary += ". Alias: " + ", ".join(client.aliases)
        clients.append(
            _base(
                id=client.id,
                notionId=client.notionId,
                type="client",
                slug=client.slug,
                name=client.name,
                label=client.name,
                summary=summary,
                aliases=list(client.aliases),
                clientType=client.clientType,
                visible=True,
                confidential=False,
            )
        )

    tools = [
        _base(
            id=item.id,
            notionId=item.notionId,
            type="tool",
            slug=item.slug,
            name=item.name,
            label=item.name,
            summary=item.category or "",
            category=item.category,
            visible=True,
            confidential=False,
        )
        for item in sorted(public_tools, key=lambda item: item.id)
    ]
    ideas = [
        _base(
            id=item.id,
            notionId=item.notionId,
            type="idea",
            slug=item.slug,
            name=item.name,
            label=item.name,
            summary=clean_text(item.note) or "",
            status=item.status,
            visible=True,
            confidential=False,
        )
        for item in sorted(public_ideas, key=lambda item: item.id)
    ]
    disciplines = [
        _base(
            id=item.id,
            notionId=item.notionId,
            type="discipline",
            slug=item.slug,
            name=item.name,
            label=item.name,
            visible=True,
            confidential=False,
        )
        for item in sorted(public_disciplines, key=lambda item: item.id)
    ]

    origin = None
    if is_public(catalog.origin):
        origin = _base(
            id=catalog.origin.id,
            type="origin",
            slug=catalog.origin.slug,
            name=catalog.origin.name,
            label=catalog.origin.label,
            title=catalog.origin.title,
            summary=clean_text(catalog.origin.summary) or "",
            body=clean_text(catalog.origin.body) or "",
            visible=True,
            confidential=False,
        )

    relations = []
    for relation in catalog.relations:
        if relation.from_ in ids and relation.to in ids:
            relations.append(relation.model_dump(by_alias=True))
    relations.sort(key=lambda item: item["id"])

    entities = [*projects, *clients, *tools, *ideas, *disciplines]
    if origin is not None:
        entities.append(origin)
    entities.sort(key=lambda item: item["id"])
    return {
        "origin": origin,
        "projects": projects,
        "clients": clients,
        "tools": tools,
        "ideas": ideas,
        "disciplines": disciplines,
        "relations": relations,
        "entities": entities,
    }


def scan_public(text: str, digests: frozenset[str] | None = None) -> list[str]:
    errors = []
    if FORBIDDEN_TITLE.search(text):
        errors.append("generated output contains the forbidden title 'Product Designer'")
    if contains_blocked(text, PUBLISHED if digests is None else digests):
        errors.append("public output contains a blocked term")
    if TEAM_PHRASING.search(text):
        errors.append("public output contains team phrasing")
    if GRADUATION.search(text):
        errors.append("public output mentions a graduation year")
    if PLACEHOLDER in text:
        errors.append("public output contains a NEEDS TYLER placeholder")
    return errors
