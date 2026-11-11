import importlib.util
from pathlib import Path


def _gen():
    path = Path("design/source/gen.py")
    spec = importlib.util.spec_from_file_location("design_gen", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return path, module


def test_employer_clients_and_no_pc_health_app():
    path, module = _gen()
    model = module.build()
    employer = module.employer_public_name()
    names = [project["name"] for project in model["projects"]]
    assert "PC Health app" not in names
    assert "Loblaw" in names
    loblaw = next(project for project in model["projects"] if project["name"] == "Loblaw")
    remedy = next(project for project in model["projects"] if project["name"] == "Remedy")
    intuit = next(project for project in model["projects"] if project["name"] == "Intuit")
    assert loblaw["org"] == employer
    assert remedy["org"] == employer
    assert intuit["org"] == "Intuit"
    assert loblaw["themes"] == ["Systems"]
    assert loblaw["lane"] == 1
    assert loblaw["start"] == 2026.04
    assert loblaw["end"] == model["now"]
    role = next(item for item in model["roles"] if item["lane"] == 1 and item["end"] is None)
    assert role["name"] == employer.upper()
    assert employer not in path.read_text(encoding="utf-8")
    themes = Path("design/source/themes.md").read_text(encoding="utf-8")
    assert "PC Health app" not in themes
    assert "| Loblaw (2026–)" in themes
    assert employer not in themes
    html = Path("design/source/home.html").read_text(encoding="utf-8")
    assert "PC Health app" not in html
    assert ">Loblaw<" in html
