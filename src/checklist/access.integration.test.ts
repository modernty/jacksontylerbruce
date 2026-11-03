import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, test } from "node:test"
import { NextRequest } from "next/server"
import robots from "../../app/robots"
import sitemap from "../../app/sitemap"
import { middleware } from "../../middleware"
import { StorageNotConfigured } from "./errors"
import type { Item } from "./model"
import { resetRateLimits } from "./rate-limit"
import { daysPost, itemsGet, itemsPut, loginPost } from "./service"
import { issueSession, SESSION_SECONDS } from "./session"
import { createMemoryStore, type ChecklistStore } from "./store"

const SECRET = "test-session-secret-test-session-secret"
const PASSPHRASE = "correct horse"

function item(partial: Partial<Item> & Pick<Item, "id" | "label" | "category">): Item {
  return { order: 0, active: true, publicStreak: false, ...partial }
}

function files(dir: string): string[] {
  const found: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) found.push(...files(path))
    else if (/\.(ts|tsx|css)$/.test(name)) found.push(path)
  }
  return found
}

function trap(): ChecklistStore {
  const boom = async () => {
    throw new Error("store should not be read")
  }
  return { listItems: boom, saveItems: boom, getDays: boom, saveDay: boom, getWeek: boom, saveWeek: boom }
}

function formRequest(passphrase: string, ip: string): Request {
  const body = new URLSearchParams({ passphrase })
  return new Request("https://example.com/me/checklist/api/session", {
    method: "POST",
    headers: {
      origin: "https://example.com",
      "content-type": "application/x-www-form-urlencoded",
      "x-forwarded-for": ip,
    },
    body,
  })
}

describe("checklist access", { concurrency: false }, () => {
  test("unauthenticated requests get no checklist data", async () => {
    const previousSecret = process.env.CHECKLIST_SESSION_SECRET
    const previousPass = process.env.CHECKLIST_PASSPHRASE
    const previousSeed = process.env.CHECKLIST_SEED_JSON
    const previousNode = process.env.NODE_ENV
    const previousUrl = process.env.SUPABASE_URL
    const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    process.env.CHECKLIST_SESSION_SECRET = SECRET
    process.env.CHECKLIST_PASSPHRASE = PASSPHRASE
    process.env.CHECKLIST_SEED_JSON = JSON.stringify([
      item({ id: "item-a", label: "Item A", category: "Body", publicStreak: true }),
    ])
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    resetRateLimits()
    try {
      const api = new NextRequest("https://example.com/me/checklist/api/items")
      const hidden = await middleware(api)
      assert.equal(hidden.status, 404)
      assert.equal(await hidden.text(), "")
      assert.equal(hidden.headers.get("x-robots-tag")?.includes("noindex"), true)

      const page = new NextRequest("https://example.com/me/checklist")
      const redirect = await middleware(page)
      assert.equal(redirect.status, 307)
      assert.equal(new URL(redirect.headers.get("location") ?? "", "https://example.com").pathname, "/me/checklist/login")
      assert.equal((await redirect.text()).includes("Item A"), false)

      const missed = await itemsGet(new Request("https://example.com/me/checklist/api/items"), { store: trap() })
      assert.equal(missed.status, 404)
      assert.equal(await missed.text(), "")

      const day = await daysPost(new Request("https://example.com/me/checklist/api/days", {
        method: "POST",
        headers: { origin: "https://example.com", "content-type": "application/json" },
        body: JSON.stringify({ date: "2026-11-02", itemId: "item-a", checked: true }),
      }), { store: trap() })
      assert.equal(day.status, 404)
      assert.equal(await day.text(), "")

      setNodeEnv("production")
      const token = await issueSession(SECRET)
      const authed = new Request("https://example.com/me/checklist/api/items", {
        headers: { cookie: `checklist_session=${token}` },
      })
      const unconfigured = await itemsGet(authed)
      assert.equal(unconfigured.status, 503)
      const body = await unconfigured.text()
      assert.equal(body, JSON.stringify({ error: "storage not configured" }))
      assert.equal(body.includes("Item A"), false)
      assert.throws(() => {
        throw new StorageNotConfigured()
      }, StorageNotConfigured)
    } finally {
      restore("CHECKLIST_SESSION_SECRET", previousSecret)
      restore("CHECKLIST_PASSPHRASE", previousPass)
      restore("CHECKLIST_SEED_JSON", previousSeed)
      setNodeEnv(previousNode)
      restore("SUPABASE_URL", previousUrl)
      restore("SUPABASE_SERVICE_ROLE_KEY", previousKey)
    }
  })

  test("a signed session can read memory storage and cannot publish a refused streak", async () => {
    const previousSecret = process.env.CHECKLIST_SESSION_SECRET
    process.env.CHECKLIST_SESSION_SECRET = SECRET
    try {
      const store = createMemoryStore()
      await store.saveItems([item({ id: "item-a", label: "Item A", category: "Mind" })])
      const token = await issueSession(SECRET)
      const headers = { cookie: `checklist_session=${token}`, origin: "https://example.com", "content-type": "application/json" }
      const ok = await itemsGet(new Request("https://example.com/me/checklist/api/items", { headers }), { store })
      assert.equal(ok.status, 200)
      const listed = (await ok.json()) as { items: Item[] }
      assert.deepEqual(listed.items.map((entry) => entry.label), ["Item A"])

      const refused = await itemsPut(new Request("https://example.com/me/checklist/api/items", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          items: [item({ id: "item-b", label: "Item B", category: "Money", publicStreak: true, note: "rent note" })],
        }),
      }), { store })
      assert.equal(refused.status, 400)
      assert.equal(await refused.text(), JSON.stringify({ error: "public streak refused" }))
      assert.deepEqual((await store.listItems()).map((entry) => entry.id), ["item-a"])
    } finally {
      restore("CHECKLIST_SESSION_SECRET", previousSecret)
    }
  })

  test("login sets an HttpOnly Secure SameSite=Strict cookie for 30 days", async () => {
    const previousSecret = process.env.CHECKLIST_SESSION_SECRET
    const previousPass = process.env.CHECKLIST_PASSPHRASE
    process.env.CHECKLIST_SESSION_SECRET = SECRET
    process.env.CHECKLIST_PASSPHRASE = PASSPHRASE
    resetRateLimits()
    try {
      const ok = await loginPost(formRequest(PASSPHRASE, "203.0.113.10"))
      assert.equal(ok.status, 303)
      assert.equal(ok.headers.get("location"), "/me/checklist")
      const cookie = ok.headers.get("set-cookie") ?? ""
      assert.match(cookie, /HttpOnly/)
      assert.match(cookie, /Secure/)
      assert.match(cookie, /SameSite=Strict/)
      assert.match(cookie, new RegExp(`Max-Age=${SESSION_SECONDS}`))
      assert.equal(cookie.includes(PASSPHRASE), false)

      const bad = await loginPost(formRequest("nope", "203.0.113.11"))
      assert.equal(bad.headers.get("location"), "/me/checklist/login?error=1")
      assert.equal(bad.headers.get("set-cookie"), null)

      for (let attempt = 0; attempt < 8; attempt += 1) await loginPost(formRequest("nope", "203.0.113.12"))
      const limited = await loginPost(formRequest(PASSPHRASE, "203.0.113.12"))
      assert.equal(limited.headers.get("location"), "/me/checklist/login?error=rate")
      assert.equal(limited.headers.get("set-cookie"), null)
    } finally {
      restore("CHECKLIST_SESSION_SECRET", previousSecret)
      restore("CHECKLIST_PASSPHRASE", previousPass)
    }
  })

  test("the checklist stays out of the public site, sitemap, and robots allow list", async () => {
    const rules = JSON.stringify(robots())
    assert.match(rules, /\/me\/checklist/)
    const urls = (await Promise.resolve(sitemap())).map((entry) => entry.url)
    assert.equal(urls.some((url) => url.includes("/me")), false)
    assert.ok(urls.length > 0)

    const roots = ["app/(site)", "src/components", "src/router"]
    const hits: string[] = []
    for (const root of roots) {
      for (const file of files(root)) {
        if (readFileSync(file, "utf8").includes("/me/checklist")) hits.push(file)
      }
    }
    assert.deepEqual(hits, [])
  })

  test("Supabase is server-only and the migration enables RLS without policies", () => {
    const client = readFileSync("src/checklist/supabase.ts", "utf8")
    const store = readFileSync("src/checklist/store.ts", "utf8")
    assert.match(client, /import "server-only"/)
    assert.match(store, /import "server-only"/)
    assert.match(client, /SUPABASE_URL/)
    assert.match(client, /SUPABASE_SERVICE_ROLE_KEY/)
    assert.equal(client.includes("NEXT_PUBLIC"), false)
    assert.equal(store.includes("NEXT_PUBLIC"), false)
    assert.equal(store.includes("@upstash/redis"), false)
    for (const file of [...files("src/checklist/ui"), ...files("app/me")]) {
      const text = readFileSync(file, "utf8")
      assert.equal(/@supabase\/supabase-js|from ["'][^"']*supabase["']|from ["'][^"']*store["']/.test(text), false, file)
      assert.equal(text.includes("NEXT_PUBLIC"), false, file)
      assert.equal(text.includes("SERVICE_ROLE"), false, file)
    }
    const sql = readFileSync("supabase/migrations/20261102120000_checklist.sql", "utf8")
    for (const table of ["checklist_items", "checklist_day_logs", "checklist_week_targets"]) {
      assert.match(sql, new RegExp(`create table public\\.${table}`))
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`))
    }
    assert.equal(/create policy/i.test(sql), false)
    assert.equal(sql.includes("NEXT_PUBLIC"), false)
  })
})

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

function setNodeEnv(value: string | undefined) {
  const env = process.env as Record<string, string | undefined>
  if (value === undefined) delete env.NODE_ENV
  else env.NODE_ENV = value
}
