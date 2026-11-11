import type { PublicCatalog } from "@/src/content/publish"

type Role = PublicCatalog["roles"][number]

/** A career answer: the words, the roles to show as cards, and whether the timeline opens beside it. */
export type CareerReply = { answer: string; roles: string[]; panel?: "timeline" }

const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim()
const has = (q: string, word: string) => new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(q)
const join = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`)

/** The whole history: the resume, the timeline. */
const BROAD = /\b(resume|cv|career|work history|job history|employment|past (history|roles|jobs)|history|background|experience|walk me through)\b/
/** Words that make a question about employment rather than a project. */
const JOBBY = /\b(work(ed|ing)? (at|for)|working|job|jobs|role|roles|employ\w*|employer|compan(y|ies)|title|position|joined|join|left|leave|leaving|was (he|tyler|you) at|were you at|how long|when did|(did|do) (you|tyler|he) do (at|for)|career)\b/
const BEFORE = /\b(before|prior to|previous(ly)? to|earlier than|preceding|until)\b/
const AFTER = /\b(after|following|since leaving|once (he|you) left)\b/
const CURRENT = /\b(current(ly)?|now|today|right now|these days|at the moment|presently)\b/
const FIRST = /\b(first|earliest|start(ed)? (his|your|the) career)\b/
const LAST = /\b(last|previous|most recent) (job|role|company|employer|position)\b/

/** Roles the question names, by name or alias, as whole words. */
export function mentionedRoles(question: string, catalog: PublicCatalog): Role[] {
  const q = fold(question)
  // "Current role" is an alias of one role, but the question means every role held now.
  const words = (role: Role) => [role.name, ...(role.aliases ?? [])].map(fold).filter((word) => word.length > 2 && !word.startsWith("current"))
  return catalog.roles.filter((role) => words(role).some((word) => has(q, word)))
}

const byStart = (roles: Role[]) => [...roles].sort((a, b) => a.start - b.start)
const reply = (answer: string, roles: Role[]): CareerReply => ({ answer, roles: [...roles].sort((a, b) => (b.end ?? Infinity) - (a.end ?? Infinity) || b.start - a.start).map((role) => role.id) })

/**
 * Career questions in the conversation, answered with only the roles they ask about:
 * "where was Tyler before Overmatch and the current employer" is Lazarus AI alone. A question about the whole
 * history ("show me your resume") lists every role and opens the timeline beside the chat.
 * Null means the question is not about where Tyler worked.
 */
export function careerReply(question: string, catalog: PublicCatalog): CareerReply | null {
  const q = fold(question)
  if (!q) return null
  const named = mentionedRoles(question, catalog)
  const broad = BROAD.test(q)
  if (!broad && !JOBBY.test(q) && !(named.length && (BEFORE.test(q) || AFTER.test(q)))) return null
  const roles = catalog.roles
  const others = roles.filter((role) => !named.includes(role))

  if (named.length && BEFORE.test(q)) {
    const anchor = Math.min(...named.map((role) => role.start))
    const prior = byStart(others.filter((role) => role.start < anchor)).pop()
    if (prior) return reply(`Before ${join(named.map((role) => role.name))}: ${prior.name}.`, [prior])
    return reply(`${join(named.map((role) => role.name))} ${named.length > 1 ? "are" : "is"} where the career starts.`, named)
  }
  if (named.length && AFTER.test(q)) {
    const anchor = Math.max(...named.map((role) => role.start))
    const later = byStart(others.filter((role) => role.start > anchor))[0]
    if (later) return reply(`After ${join(named.map((role) => role.name))}: ${later.name}.`, [later])
    return reply(`${join(named.map((role) => role.name))} ${named.length > 1 ? "are the current roles" : "is the current role"}.`, named)
  }
  if (named.length) return reply(`Time at ${join(named.map((role) => role.name))}.`, named)

  const year = q.match(/\b(20\d{2})\b/)
  if (year) {
    const at = Number(year[1])
    const then = roles.filter((role) => role.start < at + 1 && (role.end ?? Infinity) >= at)
    if (then.length) return reply(`In ${at}: ${join(byStart(then).map((role) => role.name))}.`, then)
  }
  if (LAST.test(q)) {
    const ended = roles.filter((role) => role.end !== null).sort((a, b) => (b.end ?? 0) - (a.end ?? 0))
    if (ended[0]) return reply(`Before the current roles: ${ended[0].name}.`, [ended[0]])
  }
  if (FIRST.test(q) && !broad) {
    const first = byStart(roles)[0]
    if (first) return reply(`First role: ${first.name}.`, [first])
  }
  if (CURRENT.test(q) && !broad) {
    const now = roles.filter((role) => role.end === null)
    if (now.length) return reply(`Right now: ${join(byStart(now).map((role) => role.name))}.`, now)
  }
  if (broad) return { ...reply("The career, most recent first. The timeline is open beside it.", roles), panel: "timeline" }
  return null
}
