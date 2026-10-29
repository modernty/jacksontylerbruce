import hashlib
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from pipeline.blocklist import PUBLISHED, contains_blocked
from pipeline.catalog import (
    CONFIRMED_OVERLAPS,
    CONTENT_DIR,
    FORBIDDEN_TITLE,
    CatalogError,
    count_placeholders,
    export_public,
    load_catalog,
    overlap_errors,
    overlapping_pairs,
    scan_public,
    span_of,
    validate,
)
from pipeline.schema import Project
from pipeline.sections import render_work_page, sections_from_copy

EXPECTED_PLACEHOLDERS = 26


def _by_id(items):
    if items and isinstance(items[0], dict):
        return {item["id"]: item for item in items}
    return {item.id: item for item in items}


def test_seed_validates_and_counts_real_nodes():
    catalog = load_catalog()
    report = validate(catalog)
    assert report.errors == []
    assert report.placeholder_count == EXPECTED_PLACEHOLDERS
    print(f"NEEDS_TYLER_PLACEHOLDERS={report.placeholder_count}")

    public = export_public(catalog)
    assert len(public["entities"]) >= 20
    assert len(public["projects"]) == 19
    assert len(public["ideas"]) == 18
    assert len(public["tools"]) == 21
    assert public["origin"]["id"] == "origin:tyler"
    assert len(public["clients"]) == 14
    assert len(public["disciplines"]) == 12
    # The acceptance set, after the side projects and the Venice split.
    assert len(public["projects"]) + len(public["ideas"]) + len(public["tools"]) + 1 >= 20


def test_placeholder_text_is_not_published():
    catalog = load_catalog()
    public = export_public(catalog)
    blob = json.dumps(public)
    assert "NEEDS TYLER" not in blob
    intuit = _by_id(public["projects"])["project:intuit"]
    assert intuit["summary"] == (
        "Exploring a ChatGPT integration that lets clients invoice and track "
        "balances, connected to Intuit Wallet."
    )
    assert intuit["year"] == ""
    assert intuit["role"] == ""
    venice = _by_id(public["projects"])["project:usm-venice-2025"]
    assert venice["summary"] == ""
    assert venice["role"] == ""


def _flag_hits(value, path=""):
    hits = []
    if isinstance(value, dict):
        if value.get("visible") is False:
            hits.append(f"{path} visible:false")
        if value.get("confidential") is True:
            hits.append(f"{path} confidential:true")
        for key, item in value.items():
            hits.extend(_flag_hits(item, f"{path}.{key}"))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            hits.extend(_flag_hits(item, f"{path}[{index}]"))
    return hits


def test_committed_content_is_public_only():
    root = CONTENT_DIR.parent
    paths = list(CONTENT_DIR.glob("*.json"))
    paths.append(root / "public" / "map.json")
    paths.append(root / "data" / "engine" / "nodes.json")
    hits = []
    for path in paths:
        payload = json.loads(path.read_text(encoding="utf-8"))
        hits.extend(f"{path.relative_to(root)} {item}" for item in _flag_hits(payload))
    assert hits == []


def test_hidden_and_confidential_rows_drop_out():
    catalog = load_catalog()
    hidden = catalog.projects[0]
    hidden.visible = False
    hidden.confidential = True
    public = export_public(catalog)
    ids = {item["id"] for item in public["entities"]}
    assert hidden.id not in ids
    blob = json.dumps(public)
    assert hidden.id not in blob


def test_client_ids_are_a_list_and_singular_is_rejected():
    catalog = load_catalog()
    projects = _by_id(catalog.projects)
    assert len(projects["project:nestle"].clientIds) == 2
    assert len(projects["project:corelogic"].clientIds) == 2
    assert len(projects["project:usm-milan-2025"].clientIds) == 2
    assert len(projects["project:usm-hueman"].clientIds) == 2
    raw = json.loads((CONTENT_DIR / "projects.json").read_text())[0]
    raw["clientId"] = raw["clientIds"][0]
    with pytest.raises(ValidationError):
        Project.model_validate(raw)


def test_nax_group_alias_and_awards_and_usm_split():
    catalog = load_catalog()
    nax = _by_id(catalog.clients)["client:nax-group"]
    assert nax.name == "Nax Group"
    assert nax.aliases == ["Novart"]
    novart = _by_id(catalog.projects)["project:novart"]
    assert novart.clientIds == ["client:nax-group"]

    milan = _by_id(catalog.projects)["project:usm-milan-2025"]
    venice = _by_id(catalog.projects)["project:usm-venice-2025"]
    assert milan.role == "Lead designer"
    assert [award.name for award in milan.awards] == [
        "Indigo Gold",
        "Indigo Silver",
        "IDA Silver",
    ]
    assert {award.credit for award in milan.awards} == {"Tyler"}
    assert venice.id != milan.id
    relation = catalog.relations[0]
    assert {relation.from_, relation.to} == {milan.id, venice.id}
    assert "Milan Design Week" in relation.reason
    assert "Venice" in relation.reason


def test_tyler_role_and_date_answers():
    catalog = load_catalog()
    projects = _by_id(catalog.projects)
    playground = projects["project:model-playground"]
    assert playground.role == "Design Lead"
    assert playground.ledOrMade == "Led and made"
    assert playground.year == "2024\u20132025"

    assert projects["project:lazarus-brand"].role == "Led"
    assert projects["project:lazarus-brand"].teamNote == "Directed 6+ designers"

    chatter = projects["project:chatter"]
    assert chatter.role == "Head of Design"
    assert chatter.teamSize == 1
    assert chatter.end == "2025-09"
    assert chatter.year == "2023\u2013Sep 2025"

    jet = projects["project:jet-protocol"]
    assert jet.archived is True
    assert jet.demo is None
    assert jet.url is None
    assert jet.teamSize == 1
    assert jet.role == "Solo designer"

    for slug in ("corelogic", "nestle"):
        project = projects[f"project:{slug}"]
        assert project.role == "Solo designer"
        assert project.teamSize == 1

    loblaw = projects["project:loblaw"]
    assert loblaw.summary == "A mobile health chat assistant codenamed Remedy."
    assert loblaw.role == "Senior Designer"
    assert loblaw.year == "2026–present"
    assert loblaw.start == "2026-01"
    assert loblaw.end is None
    assert loblaw.ledOrMade == "Made"
    assert loblaw.metrics == "PC Health: #19 Medical and #25 Shopping"
    assert loblaw.demo is None
    assert "PC Health" in loblaw.aliases

    whitelist = projects["project:whitelist"]
    assert whitelist.visible is True
    assert whitelist.confidential is False
    assert "ATLS" in whitelist.summary
    assert "ATLS field app" in whitelist.aliases

    own = _by_id(catalog.clients)["client:own"]
    assert own.visible is True
    assert own.confidential is False
    for slug in ("verystrongopinion", "traveller", "idea-map"):
        project = projects[f"project:{slug}"]
        assert project.visible is True
        assert project.confidential is False
        assert project.clientIds == ["client:own"]


def _site_texts():
    root = CONTENT_DIR.parent
    paths = [root / "index.html", root / "404.html"]
    for folder in ("content", "data", "public"):
        for path in (root / folder).rglob("*"):
            if not path.is_file() or "models" in path.parts:
                continue
            if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bin"}:
                continue
            paths.append(path)
    return paths


def test_forbidden_phrases_are_absent_from_the_seed():
    blob = "\n".join(path.read_text(encoding="utf-8") for path in CONTENT_DIR.glob("*.json"))
    lowered = blob.lower()
    assert "product designer" not in lowered
    assert not contains_blocked(blob, PUBLISHED)
    assert "my team" not in lowered
    assert "watch party" not in lowered
    assert "moments" not in lowered
    assert "2026-07" not in blob


def test_confirmed_date_overlaps_are_allowed_and_others_can_fail():
    catalog = load_catalog()
    found = {frozenset((left.id, right.id)) for left, right in overlapping_pairs(catalog.projects)}
    for pair in CONFIRMED_OVERLAPS:
        assert pair in found
    report = validate(catalog)
    assert report.errors == []
    strict = overlap_errors(catalog.projects, strict=True)
    for pair in CONFIRMED_OVERLAPS:
        left, right = sorted(pair)
        assert not any(left in message and right in message for message in strict)

    class Row:
        def __init__(self, id, client_ids, start, end):
            self.id = id
            self.clientIds = client_ids
            self.start = start
            self.end = end
            self.year = None
            self.visible = True
            self.confidential = False

    left = Row("project:alpha", ["client:a"], "2020-01", "2020-06")
    right = Row("project:beta", ["client:b"], "2020-04", "2020-12")
    assert span_of(left) is not None
    flagged = overlap_errors([left, right], strict=True)
    assert flagged
    cleared = overlap_errors(
        [left, right],
        strict=True,
        extra_allow={frozenset({left.id, right.id})},
    )
    assert cleared == []


def test_origin_title_and_withheld_graduation_year():
    catalog = load_catalog()
    assert catalog.origin.title == "Designer / Design Director"
    assert catalog.origin.label == "Tyler Jackson, Designer / Design Director"
    assert catalog.origin.withheld[0].field == "graduationYear"
    assert catalog.origin.withheld[0].public is False
    public = export_public(catalog)
    blob = json.dumps(public)
    assert "graduation" not in blob.lower()
    assert "graduat" not in blob.lower()


def test_built_site_has_no_blocked_terms():
    """The published site, not only the seed and map.json."""
    hits = []
    for path in _site_texts():
        text = path.read_text(encoding="utf-8", errors="ignore")
        if contains_blocked(text, PUBLISHED):
            hits.append(str(path.relative_to(CONTENT_DIR.parent)))
        if FORBIDDEN_TITLE.search(text):
            hits.append(str(path.relative_to(CONTENT_DIR.parent)) + " title")
    assert hits == []
    page = (CONTENT_DIR.parent / "index.html").read_text(encoding="utf-8")
    assert "What are you looking for?" in page
    assert "Ask Tyler" in page


def test_overmatch_is_featured_sample_work_without_sensitive_specifics():
    catalog = load_catalog()
    project = _by_id(catalog.projects)["project:overmatch-ai"]
    client = _by_id(catalog.clients)["client:overmatch-ai"]
    assert project.featured is True
    assert project.role == "Design Lead"
    assert project.status == "in progress"
    assert project.start == "2026-05"
    assert project.clientIds == ["client:overmatch-ai"]
    assert project.patternIdeaIds == [
        "idea:dynamic-objective-specific-plans",
        "idea:agentic-trust",
    ]
    assert project.ideaIds == []
    assert project.toolIds == []
    assert project.disciplineIds == []
    assert project.visuals == "NEEDS TYLER"
    assert project.patterns == (
        "Dynamic objective-specific plans; Trust and verifiable reasoning"
    )
    reused = _by_id(catalog.ideas)["idea:agentic-trust"]
    assert reused.name == "Trust and verifiable reasoning"
    whitelist = _by_id(catalog.projects)["project:whitelist"]
    assert "verifiable reasoning" in whitelist.summary
    assert "idea:agentic-trust" in whitelist.ideaIds
    assert client.visible is True
    assert client.confidential is False
    assert client.name == "Overmatch AI"

    public = export_public(catalog)
    assert public["projects"][0]["id"] == "project:overmatch-ai"
    published = _by_id(public["projects"])["project:overmatch-ai"]
    assert published["summary"] == (
        "Sample work in progress: product patterns I'm exploring as Design Lead at Overmatch AI."
    )
    assert published["visuals"] == ""
    assert published["patterns"] == (
        "Dynamic objective-specific plans; Trust and verifiable reasoning"
    )
    assert published["patternIdeaIds"] == [
        "idea:dynamic-objective-specific-plans",
        "idea:agentic-trust",
    ]
    assert "idea:dynamic-objective-specific-plans" in published["ideaIds"]
    assert "idea:agentic-trust" in published["ideaIds"]
    blob = json.dumps(
        {
            "project": published,
            "client": _by_id(public["clients"])["client:overmatch-ai"],
        }
    )
    assert "NEEDS TYLER" not in blob
    assert not contains_blocked(blob)


def test_blocklist_catches_a_synthetic_term():
    banned = frozenset({hashlib.sha256(b"zzforbidden").hexdigest()})
    assert contains_blocked("a zzforbidden note", banned)
    assert contains_blocked("zz forbidden", banned)
    assert contains_blocked("https://zzforbidden.example/a", banned)
    assert contains_blocked("https://cdn.example.com/zz-forbidden/file", banned)
    assert not contains_blocked("ordinary public sentence", banned)
    assert scan_public("https://zzforbidden.example/a", banned)
    assert scan_public("Designer / Design Director", banned) == []


def test_public_scan_rejects_blocked_terms():
    assert scan_public("Tyler, Product Designer")
    assert scan_public("Lead Product Designer")
    assert scan_public("senior product designer")
    assert scan_public("product-designer")
    assert scan_public("ProductDesigner")
    assert scan_public("product designers")
    assert scan_public("graduated in 2014")
    assert scan_public("still NEEDS TYLER")
    assert scan_public("Designer / Design Director") == []
    assert scan_public("Lead Designer") == []


def test_tracked_files_omit_blocked_plaintext():
    """Digests only. The plaintext forms are not stored in this test."""
    banned = frozenset({
        "0741e4137fe40db582bb91ef35da3ce83daa6d6ba35de784ba478a0f825f339e",
        "8be464106f2d6f1eabe7ff36c3e84d5eae6c5c24870887d7155640193af12545",
        "94cf3858beeb446a763d03b7d9180263e88cee425868a4bfca826879e16457a3",
        "c0fa256940a6b1be495b94822c9622931bfcd11dd42e818c600ec36aade2af1a",
        "e342afe5bdfedc90c2531e69ffa98768427d86212deab8abd2818da8997b5b13",
    })
    root = CONTENT_DIR.parent
    listed = __import__("subprocess").check_output(["git", "ls-files"], cwd=root, text=True).splitlines()
    skip = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".woff", ".woff2", ".bin", ".pdf"}
    hits = []
    for rel in listed:
        path = root / rel
        if not path.is_file() or path.suffix.lower() in skip:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if contains_blocked(text, banned):
            hits.append(rel)
    assert hits == []


def test_bad_seed_fails_validation(tmp_path: Path):
    for name in (
        "projects.json",
        "clients.json",
        "tools.json",
        "ideas.json",
        "disciplines.json",
        "origin.json",
        "relations.json",
        "overrides.json",
    ):
        (tmp_path / name).write_text((CONTENT_DIR / name).read_text(encoding="utf-8"), encoding="utf-8")
    projects = json.loads((tmp_path / "projects.json").read_text(encoding="utf-8"))
    for project in projects:
        if project["slug"] == "model-playground":
            project["role"] = "Product Designer"
    (tmp_path / "projects.json").write_text(json.dumps(projects), encoding="utf-8")
    report = validate(load_catalog(tmp_path))
    assert any("forbidden title" in error for error in report.errors)
    with pytest.raises(CatalogError):
        from pipeline.build import build_map

        build_map(
            content_dir=tmp_path,
            map_path=tmp_path / "map.json",
            nodes_path=tmp_path / "nodes.json",
            cache_path=None,
            embeddings_path=None,
            embed_fn=lambda texts: {key: [0.0] * 8 for key in texts},
        )


def test_section_anchors_are_unique_and_keep_the_wording():
    catalog = load_catalog()
    for project in catalog.projects:
        ids = [section.id for section in project.sections]
        assert ids == list(dict.fromkeys(ids))
        assert [section.model_dump() for section in project.sections] == sections_from_copy(project)
        for section in project.sections:
            assert getattr(project, section.id) == section.body


def test_every_section_renders_its_anchor():
    catalog = load_catalog()
    root = CONTENT_DIR.parent
    for project in catalog.projects:
        if not project.visible or project.confidential:
            continue
        html = render_work_page(project)
        page = (root / "work" / project.slug / "index.html").read_text(encoding="utf-8")
        assert page == html
        for section in project.sections:
            assert page.count(f'id="{section.id}"') == 1
            assert f'<section id="{section.id}">' in page
        assert scan_public(page) == []


def test_public_sections_pass_guards():
    public = export_public(load_catalog())
    blob = json.dumps([project["sections"] for project in public["projects"]])
    assert scan_public(blob) == []
    for project in public["projects"]:
        ids = [section["id"] for section in project["sections"]]
        assert ids == list(dict.fromkeys(ids))
        for section in project["sections"]:
            assert scan_public(section["title"]) == []
            assert scan_public(section["body"]) == []
            assert "NEEDS TYLER" not in section["body"]


def test_duplicate_and_non_kebab_section_ids_are_rejected():
    raw = json.loads((CONTENT_DIR / "projects.json").read_text(encoding="utf-8"))[0]
    duplicated = dict(raw)
    duplicated["sections"] = [
        {"id": "summary", "title": "Summary", "body": "One sentence."},
        {"id": "summary", "title": "Again", "body": "Another sentence."},
    ]
    with pytest.raises(ValidationError):
        Project.model_validate(duplicated)
    broken = dict(raw)
    broken["sections"] = [{"id": "Not Slug", "title": "Summary", "body": "One sentence."}]
    with pytest.raises(ValidationError):
        Project.model_validate(broken)
