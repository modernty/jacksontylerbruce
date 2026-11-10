import "server-only"
import { z } from "zod"
import { careerEntries } from "@/src/content/career"
import { DISCIPLINES, byRecent, disciplineOf, type Discipline } from "@/src/content/disciplines"
import { containsBlocked } from "@/src/content/guard"
import { publishCatalog, type PublicCatalog } from "@/src/content/publish"
import type { Project } from "@/src/content/schema"
import { handleAsk, type AskDeps } from "./handle"
import { handleProjectAsk } from "./project"
import { keywordRoute, mentionedProjects } from "./keyword"
import { MAX_CHARS } from "./limits"
import type { Go } from "./navigate"

/**
 * One reply in the main conversation. projects lists slugs, in order, that the chat shows as
 * links; previous and next in the preview follow that order. expects says what the reply asked for.
 */
/** roles lists role ids the reply shows as a resume-style list, newest first. */
export type ChatReply = { answer: string; projects?: string[]; roles?: string[]; expects?: "category"; panel?: "globe" | "timeline"; go?: Go }

const ChatAsk = z.object({
  q: z.string(),
  sessionId: z.string().min(1).max(80),
  expects: z.enum(["category"]).optional(),
  // Where the conversation stands: the projects the last reply listed, in order, and the open preview.
  listed: z.array(z.string().max(80)).max(20).optional(),
  open: z.string().max(80).optional(),
})

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
const YES = /^(yes|yeah|yep|yup|sure|ok|okay|please|go ahead|do it|y)\b/
const NO = /^(no|nope|nah|not now|no thanks|all of them|show (me )?all)\b/

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
  return catalog.themes.find((theme) => [theme.name, theme.key, theme.slug].some((word) => word.length > 2 && has(q, fold(word))))
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
  const { companies, projects } = recentPicks(catalog)
  const from = companies.length ? ` from ${joinNames(companies)}` : ""
  return {
    answer: `My most recent projects include work${from}: ${joinNames(projects.map((project) => project.name))}. Pick one to preview it, or I can group the rest by type: ${typeList()}.`,
    projects: projects.map((project) => project.slug),
    expects: "category",
  }
}

/** A group of projects as one sentence, newest first. */
function sentence(lead: string, found: Project[]): ChatReply {
  const ordered = byRecent(found)
  return { answer: `${lead} ${joinNames(ordered.map((project) => project.name))}. Pick one to preview it.`, projects: ordered.map((project) => project.slug) }
}

function byDiscipline(key: Discipline, catalog: PublicCatalog): ChatReply {
  const label = DISCIPLINES.find((item) => item.key === key)?.label ?? key
  const found = catalog.projects.filter((project) => disciplineOf(project) === key)
  if (!found.length) return { answer: `I don't have ${label.toLowerCase()} work up yet. Try ${typeList()}.`, expects: "category" }
  return sentence(`My ${label.toLowerCase()} work, most recent first:`, found)
}

/**
 * Answers the work questions in the conversation itself: the list of projects, the offer to group
 * them, and the grouped lists. Everything else goes to the main router, and its answer comes back
 * with the page it points to. Null means this question is not one the conversation lists.
 */
export function answerChat(question: string, expects: "category" | undefined, catalog: PublicCatalog = publishCatalog()): ChatReply | null {
  const q = fold(question)
  if (!q) return null
  const discipline = disciplineIn(q)

  if (expects === "category") {
    if (discipline) return byDiscipline(discipline, catalog)
    const theme = themeIn(q, catalog)
    if (theme) return byTheme(theme.id, catalog)
    if (YES.test(q)) return { answer: `Which type: ${typeList()}?`, expects: "category" }
    if (NO.test(q)) return sentence("Sure. Here's all of it, most recent first:", catalog.projects)
  }

  const work = ALL_WORK.test(q) || /\bwork\b/.test(q)
  if (discipline && work) return byDiscipline(discipline, catalog)
  if (ALL_WORK.test(q)) return allWork(catalog)
  const named = mentionedProjects(question, catalog)
  if (named.length === 1) return { answer: `Here's ${named[0].name}. ${named[0].summary}`, projects: [named[0].slug] }
  const routed = keywordRoute(question)
  if (routed.intent === "focus" && routed.focusIds[0]) return byTheme(routed.focusIds[0], catalog)
  // Not an answer to the offer: a new question, so the main router takes it. The offer is a hint
  // about what the visitor might say next, never a lock on the conversation.
  return null
}

const GLOBE_LEAD = "Here's where Tyler has lived and travelled."

function panelFor(intent: string | undefined, question: string): "globe" | "timeline" | null {
  if (intent === "location") return "globe"
  // The drawn timeline only when asked for by name; career questions get the resume list.
  if ((intent === "career" || intent === "role") && /\btimeline\b/i.test(question)) return "timeline"
  return null
}

/** Asked again only when the visitor's reply was neither a type nor anything else the site knows. */
export const askTypeAgain = (): ChatReply => ({ answer: `I group the work as ${typeList()}. Which would you like?`, expects: "category" })

function byTheme(themeId: string, catalog: PublicCatalog): ChatReply {
  const theme = catalog.themes.find((item) => item.id === themeId)
  const found = catalog.projects.filter((project) => project.themeIds.includes(themeId))
  if (!theme || !found.length) return allWork(catalog)
  return sentence(`My ${theme.name} work, most recent first:`, found)
}

export async function handleChatAsk(raw: unknown, ctx: { ip: string; now?: number }, deps: AskDeps = {}): Promise<{ status: number; body: ChatReply | { error: string } }> {
  const parsed = ChatAsk.safeParse(raw)
  if (!parsed.success) return { status: 400, body: { error: "Expected {q, sessionId}." } }
  const { q, sessionId, expects, listed = [], open } = parsed.data
  if (q.length > MAX_CHARS) return { status: 400, body: { error: "Question is capped at 400 characters." } }
  const blocked = deps.blocked ?? containsBlocked
  const catalog = publishCatalog()
  if (!blocked(q)) {
    const slug = pickFromList(q, listed.filter((item) => catalog.projects.some((project) => project.slug === item)))
    if (slug) {
      const project = catalog.projects.find((item) => item.slug === slug)
      if (project) return { status: 200, body: { answer: `Here's ${project.name}. ${project.summary}`, projects: [project.slug] } }
    }
    const opened = open ? catalog.projects.find((project) => project.slug === open) : undefined
    if (opened && ABOUT_OPEN.test(fold(q)) && !mentionedProjects(q, catalog).length && !ALL_WORK.test(fold(q))) {
      const reply = await handleProjectAsk({ slug: opened.slug, q, sessionId }, ctx, { store: deps.store, env: deps.env, now: deps.now })
      const body = reply.body as { answer?: string; source?: string }
      if (reply.status === 200 && body.answer && body.source !== "route") return { status: 200, body: { answer: body.answer, projects: [opened.slug] } }
    }
    const answered = answerChat(q, expects, catalog)
    if (answered) return { status: 200, body: answered }
  }
  // Not a list: the main router answers, knowing where the conversation stands, and the reply
  // either changes the view beside the chat or says where to go.
  const result = await handleAsk({ q, sessionId, context: contextLine(catalog, listed, open, expects) }, ctx, deps)
  const body = result.body as { annotation?: string; href?: string; intent?: string; error?: string; handoff?: boolean }
  if (result.status !== 200) return { status: result.status, body: { error: body.error ?? "Something went wrong. Try asking again." } }
  const answer = body.annotation?.trim() || "Here's where that lives."
  if (body.intent === "off_topic" && expects === "category") return { status: 200, body: askTypeAgain() }
  // Some answers have a view that fits beside the chat, so the conversation stays put and changes
  // what it shows: the globe for places, the timeline for the career, a preview for one project.
  const panel = panelFor(body.intent, q)
  if (panel === "globe") return { status: 200, body: { answer: body.annotation?.trim() || GLOBE_LEAD, panel } }
  if (panel === "timeline") return { status: 200, body: { answer, panel } }
  // The career is answered in the conversation, as a resume: each role, its dates and what it was.
  if (body.intent === "career") {
    return { status: 200, body: { answer: "Here's my career, most recent first.", roles: careerEntries(catalog).map((entry) => entry.id) } }
  }
  if (body.intent === "role") {
    const focusIds = (result.body as { focusIds?: string[] }).focusIds ?? []
    const role = catalog.roles.find((item) => focusIds.includes(item.id))
    if (role) return { status: 200, body: { answer: `Here's my time at ${role.name}.`, roles: [role.id] } }
  }
  if (body.intent === "project") {
    const focusIds = (result.body as { focusIds?: string[] }).focusIds ?? []
    const project = catalog.projects.find((item) => focusIds.includes(item.id))
    if (project) return { status: 200, body: { answer, projects: [project.slug] } }
  }
  if (body.intent === "decline" || body.intent === "off_topic" || !body.href) return { status: 200, body: { answer } }
  return { status: 200, body: { answer, go: { href: body.href, handoff: body.handoff } } }
}
