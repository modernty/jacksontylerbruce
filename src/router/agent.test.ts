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

const COMPARE = "Intuit folds invoicing into a conversation inside ChatGPT, so the interface recedes. Loblaws / PC Health puts a front door to care inside a loyalty app. Both make a complex service feel like one place."

test("a project question reads the project before replying, and the reply keeps only public slugs", async () => {
  const seen: string[] = []
  const statuses: string[] = []
  const out = await workAgent("What's the difference between Intuit and Loblaw?", [], {
    client: reads(["intuit", "loblaws"], { answer: COMPARE, projects: ["intuit", "loblaws", "traveller"], followUps: ["What are the seven touchpoints in the Intuit flow?", "What does the PC Health care team include?", "How was the Intuit prototype approved?"] }, seen),
    onStatus: (status) => statuses.push(status),
  })
  assert.ok(out)
  assert.deepEqual(out.projects, ["intuit", "loblaws"])
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
  assert.equal(workAllowed("Traveller is a trip planner."), false)
  assert.equal(workAllowed("Tyler designed the flow."), false)
  assert.equal(workAllowed("Want to see more?"), false)
  assert.equal(workAllowed(Array.from({ length: 140 }, () => "word").join(" ") + "."), false)
  assert.equal(workAllowed(COMPARE), true)
  const out = await workAgent("Tell me about the health work", [], { client: reads([], { answer: "Traveller handles consent.", projects: [], followUps: [] }) })
  assert.equal(out, null)
})

test("showing a project stays instant; asking about one, or comparing, goes to the agent", () => {
  for (const q of ["Show me loblaw", "loblaws", "Tell me about Intuit", "open intuit", "Show me Intuit and Loblaw"]) assert.equal(wantsWork(q, catalog), false, q)
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
    { store: new MemoryStore(), env: { NODE_ENV: "test", DAILY_USD_CAP: "5" }, work: reads(["intuit", "loblaws"], { answer: COMPARE, projects: ["intuit", "loblaws"], followUps: follow }) },
  )
  assert.equal(reply.status, 200)
  assert.ok("answer" in reply.body)
  assert.equal(reply.body.answer, COMPARE)
  assert.equal(reply.body.source, "work")
  assert.deepEqual(reply.body.projects, ["intuit", "loblaws"])
  assert.deepEqual(reply.body.followUps, follow)
})

test("without the model, a project question falls back to the site's own answer", async () => {
  const reply = await handleChatAsk({ q: "What is the core challenge of the Intuit project?", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.equal(reply.status, 200)
  assert.ok("projects" in reply.body && reply.body.projects?.includes("intuit"))
})

/** A fake model that reads the practice first, then replies. */
const practises = (reply: Record<string, unknown>, seen: string[] = []): WorkClient => {
  let round = 0
  return async ({ messages }) => {
    const last = messages[messages.length - 1]
    if (Array.isArray(last.content)) for (const block of last.content as { content: string }[]) seen.push(block.content)
    round++
    if (round === 1) return { content: [{ type: "tool_use", id: "p", name: "read_practice", input: {} }] }
    return { content: [{ type: "tool_use", id: "r", name: "reply", input: reply }] }
  }
}

const PROCESS = "It starts inside the problem, with the people it is for, before any screen. One core idea comes out of that time, and every detail answers to it. Intuit shows it: one conversation instead of an app to open."

test("questions about how Tyler works go to the work agent, which reads the practice, and never open the timeline", async () => {
  for (const q of ["Walk me through your process", "How do you work?", "What's your design philosophy?", "Walk me through how you think about trust", "What's your approach to a new project?"]) {
    const seen: string[] = []
    const reply = await handleChatAsk(
      { q, sessionId: "s" },
      { ip: "1" },
      { store: new MemoryStore(), env: { NODE_ENV: "test", DAILY_USD_CAP: "5" }, work: practises({ answer: PROCESS, projects: ["intuit"], panel: "timeline", followUps: ["What did you learn inside the Intuit problem?", "How do you find the core idea?", "What happens after the idea?"] }, seen) },
    )
    const body = reply.body as { answer: string; panel?: string; source?: string }
    assert.equal(body.source, "work", q)
    assert.equal(body.answer, PROCESS, q)
    assert.equal(body.panel, undefined, q)
    assert.match(seen.join("\n"), /Earn the right to remember/, q)
    assert.match(seen.join("\n"), /Grounded in architecture/, q)
  }
})

test("with no model, a question about how Tyler works answers from the site, never the timeline", async () => {
  for (const q of ["Walk me through your process", "How do you work?", "What's your approach to a new project?"]) {
    const reply = await handleChatAsk({ q, sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
    const body = reply.body as { answer: string; panel?: string }
    assert.equal(body.panel, undefined, q)
    assert.match(body.answer, /Inside the problem/, q)
  }
})

test("the career still opens the timeline", async () => {
  for (const q of ["Walk me through your career", "Show me your resume", "Tell me about your experience"]) {
    const reply = await handleChatAsk({ q, sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test", DAILY_USD_CAP: "5" }, work: practises({ answer: "x", projects: [], followUps: [] }) })
    assert.equal((reply.body as { panel?: string }).panel, "timeline", q)
  }
})
