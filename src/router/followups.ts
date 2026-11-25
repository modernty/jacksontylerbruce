import { QA } from "@/src/content/qa"
import { homeLine } from "./about"
import { matchQa } from "./qa"

/**
 * Follow-ups that move the conversation on. Two suggestions are the same when they lead to the
 * same answer, whatever their words ("Where are you located?" and "Where are you right now?" both
 * lead to where Tyler is now). A suggestion is dropped when its answer has already been given in
 * this conversation, or is the one just asked for; the room left is filled with fresh questions on
 * topics not yet covered, in an order that turns with the conversation so it does not repeat itself.
 */

/** Questions that open a new topic, the starters first, then the Q&A's own pill questions. */
const FRESH: readonly string[] = [
  "Show me some case studies.",
  "Tell me about your experience.",
  "What's your take on AI?",
  "How do you start a project?",
  ...QA.filter((entry) => entry.pill).map((entry) => entry.question),
]

const words = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).join(" ")

/** The answer a question leads to, as a key: two questions with the same key get the same answer. */
export function answerKey(question: string): string {
  // Where Tyler is now and where he is from are answered from the profile, whatever the wording.
  const home = homeLine(question, "here")
  if (home) return home.startsWith("From") ? "home:from" : "home:now"
  const entry = matchQa(question)
  if (entry) return entry.key === "where-now" ? "home:now" : `qa:${entry.key}`
  return `q:${words(question)}`
}

/**
 * The follow-ups to show after an answer: the ones offered, less any already answered or offered
 * twice, topped up from fresh topics so there are always at least two and never more than three.
 */
export function freshFollowUps(offered: readonly string[], asked: string, earlier: readonly string[], { min = 2, max = 3 } = {}): string[] {
  const covered = new Set([asked, ...earlier].map(answerKey))
  const chosen: string[] = []
  const keys = new Set<string>()
  const take = (question: string) => {
    const key = answerKey(question)
    if (covered.has(key) || keys.has(key)) return
    keys.add(key)
    chosen.push(question)
  }
  offered.forEach((question) => chosen.length < max && take(question))
  if (chosen.length < min) {
    // Start somewhere different each turn, so a long conversation does not offer the same few.
    const start = (earlier.length * 2) % FRESH.length
    const turned = [...FRESH.slice(start), ...FRESH.slice(0, start)]
    for (const question of turned) {
      if (chosen.length >= min) break
      take(question)
    }
  }
  return chosen
}
