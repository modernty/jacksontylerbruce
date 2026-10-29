import assert from "node:assert/strict"
import { test } from "node:test"
import { keywordRoute } from "./keyword"
import { handleAsk } from "./handle"
import {
  BURST_LIMIT,
  DAY_LIMIT,
  DAY_MS,
  MAX_TOKENS,
  MemoryCounter,
  TEN_MIN_MS,
  costUsd,
  counterFromEnv,
  createKvCounter,
  memoryCounter,
  recordSpend,
  resetSpend,
  spendRatio,
  underLimit,
} from "./limits"

test("burst limit is 10 per 10 minutes and 50 per day", async () => {
  memoryCounter.reset()
  const ip = "burst"
  for (let i = 0; i < BURST_LIMIT; i += 1) assert.equal(await underLimit(ip, 5_000 + i), true)
  assert.equal(await underLimit(ip, 5_100), false)
  assert.equal(await underLimit("other", 5_100), true)
  assert.equal(await underLimit(ip, 5_000 + TEN_MIN_MS), true)
})

test("daily limit holds across burst windows", async () => {
  memoryCounter.reset()
  const ip = "day"
  for (let window = 0; window < DAY_LIMIT / BURST_LIMIT; window += 1) {
    const start = window * TEN_MIN_MS
    for (let i = 0; i < BURST_LIMIT; i += 1) assert.equal(await underLimit(ip, start + i), true)
  }
  assert.equal(await underLimit(ip, (DAY_LIMIT / BURST_LIMIT) * TEN_MIN_MS), false)
  assert.equal(await underLimit(ip, DAY_MS + 10), true)
})

test("ask route enforces the character cap and the limit adapter", async () => {
  memoryCounter.reset()
  const missing = await handleAsk({ q: "hello" }, { ip: "a", now: 1 })
  assert.equal(missing.status, 400)
  const long = await handleAsk({ q: "a".repeat(401), sessionId: "s" }, { ip: "b", now: 1 })
  assert.equal(long.status, 400)
  const counter = new MemoryCounter()
  for (let i = 0; i < BURST_LIMIT; i += 1) {
    const ok = await handleAsk({ q: "Where are you based?", sessionId: "s" }, { ip: "capped", now: 20 }, { counter })
    assert.equal(ok.status, 200)
  }
  const limited = await handleAsk({ q: "Where are you based?", sessionId: "s" }, { ip: "capped", now: 30 }, { counter })
  assert.equal(limited.status, 429)
})

test("spend cap and model errors stay on the keyword router", async () => {
  resetSpend()
  const now = 8_000
  recordSpend(2, now)
  const previous = process.env.DAILY_USD_CAP
  process.env.DAILY_USD_CAP = "1"
  assert.ok(spendRatio(now) >= 1)
  let called = false
  const capped = await handleAsk(
    { q: "Where are you based?", sessionId: "s" },
    { ip: "spend", now },
    { counter: new MemoryCounter(), routeModel: async () => { called = true; return keywordRoute("Where are you based?") } },
  )
  assert.equal(called, false)
  assert.equal((capped.body as { source: string }).source, "keyword")
  process.env.DAILY_USD_CAP = previous
  resetSpend()

  const failed = await handleAsk(
    { q: "Where are you based?", sessionId: "s" },
    { ip: "err", now: 9_000 },
    { counter: new MemoryCounter(), routeModel: async () => { throw new Error("llm down") } },
  )
  assert.equal((failed.body as { source: string; intent: string }).source, "keyword")
  assert.equal((failed.body as { intent: string }).intent, "location")
})

test("a blocked question declines without echoing a hidden link", async () => {
  const result = await handleAsk(
    { q: "hello there", sessionId: "s" },
    { ip: "block", now: 4_000 },
    { counter: new MemoryCounter(), blocked: () => true },
  )
  const body = result.body as { intent: string; href: string; annotation: string }
  assert.equal(body.intent, "decline")
  assert.equal(body.href.includes("/work/"), false)
  assert.equal(/remedy|traveller|fintech/i.test(body.annotation), false)
})

test("model calls use the token cap and a timeout", async () => {
  let seen = 0
  let timed = false
  await assert.rejects(() => import("./llm").then(({ modelRoute }) => modelRoute("Where are you based?", {
    async create(body, opts) {
      seen = body.max_tokens
      timed = Boolean(opts.signal)
      throw new Error("stop")
    },
  })))
  assert.equal(seen, MAX_TOKENS)
  assert.equal(timed, true)
  assert.equal(costUsd(1_000_000, 0), 1)
})

test("kv is used only when its env vars exist", async () => {
  assert.equal(counterFromEnv({ NODE_ENV: "test" }), memoryCounter)
  const calls: string[] = []
  const counter = createKvCounter("https://kv.example", "token", async (url) => {
    calls.push(url)
    return new Response(JSON.stringify({ result: calls.length }), { status: 200 })
  })
  assert.equal(await counter.incr("10m:ip:1", 600_000, 0), 1)
  assert.equal(calls[0]?.includes("/incr/"), true)
  assert.equal(calls[1]?.includes("/expire/"), true)
})
