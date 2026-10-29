"""Browser checks for the map page."""

import json
import re
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MAP = json.loads((ROOT / "public" / "map.json").read_text(encoding="utf-8"))
CHROME = "/usr/bin/google-chrome"


def _free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@pytest.fixture(scope="module")
def server():
    port = _free_port()
    proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    deadline = time.time() + 8
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                break
        except OSError:
            time.sleep(0.05)
    else:
        proc.kill()
        raise RuntimeError("map server did not start")
    yield f"http://127.0.0.1:{port}"
    proc.kill()
    proc.wait(timeout=5)


@pytest.fixture(scope="module")
def browser():
    from playwright.sync_api import sync_playwright

    playwright = sync_playwright().start()
    launched = playwright.chromium.launch(
        executable_path=CHROME,
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    yield launched
    launched.close()
    playwright.stop()


@pytest.fixture
def page(browser, server):
    opened = browser.new_page(viewport={"width": 1440, "height": 900})
    opened.goto(server + "/map.html", wait_until="networkidle")
    opened.wait_for_selector("body[data-ready='true']")
    yield opened
    opened.close()


def test_map_json_loads_and_counts_nodes(page):
    count = page.locator("[data-node-id]").count()
    assert count == len(MAP["nodes"])
    assert count == int(page.locator("body").get_attribute("data-node-count"))
    assert page.locator("h1").inner_text() == "Designing the intimacy between people and machines."


def test_origin_is_centered(page):
    origin = page.locator("[data-node-id='origin:tyler']").bounding_box()
    stage = page.locator("#stage").bounding_box()
    assert origin and stage
    center_x = origin["x"] + origin["width"] / 2
    center_y = origin["y"] + origin["height"] / 2
    assert abs(center_x - (stage["x"] + stage["width"] / 2)) < 6
    assert abs(center_y - (stage["y"] + stage["height"] / 2)) < 6


def test_click_opens_detail_and_deep_link(page):
    page.locator("[data-node-id='origin:tyler']").click()
    page.wait_for_selector("#detail:not([hidden])")
    assert "Tyler Jackson" in page.locator("#detail-label").inner_text()
    assert "node=origin%3Atyler" in page.url or "node=origin:tyler" in page.url

    page.goto(page.url.split("?")[0] + "?node=project:overmatch-ai", wait_until="networkidle")
    page.wait_for_selector("body[data-ready='true']")
    page.wait_for_selector("#detail:not([hidden])")
    assert page.locator("#detail-label").inner_text() == "Overmatch AI"
    assert page.locator("#detail-summary").inner_text().startswith("Sample work in progress:")


def test_every_node_has_an_onward_link(page):
    misses = page.evaluate(
        """() => {
          const ids = [...document.querySelectorAll("[data-node-id]")].map((el) => el.dataset.nodeId);
          return ids.filter((id) => {
            window.MapView.open(id);
            return document.querySelectorAll("#detail-relations [data-go]").length < 1;
          });
        }"""
    )
    assert misses == []


def test_onward_link_moves_and_back_out_steps_up(page, server):
    page.goto(server + "/map.html?node=project:overmatch-ai", wait_until="networkidle")
    page.wait_for_selector("#detail-relations [data-go]")
    yaw = page.locator("#stage").get_attribute("data-yaw")
    link = page.locator("#detail-relations [data-go]").first
    target = link.get_attribute("data-go")
    link.click()
    page.wait_for_function(
        "(id) => new URL(location.href).searchParams.get('node') === id",
        arg=target,
    )
    assert page.locator("#detail-kind").inner_text() == "CLIENT"
    page.wait_for_timeout(750)
    assert page.locator("#stage").get_attribute("data-yaw") != yaw
    page.go_back()
    page.wait_for_function("() => document.getElementById('detail-label').textContent === 'Overmatch AI'")
    page.locator("#detail-back").click()
    page.wait_for_function("() => location.search.includes('cluster=')")
    assert page.locator("#detail-relations [data-go]").count() >= 1
    page.locator("#detail-back").click()
    page.wait_for_function("() => location.search.includes('origin')")
    assert "Tyler Jackson" in page.locator("#detail-label").inner_text()


def test_list_toggle_survives_reload_and_keeps_the_node(page, server):
    page.goto(server + "/map.html?node=project:overmatch-ai", wait_until="networkidle")
    page.wait_for_selector("body[data-ready='true']")
    page.locator("#view-list").click()
    page.wait_for_function("() => location.search.includes('view=list') && location.search.includes('node=')")
    assert page.locator("body").get_attribute("class") == "is-list" or "is-list" in (page.locator("body").get_attribute("class") or "")
    assert page.locator("#list [data-row='project:overmatch-ai']").get_attribute("class").find("is-current") != -1
    page.reload(wait_until="networkidle")
    page.wait_for_selector("body[data-ready='true']")
    assert "view=list" in page.url
    assert "overmatch-ai" in page.url
    page.go_back()
    page.wait_for_function("() => !location.search.includes('view=list')")
    page.wait_for_selector("#detail:not([hidden])")
    assert page.locator("#detail-label").inner_text() == "Overmatch AI"


def test_filter_matches_across_map_and_list(page):
    page.locator(".filters [data-filter='tool']").click()
    page.wait_for_function("() => location.search.includes('filter=tool')")
    listed = page.evaluate("() => window.MapView.entries('tool', 'list').slice().sort()")
    page.locator("#view-list").click()
    rows = page.locator("#list [data-row]").evaluate_all("els => els.map((el) => el.dataset.row).sort()")
    assert rows == listed
    page.locator("#view-map").click()
    shown = page.locator("[data-node-id]:not([hidden])").evaluate_all("els => els.map((el) => el.dataset.nodeId).sort()")
    assert shown == listed


def test_every_list_row_has_an_onward_link(page, server):
    for kind in ("project", "idea", "tool", "client", "theme"):
        page.goto(server + "/map.html?view=list&filter=" + kind, wait_until="networkidle")
        page.wait_for_selector("body[data-ready='true']")
        missing = page.locator("#list [data-row]").evaluate_all(
            "els => els.filter((row) => !row.querySelector('.onward [data-go]')).map((row) => row.dataset.row)"
        )
        assert missing == []


def _channels(color):
    return [float(channel) for channel in re.findall(r"[\d.]+", color)[:3]]


def _contrast(foreground, background):
    def linear(channel):
        channel = channel / 255
        if channel <= 0.04045:
            return channel / 12.92
        return ((channel + 0.055) / 1.055) ** 2.4

    def luminance(color):
        red, green, blue = [linear(channel) for channel in _channels(color)]
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue

    darker, lighter = sorted((luminance(foreground), luminance(background)))
    return (lighter + 0.05) / (darker + 0.05)


def _token_block():
    css = (ROOT / "system" / "tokens.css").read_text(encoding="utf-8")
    block = re.search(r":root\s*\{([^}]+)\}", css).group(1)
    return dict(re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", block))


def test_token_snapshot():
    tokens = _token_block()
    snapshot = json.loads((ROOT / "tests" / "snapshots" / "tokens.json").read_text(encoding="utf-8"))
    assert tokens == snapshot
    assert tokens["--paper"] == "#FBFBF8"
    assert tokens["--ink"] == "#2E3A87"
    assert "70%" in tokens["--ink-70"]
    assert "40%" in tokens["--ink-40"]
    assert "15%" in tokens["--ink-15"]
    assert "6%" in tokens["--ink-06"]


def test_no_raw_hex_outside_the_token_file():
    pattern = re.compile(r"#[0-9A-Fa-f]{3,8}\b|%23[0-9A-Fa-f]{6}|rgba?\(", re.I)
    skip_names = {"index.html", "404.html", "tokens.css"}
    skip_roots = {".venv", ".git", "node_modules", "pipeline", "data", "public", "fonts", "tests"}
    offenders = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in {".css", ".html", ".js"}:
            continue
        rel = path.relative_to(ROOT)
        if rel.parts[0] in skip_roots or path.name in skip_names:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if pattern.search(text):
            offenders.append(str(rel))
    assert offenders == []


def test_ink_on_paper_meets_aa(page, server):
    page.wait_for_function("() => document.fonts.check('16px \"Courier Prime\"')")
    measured = page.evaluate(
        """() => {
          window.THREE = { Color: function (value) { this.value = value; } };
          const colors = window.MapView.palette();
          const style = (sel) => getComputedStyle(document.querySelector(sel));
          const hero = style("#hero");
          const label = style(".node.is-origin .name");
          return {
            body: style("body").backgroundColor,
            hero: hero.color,
            heroFont: hero.fontFamily,
            label: label.color,
            labelFont: label.fontFamily,
            labelCase: label.textTransform,
            ink: colors.ink,
            line: colors.line,
            threeInk: colors.three.ink.value,
            threeLine: colors.three.line.value
          };
        }"""
    )
    assert _contrast(measured["hero"], measured["body"]) >= 4.5
    assert _contrast(measured["label"], measured["body"]) >= 4.5
    assert measured["hero"] == measured["ink"]
    assert measured["label"] == measured["ink"]
    assert measured["threeInk"] == measured["ink"]
    assert measured["threeLine"] == measured["line"]
    assert measured["line"] != measured["ink"]
    assert "Courier Prime" in measured["labelFont"]
    assert measured["labelCase"] == "uppercase"
    assert "Courier Prime" not in measured["heroFont"]

    page.locator("[data-node-id='origin:tyler']").click()
    page.wait_for_selector("#edges line")
    stroke = page.evaluate("() => getComputedStyle(document.querySelector('#edges line')).stroke")
    assert stroke == measured["line"]

    page.goto(server + "/map.html?view=list", wait_until="networkidle")
    page.wait_for_selector(".row-meta")
    page.wait_for_function("() => document.fonts.check('16px \"Courier Prime\"')")
    meta = page.evaluate(
        """() => {
          const row = getComputedStyle(document.querySelector(".row-meta"));
          const title = getComputedStyle(document.querySelector(".row-title"));
          return { color: row.color, font: row.fontFamily, title: title.fontFamily, transform: row.textTransform };
        }"""
    )
    assert _contrast(meta["color"], measured["body"]) >= 4.5
    assert meta["color"] == measured["ink"]
    assert "Courier Prime" in meta["font"]
    assert meta["transform"] == "uppercase"
    assert "Courier Prime" not in meta["title"]


def test_system_renders_every_primitive(page, server):
    page.goto(server + "/system/", wait_until="networkidle")
    page.wait_for_function("() => document.fonts.check('16px \"Courier Prime\"')")
    expect = [
        "jtb-text[variant='display']",
        "jtb-text[variant='body']",
        "jtb-text[variant='caption']",
        "jtb-text[variant='mono']",
        "jtb-link[variant='inline']",
        "jtb-link[variant='onward'] jtb-icon[name='arrow']",
        "jtb-button[variant='text']",
        "jtb-button[variant='ghost']",
        "jtb-button[disabled]",
        "jtb-icon[name='arrow']",
        "jtb-icon[name='back']",
        "jtb-icon[name='close']",
        "jtb-icon[name='plus']",
        "jtb-divider",
        "jtb-tag",
        "jtb-tag[disabled]",
        "jtb-tag[aria-pressed='true']",
        "jtb-counter",
    ]
    for selector in expect:
        assert page.locator(selector).count() >= 1, selector
        assert page.locator(selector).first.is_visible(), selector
    assert "12 projects" in page.locator("jtb-counter").first.inner_text().casefold()
    sections = page.locator("section")
    for index in range(sections.count()):
        assert sections.nth(index).locator("jtb-link[variant='onward']").count() >= 1
    page.locator("jtb-link[href='../map.html']").click()
    page.wait_for_selector("body[data-ready='true']")
    assert page.url.endswith("/map.html") or "/map.html" in page.url


def _focus_ring(page):
    return page.evaluate(
        """() => {
          const el = document.activeElement;
          if (!el || el === document.body || el === document.documentElement) return null;
          const style = getComputedStyle(el);
          return { outline: style.outlineStyle, width: style.outlineWidth };
        }"""
    )


def test_keyboard_focus_is_visible(page, server):
    page.goto(server + "/system/", wait_until="networkidle")
    seen = 0
    for _ in range(24):
        page.keyboard.press("Tab")
        ring = _focus_ring(page)
        if not ring:
            continue
        assert ring["outline"] != "none"
        assert ring["width"] != "0px"
        seen += 1
    assert seen >= 8

    page.goto(server + "/map.html", wait_until="networkidle")
    page.wait_for_selector("body[data-ready='true']")
    seen = 0
    for _ in range(8):
        page.keyboard.press("Tab")
        ring = _focus_ring(page)
        if not ring:
            continue
        assert ring["outline"] != "none"
        assert ring["width"] != "0px"
        seen += 1
    assert seen >= 3


def test_private_nodes_are_not_rendered(page):
    kept = page.evaluate(
        """() => window.MapView.isPublic({
          id: 'shown', visible: true, confidential: false, pos: [0, 0, 0]
        }) && !window.MapView.isPublic({
          id: 'hidden', visible: false, confidential: false, pos: [0, 0, 0]
        }) && !window.MapView.isPublic({
          id: 'sealed', visible: true, confidential: true, pos: [0, 0, 0]
        })"""
    )
    assert kept is True
