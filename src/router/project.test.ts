import assert from "node:assert/strict"
import { test } from "node:test"
import { textIssues } from "@/src/content/guard"
import { loadCatalog } from "@/src/content/catalog"
import { publishCatalog } from "@/src/content/publish"
import { MemoryStore } from "./store"
import { answerProject, handleProjectAsk, type ProjectReply } from "./project"

const project = (slug: string) => publishCatalog().projects.find((item) => item.slug === slug)!
const ask = (slug: string, q: string, model: Parameters<typeof answerProject>[2] = null) =>
  handleProjectAsk({ slug, q, sessionId: "test" }, { ip: "1.1.1.1" }, { store: new MemoryStore(), model })

test("questions draw from the matching generated section", async () => {
  const why = (await ask("novart", "Why did this project exist?")).body as ProjectReply
  assert.equal(why.sectionId, "context")
  const ideas = (await ask("loblaws", "What are the core ideas?")).body as ProjectReply
  // The core ideas close the Approach now; the reply is that line.
  assert.equal(ideas.sectionId, "approach")
  assert.match(ideas.answer, /consent and data trust/i)
  for (const reply of [why, ideas]) {
    assert.ok(reply.answer.length > 0)
    assert.deepEqual(textIssues(reply.answer), [])
  }
})

test("role, tools and a Core ideas section are hidden from every project; the ideas close one section and never name other projects", () => {
  const names = publishCatalog().projects.flatMap((project) => [project.name, ...project.aliases])
  for (const item of publishCatalog().projects) {
    const ids = item.sections.map((section) => section.id)
    assert.ok(!ids.includes("role"), `${item.slug} shows a role`)
    assert.ok(!ids.includes("tools"), `${item.slug} shows tools`)
    assert.ok(!ids.includes("ideas"), `${item.slug} shows a Core ideas section`)
    const lines = item.sections.flatMap((section) => section.body.split("\n\n")).filter((paragraph) => paragraph.startsWith("Built on"))
    assert.ok(lines.length <= 1, `${item.slug} has more than one ideas line`)
    for (const line of lines) for (const name of names) if (name.length > 3) assert.ok(!line.includes(name), `${item.slug}: ${line}`)
  }
  const loblaws = publishCatalog().projects.find((project) => project.slug === "loblaws")
  const approach = loblaws?.sections.find((section) => section.id === "approach")
  assert.match(approach?.body ?? "", /Built on three ideas: consent and data trust; trust and verifiable reasoning; making AI legible\.$/)
})

test("a topic the project has not written up says so instead of repeating the intro", async () => {
  const reply = (await ask("lzr-2", "What was the outcome?")).body as ProjectReply
  assert.equal(reply.sectionId, null)
  assert.match(reply.answer, /^The outcome for LZR 2\.0 isn't written up yet\./)
  assert.deepEqual(textIssues(reply.answer), [])
})

test("a model answer that fails the checks falls back to the section", async () => {
  const invented = async () => "I led Traveller at a Fortune 500 shop."
  const reply = await answerProject(project("novart"), "What did you do?", invented)
  assert.equal(reply.source, "section")
  const grounded = async () => "Redesigned the flow as two gates before a short form."
  assert.equal((await answerProject(project("novart"), "What did you do?", grounded)).source, "model")
})

test("hidden or unknown projects are not answerable", async () => {
  const hidden = loadCatalog().projects.find((item) => item.flagged)!
  assert.equal((await ask(hidden.slug, "What is this?")).status, 404)
  assert.equal((await ask("nope", "What is this?")).status, 404)
})

test("bad input and rate limits are refused", async () => {
  assert.equal((await handleProjectAsk({ slug: "novart" }, { ip: "x" })).status, 400)
  assert.equal((await ask("novart", "x".repeat(401))).status, 400)
  const store = new MemoryStore()
  let last = 0
  for (let index = 0; index < 11; index += 1) {
    last = (await handleProjectAsk({ slug: "novart", q: "Why?", sessionId: "s" }, { ip: "9.9.9.9" }, { store, model: null })).status
  }
  assert.equal(last, 429)
})

test("when the rules miss a request to look, the model can open the media", async () => {
  // Phrasing no rule catches, so the question reaches the model, which signals the media.
  const looks = async () => "OPEN_MEDIA"
  const reply = (await ask("botpress", "I am a visual person, help me out", looks)).body as ProjectReply
  assert.equal(reply.view, "images")
  assert.match(reply.answer, /^Here is the media from Botpress\./)
  // A project with nothing to show never opens an empty panel, whatever the model says.
  const bare = publishCatalog().projects.find((item) => !item.media?.cover && !item.media?.images.length && !["intuit", "loblaws", "botpress", "pc-chat", "pc-chat-memory"].includes(item.slug))
  if (bare) assert.notEqual(((await answerProject(bare, "Got anything visual?", looks)) as ProjectReply).view, "images")
})
