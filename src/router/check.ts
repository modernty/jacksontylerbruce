import { containsBlocked, textIssues, wordCount } from "@/src/content/guard"

const BANNED = ["remedy", "traveller", "fintech terminal", "defi redesign", "chatter app", "defi", "fintech"]

export function annotationAllowed(text: string, facts: string): boolean {
  if (wordCount(text) < 1 || wordCount(text) > 40) return false
  if (textIssues(text).length > 0 || containsBlocked(text)) return false
  const lower = text.toLowerCase()
  if (BANNED.some((name) => lower.includes(name))) return false
  const fact = facts.toLowerCase()
  const phrases = text.match(/[A-Z][A-Za-z0-9+'.-]*(?:\s+[A-Z][A-Za-z0-9+'.-]*)+/g) ?? []
  for (const phrase of phrases) {
    if (!fact.includes(phrase.toLowerCase())) return false
  }
  for (const year of text.match(/\b20\d{2}\b/g) ?? []) {
    if (!facts.includes(year)) return false
  }
  return true
}

export function factBlob(parts: string[]): string {
  return parts.filter(Boolean).join("\n")
}
