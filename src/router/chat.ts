import "server-only"
import { answerAbout, homeLine } from "./about"
import { qaReply, type QaReply } from "./qa"
import { z } from "zod"
import { careerEntries } from "@/src/content/career"
import { careerReply, mentionedRoles } from "./career"
import { DISCIPLINES, byRecent, disciplineOf, type Discipline } from "@/src/content/disciplines"
import { containsBlocked } from "@/src/content/guard"
import { publishCatalog, type PublicCatalog } from "@/src/content/publish"
import type { Project } from "@/src/content/schema"
import { workAgent, type WorkClient } from "./agent"
import { converse, type OpenClient, type PastTurn, type Source, type Status } from "./converse"
import { handleAsk, type AskDeps } from "./handle"
import { hydrate } from "./llm"
import { handleProjectAsk } from "./project"
import { keywordRoute, mentionedProjects } from "./keyword"
import { MAX_CHARS, modelCallsAllowed, spendRatio, underLimit } from "./limits"
import { matchQa, resolveTokens } from "./qa"
import { QA } from "@/src/content/qa"
import { memoryStore, storeFromEnv, type Store } from "./store"
import { aboutTravel, type Go } from "./navigate"

/**
 * One reply in the main conversation. projects lists slugs, in order, that the chat shows as
 * links; previous and next in the preview follow that order. expects says what the reply asked for.
 */
/** roles lists role ids the reply shows as a resume-style list, newest first. */
/** followUps are suggested next prompts; contact shows the contact link under the answer. */
/** source says who answered: the site's own content, or the model for a question outside it. sources are pages an open answer cites. nudge shows the note about general questions. */
export type ChatReply = { answer: string; projects?: string[]; roles?: string[]; expects?: "category"; panel?: "globe" | "timeline"; go?: Go; followUps?: string[]; contact?: boolean; source?: "site" | "open" | "work"; sources?: Source[]; nudge?: boolean; placeKind?: "lived" }

export type ChatDeps = AskDeps & { open?: OpenClient | null; work?: WorkClient | null; onStatus?: (status: Status) => void }

/** The open answer at which the note about general questions starts to show. */
export const NUDGE_AFTER = 3
/** Said when a question is outside the site and no open answer can be given. */
export const OUTSIDE = "That's outside the work here."

const ChatAsk = z.object({
  q: z.string(),
  sessionId: z.string().min(1).max(80),
  expects: z.enum(["category"]).optional(),
  // Where the conversation stands: the projects the last reply listed, in order, and the open preview.
  listed: z.array(z.string().max(80)).max(20).optional(),
  open: z.string().max(80).optional(),
  // The last few exchanges, as the visitor saw them, so a follow-up reads in context.
  history: z.array(z.object({ q: z.string().max(400), a: z.string().max(4000), source: z.enum(["site", "open", "work"]).optional() })).max(6).optional(),
})

// A message that leans on the last answer: "who is this person?", "like what kind?", "why?".
const LEANS = /\b(this|that|these|those|it|its|they|them|one|ones|she|her)\b|^(like|and|but|so|why|how come|what kind|which|tell me more|more|go on|really|who(s| is| are| was)|what(s| is| are| was))\b/
const ABOUT_TYLER = /\b(he|his|him|tyler|tylers|you|your)\b/

/** Whether a message continues the last answer rather than asking the site something new. */
export function isFollowUp(question: string, catalog: PublicCatalog = publishCatalog()): boolean {
  const q = fold(question).replace(/['’]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()
  if (!q || q.split(" ").length > 12 || !LEANS.test(q) || ABOUT_TYLER.test(q) || ALL_WORK.test(q)) return false
  return !mentionedProjects(question, catalog).length && !mentionedRoles(question, catalog).length && !themeIn(q, catalog)
}

const ORDINALS: [RegExp, (count: number) => number][] = [
  [/\b(first|1st|number one|#?1)\b/, () => 0],
  [/\b(second|2nd|number two|#?2)\b/, () => 1],
  [/\b(third|3rd|number three|#?3)\b/, () => 2],
  [/\b(fourth|4th|number four|#?4)\b/, () => 3],
  [/\b(fifth|5th|number five|#?5)\b/, () => 4],
  [/\b(last|final)\b/, (count) => count - 1],
]

/** "The second one", "show me the last": a position in the list the conversation just gave. */
export function pickFromList(question: string, listed: string[]): string | null {
  const q = fold(question)
  if (!listed.length || q.split(/\s+/).length > 8) return null
  if (!/\b(one|project|that|it|open|show|see|preview|the)\b/.test(q) && !/^(first|second|third|fourth|fifth|last)\b/.test(q)) return null
  for (const [pattern, at] of ORDINALS) if (pattern.test(q)) return listed[at(listed.length)] ?? null
  return null
}

// A comparison: "what's the difference between Intuit and Loblaw", "how do they compare".
const COMPARE = /\b(difference|differences|differ|different|compare|compared|comparison|vs|versus|similar|similarities|in common|contrast)\b/
// Words that only ask to see a project: "show me Intuit", "tell me about Loblaw", "Intuit".
const SHOW_WORDS = new Set(["show", "me", "open", "see", "view", "preview", "pull", "up", "the", "a", "an", "project", "projects", "case", "study", "tell", "about", "what", "whats", "is", "it", "and", "please", "work", "on", "go", "to", "lets", "can", "i", "you"])

/** True when the message only names projects to look at, so the preview answers it at once. */
export function showOnly(question: string, named: Project[]): boolean {
  let q = ` ${fold(question).replace(/['’]/g, "").replace(/[^a-z0-9+ ]+/g, " ")} `
  for (const project of named) {
    for (const phrase of [project.name, ...project.aliases]) {
      const words = fold(phrase).replace(/['’]/g, "").replace(/[^a-z0-9+ ]+/g, " ").trim()
      if (words) q = q.split(` ${words} `).join(" ")
    }
  }
  return q.split(/\s+/).filter(Boolean).every((word) => SHOW_WORDS.has(word))
}

/** Whether the work agent should read the projects to answer this, rather than show a preview. */
export function wantsWork(question: string, catalog: PublicCatalog, state: { open?: string; last?: PastTurn } = {}): boolean {
  const q = fold(question)
  const named = mentionedProjects(question, catalog)
  const roles = mentionedRoles(question, catalog)
  if (COMPARE.test(q) && named.length + roles.length >= 2) return true
  if (COMPARE.test(q) && named.length && state.open) return true
  if (named.length && !showOnly(question, named) && !ALL_WORK.test(q)) return true
  if (!named.length && state.open && ABOUT_OPEN.test(q) && !ALL_WORK.test(q)) return true
  return !!state.last && state.last.source === "work" && isFollowUp(question, catalog)
}

// A question about the project already open: "what was your role?", "how did that turn out?".
const ABOUT_OPEN = /\b(this|that|it|its|the project|your role|you do|team|outcome|result|impact|approach|process|challenge|problem|how did|why did|images?|screens?|who)\b/

/** One line for the model: what the conversation last showed, in public names and ids only. */
function contextLine(catalog: PublicCatalog, listed: string[] = [], open?: string, expects?: "category"): string | undefined {
  const named = (slug: string) => catalog.projects.find((project) => project.slug === slug)
  const parts: string[] = []
  const shown = listed.map(named).filter((project): project is Project => !!project)
  if (shown.length) parts.push(`last listed, in order: ${shown.map((project) => `${project.name} (${project.id})`).join(", ")}`)
  const opened = open ? named(open) : undefined
  if (opened) parts.push(`preview open: ${opened.name} (${opened.id})`)
  if (expects === "category") parts.push(`last offered to group the work by type: ${typeList()}`)
  return parts.length ? `Conversation: ${parts.join("; ")}.` : undefined
}

const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim()
const has = (q: string, word: string) => new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(q)

const ALL_WORK = /\b(projects|portfolio|case studies|(your|tyler'?s|the|all|other|recent|latest) work|what (have you|has tyler) (made|built|designed|done))\b/
const THEME_WORK = /\b(work|design\w*|experience|projects?|built|made|case stud(y|ies))\b/
const YES = /^(yes|yeah|yep|yup|sure|ok|okay|please|go ahead|do it|y)\b/
const NO = /^(no|nope|nah|not now|no thanks|all of them|show (me )?all)\b/
/** "all projects", "every project", "the rest of the work", "show me all of them": the whole list, not the overview again. */
const EVERY = /\b(all|every|entire|whole|full|complete|rest)\b/
const EVERY_OF = /\b(them|the rest|rest of (it|them))\b/
const asksForEverything = (q: string) => EVERY.test(q) && (ALL_WORK.test(q) || /\bprojects?\b/.test(q) || EVERY_OF.test(q))

/** The types as next prompts, so a type is one tap rather than something to type out. */
const typePrompts = () => DISCIPLINES.map((item) => `${item.label} work.`)

const typeList = () => {
  const labels = DISCIPLINES.map((item) => item.label.toLowerCase())
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`
}

function disciplineIn(q: string): Discipline | null {
  // Longest phrases first, so "product design" wins over "design".
  const words = DISCIPLINES.flatMap((item) => item.words.map((word) => ({ word, key: item.key }))).sort((a, b) => b.word.length - a.word.length)
  return words.find(({ word }) => has(q, word))?.key ?? null
}

function themeIn(q: string, catalog: PublicCatalog) {
  return catalog.themes.find((theme) => [theme.name, theme.key, theme.slug].some((word) => word.length > 1 && has(q, fold(word))))
}

/** "A", "A and B", "A, B and C". */
export const joinNames = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`)

const RECENT_COMPANIES = 2
const RECENT_PROJECTS = 3

/**
 * The opening answer: at most three of the newest projects, from at most two companies, so it
 * reads as a sentence rather than a list. The newest company gives up to two, the next one the rest.
 */
export function recentPicks(catalog: PublicCatalog): { companies: string[]; projects: Project[] } {
  const ordered = byRecent(catalog.projects)
  const companies: string[] = []
  for (const project of ordered) {
    if (!companies.includes(project.roleId)) companies.push(project.roleId)
    if (companies.length === RECENT_COMPANIES) break
  }
  const from = (roleId: string) => ordered.filter((project) => project.roleId === roleId)
  const first = from(companies[0] ?? "")
  const second = companies[1] ? from(companies[1]) : []
  const take = second.length ? Math.min(first.length, RECENT_PROJECTS - 1) : RECENT_PROJECTS
  const projects = [...first.slice(0, take), ...second].slice(0, RECENT_PROJECTS)
  const used = companies.filter((roleId) => projects.some((project) => project.roleId === roleId))
  const names = used.map((roleId) => catalog.roles.find((role) => role.id === roleId)?.name ?? "").filter(Boolean)
  return { companies: names, projects }
}

function allWork(catalog: PublicCatalog): ChatReply {
  const { projects } = recentPicks(catalog)
  return {
    answer: `The newest: ${joinNames(projects.map((project) => project.name))}. Select one to view, see all ${catalog.projects.length}, or narrow it to one type.`,
    projects: projects.map((project) => project.slug),
    expects: "category",
    followUps: ["All projects.", ...typePrompts()],
  }
}

/** Every public project, newest first, with the types to narrow it. */
function everything(catalog: PublicCatalog): ChatReply {
  return { ...sentence(`All ${catalog.projects.length} projects, most recent first:`, catalog.projects), followUps: typePrompts() }
}

/** A group of projects as one sentence, newest first. */
function sentence(lead: string, found: Project[]): ChatReply {
  const ordered = byRecent(found)
  return { answer: `${lead} ${joinNames(ordered.map((project) => project.name))}. Select one to view.`, projects: ordered.map((project) => project.slug), followUps: ["Walk me through your career."] }
}

function byDiscipline(key: Discipline, catalog: PublicCatalog): ChatReply {
  const label = DISCIPLINES.find((item) => item.key === key)?.label ?? key
  const found = catalog.projects.filter((project) => disciplineOf(project) === key)
  if (!found.length) return { answer: `No ${label.toLowerCase()} work is up yet. Try ${typeList()}.`, expects: "category" }
  // The other types and the whole list come next, so the visitor can keep browsing in one tap.
  const others = DISCIPLINES.filter((item) => item.key !== key).map((item) => `${item.label} work.`)
  return { ...sentence(`${label} work, most recent first:`, found), followUps: [...others, "All projects."] }
}

/**
 * Answers the work questions in the conversation itself: the list of projects, the offer to group
 * them, and the grouped lists. Everything else goes to the main router, and its answer comes back
 * with the page it points to. Null means this question is not one the conversation lists.
 */
export function answerChat(question: string, expects: "category" | undefined, catalog: PublicCatalog = publishCatalog()): ChatReply | null {
  const q = fold(question)
  if (!q) return null
  const qa = qaReply(question)
  if (qa) return qaToChat(qa)
  const discipline = disciplineIn(q)

  if (expects === "category") {
    if (discipline) return byDiscipline(discipline, catalog)
    const theme = themeIn(q, catalog)
    if (theme) return byTheme(theme.id, catalog)
    if (YES.test(q)) return { answer: `Which type: ${typeList()}?`, expects: "category" }
    if (NO.test(q)) return everything(catalog)
  }

  // A theme asked for as work: "experience designing for AI", "AI projects". Not when a company
  // is named, so "Lazarus AI" stays a question about that role.
  const theme = mentionedRoles(question, catalog).length ? undefined : themeIn(q, catalog)
  if (theme && THEME_WORK.test(q)) return byTheme(theme.id, catalog)
  const work = ALL_WORK.test(q) || /\bwork\b/.test(q)
  if (discipline && work) return byDiscipline(discipline, catalog)
  if (asksForEverything(q) && !discipline && !theme) return everything(catalog)
  if (ALL_WORK.test(q)) return allWork(catalog)
  const named = mentionedProjects(question, catalog)
  if (named.length === 1) return { answer: `Here's ${named[0].name}. ${named[0].summary}`, projects: [named[0].slug], followUps: suggest(question, ["How do you start a project?", "Walk me through your career."]) }
  const routed = keywordRoute(question)
  if (routed.intent === "focus" && routed.focusIds[0]) return byTheme(routed.focusIds[0], catalog)
  // Not an answer to the offer: a new question, so the main router takes it. The offer is a hint
  // about what the visitor might say next, never a lock on the conversation.
  return null
}

/** The next thing a visitor might ask, leaving out the question they just asked. One to three. */
function suggest(question: string, ideas: string[]): string[] {
  const asked = question.trim().toLowerCase()
  return ideas.filter((idea) => idea.trim().toLowerCase() !== asked).slice(0, 3)
}

function qaToChat({ answer, panel, followUps, contact }: Pick<QaReply, "answer" | "panel" | "followUps" | "contact">): ChatReply {
  return { answer, ...(panel ? { panel } : {}), ...(followUps ? { followUps } : {}), ...(contact ? { contact } : {}) }
}

const GLOBE_LEAD = "Places lived and travelled, on the globe."

function panelFor(intent: string | undefined, question: string): "globe" | "timeline" | null {
  if (intent === "location") return "globe"
  // The drawn timeline only when asked for by name; career questions get the resume list.
  if ((intent === "career" || intent === "role") && /\btimeline\b/i.test(question)) return "timeline"
  return null
}

/** Asked again only when the visitor's reply was neither a type nor anything else the site knows. */
export const askTypeAgain = (): ChatReply => ({ answer: `The work is grouped as ${typeList()}. Which one?`, expects: "category" })

function byTheme(themeId: string, catalog: PublicCatalog): ChatReply {
  const theme = catalog.themes.find((item) => item.id === themeId)
  const found = catalog.projects.filter((project) => project.themeIds.includes(themeId))
  if (!theme || !found.length) return allWork(catalog)
  return sentence(`${theme.name} work, most recent first:`, found)
}

const MISSES = "qa:misses"
const MAX_MISSES = 500

/** Keeps a question the exact answers missed, and what answered it, so the Q&A can grow. Text only. */
async function logMiss(store: Store, q: string, how: string, now: number): Promise<void> {
  await store.push(MISSES, JSON.stringify({ q: q.slice(0, 200), how, at: new Date(now).toISOString().slice(0, 10) }), MAX_MISSES).catch(() => undefined)
}

/** The questions the exact answers missed, newest first. */
export async function readMisses(store: Store = storeFromEnv()): Promise<{ q: string; how: string; at: string }[]> {
  return (await store.list(MISSES)).flatMap((row) => {
    try {
      return [JSON.parse(row) as { q: string; how: string; at: string }]
    } catch {
      return []
    }
  })
}

type Routed = { annotation?: string; href?: string; intent?: string; handoff?: boolean; focusIds?: string[]; qaKey?: string }

/** A route from the site router, as a reply in the conversation. */
function fromRoute(body: Routed, q: string, catalog: PublicCatalog): ChatReply {
  // Origin and current place stay distinct even when a route points at the right-now answer.
  const line = homeLine(q, catalog.profile.location)
  if (line) {
    const followUps = line.startsWith("From")
      ? suggest(q, ["Where are you located?", "Where are you right now?"])
      : suggest(q, ["Where are you from?", "Show me everywhere you've lived."])
    return { answer: line, panel: "globe", followUps }
  }
  const entry = body.qaKey ? QA.find((item) => item.key === body.qaKey) : undefined
  if (entry) {
    return qaToChat({ answer: resolveTokens(entry.answer), ...(entry.view ? { panel: entry.view } : {}), ...(entry.followUps.length ? { followUps: entry.followUps } : {}) })
  }
  const answer = body.annotation?.trim() || "Here's where that lives."
  // Some answers have a view that fits beside the chat, so the conversation stays put and changes
  // what it shows: the globe for places, the timeline for the career, a preview for one project.
  const panel = panelFor(body.intent, q)
  // Places answer from the places content, the same as About.
  if (panel === "globe") {
    const place = answerAbout(q, catalog)
    const followUps = place.only === "lived"
      ? suggest(q, ["Where are you right now?", "Where have you lived and worked from?"])
      : suggest(q, ["Where are you right now?", "Show me everywhere you've lived."])
    return { answer: place.answer.startsWith("The globe covers") ? GLOBE_LEAD : place.answer, panel, followUps, ...(place.only ? { placeKind: place.only } : {}) }
  }
  if (panel === "timeline") return { answer, panel, followUps: suggest(q, ["Show me your projects."]) }
  // The career is answered in the conversation, as a resume: each role, its dates and what it was.
  if (body.intent === "career") {
    return { answer: "The career, most recent first. The timeline is open beside it.", roles: careerEntries(catalog).map((entry) => entry.id), panel: "timeline", followUps: suggest(q, ["Show me your projects.", "How do you start a project?"]) }
  }
  const focusIds = body.focusIds ?? []
  if (body.intent === "role") {
    const role = catalog.roles.find((item) => focusIds.includes(item.id))
    if (role) return { answer: `Time at ${role.name}.`, roles: [role.id], followUps: suggest(q, ["Walk me through your career."]) }
  }
  if (body.intent === "project") {
    const project = catalog.projects.find((item) => focusIds.includes(item.id))
    if (project) return { answer, projects: [project.slug], followUps: suggest(q, ["How do you start a project?", "Walk me through your career."]) }
  }
  if (body.intent === "decline" || body.intent === "off_topic" || !body.href) return { answer }
  return { answer, go: { href: body.href, handoff: body.handoff } }
}

export async function handleChatAsk(raw: unknown, ctx: { ip: string; now?: number }, deps: ChatDeps = {}): Promise<{ status: number; body: ChatReply | { error: string } }> {
  const parsed = ChatAsk.safeParse(raw)
  if (!parsed.success) return { status: 400, body: { error: "Expected {q, sessionId}." } }
  const { q, sessionId, expects, listed = [], open } = parsed.data
  if (q.length > MAX_CHARS) return { status: 400, body: { error: "Question is capped at 400 characters." } }
  const blocked = deps.blocked ?? containsBlocked
  const catalog = publishCatalog()
  const env = deps.env ?? process.env
  const now = ctx.now ?? deps.now ?? Date.now()
  const store = deps.store ?? storeFromEnv(env)
  // Earlier turns come from the visitor's browser: drop any that carry a blocked term.
  const history: PastTurn[] = (parsed.data.history ?? []).filter((turn) => !blocked(turn.q) && !blocked(turn.a))
  const last = history[history.length - 1]
  const openBefore = history.filter((turn) => turn.source === "open").length

  /** An answer from the model, for a question the site has no answer of its own for. */
  const openTurn = async (): Promise<ChatReply | null> => {
    if (!modelCallsAllowed(env) || (await spendRatio(now, env, store).catch(() => 0)) >= 1) return null
    const out = await converse(q, history, { client: deps.open, onStatus: deps.onStatus, env })
    if (!out) return null
    // The model saw a question about the work after all: show the site's own view.
    if (out.view) {
      const view = hydrate(out.view, q)
      if (view.intent !== "off_topic" && view.intent !== "decline") return { ...fromRoute(view, q, catalog), source: "site" }
      return null
    }
    return { answer: out.text, source: "open", followUps: suggest(q, ["Show me your projects.", "How do you start a project?"]), ...(out.sources.length ? { sources: out.sources } : {}), ...(openBefore + 1 >= NUDGE_AFTER ? { nudge: true } : {}) }
  }

  /** An answer from the work agent, which reads the projects before it answers. */
  const workTurn = async (): Promise<ChatReply | "limited" | null> => {
    if (!modelCallsAllowed(env) || (await spendRatio(now, env, store).catch(() => 0)) >= 1) return null
    const allowed = await underLimit(ctx.ip || "local", now, store).catch(() => underLimit(ctx.ip || "local", now, memoryStore))
    if (!allowed) return "limited"
    const out = await workAgent(q, history, { client: deps.work, onStatus: deps.onStatus, env, context: contextLine(catalog, listed, open, expects), catalog })
    if (!out) return null
    const followUps = out.followUps.length ? out.followUps : suggest(q, ["How do you start a project?", "Show me your projects."])
    return { answer: out.answer, projects: out.projects, followUps, source: "work", ...(out.panel ? { panel: out.panel } : {}) }
  }

  if (!blocked(q)) {
    // The Notion Q&A first: a matched question or pill is answered without the model.
    const qa = qaReply(q)
    if (qa && !qa.contact) return { status: 200, body: qaToChat(qa) }
    // A follow-up to an open or Q&A answer stays in that thread: "who is this person?".
    if (last && (last.source === "open" || matchQa(last.q)) && isFollowUp(q, catalog)) {
      const allowed = await underLimit(ctx.ip || "local", now, store).catch(() => underLimit(ctx.ip || "local", now, memoryStore))
      if (!allowed) return { status: 429, body: { error: "Too many questions." } }
      const reply = await openTurn()
      if (reply) {
        await logMiss(store, q, reply.source === "open" ? "open" : "view", now)
        return { status: 200, body: reply }
      }
    }
    // A personal question with no entry.
    if (qa) return { status: 200, body: qaToChat(qa) }
    // Places lived and travelled answer from the places content, with the globe beside them.
    if (aboutTravel(q) || /\b(everywhere|where all|every place|all the places)\b.*\b(lived|been|travell?ed)\b/i.test(q)) {
      // An answer about places lived shows only those on the globe.
      const place = answerAbout(q, catalog)
      const followUps = place.only === "lived"
        ? suggest(q, ["Where are you right now?", "Where have you lived and worked from?"])
        : suggest(q, ["Where are you right now?", "Show me everywhere you've lived."])
      return { status: 200, body: { answer: place.answer, panel: "globe", followUps, ...(place.only ? { placeKind: place.only } : {}) } }
    }
    const slug = pickFromList(q, listed.filter((item) => catalog.projects.some((project) => project.slug === item)))
    if (slug) {
      const project = catalog.projects.find((item) => item.slug === slug)
      if (project) return { status: 200, body: { answer: `Here's ${project.name}. ${project.summary}`, projects: [project.slug], followUps: suggest(q, ["How do you start a project?", "Walk me through your career."]) } }
    }
    // A question about the work itself, a comparison, or a follow-up to one: the agent reads and answers.
    if (wantsWork(q, catalog, { open, last })) {
      const reply = await workTurn()
      if (reply === "limited") return { status: 429, body: { error: "Too many questions." } }
      if (reply) return { status: 200, body: reply }
    }
    const opened = open ? catalog.projects.find((project) => project.slug === open) : undefined
    if (opened && ABOUT_OPEN.test(fold(q)) && !mentionedProjects(q, catalog).length && !ALL_WORK.test(fold(q))) {
      const reply = await handleProjectAsk({ slug: opened.slug, q, sessionId }, ctx, { store: deps.store, env: deps.env, now: deps.now })
      const body = reply.body as { answer?: string; source?: string }
      if (reply.status === 200 && body.answer && body.source !== "route") return { status: 200, body: { answer: body.answer, projects: [opened.slug], followUps: suggest(q, ["How do you start a project?", "Show me your projects."]) } }
    }
    // Where Tyler worked, answered with only the roles asked about; the whole history opens the timeline.
    const asksTheme = !mentionedRoles(q, catalog).length && !!themeIn(fold(q), catalog) && THEME_WORK.test(fold(q))
    const career = ALL_WORK.test(fold(q)) || asksTheme ? null : careerReply(q, catalog)
    if (career) return { status: 200, body: { ...career, followUps: suggest(q, ["Show me your projects.", "How do you start a project?"]) } }
    const answered = answerChat(q, expects, catalog)
    if (answered) return { status: 200, body: answered }
  }
  // Not a list: the main router answers, knowing where the conversation stands, and the reply
  // either changes the view beside the chat or says where to go.
  const result = await handleAsk({ q, sessionId, context: contextLine(catalog, listed, open, expects) }, ctx, deps)
  const body = result.body as Routed & { error?: string }
  if (result.status !== 200) return { status: result.status, body: { error: body.error ?? "Something went wrong. Try asking again." } }
  if (body.intent === "off_topic" && !blocked(q)) {
    // Outside the site: the model answers, with the conversation so far and web search.
    const reply = await openTurn()
    if (reply) {
      await logMiss(store, q, reply.source === "open" ? "open" : "view", now)
      return { status: 200, body: reply }
    }
    await logMiss(store, q, "fallback", now)
    if (expects === "category") return { status: 200, body: askTypeAgain() }
    return { status: 200, body: { answer: OUTSIDE, contact: true } }
  }
  if (!blocked(q)) await logMiss(store, q, body.qaKey ? `qa-fuzzy:${body.qaKey}` : `route:${body.intent ?? "unknown"}`, now)
  return { status: 200, body: fromRoute(body, q, catalog) }
}
