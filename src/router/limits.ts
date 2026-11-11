import { memoryStore, storeFromEnv, type Env, type Store } from "./store"

export const TEN_MIN_MS = 10 * 60 * 1000
export const DAY_MS = 24 * 60 * 60 * 1000
export const BURST_LIMIT = 10
export const DAY_LIMIT = 50
export const MAX_CHARS = 400
export const MAX_TOKENS = 1200
export const ASK_TIMEOUT_MS = 12000
/** Anything about Tyler and the work: routing, loosely worded questions, project questions. */
export const DEFAULT_MODEL = "claude-sonnet-5-5"
/** General questions and web search. */
export const GENERAL_MODEL = "claude-haiku-5-5"
export const GENERAL_MAX_TOKENS = 700
export const GENERAL_TIMEOUT_MS = 25000
export const MAX_SEARCHES = 2
/** USD per million tokens, input and output, by model family. */
const RATES: [RegExp, number, number][] = [
  [/sonnet/, 2, 10],
  [/haiku/, 0.1, 0.5],
]
const USD_PER_SEARCH = 0.01

/** Turns thinking off for a short grounded answer. Sonnet 5.5 rejects "disabled". */
export function thinkingOff(model: string): { type: "disabled" } {
  return (/sonnet-5-5|opus-5-5/.test(model) ? { type: "between_tools" } : { type: "disabled" }) as { type: "disabled" }
}
const MICROS = 1_000_000

function bucket(ip: string, now: number, size: number, name: string): string {
  return `${name}:${ip}:${Math.floor(now / size)}`
}

export async function underLimit(ip: string, now: number, store: Store = memoryStore): Promise<boolean> {
  const burst = await store.incr(bucket(ip, now, TEN_MIN_MS, "10m"), TEN_MIN_MS, now)
  const day = await store.incr(bucket(ip, now, DAY_MS, "day"), DAY_MS, now)
  return burst <= BURST_LIMIT && day <= DAY_LIMIT
}

function spendKey(now: number): string {
  return `spend:${Math.floor(now / DAY_MS)}`
}

/** Spend is stored in whole micro-dollars so the shared store only needs integer increments. */
export async function recordSpend(usd: number, now = Date.now(), store: Store = storeFromEnv()): Promise<void> {
  if (!Number.isFinite(usd) || usd <= 0) return
  await store.incr(spendKey(now), DAY_MS, now, Math.max(1, Math.round(usd * MICROS)))
}

export async function spendRatio(now = Date.now(), env: Env = process.env, store: Store = storeFromEnv(env)): Promise<number> {
  const cap = Number(env.DAILY_USD_CAP)
  if (!Number.isFinite(cap) || cap <= 0) return 0
  return (await store.get(spendKey(now), now)) / MICROS / cap
}

/** What one call cost: tokens at the model's rate, plus web searches. */
export function costUsd(inputTokens: number, outputTokens: number, model: string = GENERAL_MODEL, searches = 0): number {
  const [, inputRate, outputRate] = RATES.find(([family]) => family.test(model)) ?? RATES[0]
  return (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000 + searches * USD_PER_SEARCH
}
