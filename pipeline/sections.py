"""Project sections: stable anchors for /work/<slug>/#<sectionId>.

Copy moves in without a rewrite. A field that still says NEEDS TYLER is not
copy, so it does not become a section. The path segment is the project slug
(the id without the ``project:`` prefix).
"""

from __future__ import annotations

import html
from pathlib import Path

PLACEHOLDER = "NEEDS TYLER"

# field, anchor id, title. Bodies are the field values verbatim.
COPY_FIELDS = (
    ("summary", "summary", "Summary"),
    ("body", "body", "Body"),
    ("patterns", "patterns", "Patterns"),
    ("metrics", "metrics", "Metrics"),
    ("visuals", "visuals", "Visuals"),
)


def _value(project, field: str):
    if isinstance(project, dict):
        return project.get(field)
    return getattr(project, field, None)


def sections_from_copy(project) -> list[dict]:
    rows = []
    for field, section_id, title in COPY_FIELDS:
        value = _value(project, field)
        if not isinstance(value, str) or not value.strip() or PLACEHOLDER in value:
            continue
        rows.append({"id": section_id, "title": title, "body": value})
    return rows


def work_href(slug: str, section_id: str | None = None) -> str:
    path = f"/work/{slug}/"
    if section_id:
        return f"{path}#{section_id}"
    return path


def _esc(value: str) -> str:
    return html.escape(value, quote=True)


def section_rows(project) -> list[dict]:
    stored = _value(project, "sections")
    if stored is None:
        return sections_from_copy(project)
    rows = []
    for section in stored:
        if isinstance(section, dict):
            rows.append(section)
        else:
            rows.append({"id": section.id, "title": section.title, "body": section.body})
    return rows


def render_work_page(project) -> str:
    """One public project. Every section element carries id=<sectionId>."""
    sections = section_rows(project)
    name = _value(project, "name") or ""
    slug = _value(project, "slug") or ""
    project_id = _value(project, "id") or ""
    role = _value(project, "role") or ""
    year = _value(project, "year") or ""
    if not isinstance(role, str) or PLACEHOLDER in role:
        role = ""
    if not isinstance(year, str) or PLACEHOLDER in year:
        year = ""
    meta = [part for part in (role, year) if part]
    parts = [
        "<!doctype html>",
        '<html lang="en">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        f"<title>{_esc(name)}</title>",
        '<link rel="stylesheet" href="../../system/tokens.css">',
        '<link rel="stylesheet" href="../../system/primitives.css">',
        '<link rel="stylesheet" href="../../ask/landing.css">',
        '<script src="../../system/fonts.js"></script>',
        "</head>",
        "<body>",
        f'<main class="work" data-project-id="{_esc(project_id)}">',
        '<p class="kicker"><a href="/">Ask Tyler</a></p>',
        f"<h1>{_esc(name)}</h1>",
    ]
    if meta:
        parts.append(f'<p class="meta">{_esc(" · ".join(meta))}</p>')
    for section in sections:
        parts.append(f'<section id="{_esc(section["id"])}">')
        parts.append(f"<h2>{_esc(section['title'])}</h2>")
        parts.append(f"<p>{_esc(section['body'])}</p>")
        parts.append("</section>")
    parts.extend(
        [
            '<p class="kicker"><a href="/">Back</a></p>',
            "</main>",
            '<script src="../../system/primitives.js"></script>',
            "<script>",
            "(function () {",
            "  var id = location.hash.replace(/^#/, '');",
            "  if (!id) return;",
            "  var el = document.getElementById(id);",
            "  if (!el) return;",
            "  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;",
            "  var top = el.getBoundingClientRect().top + window.scrollY - 24;",
            "  if (reduce) window.scrollTo(0, top);",
            "  else {",
            "    var start = window.scrollY;",
            "    var change = top - start;",
            "    var t0 = performance.now();",
            "    var dur = 360;",
            "    var frame = function (now) {",
            "      var p = Math.min(1, (now - t0) / dur);",
            "      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;",
            "      window.scrollTo(0, start + change * e);",
            "      if (p < 1) requestAnimationFrame(frame);",
            "    };",
            "    requestAnimationFrame(frame);",
            "  }",
            "  el.classList.add('is-target');",
            "  window.setTimeout(function () { el.classList.remove('is-target'); }, 400);",
            "})();",
            "</script>",
            "</body>",
            "</html>",
            "",
        ]
    )
    return "\n".join(parts)


def write_sections(root: Path | None = None) -> None:
    """Refresh seed sections, public map nodes, and work pages from copy fields."""
    import json

    from pipeline.catalog import CONTENT_DIR, ROOT, export_public, load_catalog
    from pipeline.build import MAP_PATH

    root = root or ROOT
    catalog = load_catalog()
    path = CONTENT_DIR / "projects.json"
    rows = json.loads(path.read_text(encoding="utf-8"))
    by_id = {project.id: project for project in catalog.projects}
    for row in rows:
        row["sections"] = sections_from_copy(by_id[row["id"]])
    path.write_text(
        json.dumps(rows, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    catalog = load_catalog()
    public = {item["id"]: item.get("sections") or [] for item in export_public(catalog)["projects"]}
    document = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    for node in document["nodes"]:
        if node.get("type") == "project" and node["id"] in public:
            node["sections"] = public[node["id"]]
    MAP_PATH.write_text(
        json.dumps(document, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    work = root / "work"
    for project in catalog.projects:
        if not project.visible or project.confidential:
            continue
        folder = work / project.slug
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "index.html").write_text(render_work_page(project), encoding="utf-8")


if __name__ == "__main__":
    write_sections()
