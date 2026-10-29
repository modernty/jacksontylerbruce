import assert from "node:assert/strict"
import { test } from "node:test"
import { allow, handleAsk, resetRateLimit } from "./handle"

test("rejects a missing body and a long question", async () => {
  const missing = await handleAsk({ q: "hello" }, { ip: "a" })
  assert.equal(missing.status, 400)
  const long = await handleAsk({ q: "a".repeat(401), sessionId: "s" }, { ip: "b" })
  assert.equal(long.status, 400)
})

test("rate limit is per address", async () => {
  resetRateLimit()
  for (let i = 0; i < 10; i += 1) assert.equal(allow("ip", 1_000 + i), true)
  assert.equal(allow("ip", 1_500), false)
  assert.equal(allow("other", 1_500), true)
  const limited = await handleAsk({ q: "Where are you based?", sessionId: "s" }, { ip: "ip", now: 1_600 })
  assert.equal(limited.status, 429)
  resetRateLimit()
})
