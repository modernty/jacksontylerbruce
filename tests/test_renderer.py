"""Browser checks for the map page."""

import json
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
