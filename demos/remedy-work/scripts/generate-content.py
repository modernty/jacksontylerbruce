#!/usr/bin/env python3
"""Generate `src/lib/content.generated.ts` from `remedy-work-site-content.xlsx`.

The spreadsheet is the source of truth for every card on the site. Run `npm run content`
after editing it; never hand-edit the generated module.

Uses only the Python standard library, so there is nothing to install — an .xlsx is a
zip of XML, and `zipfile` + `ElementTree` are enough to read it.
"""

from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORKBOOK = ROOT / "remedy-work-site-content.xlsx"
OUT = ROOT / "src" / "lib" / "content.generated.ts"

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

# The content sheet carries a title row, an instructions row, then the real headers.
HEADER_ROW_INDEX = 2

# Rows the sheet ships as worked examples, flagged for deletion before handoff. Dropping
# them here means the site stays clean whether or not anyone remembers to delete them.
EXAMPLE_MARKERS = ("example row, delete before handoff",)


def column_of(ref: str) -> str:
    """`"C14"` -> `"C"`."""
    match = re.match(r"[A-Z]+", ref)
    if not match:
        raise ValueError(f"unparseable cell reference: {ref}")
    return match.group()


def load_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    """The shared string table, when the writer used one (this workbook uses inline
    strings, but other exporters of the same sheet will not)."""
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    return ["".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")) for si in root]


def read_sheet(
    archive: zipfile.ZipFile, index: int, shared: list[str]
) -> list[dict[str, str]]:
    """One sheet as a list of `{column letter: text}`, blank cells omitted."""
    root = ET.fromstring(archive.read(f"xl/worksheets/sheet{index}.xml"))
    rows: list[dict[str, str]] = []
    for row in root.findall(".//m:row", NS):
        cells: dict[str, str] = {}
        for cell in row.findall("m:c", NS):
            kind = cell.get("t")
            if kind == "inlineStr":
                node = cell.find("m:is", NS)
                text = "".join(t.text or "" for t in node.iter(f"{{{NS['m']}}}t")) if node is not None else ""
            elif kind == "s":
                node = cell.find("m:v", NS)
                text = shared[int(node.text)] if node is not None and node.text else ""
            else:
                node = cell.find("m:v", NS)
                text = node.text or "" if node is not None else ""
                if node is None:
                    # Some writers put text straight in an <is> without t="inlineStr".
                    inline = cell.find("m:is", NS)
                    if inline is not None:
                        text = "".join(t.text or "" for t in inline.iter(f"{{{NS['m']}}}t"))
            text = text.strip()
            if text:
                cells[column_of(cell.get("r", "A1"))] = text
        rows.append(cells)
    return rows


def slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    if not slug:
        raise ValueError(f"title produced an empty slug: {title!r}")
    return slug


def ts(value: str | None) -> str:
    """A TypeScript string literal, or `null`."""
    if not value:
        return "null"
    escaped = value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'"{escaped}"'


def ts_list(values: list[str]) -> str:
    return "[" + ", ".join(ts(v) for v in values) + "]"


def main() -> int:
    if not WORKBOOK.exists():
        print(f"error: workbook not found at {WORKBOOK}", file=sys.stderr)
        return 1

    with zipfile.ZipFile(WORKBOOK) as archive:
        shared = load_shared_strings(archive)
        content_rows = read_sheet(archive, 1, shared)
        section_rows = read_sheet(archive, 2, shared)

    headers = content_rows[HEADER_ROW_INDEX]
    # Map header label -> column letter, so a reordered sheet still generates correctly.
    by_label = {label: letter for letter, label in headers.items()}

    def field(row: dict[str, str], label: str) -> str:
        letter = by_label.get(label)
        return row.get(letter, "") if letter else ""

    # ---- sections -------------------------------------------------------------
    sections: list[dict[str, str]] = []
    for row in section_rows[1:]:
        name = row.get("B", "")
        if not name or not row.get("A", "").isdigit():
            continue
        sections.append(
            {
                "name": name,
                "heading": row.get("C", ""),
                "intro": row.get("D", ""),
            }
        )

    # ---- items ----------------------------------------------------------------
    items = []
    skipped_examples = 0
    for row in content_rows[HEADER_ROW_INDEX + 1 :]:
        title = field(row, "Title")
        if not title:
            continue
        notes = field(row, "Notes and open questions")
        if any(marker in notes.lower() for marker in EXAMPLE_MARKERS):
            skipped_examples += 1
            continue

        items.append(
            {
                "slug": slugify(title),
                "section": field(row, "Section"),
                "group": field(row, "Group"),
                "title": title,
                "oneLiner": field(row, "One liner"),
                "description": field(row, "Description"),
                "platform": field(row, "Platform"),
                "status": field(row, "Status"),
                "source": field(row, "Source"),
                "link": field(row, "Link"),
                "ios": field(row, "iOS link"),
                "android": field(row, "Android link"),
                "web": field(row, "Web link"),
                "tags": [t.strip() for t in field(row, "Tags").split(",") if t.strip()],
                "visual": field(row, "Visual"),
            }
        )

    duplicates = {s for s in (i["slug"] for i in items) if [i["slug"] for i in items].count(s) > 1}
    if duplicates:
        print(f"error: duplicate slugs from duplicate titles: {sorted(duplicates)}", file=sys.stderr)
        return 1

    unknown = sorted({i["section"] for i in items} - {s["name"] for s in sections})
    if unknown:
        print(f"error: rows reference sections missing from the Sections sheet: {unknown}", file=sys.stderr)
        return 1

    # ---- emit -----------------------------------------------------------------
    lines = [
        "// Generated by `npm run content` from remedy-work-site-content.xlsx.",
        "// Do not edit by hand — edit the spreadsheet and regenerate.",
        "",
        'import type { Section, WorkItem } from "./content";',
        "",
        "export const SECTIONS: Section[] = [",
    ]
    for section in sections:
        lines += [
            "  {",
            f'    name: {ts(section["name"])},',
            f'    heading: {ts(section["heading"])},',
            f'    intro: {ts(section["intro"])},',
            "  },",
        ]
    lines += ["];", "", "export const ITEMS: WorkItem[] = ["]
    for item in items:
        lines += [
            "  {",
            f'    slug: {ts(item["slug"])},',
            f'    section: {ts(item["section"])},',
            f'    group: {ts(item["group"])},',
            f'    title: {ts(item["title"])},',
            f'    oneLiner: {ts(item["oneLiner"])},',
            f'    description: {ts(item["description"])},',
            f'    platform: {ts(item["platform"])},',
            f'    status: {ts(item["status"])},',
            f'    source: {ts(item["source"])},',
            "    links: {",
            f'      all: {ts(item["link"])},',
            f'      ios: {ts(item["ios"])},',
            f'      android: {ts(item["android"])},',
            f'      web: {ts(item["web"])},',
            "    },",
            f'    tags: {ts_list(item["tags"])},',
            f'    visual: {ts(item["visual"])},',
            "  },",
        ]
    lines += ["];", ""]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")

    by_section: dict[str, int] = {}
    for item in items:
        by_section[item["section"]] = by_section.get(item["section"], 0) + 1
    summary = ", ".join(f"{name} {count}" for name, count in by_section.items())
    print(f"wrote {OUT.relative_to(ROOT)} — {len(items)} items ({summary})")
    if skipped_examples:
        print(f"skipped {skipped_examples} example row(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
