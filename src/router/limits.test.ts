import assert from "node:assert/strict"
import { test } from "node:test"
import { keywordRoute } from "./keyword"
import { handleAsk } from "./handle"
import { BURST_LIMIT, DAY_LIMIT, DAY_MS, MAX_TOKENS, TEN_MIN_MS, costUsd, recordSpend, spendRatio, underLimit } from "./limits"
import { MemoryStore, createRestStore, memoryStore, storeFromEnv, withFallback } from "./store"

test("burst limit is 10 per 10 minutes and 50 per day", async () => {
  memoryStore.reset()
  const ip = "burst"
  for (let i = 0; i < BURST_LIMIT; i += 1) assert.equal(await underLimit(ip, 5_000 + i), true)
  assert.equal(await underLimit(ip, 5_100), false)
  assert.equal(await underLimit("other", 5_100), true)
  assert.equal(await underLimit(ip, 5_000 + TEN_MIN_MS), true)
})

test("daily limit holds across burst windows", async () => {
  memoryStore.reset()
  const ip = "day"
  for (let window = 0; window < DAY_LIMIT / BURST_LIMIT; window += 1) {
    const start = window * TEN_MIN_MS
    for (let i = 0; i < BURST_LIMIT; i += 1) assert.equal(await underLimit(ip, start + i), true)
  }
  assert.equal(await underLimit(ip, (DAY_LIMIT / BURST_LIMIT) * TEN_MIN_MS), false)
  assert.equal(await underLimit(ip, DAY_MS + 10), true)
})

test("ask route enforces the character cap and the limit adapter", async () => {
  memoryStore.reset()
  const missing = await handleAsk({ q: "hello" }, { ip: "a", now: 1 })
  assert.equal(missing.status, 400)
  const long = await handleAsk({ q: "a".repeat(401), sessionId: "s" }, { ip: "b", now: 1 })
  assert.equal(long.status, 400)
  const counter = new MemoryStore()
  for (let i = 0; i < BURST_LIMIT; i += 1) {
    const ok = await handleAsk({ q: "Where are you based?", sessionId: "s" }, { ip: "capped", now: 20 }, { store: counter })
    assert.equal(ok.status, 200)
  }
  const limited = await handleAsk({ q: "Where are you based?", sessionId: "s" }, { ip: "capped", now: 30 }, { store: counter })
  assert.equal(limited.status, 429)
})

test("spend cap and model errors stay on the keyword router", async () => {
  const spent = new MemoryStore()
  const now = 8_000
  await recordSpend(2, now, spent)
  const env = { ...process.env, DAILY_USD_CAP: "1" }
  assert.ok((await spendRatio(now, env, spent)) >= 1)
  assert.equal(await spendRatio(now + DAY_MS, env, spent), 0)
  let called = false
  const capped = await handleAsk(
    { q: "Where are you based?", sessionId: "s" },
    { ip: "spend", now },
    { store: spent, env, routeModel: async () => { called = true; return keywordRoute("Where are you based?") } },
  )
  assert.equal(called, false)
  assert.equal((capped.body as { source: string }).source, "keyword")

  const failed = await handleAsk(
    { q: "Where are you based?", sessionId: "s" },
    { ip: "err", now: 9_000 },
    { store: new MemoryStore(), routeModel: async () => { throw new Error("llm down") } },
  )
  assert.equal((failed.body as { source: string; intent: string }).source, "keyword")
  assert.equal((failed.body as { intent: string }).intent, "location")
})

test("a blocked question declines without echoing a hidden link", async () => {
  const result = await handleAsk(
    { q: "hello there", sessionId: "s" },
    { ip: "block", now: 4_000 },
    { store: new MemoryStore(), blocked: () => true },
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

test("the shared store is used only when its env vars exist", async () => {
  assert.equal(storeFromEnv({ NODE_ENV: "test" }), memoryStore)
  assert.notEqual(storeFromEnv({ UPSTASH_REDIS_REST_URL: "https://r.example", UPSTASH_REDIS_REST_TOKEN: "t" }), memoryStore)
  assert.notEqual(storeFromEnv({ KV_REST_API_URL: "https://r.example", KV_REST_API_TOKEN: "t" }), memoryStore)
})

test("the Upstash REST store increments, expires new keys and reads totals", async () => {
  const calls: string[] = []
  const totals = new Map<string, number>()
  const store = createRestStore("https://r.example/", "t", async (url, init) => {
    calls.push(url)
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer t")
    const [, op, key, arg] = new URL(url).pathname.split("/")
    if (op === "incrby") totals.set(key!, (totals.get(key!) ?? 0) + Number(arg))
    const result = op === "pexpire" ? 1 : op === "get" ? (totals.has(key!) ? String(totals.get(key!)) : null) : totals.get(key!)
    return new Response(JSON.stringify({ result }), { status: 200 })
  })
  assert.equal(await store.incr("10m:ip:1", 600_000, 0), 1)
  assert.equal(await store.incr("10m:ip:1", 600_000, 0, 4), 5)
  assert.equal(await store.get("10m:ip:1", 0), 5)
  assert.equal(await store.get("missing", 0), 0)
  assert.deepEqual(calls.map((url) => new URL(url).pathname.split("/")[1]), ["incrby", "pexpire", "incrby", "get", "get"])
})

test("a failing shared store falls back to memory for limits and spend", async () => {
  const down = createRestStore("https://r.example", "t", async () => new Response("no", { status: 503 }))
  const backup = new MemoryStore()
  const store = withFallback(down, backup)
  for (let i = 0; i < BURST_LIMIT; i += 1) assert.equal(await underLimit("fb", 1, store), true)
  assert.equal(await underLimit("fb", 2, store), false)
  await recordSpend(0.5, 1, store)
  assert.equal(await spendRatio(1, { DAILY_USD_CAP: "1" }, store), 0.5)
  const limited = await handleAsk({ q: "Where are you based?", sessionId: "s" }, { ip: "fb", now: 3 }, { store })
  assert.equal(limited.status, 429)
})
