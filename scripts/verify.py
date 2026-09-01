#!/usr/bin/env python3
"""
Layout regression check for the portfolio.

Renders the site headlessly at three viewports and compares the typographic
line grid against values measured from the Figma mockups. Catches the failure
this project is actually prone to: a copy or CSS edit silently reflowing the
text so the design no longer matches the source of truth.

Usage:  python3 scripts/verify.py [--update]

  --update   rewrite the stored baselines from the current render.
             Use ONLY after deliberately changing the design.

Requires: Google Chrome, and `pip3 install --user pillow numpy`.
"""

import json
import os
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "index.html")
BASELINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "baseline.json")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Chrome headless refuses windows narrower than ~500px, so phone viewports are
# rendered inside an exactly-sized iframe instead.
VIEWS = [
    {"name": "desktop",     "w": 1728, "h": 1117, "iframe": False, "scale": 2},
    {"name": "mobile-home", "w": 402,  "h": 874,  "iframe": True,  "scale": 2},
    {"name": "tablet",      "w": 834,  "h": 1112, "iframe": False, "scale": 2},
]


def die(msg):
    print(f"\n  FAIL  {msg}\n")
    sys.exit(1)


def shoot(view, tmp):
    """Render one viewport, return the PNG path."""
    out = os.path.join(tmp, view["name"] + ".png")
    url = "file://" + INDEX

    if view["iframe"]:
        wrapper = os.path.join(tmp, view["name"] + ".html")
        with open(wrapper, "w") as f:
            f.write(
                '<meta charset="utf-8"><style>html,body{margin:0}'
                f'iframe{{width:{view["w"]}px;height:{view["h"]}px;border:0;display:block}}'
                f'</style><iframe src="file://{INDEX}"></iframe>'
            )
        url = "file://" + wrapper
        win_w, win_h = max(view["w"], 600), view["h"] + 80
    else:
        win_w, win_h = view["w"], view["h"]

    proc = subprocess.Popen(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         "--no-first-run", "--no-default-browser-check",
         f"--user-data-dir={tmp}/prof_{view['name']}",
         f"--window-size={win_w},{win_h}",
         f"--force-device-scale-factor={view['scale']}",
         "--virtual-time-budget=6000", f"--screenshot={out}", url],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    for _ in range(80):
        if os.path.exists(out) and os.path.getsize(out) > 0:
            break
        time.sleep(0.25)
    time.sleep(0.6)
    proc.kill()

    if not os.path.exists(out) or os.path.getsize(out) == 0:
        die(f"{view['name']}: Chrome produced no screenshot")
    return out


def measure(png, view):
    """Return {lines, advances, gutter} from the rendered ink."""
    from PIL import Image
    import numpy as np

    im = Image.open(png)
    if view["iframe"]:                      # crop to just the iframe
        im = im.crop((0, 0, view["w"] * view["scale"], view["h"] * view["scale"]))

    a = np.array(im.convert("L"))
    dark = a < 150
    if not dark.any():
        die(f"{view['name']}: rendered page has no text at all")

    cols = np.where(dark.any(axis=0))[0]
    rows = dark.sum(axis=1)

    bands, in_band, start = [], False, 0
    for i, v in enumerate(rows):
        if v > 0 and not in_band:
            start, in_band = i, True
        elif v == 0 and in_band:
            bands.append(start)
            in_band = False
    if in_band:
        bands.append(start)

    s = view["scale"]
    return {
        "lines": len(bands),
        "advances": [round((bands[i] - bands[i - 1]) / s) for i in range(1, len(bands))],
        "gutter": round(cols.min() / s),
    }


def static_checks(html):
    """Cheap checks that need no rendering."""
    problems = []

    import re
    if re.search(r'(?:src|href)="/[^/]', html):
        problems.append('root-relative path (src="/..." or href="/...") — '
                        "breaks if the site is ever served from a subpath")

    if "<title>" not in html:
        problems.append("missing <title>")

    # the font stack order that took a real debugging pass to get right
    i_web = html.find('"Source Serif 4"')
    i_ui = html.find("ui-serif")
    if i_web == -1 or i_ui == -1:
        problems.append("font stack no longer contains both Source Serif 4 and ui-serif")
    elif i_ui < i_web:
        problems.append("ui-serif precedes Source Serif 4 in the font stack — "
                        "Chrome resolves ui-serif to Times, so non-Apple visitors "
                        "would get Times instead of the intended fallback")

    cname = os.path.join(ROOT, "CNAME")
    if not os.path.exists(cname):
        problems.append("CNAME file missing — custom domain would be dropped on deploy")
    elif open(cname).read().strip() != "jacksontylerbruce.com":
        problems.append(f"CNAME says {open(cname).read().strip()!r}, expected jacksontylerbruce.com")

    # 404.html is the project-page router (GitHub Pages serves it for /<slug>).
    # It has no layout baseline, but the same cheap traps apply.
    p404 = os.path.join(ROOT, "404.html")
    if not os.path.exists(p404):
        problems.append("404.html missing — project-page routing depends on it")
    else:
        h404 = open(p404, encoding="utf-8").read()
        if "<title>" not in h404:
            problems.append("404.html: missing <title>")
        if re.search(r'(?:src|href)="/[^/]', h404):
            problems.append('404.html: root-relative path (src="/..." or href="/...")')
        i_web404, i_ui404 = h404.find('"Source Serif 4"'), h404.find("ui-serif")
        if i_web404 == -1 or i_ui404 == -1:
            problems.append("404.html: font stack no longer contains both Source Serif 4 and ui-serif")
        elif i_ui404 < i_web404:
            problems.append("404.html: ui-serif precedes Source Serif 4 in the font stack")

    return problems


def main():
    update = "--update" in sys.argv

    if not os.path.exists(CHROME):
        die("Google Chrome not found at the expected path")
    html = open(INDEX, encoding="utf-8").read()

    print("\n  Static checks")
    problems = static_checks(html)
    for p in problems:
        print(f"    ✗ {p}")
    if not problems:
        print("    ✓ paths, title, font stack order, CNAME")

    baseline = {}
    if os.path.exists(BASELINE) and not update:
        baseline = json.load(open(BASELINE))

    print("\n  Layout")
    current, failures = {}, list(problems)
    with tempfile.TemporaryDirectory() as tmp:
        for view in VIEWS:
            got = measure(shoot(view, tmp), view)
            current[view["name"]] = got

            if update or view["name"] not in baseline:
                print(f"    · {view['name']:<12} lines={got['lines']:<3} "
                      f"advances={got['advances']}  (recorded)")
                continue

            want = baseline[view["name"]]
            if got == want:
                print(f"    ✓ {view['name']:<12} lines={got['lines']:<3} advances={got['advances']}")
            else:
                print(f"    ✗ {view['name']:<12} CHANGED")
                for k in ("lines", "advances", "gutter"):
                    if got.get(k) != want.get(k):
                        print(f"        {k}: expected {want.get(k)}  got {got.get(k)}")
                failures.append(f"{view['name']} layout drifted")

    if update or not baseline:
        json.dump(current, open(BASELINE, "w"), indent=2)
        print(f"\n  Baselines written to {os.path.relpath(BASELINE, ROOT)}\n")
        return

    if failures:
        print(f"\n  FAIL  {len(failures)} problem(s). If a change was intentional, "
              f"re-run with --update.\n")
        sys.exit(1)

    print("\n  PASS  layout matches the design baselines\n")


if __name__ == "__main__":
    main()
