import assert from "node:assert/strict"
import { test } from "node:test"
import { NUDGE_AFTER, OUTSIDE, handleChatAsk, isFollowUp, readMisses } from "./chat"
import { openSystem, pastMessages, readBlocks, type OpenClient, type PastTurn } from "./converse"
import { MemoryStore } from "./store"

const FAVOURITES: PastTurn = { q: "Who are his favorite designers or studios?", a: "Rem Koolhaas, SANAA, Zaha Hadid Architects, Le Corbusier, Valerio Olgiati, Tadao Ando, Chris Precht, Bjarke Ingels, and more.", source: "site" }
const says = (text: string, sources: { title: string; url: string }[] = []): OpenClient => async (_request, onStatus) => {
  onStatus("searching")
  return { text, sources }
}
const chat = (q: string, history: PastTurn[], open: OpenClient | null, extra: { store?: MemoryStore; statuses?: string[]; env?: NodeJS.ProcessEnv } = {}) =>
  handleChatAsk({ q, sessionId: "s", history }, { ip: "1" }, { store: extra.store ?? new MemoryStore(), env: extra.env ?? { NODE_ENV: "test", DAILY_USD_CAP: "5" }, open, onStatus: (status) => extra.statuses?.push(status) })

test("a follow-up leans on the last answer and names nothing on the site", () => {
  for (const q of ["Who is this person?", "Like what kind of soy sauce bottle?", "Why?", "Tell me more", "Who is Rem Koolhaas?", "what is that"]) assert.equal(isFollowUp(q), true, q)
  for (const q of ["Show me his AI work", "What did he do at Lazarus?", "Tell me about Novart", "What is his process?", "Show me your projects"]) assert.equal(isFollowUp(q), false, q)
})

test("a follow-up to a Q&A answer reaches the model with the conversation, and comes back as an open answer", async () => {
  let seen: { role: string; content: string }[] = []
  const statuses: string[] = []
  const client: OpenClient = async (request, onStatus) => {
    seen = request.messages
    onStatus("searching")
    return { text: "Rem Koolhaas is a Dutch architect and the founder of OMA.", sources: [{ title: "OMA", url: "https://www.oma.com/" }] }
  }
  const reply = await chat("Who is this person?", [FAVOURITES], client, { statuses })
  assert.equal(reply.status, 200)
  assert.ok("answer" in reply.body)
  assert.equal(reply.body.source, "open")
  assert.match(reply.body.answer, /Rem Koolhaas/)
  assert.deepEqual(reply.body.sources, [{ title: "OMA", url: "https://www.oma.com/" }])
  // The model saw the favourites answer before the question.
  assert.deepEqual(seen.map((message) => message.role), ["user", "assistant", "user"])
  assert.match(seen[1].content, /Zaha Hadid/)
  assert.equal(seen[2].content, "Who is this person?")
  // Status comes before the reply.
  assert.deepEqual(statuses, ["thinking", "searching"])
})

test("a question about the work after an open turn is a site answer again, with no model call", async () => {
  let called = false
  const client: OpenClient = async () => {
    called = true
    return { text: "x", sources: [] }
  }
  const history: PastTurn[] = [FAVOURITES, { q: "Who is this person?", a: "Rem Koolhaas is a Dutch architect.", source: "open" }]
  const reply = await chat("Show me your projects", history, client)
  assert.ok("projects" in reply.body && reply.body.projects?.length)
  assert.equal(called, false)
  const qa = await chat("Does he have a dog?", history, client)
  assert.ok("answer" in qa.body && qa.body.answer.startsWith("Winston."))
  assert.equal(called, false)
})

test("a question outside the site goes to the model; the note shows from the third open answer", async () => {
  const open = (n: number): PastTurn[] => Array.from({ length: n }, (_, index) => ({ q: `q${index}`, a: `a${index}`, source: "open" as const }))
  const first = await chat("What is the capital of France?", [], says("Paris."))
  assert.ok("answer" in first.body)
  assert.equal(first.body.answer, "Paris.")
  assert.equal(first.body.nudge, undefined)
  const second = await chat("What is the capital of France?", open(NUDGE_AFTER - 2), says("Paris."))
  assert.ok("answer" in second.body && !second.body.nudge)
  const third = await chat("What is the capital of France?", open(NUDGE_AFTER - 1), says("Paris."))
  assert.ok("answer" in third.body && third.body.nudge === true)
})

test("with no key, an error, the cap reached or a blocked answer, the site says so and offers contact", async () => {
  const none = await chat("What is the capital of France?", [], null)
  assert.deepEqual(none.body, { answer: OUTSIDE, contact: true })
  const broken: OpenClient = async () => {
    throw new Error("down")
  }
  assert.deepEqual((await chat("What is the capital of France?", [], broken)).body, { answer: OUTSIDE, contact: true })
  assert.deepEqual((await chat("What is the capital of France?", [], says("Ask about Remedy instead."))).body, { answer: OUTSIDE, contact: true })
  // Cap reached: the model is not called at all.
  const store = new MemoryStore()
  const { recordSpend } = await import("./limits")
  await recordSpend(5, Date.now(), store)
  let called = false
  const client: OpenClient = async () => {
    called = true
    return { text: "Paris.", sources: [] }
  }
  const capped = await chat("What is the capital of France?", [], client, { store, env: { NODE_ENV: "test", DAILY_USD_CAP: "1" } })
  assert.deepEqual(capped.body, { answer: OUTSIDE, contact: true })
  assert.equal(called, false)
  // A missing cap also fails closed.
  called = false
  const uncapped = await chat("What is the capital of France?", [], client, { env: { NODE_ENV: "test" } })
  assert.deepEqual(uncapped.body, { answer: OUTSIDE, contact: true })
  assert.equal(called, false)
})

test("when the model asks for a site view, the reply is the site's own", async () => {
  const client: OpenClient = async () => ({ text: "", sources: [], view: { intent: "project", focusIds: ["project:novart"], filter: "work", annotation: "Novart.", followUps: ["a", "b", "c"] } })
  const reply = await chat("and the art one?", [{ q: "q", a: "a", source: "open" }], client)
  assert.ok("projects" in reply.body)
  assert.deepEqual(reply.body.projects, ["novart"])
  assert.equal(reply.body.source, "site")
})

test("questions the exact answers missed are kept, with what answered them", async () => {
  const store = new MemoryStore()
  await chat("What is the capital of France?", [], says("Paris."), { store })
  await chat("What is the capital of Spain?", [], null, { store })
  const misses = await readMisses(store)
  assert.deepEqual(misses.map((miss) => [miss.q, miss.how]), [["What is the capital of Spain?", "fallback"], ["What is the capital of France?", "open"]])
})

test("the model gets the conversation trimmed, the site facts and the rules", () => {
  assert.equal(pastMessages(Array.from({ length: 9 }, (_, index) => ({ q: `q${index}`, a: "a" }))).length, 12)
  const system = openSystem()
  assert.match(system, /Studied Architecture at Virginia Tech\./)
  assert.match(system, /never "architect"/)
  assert.match(system, /soy sauce bottle/i)
})

test("only the words after the last search are the answer, with the pages they cite", () => {
  const read = readBlocks([
    { type: "text", text: "Let me look that up." },
    { type: "server_tool_use", name: "web_search" },
    { type: "web_search_tool_result" },
    { type: "text", text: "Kenji Ekuan designed it ", citations: [{ url: "https://example.org/a", title: "Kikkoman bottle" }] },
    { type: "text", text: "in 1961.", citations: [{ url: "https://example.org/a", title: "Kikkoman bottle" }, { url: "http://insecure.example", title: "no" }] },
  ])
  assert.equal(read.text, "Kenji Ekuan designed it in 1961.")
  assert.deepEqual(read.sources, [{ title: "Kikkoman bottle", url: "https://example.org/a" }])
})

test("a loosely worded Q&A question gets the authored answer by key, and is kept as a fuzzy hit", async () => {
  const store = new MemoryStore()
  const { hydrate } = await import("./llm")
  const routeModel = async (question: string) => hydrate({ qaKey: "favorite-studios", intent: "about", focusIds: [], filter: "sheet", annotation: "x", followUps: ["a", "b", "c"] }, question)
  const reply = await handleChatAsk({ q: "whos his fav designers", sessionId: "s" }, { ip: "1" }, { store, env: { NODE_ENV: "test", DAILY_USD_CAP: "5" }, routeModel, open: null })
  assert.ok("answer" in reply.body)
  assert.match(reply.body.answer, /^Rem Koolhaas, SANAA/)
  assert.deepEqual((await readMisses(store)).map((miss) => miss.how), ["qa-fuzzy:favorite-studios"])
})
