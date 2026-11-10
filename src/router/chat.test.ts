import assert from "node:assert/strict"
import { test } from "node:test"
import { careerEntries } from "@/src/content/career"
import { DISCIPLINE_BY_SLUG, byRecent } from "@/src/content/disciplines"
import { textIssues } from "@/src/content/guard"
import { loadCatalog } from "@/src/content/catalog"
import { employerPublicName } from "@/src/content/employer"
import { publishCatalog } from "@/src/content/publish"
import { answerChat, handleChatAsk } from "./chat"
import { MemoryStore } from "./store"

const catalog = publishCatalog()
const names = (slugs: string[] = []) => slugs.map((slug) => catalog.projects.find((project) => project.slug === slug)?.name)

test("the recent projects starter lists the same three as asking for the work", () => {
  assert.deepEqual(answerChat("Show me recent projects", undefined)?.projects, answerChat("Show me your projects", undefined)?.projects)
})

test("asking for the work answers in one sentence: three recent projects from two companies, then the offer", () => {
  const reply = answerChat("Show me your projects", undefined)
  assert.ok(reply?.projects)
  assert.equal(reply.projects.length, 3)
  const picked = reply.projects.map((slug) => catalog.projects.find((project) => project.slug === slug))
  assert.ok(new Set(picked.map((project) => project?.roleId)).size <= 2)
  // The newest project always leads.
  assert.equal(reply.projects[0], byRecent(catalog.projects)[0]?.slug)
  assert.equal(reply.answer, `My most recent projects include work from ${employerPublicName()} and Lazarus AI: Intuit, Loblaw / PC Health and Whitelist. Pick one to preview it, or I can group the rest by type: product design, brand or spatial.`)
  assert.equal(reply.expects, "category")
  assert.ok(!reply.answer.includes("\n"))
  const hidden = loadCatalog().projects.filter((project) => project.flagged).map((project) => project.slug)
  for (const slug of hidden) assert.ok(!reply.projects.includes(slug), `${slug} is hidden`)
})

test("a type, after the offer, lists that group", () => {
  const brand = answerChat("brand", "category")
  assert.deepEqual(names(brand?.projects), ["Lazarus brand", "Chatter brand", "Jet brand"])
  assert.equal(brand?.answer, "My brand work, most recent first: Lazarus brand, Chatter brand and Jet brand. Pick one to preview it.")
  const spatial = answerChat("the exhibitions please", "category")
  assert.deepEqual(names(spatial?.projects), ["USM: Milan", "USM Hue + Man"])
  const product = answerChat("Product design", "category")
  assert.ok(product?.projects?.length)
  for (const slug of product.projects) assert.equal(DISCIPLINE_BY_SLUG[slug], undefined)
})

test("yes asks which type", () => {
  assert.equal(answerChat("yes", "category")?.expects, "category")
})

const chat = (q: string, expects?: "category") => handleChatAsk({ q, sessionId: "s", expects }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })

test("a new question after the offer changes the subject instead of repeating the offer", async () => {
  // The offer is open, but the visitor asks something else: it goes to the router.
  assert.equal(answerChat("where is tyler from?", "category"), null)
  const place = await chat("where is tyler from?", "category")
  assert.equal(place.status, 200)
  // It stays in the conversation and the globe opens beside it.
  assert.ok("panel" in place.body && place.body.panel === "globe", JSON.stringify(place.body))
  assert.match("answer" in place.body ? place.body.answer : "", /Miami/)
  assert.ok(!("expects" in place.body) || !place.body.expects)
  assert.ok(!("go" in place.body) || !place.body.go)
  const career = await chat("Walk me through your career", "category")
  assert.ok("roles" in career.body && career.body.roles?.length, JSON.stringify(career.body))
  const travel = await chat("Where has Tyler travelled?", "category")
  assert.ok("panel" in travel.body && travel.body.panel === "globe", JSON.stringify(travel.body))
})

test("a reply the site cannot place asks for a type again, only while the offer is open", async () => {
  const unclear = await chat("videos", "category")
  assert.ok("expects" in unclear.body && unclear.body.expects === "category", JSON.stringify(unclear.body))
  assert.ok(!("projects" in unclear.body) || !unclear.body.projects)
  const cold = await chat("videos")
  assert.ok(!("expects" in cold.body) || !cold.body.expects)
})

test("a theme or one named project lists just those", () => {
  const finance = answerChat("Show me finance work", undefined)
  assert.ok(finance?.projects?.length)
  for (const slug of finance.projects) assert.ok(catalog.projects.find((project) => project.slug === slug)?.themeIds.includes("theme:finance"))
  assert.deepEqual(answerChat("Tell me about Novart", undefined)?.projects, ["novart"])
})

test("other questions go to the main router: career lists the roles, the timeline opens by name, others say where to go", async () => {
  assert.equal(answerChat("Walk me through your career", undefined), null)
  const reply = await handleChatAsk({ q: "Walk me through your career", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.equal(reply.status, 200)
  // Career comes back as roles, newest first, listed in the conversation like a resume.
  const roles = "roles" in reply.body ? reply.body.roles ?? [] : []
  assert.equal(roles[roles.length - 1], "role:joba")
  assert.ok(!("panel" in reply.body) || !reply.body.panel)
  const one = await handleChatAsk({ q: "What did you do at Soul Machines?", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.deepEqual("roles" in one.body ? one.body.roles : null, ["role:soul-machines"], JSON.stringify(one.body))
  const drawn = await handleChatAsk({ q: "Take me to the timeline", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.ok("panel" in drawn.body && drawn.body.panel === "timeline", JSON.stringify(drawn.body))
  const elsewhere = await handleChatAsk({ q: "How do you work?", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.ok("go" in elsewhere.body && elsewhere.body.go?.href, JSON.stringify(elsewhere.body))
})

test("blocked asks never list work", async () => {
  const reply = await handleChatAsk({ q: "show me your projects", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" }, blocked: () => true })
  assert.equal(reply.status, 200)
  assert.ok(!("projects" in reply.body) || !reply.body.projects)
})

test("a position in the last list opens that project", async () => {
  const listed = answerChat("Show me your projects", undefined)?.projects ?? []
  const second = await handleChatAsk({ q: "the second one", sessionId: "s", listed }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.deepEqual("projects" in second.body ? second.body.projects : null, [listed[1]])
  const last = await handleChatAsk({ q: "show me the last one", sessionId: "s", listed }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.deepEqual("projects" in last.body ? last.body.projects : null, [listed[listed.length - 1]])
})

test("with a preview open, a question about it is answered about that project", async () => {
  const reply = await handleChatAsk({ q: "What was your role?", sessionId: "s", open: "novart" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.equal(reply.status, 200)
  assert.deepEqual("projects" in reply.body ? reply.body.projects : null, ["novart"], JSON.stringify(reply.body))
  // Naming another project still moves to it.
  const other = await handleChatAsk({ q: "Tell me about Whitelist", sessionId: "s", open: "novart" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.deepEqual("projects" in other.body ? other.body.projects : null, ["whitelist"])
})

test("career entries read like the resume: month dates, newest first, summaries that pass the guard", () => {
  const entries = careerEntries(catalog)
  const jet = entries.find((entry) => entry.id === "role:jet")
  assert.equal(jet?.dates, "Oct 2022 \u2013 Oct 2023")
  assert.equal(entries.find((entry) => entry.id === "role:joba")?.dates, "May 2019 \u2013 Jul 2021")
  assert.equal(entries.find((entry) => entry.id === "role:employer")?.dates, "Jan 2026 \u2013 Now")
  assert.equal(entries[entries.length - 1]?.id, "role:joba")
  for (const entry of entries) assert.deepEqual(textIssues(entry.summary), [], entry.id)
})
