import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { test } from "node:test"
import { loadCatalog } from "@/src/content/catalog"
import { toTimelineModel } from "./model"
import { publicStage } from "./stage-data"
import { desktopSvg, mobileSvg } from "./svg"

test("the typescript timeline matches gen.py", () => {
  const raw = execFileSync("python3", ["-c", `
import importlib.util, json
spec = importlib.util.spec_from_file_location("design_gen", "design/source/gen.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
model = mod.build()
print(json.dumps({"desktop": mod.desktop(model), "mobile": mod.mobile(model)}))
`], { encoding: "utf8", maxBuffer: 8_000_000 })
  const expected = JSON.parse(raw) as { desktop: string; mobile: string }
  const model = toTimelineModel(loadCatalog(), { includeFlagged: true })
  assert.equal(desktopSvg(model), expected.desktop)
  assert.equal(mobileSvg(model), expected.mobile)
})

test("public views omit flagged work and link real sections", () => {
  const stage = publicStage()
  const catalog = loadCatalog()
  const hidden = catalog.projects.filter((project) => project.flagged)
  const blob = `${stage.desktop}\n${stage.mobile}\n${JSON.stringify(stage.cards)}`
  for (const project of hidden) {
    assert.equal(blob.includes(project.name), false, project.name)
    assert.equal(blob.includes(`/work/${project.slug}`), false, project.slug)
  }
  for (const card of stage.cards) {
    const [path, hash] = card.u.split("#")
    const slug = path?.replace("/work/", "")
    const project = catalog.projects.find((item) => item.slug === slug)
    assert.equal(project?.flagged, false)
    assert.equal(project?.sections.some((section) => section.id === hash), true, card.u)
    assert.ok(card.f.length > 0)
  }
})
