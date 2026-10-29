"""Ask Tyler landing: the line, the composer, delayed cards, and a project card."""

import json
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CHROME = "/usr/bin/google-chrome"
PROMPTS = json.loads((ROOT / "content" / "suggested-prompts.json").read_text(encoding="utf-8"))


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
        raise RuntimeError("landing server did not start")
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
def page(browser):
    opened = browser.new_page(viewport={"width": 1440, "height": 900})
    yield opened
    opened.close()


def test_suggested_prompts_are_placeholders():
    assert "TYLER: edit these" in PROMPTS["note"]
    assert 4 <= len(PROMPTS["prompts"]) <= 6
    ids = [item["id"] for item in PROMPTS["prompts"]]
    assert ids == list(dict.fromkeys(ids))
    for item in PROMPTS["prompts"]:
        assert item["placeholder"] is True
        assert item["label"]
        assert item["prompt"]


def test_view_registry_rejects_unknown_ids():
    completed = subprocess.run(
        ["node", str(ROOT / "tests" / "check_views.mjs")],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stderr


def test_landing_line_and_composer(page, server):
    page.goto(server + "/", wait_until="networkidle")
    assert page.locator("h1").inner_text() == "What are you looking for?"
    font = page.evaluate("() => getComputedStyle(document.querySelector('h1')).fontFamily")
    assert "Courier" not in font
    label = page.locator("label[for='ask-tyler']")
    assert label.inner_text() == "Ask Tyler"
    assert page.locator("#ask-tyler").count() == 1
    assert "Placeholder" in page.locator(".note").first.inner_text()


def test_cards_appear_after_two_seconds(page, server):
    page.clock.install(time="2026-10-29T12:00:00Z")
    page.clock.pause_at("2026-10-29T12:00:01Z")
    page.goto(server + "/", wait_until="domcontentloaded")
    page.wait_for_function("() => document.querySelectorAll('[data-prompt-id]').length >= 4")
    suggestions = page.locator("[data-suggestions]")
    assert suggestions.get_attribute("data-visible") == "false"
    page.clock.fast_forward(1999)
    assert suggestions.get_attribute("data-visible") == "false"
    page.clock.fast_forward(1)
    page.wait_for_function(
        "() => document.querySelector('[data-suggestions]').dataset.visible === 'true'"
    )
    assert page.locator("[data-prompt-id]").count() == len(PROMPTS["prompts"])


def test_reduced_motion_shows_cards_without_the_rise(page, browser, server):
    context = browser.new_context(
        viewport={"width": 1440, "height": 900},
        reduced_motion="reduce",
    )
    opened = context.new_page()
    opened.clock.install(time="2026-10-29T12:00:00Z")
    opened.clock.pause_at("2026-10-29T12:00:01Z")
    opened.goto(server + "/", wait_until="domcontentloaded")
    opened.wait_for_function("() => document.querySelectorAll('[data-prompt-id]').length >= 4")
    opened.clock.fast_forward(2000)
    opened.wait_for_function(
        "() => document.querySelector('[data-suggestions]').dataset.visible === 'true'"
    )
    animation = opened.evaluate(
        "() => getComputedStyle(document.querySelector('.card')).animationName"
    )
    assert animation == "none"
    opened.close()
    context.close()


def test_card_click_sends_its_prompt_and_renders_a_project_card(page, server):
    page.goto(server + "/", wait_until="networkidle")
    lazarus = next(item for item in PROMPTS["prompts"] if item["id"] == "lazarus")
    page.locator("[data-prompt-id='lazarus']").click()
    page.wait_for_selector("[data-view='project-card']")
    assert page.locator("[data-role='user']").inner_text() == lazarus["prompt"]
    card = page.locator("[data-view='project-card']")
    assert "Lazarus AI Brand Identity" in card.inner_text()
    assert "NEEDS TYLER" not in card.inner_text()
    assert card.locator("a[href*='/work/'][href*='#']").count() >= 1
    assert card.locator("a[href*='/work/']").count() >= 2
    assert page.locator("[data-message-state='error']").count() == 0


def test_error_and_rate_limit_states(page, server):
    page.goto(server + "/", wait_until="networkidle")
    page.locator("#ask-tyler").fill("trigger error")
    page.locator(".send").click()
    page.wait_for_selector("[data-message-state='error']")
    assert page.locator("[data-role='user']").inner_text() == "trigger error"

    page.goto(server + "/", wait_until="networkidle")
    page.locator("#ask-tyler").fill("trigger rate limit")
    page.locator(".send").click()
    page.wait_for_selector("[data-message-state='rate-limit']")


def test_no_answer_and_disabled_mic(page, server):
    page.goto(server + "/", wait_until="networkidle")
    mic = page.locator("button.mic")
    assert mic.is_disabled()
    assert page.locator(".mic [data-shape='misfire']").count() == 1
    page.evaluate("() => { document.querySelector('.mic').dataset.mic = 'misfire'; }")
    visible = page.evaluate(
        """() => getComputedStyle(document.querySelector('.mic [data-shape="misfire"]')).display !== 'none'"""
    )
    assert visible is True
    page.locator("#ask-tyler").fill("tell me a secret")
    page.locator(".send").click()
    page.wait_for_selector("[data-message-state='no-answer']")
    assert "Nothing in the public record answers that." in page.locator("[data-role='assistant']").inner_text()


def test_timeline_is_public_and_marks_now(page, server):
    page.goto(server + "/", wait_until="networkidle")
    page.wait_for_selector("[data-timeline]")
    text = page.locator("[data-timeline]").inner_text()
    lowered = text.lower()
    assert "graduat" not in lowered
    assert "virginia tech" not in lowered
    assert "vt" not in lowered.split()
    assert "overmatch ai" in lowered
    assert "design lead" in lowered
    assert "loblaw / pc health" in lowered
    assert "senior designer" in lowered
    assert "loblaw canada" not in lowered
    assert page.locator("[data-lane='posts'] [data-timeline-id]").count() == 0
    assert page.locator("[data-lane='roles'] [data-now='true']").count() == 2
    assert page.locator("[data-lane='roles'] [data-open='true']").count() == 2
    years = page.locator(".tick .meta").all_inner_texts()
    assert "2026" in years
    assert "2027" not in years
    assert "2028" not in years
    placed = page.evaluate(
        """() => {
          const plot = document.querySelector(".tick-row .plot").getBoundingClientRect();
          const label = [...document.querySelectorAll(".tick")].find((el) => el.innerText.includes("2020")).querySelector(".meta").getBoundingClientRect();
          const leaders = [...document.querySelectorAll(".mark.is-now .leader")].map((el) => el.getBoundingClientRect());
          const ticks = [...document.querySelectorAll(".tick")].map((el) => el.getBoundingClientRect());
          const hit = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
          const collisions = leaders.filter((leader) => ticks.some((tick) => hit(leader, tick))).length;
          return { labelLeft: label.left, plotLeft: plot.left, collisions };
        }"""
    )
    assert placed["labelLeft"] >= placed["plotLeft"] - 1
    assert placed["collisions"] == 0
    assert page.locator("[data-timeline]").get_attribute("data-orientation") == "horizontal"


def test_timeline_hover_draws_arcs(page, server):
    page.goto(server + "/", wait_until="networkidle")
    page.wait_for_selector("[data-timeline-id='project:corelogic']")
    page.locator("[data-timeline-id='project:corelogic']").first.hover(force=True)
    page.wait_for_selector("[data-timeline-arcs] path")
    assert page.locator("[data-timeline-id='project:corelogic'] .leader").first.is_visible()


def test_show_timeline_answer(page, server):
    page.goto(server + "/", wait_until="networkidle")
    page.locator("#ask-tyler").fill("How does Tyler approach design leadership as a design director?")
    page.locator(".send").click()
    page.wait_for_selector("[data-role='assistant'] [data-timeline]")
    answer = page.locator("[data-role='assistant'] [data-timeline]").inner_text().lower()
    assert "overmatch ai" in answer
    assert "loblaw / pc health" in answer


def test_production_bundle_omits_dialkit():
    bundle = (ROOT / "ask" / "dist" / "landing.js").read_text(encoding="utf-8")
    assert "dialkit" not in bundle.lower()
    assert "DialRoot" not in bundle
