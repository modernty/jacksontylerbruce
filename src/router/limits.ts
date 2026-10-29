export const TEN_MIN_MS = 10 * 60 * 1000
export const DAY_MS = 24 * 60 * 60 * 1000
export const BURST_LIMIT = 10
export const DAY_LIMIT = 50
export const MAX_CHARS = 400
export const MAX_TOKENS = 300
export const ASK_TIMEOUT_MS = 8000

export interface Counter {
  incr(key: string, ttlMs: number, now: number): Promise<number>
}

type Bucket = { n: number; exp: number }

export class MemoryCounter implements Counter {
  private buckets = new Map<string, Bucket>()

  async incr(key: string, ttlMs: number, now: number): Promise<number> {
    const current = this.buckets.get(key)
    if (!current || current.exp <= now) {
      this.buckets.set(key, { n: 1, exp: now + ttlMs })
      return 1
    }
    current.n += 1
    return current.n
  }

  reset(): void {
    this.buckets.clear()
  }
}

export const memoryCounter = new MemoryCounter()

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>

export function createKvCounter(url: string, token: string, fetcher: Fetcher = fetch): Counter {
  const base = url.replace(/\/$/, "")
  const headers = { Authorization: `Bearer ${token}` }
  return {
    async incr(key: string, ttlMs: number): Promise<number> {
      const encoded = encodeURIComponent(key)
      const response = await fetcher(`${base}/incr/${encoded}`, { headers })
      if (!response.ok) throw new Error("kv incr failed")
      const body = (await response.json()) as { result?: number }
      const count = Number(body.result)
      if (!Number.isFinite(count)) throw new Error("kv incr failed")
      if (count === 1) {
        await fetcher(`${base}/expire/${encoded}/${Math.ceil(ttlMs / 1000)}`, { headers })
      }
      return count
    },
  }
}

export function counterFromEnv(env: NodeJS.ProcessEnv = process.env, fetcher: Fetcher = fetch): Counter {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN
  if (!url || !token) return memoryCounter
  return createKvCounter(url, token, fetcher)
}

function bucket(ip: string, now: number, size: number, name: string): string {
  return `${name}:${ip}:${Math.floor(now / size)}`
}

export async function underLimit(ip: string, now: number, counter: Counter = memoryCounter): Promise<boolean> {
  const burst = await counter.incr(bucket(ip, now, TEN_MIN_MS, "10m"), TEN_MIN_MS, now)
  const day = await counter.incr(bucket(ip, now, DAY_MS, "day"), DAY_MS, now)
  return burst <= BURST_LIMIT && day <= DAY_LIMIT
}

const spend = new Map<string, number>()

function dayKey(now: number): string {
  return String(Math.floor(now / DAY_MS))
}

export function resetSpend(): void {
  spend.clear()
}

export function recordSpend(usd: number, now = Date.now()): void {
  if (!Number.isFinite(usd) || usd <= 0) return
  const key = dayKey(now)
  spend.set(key, (spend.get(key) ?? 0) + usd)
}

export function spendRatio(now = Date.now(), env: NodeJS.ProcessEnv = process.env): number {
  const cap = Number(env.DAILY_USD_CAP)
  if (!Number.isFinite(cap) || cap <= 0) return 0
  return (spend.get(dayKey(now)) ?? 0) / cap
}

export function costUsd(inputTokens: number, outputTokens: number, env: NodeJS.ProcessEnv = process.env): number {
  const inputRate = Number(env.USD_PER_MILLION_INPUT ?? "1")
  const outputRate = Number(env.USD_PER_MILLION_OUTPUT ?? "5")
  return (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000
}
