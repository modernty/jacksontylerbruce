import "server-only"
import { z } from "zod"
import { containsBlocked } from "@/src/content/guard"
import { keywordRoute, withQuestion } from "./keyword"
import { modelRoute } from "./llm"
import { followUpsFor, sheetCopy } from "./pills"
import type { ViewSpec } from "./types"

const AskBody = z.object({
  q: z.string(),
  sessionId: z.string().min(1).max(80),
})

const hits = new Map<string, number[]>()
const WINDOW_MS = 60_000
const MAX_HITS = 10

export function resetRateLimit(): void {
  hits.clear()
}

export function allow(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < WINDOW_MS)
  if (recent.length >= MAX_HITS) {
    hits.set(ip, recent)
    return false
  }
  recent.push(now)
  hits.set(ip, recent)
  return true
}

function decline(): ViewSpec {
  const copy = sheetCopy("decline")
  return {
    intent: "decline",
    focusIds: [],
    filter: "sheet",
    href: "/sheet?topic=decline",
    annotation: copy.body,
    followUps: [],
    confidence: 1,
    source: "keyword",
  }
}

export async function handleAsk(raw: unknown, ctx: { ip: string; now?: number }): Promise<{ status: number; body: unknown }> {
  const parsed = AskBody.safeParse(raw)
  if (!parsed.success) return { status: 400, body: { error: "Expected {q, sessionId}." } }
  const question = parsed.data.q
  if (question.length > 400) return { status: 400, body: { error: "Question is capped at 400 characters." } }
  if (!allow(ctx.ip || "local", ctx.now ?? Date.now())) {
    return { status: 429, body: { error: "Too many questions.", href: "/sheet?topic=decline" } }
  }
  if (containsBlocked(question)) {
    const blocked = decline()
    return { status: 200, body: { ...blocked, followUps: followUpsFor("decline") } }
  }
  const routed = process.env.ANTHROPIC_API_KEY ? await modelRoute(question) : keywordRoute(question)
  const finished = routed.confidence < 0.55 && routed.filter !== "sheet"
    ? { ...keywordRoute("something unclear"), confidence: routed.confidence, source: routed.source }
    : routed
  return {
    status: 200,
    body: {
      intent: finished.intent,
      focusIds: finished.focusIds,
      filter: finished.filter,
      href: question ? withQuestion(finished.href, question) : finished.href,
      annotation: finished.annotation,
      followUps: finished.followUps,
      confidence: finished.confidence,
      source: finished.source,
    },
  }
}
