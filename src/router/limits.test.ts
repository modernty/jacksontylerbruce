import assert from "node:assert/strict"
import { test } from "node:test"
import { keywordRoute } from "./keyword"
import { handleAsk } from "./handle"
import { BURST_LIMIT, DAY_LIMIT, DAY_MS, MAX_TOKENS, TEN_MIN_MS, costUsd, modelCallsAllowed, recordSpend, spendRatio, underLimit } from "./limits"
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
  assert.equal(costUsd(1_000_000, 0), 0.1)
  assert.equal(costUsd(0, 1_000_000), 0.5)
  assert.equal(costUsd(1_000_000, 1_000_000, "claude-sonnet-5-5"), 12)
  assert.equal(costUsd(0, 0, "claude-haiku-5-5", 2), 0.02)
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

test("model calls fail closed without a valid daily spend cap", async () => {
  assert.equal(modelCallsAllowed({}), false)
  assert.equal(modelCallsAllowed({ DAILY_USD_CAP: "" }), false)
  assert.equal(modelCallsAllowed({ DAILY_USD_CAP: "0" }), false)
  assert.equal(modelCallsAllowed({ DAILY_USD_CAP: "-1" }), false)
  assert.equal(modelCallsAllowed({ DAILY_USD_CAP: "nope" }), false)
  assert.equal(modelCallsAllowed({ DAILY_USD_CAP: "5" }), true)
  let called = false
  const result = await handleAsk(
    { q: "What is the capital of France?", sessionId: "s" },
    { ip: "nocap", now: 11_000 },
    { store: new MemoryStore(), env: { NODE_ENV: "test" }, routeModel: async () => { called = true; return keywordRoute("What is the capital of France?") } },
  )
  assert.equal(called, false)
  assert.equal((result.body as { source: string }).source, "keyword")
})

test("model calls fail closed on Vercel without a shared store", async () => {
  const cap = { DAILY_USD_CAP: "5" }
  assert.equal(modelCallsAllowed({ ...cap, VERCEL_ENV: "preview" }), false)
  assert.equal(modelCallsAllowed({ ...cap, VERCEL_ENV: "production" }), false)
  assert.equal(modelCallsAllowed({ ...cap, VERCEL_ENV: "preview", UPSTASH_REDIS_REST_URL: "https://r.example", UPSTASH_REDIS_REST_TOKEN: "t" }), true)
  assert.equal(modelCallsAllowed({ ...cap, VERCEL_ENV: "preview", KV_REST_API_URL: "https://r.example", KV_REST_API_TOKEN: "t" }), true)
  // Local dev still allows the in-memory store when the cap is set.
  assert.equal(modelCallsAllowed({ ...cap, NODE_ENV: "test" }), true)

  let called = false
  const blocked = await handleAsk(
    { q: "What is the capital of France?", sessionId: "s" },
    { ip: "nostore", now: 12_000 },
    {
      store: new MemoryStore(),
      env: { NODE_ENV: "test", DAILY_USD_CAP: "5", VERCEL_ENV: "preview" },
      routeModel: async () => { called = true; return keywordRoute("What is the capital of France?") },
    },
  )
  assert.equal(called, false)
  assert.equal((blocked.body as { source: string }).source, "keyword")

  called = false
  const allowed = await handleAsk(
    { q: "What is the capital of France?", sessionId: "s" },
    { ip: "withstore", now: 13_000 },
    {
      store: new MemoryStore(),
      env: { NODE_ENV: "test", DAILY_USD_CAP: "5", VERCEL_ENV: "preview", UPSTASH_REDIS_REST_URL: "https://r.example", UPSTASH_REDIS_REST_TOKEN: "t" },
      routeModel: async () => {
        called = true
        return { ...keywordRoute("What is the capital of France?"), source: "model" }
      },
    },
  )
  assert.equal(called, true)
  assert.equal((allowed.body as { source: string }).source, "model")
})
