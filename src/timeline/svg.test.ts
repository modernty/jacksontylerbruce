import assert from "node:assert/strict"
import { test } from "node:test"
import { loadCatalog } from "@/src/content/catalog"
import { employerPublicName } from "@/src/content/employer"
import { toTimelineModel } from "./model"
import { publicStage } from "./stage-data"
import { desktopSvg, mobileSvg } from "./svg"

// The timeline used to match design/source/gen.py byte for byte. Projects now stack under their
// role's left edge, a deliberate change from that mock, so these check the layout itself.
test("each role's projects stack under its left edge, one row each", () => {
  const model = toTimelineModel(loadCatalog(), { includeFlagged: false })
  const svg = desktopSvg(model)
  const label = (name: string) => {
    const at = svg.indexOf(`aria-label="${name}"`)
    assert.ok(at >= 0, name)
    const match = svg.slice(at).match(/<text class="w4" x="([\d.]+)" y="([\d.]+)"/)
    assert.ok(match, name)
    return { x: Number(match[1]), y: Number(match[2]) }
  }
  const hue = label("USM Hue + Man")
  const milan = label("USM: Milan")
  assert.equal(milan.x, hue.x, "Milan stacks under Joba with Hue + Man")
  assert.equal(milan.y - hue.y, 15)
  const lazarus = ["Whitelist", "Lazarus brand", "Model Playground", "Talent Management"].map(label)
  assert.ok(lazarus.every((point) => point.x === lazarus[0].x))
  assert.deepEqual(lazarus.map((point) => point.y - lazarus[0].y), [0, 15, 30, 45])
  const jet = label("Fixed Rate Fixed Term")
  assert.ok(jet.x < label("Novart").x, "Jet's project sits at Jet's start, before Nax's")
  assert.ok(svg.includes(`>${employerPublicName().toUpperCase()}</tspan>`), "the current role reads the employer switch")
  assert.ok(label("Loblaw / PC Health").x === label("Intuit").x)
})

test("the mobile timeline still renders every public project", () => {
  const model = toTimelineModel(loadCatalog(), { includeFlagged: false })
  const svg = mobileSvg(model)
  for (const project of model.projects.filter((item) => item.onTimeline)) assert.ok(svg.includes(project.name), project.name)
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
