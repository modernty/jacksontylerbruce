import assert from "node:assert/strict"
import { test } from "node:test"
import { careerEntries } from "@/src/content/career"
import { DISCIPLINE_BY_SLUG, byRecent } from "@/src/content/disciplines"
import { textIssues } from "@/src/content/guard"
import { loadCatalog } from "@/src/content/catalog"
import { employerPublicName } from "@/src/content/employer"
import { publishCatalog } from "@/src/content/publish"
import { careerReply } from "./career"
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
  assert.equal(reply.answer, `Recent projects include work from Overmatch AI and ${employerPublicName()}: Overmatch AI, Intuit and Loblaw / PC Health. Select one to view, or pick a type to see the rest: product design, brand or spatial.`)
  assert.equal(reply.expects, "category")
  assert.ok(!reply.answer.includes("\n"))
  const hidden = loadCatalog().projects.filter((project) => project.flagged).map((project) => project.slug)
  for (const slug of hidden) assert.ok(!reply.projects.includes(slug), `${slug} is hidden`)
})

test("a type, after the offer, lists that group", () => {
  const brand = answerChat("brand", "category")
  assert.deepEqual(names(brand?.projects), ["LZR 2.0", "Lazarus brand"])
  assert.equal(brand?.answer, "Brand work, most recent first: LZR 2.0 and Lazarus brand. Select one to view.")
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
  assert.equal("answer" in place.body ? place.body.answer : "", "From Miami.")
  assert.deepEqual("followUps" in place.body ? place.body.followUps : null, ["Where is Tyler located?", "Where is Tyler right now?"])
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

test("career lists the roles and opens the timeline, the timeline opens by name, others say where to go", async () => {
  assert.equal(answerChat("Walk me through your career", undefined), null)
  const reply = await handleChatAsk({ q: "Walk me through your career", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.equal(reply.status, 200)
  // Career comes back as roles, newest first, listed in the conversation like a resume.
  const roles = "roles" in reply.body ? reply.body.roles ?? [] : []
  assert.equal(roles[roles.length - 1], "role:joba")
  // The whole career also opens the timeline beside the chat.
  assert.ok("panel" in reply.body && reply.body.panel === "timeline", JSON.stringify(reply.body))
  const one = await handleChatAsk({ q: "What did you do at Soul Machines?", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.deepEqual("roles" in one.body ? one.body.roles : null, ["role:soul-machines"], JSON.stringify(one.body))
  const drawn = await handleChatAsk({ q: "Take me to the timeline", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.ok("panel" in drawn.body && drawn.body.panel === "timeline", JSON.stringify(drawn.body))
  const elsewhere = await handleChatAsk({ q: "Tell me about your design process", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.ok("go" in elsewhere.body && elsewhere.body.go?.href, JSON.stringify(elsewhere.body))
})

test("Notion Q&A rows answer without the model, with their view and follow-ups", async () => {
  const where = await chat("Where is Tyler located?")
  assert.ok("panel" in where.body && where.body.panel === "globe", JSON.stringify(where.body))
  assert.equal("answer" in where.body ? where.body.answer : "", "Based in Miami.")
  assert.deepEqual("followUps" in where.body ? where.body.followUps : null, ["Where is Tyler from?", "Show me everywhere he's lived."])
  const now = await chat("Where is Tyler right now?")
  assert.match("answer" in now.body ? now.body.answer : "", /^Miami\. \d{1,2}:\d{2} [AP]M there\.$/)
  assert.deepEqual("followUps" in now.body ? now.body.followUps : null, ["Show me everywhere he's lived.", "Where is Tyler from?"])
  assert.equal(answerChat("Does Tyler have a dog?", undefined)?.answer, "Winston. A French Bulldog. Chief of morale.")
  assert.equal(answerChat("Does Tyler have a dog?", undefined)?.followUps?.[0], "What's a day like for him?")
  assert.equal(answerChat("Explain his work like I'm five.", undefined)?.followUps?.[0], "Show me an example.")
  const personal = answerChat("Is he married?", undefined)
  assert.equal(personal?.answer, "That's one to ask him directly.")
  assert.equal(personal?.contact, true)
  // Work questions are not personal.
  assert.notEqual(answerChat("Show me your projects", undefined)?.answer, "That's one to ask him directly.")
})

test("an answer about places lived narrows the globe to them; other place answers show everything", async () => {
  const lived = await chat("Show me everywhere he's lived.")
  assert.ok("panel" in lived.body && lived.body.panel === "globe")
  assert.equal(lived.body.placeKind, "lived")
  assert.match(lived.body.answer, /^Lived in Miami, FL/)
  const travelled = await chat("Which countries has he been to?")
  assert.ok("panel" in travelled.body && travelled.body.panel === "globe")
  assert.equal(travelled.body.placeKind, undefined)
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

test("career questions show only the roles they ask about", async () => {
  const ask = async (q: string) => {
    const reply = await handleChatAsk({ q, sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
    return "roles" in reply.body ? reply.body.roles : null
  }
  assert.deepEqual(await ask(`Where was Tyler working before Overmatch and ${employerPublicName()}?`), ["role:lazarus"])
  assert.deepEqual(await ask("Where did you work after Joba Studio?"), ["role:soul-machines"])
  assert.deepEqual(await ask("Where are you working now?"), ["role:overmatch", "role:employer"])
  assert.deepEqual(await ask("What was your first job?"), ["role:joba"])
  assert.deepEqual(await ask("Where were you working in 2021?"), ["role:soul-machines", "role:joba"])
  assert.deepEqual(await ask("How long were you at Chatter Social?"), ["role:chatter"])
  // The whole history: every role, with the timeline beside the chat.
  const resume = await handleChatAsk({ q: "Can I see your resume?", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.ok("panel" in resume.body && resume.body.panel === "timeline")
  assert.equal("roles" in resume.body ? resume.body.roles?.length : 0, catalog.roles.length)
  // Project and work questions are not career questions.
  assert.equal(await ask("Show me brand work"), null)
  assert.equal(careerReply("Tell me about Jet Protocol", catalog), null)
})

test("the AI starter lists the AI work, not the career", async () => {
  const reply = await handleChatAsk({ q: "Experience designing for AI", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  const projects = "projects" in reply.body ? reply.body.projects ?? [] : []
  assert.ok(projects.length > 0, JSON.stringify(reply.body))
  for (const slug of projects) assert.ok(catalog.projects.find((project) => project.slug === slug)?.themeIds.includes("theme:ai"), slug)
  assert.ok(!("roles" in reply.body) || !reply.body.roles?.length)
  // Naming the company keeps it a career question.
  const role = await handleChatAsk({ q: "What did you do at Lazarus AI?", sessionId: "s" }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  assert.deepEqual("roles" in role.body ? role.body.roles : null, ["role:lazarus"])
})

test("height and weight get Tyler's answer in both conversations", () => {
  assert.equal(answerChat("How tall is Tyler?", undefined)?.answer, "6'2\". 200 lbs.")
  assert.equal(answerChat("how much does he weigh", undefined)?.answer, "6'2\". 200 lbs.")
})
