import assert from "node:assert/strict"
import { test } from "node:test"
import { loadCatalog } from "@/src/content/catalog"
import { publishCatalog } from "@/src/content/publish"
import { runTool, workAgent, workAllowed, type WorkClient } from "./agent"
import { handleChatAsk, wantsWork } from "./chat"
import { MemoryStore } from "./store"

const catalog = publishCatalog()
const hidden = loadCatalog().projects.filter((project) => project.flagged)

/** A fake model: reads the projects it is given, then replies. */
const reads = (slugs: string[], reply: Record<string, unknown>, seen: string[] = []): WorkClient => {
  let round = 0
  return async ({ messages }) => {
    const last = messages[messages.length - 1]
    if (Array.isArray(last.content)) for (const block of last.content as { content: string }[]) seen.push(block.content)
    round++
    if (round === 1 && slugs.length) return { content: slugs.map((slug, index) => ({ type: "tool_use", id: `t${index}`, name: "read_project", input: { slug } })) }
    return { content: [{ type: "tool_use", id: "r", name: "reply", input: reply }] }
  }
}

const COMPARE = "Intuit folds invoicing into a conversation inside ChatGPT, so the interface recedes. Loblaw / PC Health puts a front door to care inside a loyalty app. Both make a complex service feel like one place."

test("a project question reads the project before replying, and the reply keeps only public slugs", async () => {
  const seen: string[] = []
  const statuses: string[] = []
  const out = await workAgent("What's the difference between Intuit and Loblaw?", [], {
    client: reads(["intuit", "loblaw"], { answer: COMPARE, projects: ["intuit", "loblaw", "remedy"], followUps: ["What are the seven touchpoints in the Intuit flow?", "What does the PC Health care team include?", "How was the Intuit prototype approved?"] }, seen),
    onStatus: (status) => statuses.push(status),
  })
  assert.ok(out)
  assert.deepEqual(out.projects, ["intuit", "loblaw"])
  assert.equal(out.followUps.length, 3)
  assert.match(seen.join("\n"), /Seven touchpoints/)
  assert.match(seen.join("\n"), /front door to care/)
  assert.deepEqual(statuses, ["thinking", "reading"])
})

test("tools never return a hidden project", () => {
  const listed = runTool("list_work", {}, catalog).split("\n").map((line) => line.split(" | ")[0])
  for (const project of hidden) {
    assert.ok(!listed.includes(project.slug), `${project.slug} listed`)
    assert.match(runTool("read_project", { slug: project.slug }, catalog), /^No public project/)
  }
})

test("an answer that names a hidden project, breaks the voice or runs long is not shown", async () => {
  assert.equal(workAllowed("Remedy is a health chat with citations."), false)
  assert.equal(workAllowed("Tyler designed the flow."), false)
  assert.equal(workAllowed("Want to see more?"), false)
  assert.equal(workAllowed(Array.from({ length: 140 }, () => "word").join(" ") + "."), false)
  assert.equal(workAllowed(COMPARE), true)
  const out = await workAgent("Tell me about the health work", [], { client: reads([], { answer: "Remedy handles consent.", projects: [], followUps: [] }) })
  assert.equal(out, null)
})

test("showing a project stays instant; asking about one, or comparing, goes to the agent", () => {
  for (const q of ["Show me loblaw", "loblaw", "Tell me about Intuit", "open intuit", "Show me Intuit and Loblaw"]) assert.equal(wantsWork(q, catalog), false, q)
  for (const q of ["What is the core challenge of Loblaw project", "What's the difference between intuit and Loblaw", "How was the Intuit prototype approved?", "Compare Intuit with Overmatch AI"]) assert.equal(wantsWork(q, catalog), true, q)
  assert.equal(wantsWork("what was the outcome?", catalog, { open: "intuit" }), true)
  assert.equal(wantsWork("why?", catalog, { last: { q: "x", a: "y", source: "work" } }), true)
  assert.equal(wantsWork("why?", catalog, { last: { q: "x", a: "y", source: "site" } }), false)
})

test("the chat answers a project question with the agent's words, linked projects and its follow-ups", async () => {
  const follow = ["What are the seven touchpoints in the Intuit flow?", "What does the PC Health care team include?", "How was the Intuit prototype approved?"]
  const reply = await handleChatAsk(
    { q: "What's the difference between Intuit and Loblaw?", sessionId: "s" },
    { ip: "1" },
    { store: new MemoryStore(), env: { NODE_ENV: "test", DAILY_USD_CAP: "5" }, work: reads(["intuit", "loblaw"], { answer: COMPARE, projects: ["intuit", "loblaw"], followUps: follow }) },
  )
  assert.equal(reply.status, 200)
  assert.ok("answer" in reply.body)
  assert.equal(reply.body.answer, COMPARE)
  assert.equal(reply.body.source, "work")
  assert.deepEqual(reply.body.projects, ["intuit", "loblaw"])
  assert.deepEqual(reply.body.followUps, follow)
})

test("without the model, a project question falls back to the site's own answer", async () => {
  const reply = await handleChatAsk({ q: "What is the core challenge of the Intuit project?", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.equal(reply.status, 200)
  assert.ok("projects" in reply.body && reply.body.projects?.includes("intuit"))
})
