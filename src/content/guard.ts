import { createHash } from "node:crypto"

/**
 * SHA-256 digests checked before public text is written.
 * Digests are lowercase hex. This module stores no source terms.
 * BLOCKLIST is the full set. PUBLISHED is the subset the static site checks.
 * The generative app checks the full set.
 */
const TOKEN = /[a-z0-9]+/g
const URL_RE = /https?:\/\/[^\s<>"']+/gi

export const BLOCKLIST = new Set([
  "1b0b7e51ee5d8e25cc87c83d5b4fbe933d91e1a70f7ee27d98be29c348b04950",
  "1b112ee7d79cd37d93b3938f69b6d8209990b9dd96994a26e62d76ed1a34cca9",
  "71d7575667922ac5c970baaee34eedd23815ef5a0608db867cd49a9c25686577",
  "8be464106f2d6f1eabe7ff36c3e84d5eae6c5c24870887d7155640193af12545",
  "94cf3858beeb446a763d03b7d9180263e88cee425868a4bfca826879e16457a3",
  "c0fa256940a6b1be495b94822c9622931bfcd11dd42e818c600ec36aade2af1a",
  "e342afe5bdfedc90c2531e69ffa98768427d86212deab8abd2818da8997b5b13",
])

export const PUBLISHED = new Set([
  "71d7575667922ac5c970baaee34eedd23815ef5a0608db867cd49a9c25686577",
  "8be464106f2d6f1eabe7ff36c3e84d5eae6c5c24870887d7155640193af12545",
  "94cf3858beeb446a763d03b7d9180263e88cee425868a4bfca826879e16457a3",
  "c0fa256940a6b1be495b94822c9622931bfcd11dd42e818c600ec36aade2af1a",
  "e342afe5bdfedc90c2531e69ffa98768427d86212deab8abd2818da8997b5b13",
])

const FORBIDDEN_TITLE = /product[\s-]*designers?/i
const TEAM_PHRASING = /my team|design team|\bthe team\b/i
const GRADUATION = /graduat/i

function hostLabels(url: string): string[] {
  const rest = url.split("://", 2)[1] ?? ""
  let host = rest.split("/", 1)[0]?.split("?", 1)[0]?.split("#", 1)[0] ?? ""
  host = host.includes("@") ? host.slice(host.lastIndexOf("@") + 1) : host
  if (host.startsWith("[")) return []
  host = host.split(":", 1)[0] ?? ""
  return host.toLowerCase().split(".").filter(Boolean)
}

export function candidateTerms(text: string): Set<string> {
  const pieces = text.toLowerCase().match(TOKEN) ?? []
  const terms = new Set(pieces)
  for (let index = 0; index < pieces.length - 1; index += 1) {
    terms.add(pieces[index] + pieces[index + 1])
  }
  for (const url of text.match(URL_RE) ?? []) {
    for (const label of hostLabels(url)) {
      terms.add(label)
      const labelPieces = label.match(TOKEN) ?? []
      for (const piece of labelPieces) terms.add(piece)
      for (let index = 0; index < labelPieces.length - 1; index += 1) {
        terms.add(labelPieces[index] + labelPieces[index + 1])
      }
    }
  }
  terms.delete("")
  return terms
}

function digest(term: string): string {
  return createHash("sha256").update(term, "utf8").digest("hex")
}

export function containsBlocked(text: string, digests: Set<string> = BLOCKLIST): boolean {
  if (!text || digests.size === 0) return false
  for (const term of candidateTerms(text)) {
    if (digests.has(digest(term))) return true
  }
  return false
}

export function textIssues(text: string): string[] {
  const issues: string[] = []
  if (FORBIDDEN_TITLE.test(text)) issues.push("forbidden title")
  if (containsBlocked(text)) issues.push("blocked term")
  if (TEAM_PHRASING.test(text)) issues.push("team phrasing")
  if (GRADUATION.test(text)) issues.push("graduation")
  if (text.includes("NEEDS TYLER")) issues.push("placeholder")
  return issues
}

export function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.length
}
