import { containsBlocked, textIssues, wordCount } from "@/src/content/guard"

const BANNED = ["remedy", "traveller", "defi redesign", "defi"]

// The voice: answers have no subject (no "I", "he", "we" or "Tyler"), never close on a
// question, and never say "architect".
const SUBJECT = /\b(I|I'm|I've|I'd|me|my|he|he's|him|his|we|we're|our|us|Tyler|Tyler's)\b/
export function voiceIssues(text: string): string[] {
  const issues: string[] = []
  if (SUBJECT.test(text)) issues.push("subject")
  if (/\?\s*$/.test(text.trim())) issues.push("closing question")
  if (/\barchitect\b/i.test(text)) issues.push("architect")
  return issues
}

export function annotationAllowed(text: string, facts: string): boolean {
  if (wordCount(text) < 1 || wordCount(text) > 40) return false
  if (textIssues(text).length > 0 || voiceIssues(text).length > 0 || containsBlocked(text)) return false
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
