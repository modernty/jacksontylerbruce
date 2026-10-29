import json
import os
import re

INK = "#2E3A87"
NOW = 2026.83
SKIP_TIMELINE = ("Jet brand", "Chatter brand", "Overmatch patterns")
FOCUS = [
    ("AI", "AI"),
    ("Trust", "TRUST IN AI"),
    ("Systems", "SYSTEMS"),
    ("Arch", "ARCHITECTURE"),
    ("Spatial", "SPATIAL"),
    ("Material", "MATERIAL"),
    ("Identity", "IDENTITY"),
    ("Finance", "FINANCE"),
]
NAMES = {
    "AI": "AI",
    "Trust": "Trust in AI",
    "Systems": "Systems",
    "Arch": "Architecture",
    "Spatial": "Spatial",
    "Material": "Material",
    "Identity": "Identity",
    "Finance": "Finance",
}
THEMES = {
    "USM Hue+Man": ["Spatial", "Material", "Identity"],
    "CoreLogic": ["AI", "Spatial"],
    "Nestlé": ["AI"],
    "FinTech Terminal": ["Finance", "Systems"],
    "DeFi redesign": ["Finance", "Trust"],
    "Jet brand": ["Identity"],
    "Novart": ["Finance", "Arch"],
    "Chatter app": ["Systems"],
    "Chatter brand": ["Identity"],
    "Lazarus brand": ["Identity", "Material", "Systems"],
    "Model Playground": ["AI", "Trust", "Arch", "Systems"],
    "USM Milan": ["Spatial", "Material", "Identity"],
    "ATLS": ["AI", "Trust"],
    "Loblaw": ["Systems"],
    "Remedy": ["AI", "Trust", "Systems"],
    "Intuit": ["Finance"],
    "Overmatch patterns": ["AI", "Trust", "Systems"],
    "Traveller": ["Arch", "Systems"],
}


def employer_public_name():
    """Role label. The default literal lives in src/content/employer.ts."""
    env = os.environ.get("EMPLOYER_PUBLIC_NAME")
    if env:
        return env
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    path = os.path.join(root, "src", "content", "employer.ts")
    text = open(path, encoding="utf-8").read()
    found = re.search(r"process\.env\.EMPLOYER_PUBLIC_NAME \?\? '([^']*)'", text)
    if not found:
        raise RuntimeError("missing employer switch")
    return found.group(1)


def build():
    employer = employer_public_name()
    roles = [
        {"name": "JOBA STUDIO", "year": "2019–21", "start": 2019.35, "end": 2021.55, "lane": 0},
        {"name": "SOUL MACHINES", "year": "2021–22", "start": 2021.6, "end": 2022.55, "lane": 1},
        {"name": "URVIN FINANCE", "year": "2022", "start": 2022.1, "end": 2022.7, "lane": 2},
        {"name": "JET PROTOCOL", "year": "2022–23", "start": 2022.78, "end": 2023.8, "lane": 0},
        {"name": "NAX GROUP", "year": "2023", "start": 2023.1, "end": 2023.65, "lane": 1},
        {"name": "CHATTER SOCIAL", "year": "2023–25", "start": 2023.78, "end": 2025.7, "lane": 2},
        {"name": "LAZARUS AI", "year": "2024–26", "start": 2024.13, "end": 2026.56, "lane": 0},
        {"name": employer.upper(), "year": "2026–", "start": 2026.04, "end": None, "lane": 1},
        {"name": "OVERMATCH AI", "year": "2026–", "start": 2026.35, "end": None, "lane": 2},
    ]
    projects = [
        ("USM Hue+Man", 2020.0, 2020.5, "Joba Studio", 0, "Spatial"),
        ("CoreLogic", 2021.65, 2022.1, "Soul Machines", 1, "AI"),
        ("Nestlé", 2022.1, 2022.5, "Soul Machines", 1, "AI"),
        ("FinTech Terminal", 2022.15, 2022.7, "Urvin Finance", 2, "Systems"),
        ("DeFi redesign", 2022.8, 2023.6, "Jet Protocol", 0, "Systems"),
        ("Jet brand", 2023.0, 2023.4, "Jet Protocol", 0, "Brand"),
        ("Novart", 2023.15, 2023.6, "Nax Group", 1, "Systems"),
        ("Chatter app", 2023.8, 2025.0, "Chatter Social", 2, "Systems"),
        ("Chatter brand", 2023.8, 2024.3, "Chatter Social", 2, "Brand"),
        ("Lazarus brand", 2024.2, 2024.8, "Lazarus AI", 0, "Brand"),
        ("Model Playground", 2024.5, 2025.6, "Lazarus AI", 0, "AI"),
        ("USM Milan", 2024.9, 2025.35, "Joba × USM", 1, "Spatial"),
        ("ATLS", 2025.4, 2026.4, "Lazarus AI", 0, "AI"),
        ("Loblaw", 2026.04, NOW, employer, 1, "Systems"),
        ("Remedy", 2026.1, 2026.6, employer, 1, "AI"),
        ("Intuit", 2026.45, NOW, "Intuit", 1, "AI"),
        ("Overmatch patterns", 2026.4, NOW, "Overmatch AI", 2, "AI"),
        ("Traveller", 2026.5, NOW, "Side project", 2, "Systems"),
    ]
    rows = []
    for name, start, end, org, lane, focus in projects:
        rows.append({
            "name": name,
            "start": start,
            "end": end,
            "org": org,
            "lane": lane,
            "focus": focus,
            "themes": list(THEMES[name]),
            "onTimeline": name not in SKIP_TIMELINE,
        })
    return {
        "now": NOW,
        "ink": INK,
        "employer": employer,
        "roles": roles,
        "projects": rows,
        "focus": FOCUS,
        "names": NAMES,
    }


def ff():
    base = os.environ.get("FONT_BASE_URL")
    if not base:
        return ""
    faces = []
    for weight, name in ((600, "semibold"), (400, "regular")):
        faces.append(
            "@font-face{font-family:'Aeonik Pro';font-weight:%s;src:url('%s/aeonikpro-%s.otf') format('opentype')}"
            % (weight, base, name)
        )
    return "".join(faces)


def pill(x1, y1, x2, y2, cur, h=12, sw=1.5, op=1):
    r = h / 2
    if y1 == y2:
        rect = f'<rect x="{x1 - r}" y="{y1 - r}" width="{x2 - x1 + h}" height="{h}" rx="{r}"'
    else:
        rect = f'<rect x="{x1 - r}" y="{y1 - r}" width="{h}" height="{y2 - y1 + h}" rx="{r}"'
    drawing = rect + f' class="pr" fill="#FBFBF8" stroke="{INK}" stroke-width="{sw}" stroke-opacity="{op}"/>'
    dot = 2.6 if h >= 12 else 2
    drawing += f'<circle class="d0" cx="{x1}" cy="{y1}" r="{dot}" fill="{INK}" fill-opacity="{op}"/>'
    if not cur:
        drawing += f'<circle class="d1" cx="{x2}" cy="{y2}" r="{dot}" fill="{INK}" fill-opacity="{op}"/>'
    return drawing


def tw(text, size):
    return len(text) * size * 0.55


def greedy(items, locate, size):
    ends = []
    placed = []
    ordered = sorted(items, key=lambda item: item["start"])
    for item in ordered:
        start = locate(item["start"]) - 6
        stop = max(locate(item["end"]), start + tw(item["name"], size)) + 14
        for index, end in enumerate(ends):
            if end < start:
                ends[index] = stop
                placed.append((item, index))
                break
        else:
            ends.append(stop)
            placed.append((item, len(ends) - 1))
    return placed, len(ends)


def theme_line(name):
    return " · ".join(NAMES[key] for key in THEMES[name])


def desktop(model=None, width=1120, height=340, embed=False):
    model = model or build()
    now = model["now"]
    x0, x1 = 150, width - 110

    def locate(when):
        return x0 + (when - 2019) / (now - 2019) * (x1 - x0)

    def lanes_for(count):
        if count > 1:
            return [70 + i * (220 / (max(count, 2) - 1)) for i in range(count)]
        return [150]

    parts = [
        f'<svg viewBox="0 0 {width} {height}" width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg" font-family="Aeonik Pro" fill="{INK}">'
    ]
    if embed:
        parts.append(f'<style>{ff()}.mode:not([data-m=timeline]){{display:none}}</style><rect width="{width}" height="{height}" fill="#FBFBF8"/>')
    parts.append(
        f'<line class="nowl" x1="{x1}" y1="30" x2="{x1}" y2="{height - 16}" stroke="{INK}" stroke-opacity=".35" stroke-dasharray="2 3"/>'
        f'<text x="{x1}" y="{height - 4}" text-anchor="middle" font-size="10" font-weight="600" letter-spacing=".08em" class="nowt">NOW</text>'
    )
    for year in range(2019, 2027):
        parts.append(
            f'<text class="yr" x="{locate(year)}" y="{height - 4}" text-anchor="middle" font-size="10" opacity=".4">{year}</text>'
        )
    lanes = [78, 170, 262]
    group = ['<g class="mode on" data-m="timeline">']
    for lane_y in lanes:
        group.append(
            f'<line class="bl" x1="{x0 - 40}" y1="{lane_y}" x2="{x1}" y2="{lane_y}" stroke="{INK}" stroke-opacity=".1"/>'
        )
    rows = {}
    timeline = [project for project in model["projects"] if project["onTimeline"]]
    timeline.sort(key=lambda project: project["start"])
    for index, project in enumerate(timeline):
        name = project["name"]
        lane = project["lane"]
        xx = locate(project["start"]) + 4
        row = 0
        focus = NAMES[project["themes"][0]]
        full = theme_line(name)
        width_guess = tw(name, 11.5) * 1.22 + 8 + tw(focus, 11) * 1.15
        while rows.get((lane, row), -1e9) > xx - 6:
            row += 1
        rows[(lane, row)] = xx + width_guess
        ly = lanes[lane] + 24 + row * 15
        fx = xx + 4 + tw(name, 11.5) * 1.22 + 8
        anchor = "start"
        if fx + tw(full, 11) * 1.15 > width - 4:
            fx = xx - 6
            anchor = "end"
        group.append(
            f'<line class="tk" data-t="{project["start"]}" x1="{xx}" y1="{lanes[lane] + 8}" x2="{xx}" y2="{ly - 10}" stroke="{INK}" stroke-opacity=".3"/>'
            f'<g class="pj" tabindex="0" role="button" aria-label="{name}" data-i="{index}" data-t="{project["start"]}">'
            f'<rect x="{xx}" y="{ly - 11}" width="{tw(name, 11.5) * 1.1 + 8}" height="15" fill="transparent"/>'
            f'<text class="w4" x="{xx + 4}" y="{ly}" font-size="11.5">{name}</text>'
            f'<text class="w6" x="{xx + 4}" y="{ly}" font-size="11.5" font-weight="600">{name}</text>'
            f'<text class="fo" x="{fx}" y="{ly}" text-anchor="{anchor}" font-size="11">{focus}</text>'
            f'<text class="fa" x="{fx}" y="{ly}" text-anchor="{anchor}" font-size="11">{full}</text></g>'
        )
    for role in model["roles"]:
        y = lanes[role["lane"]]
        xa = locate(role["start"])
        current = role["end"] is None
        xb = x1 if current else locate(role["end"])

        def label(weight, cls, role=role, xa=xa, y=y):
            return (
                f'<text class="{cls}" font-size="12.5" font-weight="{weight}">'
                f'<tspan x="{xa - 6}" y="{y - 26}">{role["name"]}</tspan>'
                f'<tspan x="{xa - 6}" y="{y - 12}">{role["year"]}</tspan></text>'
            )

        group.append(
            f'<g class="rp" data-t="{role["start"]}" data-cur="{int(current)}">'
            + pill(xa, y, xb, y, current)
            + '<g class="co">'
            + label(600, "w6")
            + label(400, "w4")
            + "</g></g>"
        )
    parts.extend(group)
    parts.append("</g>")

    placed, count = greedy(model["projects"], locate, 12.5)
    project_lanes = lanes_for(count)
    group = ['<g class="mode" data-m="projects">']
    for lane_y in project_lanes:
        group.append(
            f'<line x1="{x0 - 40}" y1="{lane_y}" x2="{x1}" y2="{lane_y}" stroke="{INK}" stroke-opacity=".08"/>'
        )
    for project, index in placed:
        y = project_lanes[index]
        xa, xb = locate(project["start"]), locate(project["end"])
        current = project["end"] >= now
        group.append(
            pill(xa, y, xb, y, current, h=9, sw=1.2)
            + f'<text x="{xa - 4}" y="{y - 10}" font-size="12.5" font-weight="600">{project["name"]}</text>'
            + f'<text x="{xa - 4}" y="{y + 19}" font-size="10" opacity=".45">{project["org"]}</text>'
        )
    parts.extend(group)
    parts.append("</g>")

    group = ['<g class="mode" data-m="focus">']
    positions = {}
    blocks = []
    for key, label in model["focus"]:
        ends = []
        items = []
        matching = [project for project in model["projects"] if key in project["themes"]]
        matching.sort(key=lambda project: project["start"])
        for project in matching:
            xa, xb = locate(project["start"]), locate(project["end"])
            left = xa - 14 - tw(project["name"], 10.5)
            placed_row = None
            for row, end in enumerate(ends):
                if end < left:
                    ends[row] = xb + 8
                    placed_row = row
                    break
            if placed_row is None:
                ends.append(xb + 8)
                placed_row = len(ends) - 1
            items.append((project["name"], xa, xb, project["end"] >= now, placed_row))
        blocks.append((label, items, len(ends)))
    total = sum(block[2] for block in blocks)
    gap = 9
    row_h = min(13, (height - 56 - gap * len(blocks)) / total)
    y = 34
    for label, items, count in blocks:
        group.append(
            f'<line x1="{x0 - 40}" y1="{y - 7}" x2="{x1}" y2="{y - 7}" stroke="{INK}" stroke-opacity=".1"/>'
            f'<text x="{x0 - 140}" y="{y + 3.5}" font-size="11" font-weight="600" letter-spacing=".06em">{label}</text>'
        )
        for name, xa, xb, current, row in items:
            yy = y + row * row_h
            positions.setdefault(name, []).append((xa, yy))
            group.append(
                pill(xa, yy, xb, yy, current, h=7, sw=1.1)
                + f'<text x="{xa - 9}" y="{yy + 3.5}" text-anchor="end" font-size="10">{name}</text>'
            )
        y += count * row_h + gap
    links = []
    for spots in positions.values():
        for (xa, ya), (xb, yb) in zip(spots, spots[1:]):
            links.append(
                f'<line x1="{xa}" y1="{ya + 4}" x2="{xb}" y2="{yb - 4}" stroke="{INK}" stroke-opacity=".14" stroke-dasharray="1 3"/>'
            )
    group[1:1] = links
    parts.extend(group)
    parts.append("</g></svg>")
    return "".join(parts)


def mobile(model=None):
    model = model or build()
    now = model["now"]
    width, height = 342, 860
    y0, y1 = 20, height - 30

    def locate(when):
        return y0 + (when - 2019) / (now - 2019) * (y1 - y0)

    parts = [
        f'<svg viewBox="0 0 {width} {height}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Aeonik Pro" fill="{INK}">'
    ]
    for year in range(2019, 2027):
        parts.append(f'<text class="yr" x="4" y="{locate(year) + 3}" font-size="9" opacity=".4">\'{str(year)[2:]}</text>')
    parts.append(
        f'<line class="nowl" x1="4" y1="{y1}" x2="{width - 4}" y2="{y1}" stroke="{INK}" stroke-opacity=".35" stroke-dasharray="2 3"/>'
        f'<text x="4" y="{y1 + 14}" font-size="9" font-weight="600">NOW</text>'
    )
    group = ['<g class="mode on" data-m="timeline">']
    lanes = [36, 56, 76]
    label_x = 104
    for role in model["roles"]:
        x = lanes[role["lane"]]
        ya = locate(role["start"])
        current = role["end"] is None
        yb = y1 if current else locate(role["end"])
        group.append(
            f'<g class="rp" data-t="{role["start"]}" data-cur="{int(current)}">'
            + pill(x, ya, x, yb, current)
            + f'<g class="co"><line x1="{x + 8}" y1="{ya}" x2="{label_x - 4}" y2="{ya}" stroke="{INK}" stroke-opacity=".2"/>'
            + f'<text font-size="11.5" font-weight="600"><tspan x="{label_x}" y="{ya + 4}">{role["name"]}</tspan>'
            + f'<tspan dx="6" font-weight="400" opacity=".75">{role["year"]}</tspan></text></g></g>'
        )
    last = -99
    timeline = sorted((project for project in model["projects"] if project["onTimeline"]), key=lambda project: project["start"])
    for project in timeline:
        yy = max(locate(project["start"]) + 16, last + 13)
        last = yy
        group.append(
            f'<text class="mpj" data-t="{project["start"]}" x="{width - 4}" y="{yy}" text-anchor="end" font-size="10.5" opacity=".6">{project["name"]}</text>'
        )
    parts.extend(group)
    parts.append("</g>")
    group = ['<g class="mode" data-m="projects">']
    last = -99
    ordered = sorted(model["projects"], key=lambda project: project["start"])
    for index, project in enumerate(ordered):
        x = 36 + (index % 3) * 18
        ya, yb = locate(project["start"]), locate(project["end"])
        group.append(pill(x, ya, x, yb, project["end"] >= now, h=9, sw=1.2))
        yy = max(ya + 4, last + 26)
        last = yy
        group.append(
            f'<line x1="{x + 6}" y1="{ya}" x2="{label_x - 4}" y2="{yy - 4}" stroke="{INK}" stroke-opacity=".2"/>'
            f'<text x="{label_x}" y="{yy}" font-size="11.5" font-weight="600">{project["name"]}</text>'
            f'<text x="{label_x}" y="{yy + 12}" font-size="9.5" opacity=".45">{project["org"]}</text>'
        )
    parts.extend(group)
    parts.append("</g>")
    group = ['<g class="mode" data-m="focus">']

    def locate_x(when):
        return 150 + (when - 2019) / (now - 2019) * (width - 160)

    yy = y0 + 4
    for key, label in model["focus"]:
        group.append(
            f'<text x="4" y="{yy + 8}" font-size="10" font-weight="600" letter-spacing=".06em">{label}</text>'
            f'<line x1="4" y1="{yy + 13}" x2="{width - 4}" y2="{yy + 13}" stroke="{INK}" stroke-opacity=".1"/>'
        )
        yy += 28
        matching = [project for project in model["projects"] if key in project["themes"]]
        matching.sort(key=lambda project: project["start"])
        for project in matching:
            group.append(
                f'<text x="4" y="{yy + 3.5}" font-size="10.5">{project["name"]}</text>'
                + pill(locate_x(project["start"]), yy, locate_x(project["end"]), yy, project["end"] >= now, h=8, sw=1.1)
            )
            yy += 15
        yy += 8
    parts.extend(group)
    parts.append("</g>")
    # The original generator appended the mobile focus group twice.
    parts.extend(group)
    parts.append("</g></svg>")
    return "".join(parts)


def years(start, end, now=NOW):
    opened = int(start)
    closed = None if end >= now else int(end)
    if closed is None:
        return f"{opened}–"
    if opened == closed:
        return str(opened)
    return f"{opened}–{str(closed)[2:]}"


def card_data(model=None):
    model = model or build()
    cards = []
    for project in model["projects"]:
        if not project["onTimeline"]:
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", project["name"].lower()).strip("-")
        cards.append({
            "t": project["name"],
            "c": project["org"],
            "d": years(project["start"], project["end"], model["now"]),
            "f": theme_line(project["name"]),
            "s": "[Placeholder] One-line summary to come.",
            "u": "/projects/" + slug,
        })
    return cards


def render_home(model=None):
    here = os.path.dirname(os.path.abspath(__file__))
    model = model or build()
    template = open(os.path.join(here, "tpl.html"), encoding="utf-8").read()
    html = template.replace("<style>", "<style>" + ff(), 1)
    html = html.replace("%D%", desktop(model)).replace("%M%", mobile(model))
    html = html.replace("%DATA%", json.dumps(card_data(model), ensure_ascii=False))
    return html


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    model = build()
    open(os.path.join(here, "resume-timeline.svg"), "w", encoding="utf-8").write(desktop(model, embed=True))
    open(os.path.join(here, "home.html"), "w", encoding="utf-8").write(render_home(model))


if __name__ == "__main__":
    main()
