import assert from "node:assert/strict"
import { test } from "node:test"
import { textIssues } from "@/src/content/guard"
import { publishCatalog } from "@/src/content/publish"
import { routeQuestion } from "./navigate"

const catalog = publishCatalog()
const onProject = (q: string, slug = "novart") => routeQuestion(q, catalog, { page: "project", slug })
const onAbout = (q: string) => routeQuestion(q, catalog, { page: "about" })

test("contact questions answer with the public email on every page", () => {
  for (const reply of [onProject("How do I contact Tyler?"), onAbout("What's your email?"), onAbout("Are you on LinkedIn?")]) {
    assert.match(reply?.answer ?? "", new RegExp(catalog.profile.email))
    assert.equal(reply?.go, undefined)
    assert.deepEqual(textIssues(reply?.answer ?? ""), [])
  }
})

test("a project page sends travel to the globe and other projects to their pages", () => {
  assert.deepEqual(onProject("Where has Tyler travelled?")?.go, { href: "/about", handoff: true })
  assert.deepEqual(onProject("Have you been to Japan?")?.go, { href: "/about", handoff: true })
  assert.deepEqual(onProject("Take me to Model Playground")?.go, { href: "/work/model-playground" })
  assert.deepEqual(onProject("Show me all of your projects")?.go, { href: "/chat", chat: true })
  assert.deepEqual(onProject("Take me to the timeline")?.go, { href: "/timeline#axis" })
  assert.deepEqual(onProject("Go back")?.go, { href: "back" })
})

test("a project page keeps its own questions, and comparisons stay put", () => {
  assert.equal(onProject("What was your role?"), null)
  assert.equal(onProject("Tell me about Novart"), null)
  assert.equal(onProject("How does this compare to Model Playground?"), null)
})

test("asking for images opens them, or says there are none yet", () => {
  assert.equal(onProject("Show me images")?.view, "images")
  const empty = onProject("Show me images", "rv")
  assert.equal(empty?.view, undefined)
  assert.match(empty?.answer ?? "", /haven't added images for RV/)
})

test("About keeps places and sends commands to projects", () => {
  assert.deepEqual(onAbout("Take me back to Novart")?.go, { href: "/work/novart" })
  assert.equal(onAbout("Show me Milan"), null)
  assert.equal(onAbout("Have you been to Japan?"), null)
  assert.equal(onAbout("Where has Tyler travelled?"), null)
})
