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
  const role = (await ask("chatter-brand", "What was your role?")).body as ProjectReply
  assert.equal(role.sectionId, "role")
  const why = (await ask("novart", "Why did this project exist?")).body as ProjectReply
  assert.equal(why.sectionId, "context")
  const tools = (await ask("loblaw", "What tools did you use?")).body as ProjectReply
  assert.equal(tools.sectionId, "tools")
  for (const reply of [role, why, tools]) {
    assert.ok(reply.answer.length > 0)
    assert.deepEqual(textIssues(reply.answer), [])
  }
})

test("a topic the project has not written up says so instead of repeating the intro", async () => {
  const reply = (await ask("chatter-brand", "What was the outcome?")).body as ProjectReply
  assert.equal(reply.sectionId, null)
  assert.match(reply.answer, /^I haven't written up the outcome for Chatter brand yet\. Ask me about the /)
  assert.deepEqual(textIssues(reply.answer), [])
})

test("a model answer that fails the checks falls back to the section", async () => {
  const invented = async () => "I led Remedy at a Fortune 500 Product Designer shop."
  const reply = await answerProject(project("novart"), "What did you do?", invented)
  assert.equal(reply.source, "section")
  const grounded = async () => "I redesigned the flow as two gates before a short form."
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
