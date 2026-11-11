import { QA, type QaEntry } from "@/src/content/qa"
import { personalReply } from "./personal"

/** An answer from the Q&A. Matched questions skip the model. */
export type QaReply = { answer: string; key?: string; panel?: "globe"; followUps?: string[]; contact?: boolean }

/** Where {local_time} is read. Miami. */
export const HOME_TIME_ZONE = "America/New_York"

/** The answer when a personal question has no entry. The contact link goes with it. */
export const ASK_DIRECTLY = "That's one to ask him directly."

// Words that name Tyler however a visitor writes it, folded to one token so "Does Tyler have a
// dog?" and "Does he have a dog?" read the same.
const SUBJECT = new Set(["he", "him", "his", "hes", "tyler", "tylers", "you", "your", "youre", "yours", "jackson"])
// Verb forms change with the subject ("are you", "is he"), so they fold too.
const SYNONYMS: Record<string, string> = { travelled: "traveled", located: "based", favourite: "favorite", are: "is", do: "does", have: "has" }

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
  if (fact) return { answer: fact }
  if (personal(message)) return { answer: ASK_DIRECTLY, contact: true }
  return null
}
