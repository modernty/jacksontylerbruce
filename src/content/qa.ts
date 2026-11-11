import { z } from "zod"
import data from "@/content/qa.json"

/**
 * The chat's Q&A, copied from the Chat Q&A database in Notion (the source of truth). Only Ready
 * rows whose view the site can show are kept. Key is each entry's stable id.
 */
export const QaEntrySchema = z.object({
  key: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  question: z.string().min(1),
  alternates: z.array(z.string().min(1)),
  answer: z.string().min(1),
  /** What opens beside the answer. Null answers in the conversation alone. */
  view: z.enum(["globe"]).nullable(),
  /** Shown as a tappable first-visit prompt. */
  pill: z.boolean(),
  /** Suggested next prompts under the answer, in the visitor's words. */
  followUps: z.array(z.string().min(1)),
})

export type QaEntry = z.infer<typeof QaEntrySchema>

export const QA: readonly QaEntry[] = z.array(QaEntrySchema).parse(data.entries)

/** The questions marked Pill, in their Notion order. */
export const QA_PILLS: readonly string[] = QA.filter((entry) => entry.pill).map((entry) => entry.question)

/** Three pills for a first visit. Rotates by the seed, so every visit can show a different set. */
export function rotatePills(seed: number, pills: readonly string[] = QA_PILLS, count = 3): string[] {
  if (pills.length <= count) return [...pills]
  const start = Math.abs(Math.floor(seed)) % pills.length
  return Array.from({ length: count }, (_, index) => pills[(start + index) % pills.length])
}
