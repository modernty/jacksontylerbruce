import { memoryStore, storeFromEnv, type Env, type Store } from "./store"

export const TEN_MIN_MS = 10 * 60 * 1000
export const DAY_MS = 24 * 60 * 60 * 1000
export const BURST_LIMIT = 10
export const DAY_LIMIT = 50
export const MAX_CHARS = 400
export const MAX_TOKENS = 300
export const ASK_TIMEOUT_MS = 8000
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

export function costUsd(inputTokens: number, outputTokens: number, env: Env = process.env): number {
  const inputRate = Number(env.USD_PER_MILLION_INPUT ?? "1")
  const outputRate = Number(env.USD_PER_MILLION_OUTPUT ?? "5")
  return (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000
}
