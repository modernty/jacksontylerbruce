/** One counter store for the rate limit and the spend cap: Upstash Redis REST when configured, memory otherwise. */
export interface Store {
  /** Adds `by` (default 1) to `key`, starting a `ttlMs` expiry when the key is new. Returns the new total. */
  incr(key: string, ttlMs: number, now: number, by?: number): Promise<number>
  /** The current total for `key`, or 0. */
  get(key: string, now: number): Promise<number>
  /** Adds `value` to the front of the list at `key`, keeping at most `max` entries. */
  push(key: string, value: string, max: number): Promise<void>
  /** The list at `key`, newest first. */
  list(key: string): Promise<string[]>
}

export type Env = Record<string, string | undefined>

type Bucket = { n: number; exp: number }

export class MemoryStore implements Store {
  private buckets = new Map<string, Bucket>()

  async incr(key: string, ttlMs: number, now: number, by = 1): Promise<number> {
    const current = this.buckets.get(key)
    if (!current || current.exp <= now) {
      this.buckets.set(key, { n: by, exp: now + ttlMs })
      return by
    }
    current.n += by
    return current.n
  }

  async get(key: string, now: number): Promise<number> {
    const current = this.buckets.get(key)
    return current && current.exp > now ? current.n : 0
  }

  private lists = new Map<string, string[]>()

  async push(key: string, value: string, max: number): Promise<void> {
    this.lists.set(key, [value, ...(this.lists.get(key) ?? [])].slice(0, max))
  }

  async list(key: string): Promise<string[]> {
    return this.lists.get(key) ?? []
  }

  reset(): void {
    this.buckets.clear()
    this.lists.clear()
  }
}

export const memoryStore = new MemoryStore()

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>

export function createRestStore(url: string, token: string, fetcher: Fetcher = fetch): Store {
  const base = url.replace(/\/$/, "")
  const headers = { Authorization: `Bearer ${token}` }
  const call = async (path: string): Promise<unknown> => {
    const response = await fetcher(`${base}/${path}`, { headers })
    if (!response.ok) throw new Error("store request failed")
    return ((await response.json()) as { result?: unknown }).result
  }
  return {
    async incr(key, ttlMs, _now, by = 1) {
      const encoded = encodeURIComponent(key)
      const total = Number(await call(`incrby/${encoded}/${Math.trunc(by)}`))
      if (!Number.isFinite(total)) throw new Error("store request failed")
      if (total === Math.trunc(by)) await call(`pexpire/${encoded}/${Math.ceil(ttlMs)}`)
      return total
    },
    async get(key) {
      const value = await call(`get/${encodeURIComponent(key)}`)
      const total = Number(value ?? 0)
      return Number.isFinite(total) ? total : 0
    },
    async push(key, value, max) {
      const encoded = encodeURIComponent(key)
      await call(`lpush/${encoded}/${encodeURIComponent(value)}`)
      await call(`ltrim/${encoded}/0/${Math.max(0, Math.trunc(max) - 1)}`)
    },
    async list(key) {
      const rows = await call(`lrange/${encodeURIComponent(key)}/0/-1`)
      return Array.isArray(rows) ? rows.filter((row): row is string => typeof row === "string") : []
    },
  }
}

/** Uses `primary`, and the memory store for any call where it throws. */
export function withFallback(primary: Store, fallback: Store = memoryStore): Store {
  if (primary === fallback) return primary
  return {
    incr: (key, ttlMs, now, by) => primary.incr(key, ttlMs, now, by).catch(() => fallback.incr(key, ttlMs, now, by)),
    get: (key, now) => primary.get(key, now).catch(() => fallback.get(key, now)),
    push: (key, value, max) => primary.push(key, value, max).catch(() => fallback.push(key, value, max)),
    list: (key) => primary.list(key).catch(() => fallback.list(key)),
  }
}

export function storeFromEnv(env: Env = process.env, fetcher: Fetcher = fetch): Store {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN
  if (!url || !token) return memoryStore
  return withFallback(createRestStore(url, token, fetcher))
}
