export const LOGIN_LIMIT = 8
export const LOGIN_WINDOW_MS = 10 * 60 * 1000

type Bucket = { count: number; reset: number }

const buckets = new Map<string, Bucket>()

export function resetRateLimits(): void {
  buckets.clear()
}

export function takeToken(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfter: number } {
  const current = buckets.get(key)
  if (!current || current.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  if (current.count >= limit) return { ok: false, retryAfter: Math.ceil((current.reset - now) / 1000) }
  current.count += 1
  return { ok: true, retryAfter: 0 }
}
