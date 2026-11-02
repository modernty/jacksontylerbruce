import assert from "node:assert/strict"
import { test } from "node:test"
import { loadCatalog } from "./catalog"
import { textIssues } from "./guard"
import { publishCatalog } from "./publish"

test("sections are generated from each project's own data, so the sets differ", () => {
  const shapes = new Set(publishCatalog().projects.map((project) => project.sections.map((section) => section.id).join(",")))
  assert.ok(shapes.size >= 6, `only ${shapes.size} distinct section sets`)
  for (const project of publishCatalog().projects) {
    assert.equal(project.sections[0]?.id, "summary", `${project.slug} leads with its summary`)
  }
})

test("generated sections pass the public checks and never name hidden work", () => {
  const hidden = loadCatalog().projects.filter((project) => project.flagged).map((project) => project.name)
  for (const project of publishCatalog().projects) {
    for (const section of project.sections) {
      const text = [section.body, ...section.items.flatMap((item) => [item.label, item.note ?? "", item.href ?? ""])].join(" ")
      assert.deepEqual(textIssues(text), [], `${project.slug}#${section.id}`)
      for (const name of hidden) assert.ok(!text.includes(`in ${name}`), `${project.slug}#${section.id} cites ${name}`)
    }
  }
})
