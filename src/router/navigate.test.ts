import assert from "node:assert/strict"
import { test } from "node:test"
import { textIssues } from "@/src/content/guard"
import { publishCatalog } from "@/src/content/publish"
import { routeQuestion } from "./navigate"

const catalog = publishCatalog()
const onProject = (q: string, slug = "novart") => routeQuestion(q, catalog, { page: "project", slug })

test("contact questions answer with the public email on every page", () => {
  for (const reply of [onProject("How do I contact Tyler?"), onProject("What's your email?"), onProject("Are you on LinkedIn?")]) {
    assert.match(reply?.answer ?? "", new RegExp(catalog.profile.email))
    assert.equal(reply?.go, undefined)
    assert.deepEqual(textIssues(reply?.answer ?? ""), [])
  }
})

test("a project page sends travel to the globe and other projects to their pages", () => {
  assert.deepEqual(onProject("Where has Tyler travelled?")?.go, { href: "/chat", chat: true })
  assert.deepEqual(onProject("Have you been to Japan?")?.go, { href: "/chat", chat: true })
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

test("asking to see the work opens the media, in any of the ways people ask", () => {
  const asks = [
    "Show me images", "Show the media", "Show me the media", "Media", "the demo?", "Screens",
    "Can I see it?", "Open it", "let me see that", "Show me the demo", "Play the prototype",
    "Show me the designs", "What does it look like?", "What did the app look like?", "Show me how it works",
    "Can you show me the case study?", "Walk me through the screens", "I'd like to see the work",
    "Open the gallery", "View the project visuals", "Pull up the screenshots", "show me some examples",
    "Got anything visual for me?", "can I see what it looks like?", "What it looked like", "can I see what you built?", "show me what you designed", "see it in action", "Is there a demo?", "Do you have screenshots?", "any designs to look at?",
  ]
  for (const ask of asks) assert.equal(onProject(ask, "botpress")?.view, "images", ask)
})

test("questions about the work stay as answers, not the media", () => {
  for (const ask of ["What was your role?", "How did you approach the design?", "Why did it matter?", "Show me why it worked", "What was the outcome?", "Tell me about it", "Is there anything you would change?", "Do you have any regrets?", "How did you look at the problem?", "What did you look for in research?"]) {
    assert.equal(onProject(ask, "botpress")?.view, undefined, ask)
  }
})

test("a project's demo and study count as media, not only its images", () => {
  // Botpress has no gallery images; its media is the study's chapters.
  assert.equal(onProject("Show the media", "botpress")?.view, "images")
  assert.equal(onProject("Show me the demo", "intuit")?.view, "images")
})

test("a project with nothing to show says so", () => {
  const empty = catalog.projects.find((project) => !project.media?.cover && !project.media?.images.length && !["intuit", "loblaws", "botpress", "pc-chat", "pc-chat-memory"].includes(project.slug))
  if (!empty) return
  const reply = onProject("Show me images", empty.slug)
  assert.equal(reply?.view, undefined)
  assert.match(reply?.answer ?? "", /^There's no media for /)
  assert.deepEqual(textIssues(reply?.answer ?? ""), [])
})
