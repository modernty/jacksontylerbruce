import { QA, type QaEntry } from "@/src/content/qa"
import { EDUCATION, personalReply } from "./personal"

/** An answer from the Q&A. Matched questions skip the model. */
export type QaReply = { answer: string; key?: string; panel?: "globe"; followUps?: string[]; contact?: boolean }

/** Where {local_time} is read. Miami. */
export const HOME_TIME_ZONE = "America/New_York"

/** The answer when a personal question has no entry. The contact link goes with it. */
export const ASK_DIRECTLY = "That's one to ask directly."

// Words that name Tyler however a visitor writes it, folded to one token so "Does Tyler have a
// dog?" and "Do you have a dog?" read the same.
const SUBJECT = new Set(["he", "him", "his", "hes", "himself", "tyler", "tylers", "you", "your", "youre", "yours", "youve", "yourself", "jackson"])
// Verb forms change with the subject ("are you", "is he"), so they fold too.
const SYNONYMS: Record<string, string> = { travelled: "traveled", favourite: "favorite", are: "is", do: "does", have: "has" }

/** Lowercase words with no accents, apostrophes or punctuation. */
function words(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => (SUBJECT.has(word) ? "@" : SYNONYMS[word] ?? word))
}


/**
 * The entry a message asks for: the Question or one of its Alternates, word for word once
 * folded, or the same question with a few words around it ("so, does he have a dog?").
 */
export function matchQa(message: string, entries: readonly QaEntry[] = QA): QaEntry | null {
  const asked = words(message)
  if (!asked.length) return null
  const joined = asked.join(" ")
  let best: { entry: QaEntry; size: number } | null = null
  for (const entry of entries) {
    for (const candidate of [entry.question, ...entry.alternates]) {
      const wanted = words(candidate)
      if (!wanted.length) continue
      if (wanted.join(" ") === joined) return entry
      const inside = ` ${joined} `.includes(` ${wanted.join(" ")} `)
      if (inside && asked.length <= wanted.length + 3 && (!best || wanted.length > best.size)) best = { entry, size: wanted.length }
    }
  }
  return best?.entry ?? topicMatch(asked, entries)
}

// Words that carry no topic. What is left of a question is what it is about ("Any pets?" is pets).
const FILLER = new Set(
  "a an the any some is does has can could would will should be been was were what whats who whos where when why how which this that there it its i im me my of in on at to for from with or and but so just really actually ever like did tell about know".split(" "),
)
const stem = (word: string) => (word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word)
const topics = (list: string[]) => new Set(list.filter((word) => word !== "@" && !FILLER.has(word)).map(stem))

/**
 * The looser match, for a question asked in its own words or two at once ("Does Tyler have any pets
 * or family?"). One of the entry's phrasings has all its topic words in the message, and every topic
 * word in the message belongs to the entry somewhere, so nothing asked goes unanswered or answered
 * by the wrong entry ("Did he live in Medellín?" is not "Where does he live?"). A one-word topic also
 * needs the message to be about Tyler, so "Who built the Intuit flow?" is not "Who built this?".
 */
function topicMatch(asked: string[], entries: readonly QaEntry[]): QaEntry | null {
  if (asked.length > 12) return null
  const about = asked.includes("@")
  const said = topics(asked)
  if (!said.size) return null
  let best: { entry: QaEntry; size: number } | null = null
  for (const entry of entries) {
    const phrasings = [entry.question, ...entry.alternates].map((candidate) => topics(words(candidate)))
    const covered = new Set(phrasings.flatMap((wanted) => [...wanted]))
    if (![...said].every((word) => covered.has(word))) continue
    for (const wanted of phrasings) {
      if (!wanted.size || (wanted.size < 2 && !about)) continue
      if ([...wanted].every((word) => said.has(word)) && (!best || wanted.size > best.size)) best = { entry, size: wanted.size }
    }
  }
  return best?.entry ?? null
}

/** Fills the tokens an answer can carry. */
export function resolveTokens(answer: string, now: Date = new Date()): string {
  return answer.replace(/\{local_time\}/g, () =>
    new Intl.DateTimeFormat("en-US", { timeZone: HOME_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(now),
  )
}

// A question about Tyler the person rather than the work.
const PERSONAL = /\b(favorite|family|married|wife|husband|girlfriend|boyfriend|partner|kids|children|how old|age|birthday|born|hobby|hobbies|music|movies?|films?|books?|religio\w*|politic\w*|salary|paid|zodiac|star sign|eat|food|drink|coffee|sleep|sports?|single|dating|friends?)\b/

function personal(message: string): boolean {
  const asked = words(message)
  return asked.includes("@") && PERSONAL.test(asked.join(" "))
}

/**
 * Answers a visitor's message from the Q&A, then the few personal facts kept in code, then the
 * personal fallback. Null means the message is not one of these and the router takes it.
 */
export function qaReply(message: string, now: Date = new Date()): QaReply | null {
  const entry = matchQa(message)
  if (entry) {
    return {
      key: entry.key,
      answer: resolveTokens(entry.answer, now),
      ...(entry.view ? { panel: entry.view } : {}),
      ...(entry.followUps.length ? { followUps: entry.followUps } : {}),
    }
  }
  const fact = personalReply(message)
  if (fact) {
    const followUps = fact === EDUCATION ? ["Walk me through your career.", "Who are your favorite designers or studios?"] : ["Where are you from?"]
    return { answer: fact, followUps }
  }
  if (personal(message)) return { answer: ASK_DIRECTLY, contact: true, followUps: ["How do I start a project with you?"] }
  return null
}
