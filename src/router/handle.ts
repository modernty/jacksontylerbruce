import "server-only"
import { z } from "zod"
import { sheetAnswer, followUpsFor } from "@/src/content/answers"
import { containsBlocked } from "@/src/content/guard"
import { keywordRoute, withQuestion } from "./keyword"
import { modelRoute, type ModelCaller } from "./llm"
import { counterFromEnv, MAX_CHARS, memoryCounter, spendRatio, underLimit, type Counter } from "./limits"
import type { ViewSpec } from "./types"

const AskBody = z.object({
  q: z.string(),
  sessionId: z.string().min(1).max(80),
})

export type AskDeps = {
  now?: number
  counter?: Counter
  routeModel?: ModelCaller
  blocked?: (text: string) => boolean
  env?: NodeJS.ProcessEnv
}

function decline(): ViewSpec {
  const copy = sheetAnswer("decline")
  return {
    intent: "decline",
    focusIds: [],
    filter: "sheet",
    href: "/sheet?topic=decline#answer",
    annotation: copy.body,
    followUps: followUpsFor("decline"),
    confidence: 1,
    source: "keyword",
  }
}

export async function handleAsk(raw: unknown, ctx: { ip: string; now?: number }, deps: AskDeps = {}): Promise<{ status: number; body: unknown }> {
  const parsed = AskBody.safeParse(raw)
  if (!parsed.success) return { status: 400, body: { error: "Expected {q, sessionId}." } }
  const question = parsed.data.q
  if (question.length > MAX_CHARS) return { status: 400, body: { error: "Question is capped at 400 characters." } }
  const now = ctx.now ?? deps.now ?? Date.now()
  const counter = deps.counter ?? counterFromEnv(deps.env)
  const allowed = await underLimit(ctx.ip || "local", now, counter).catch(async () => underLimit(ctx.ip || "local", now, memoryCounter))
  if (!allowed) {
    return { status: 429, body: { error: "Too many questions.", href: "/sheet?topic=decline#answer" } }
  }
  const blocked = deps.blocked ?? containsBlocked
  if (blocked(question)) {
    const hidden = decline()
    return { status: 200, body: hidden }
  }
  const env = deps.env ?? process.env
  const caller = deps.routeModel ?? (env.ANTHROPIC_API_KEY ? modelRoute : null)
  let routed = keywordRoute(question)
  if (caller && spendRatio(now, env) < 1) {
    try {
      routed = await caller(question)
    } catch {
      routed = { ...keywordRoute(question), source: "keyword" }
    }
  }
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
