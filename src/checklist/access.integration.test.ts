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
import { daysPost, itemsGet, itemsPut } from "./service"
import { createMemoryStore, type ChecklistStore } from "./store"

const USER = { id: "user-a", email: "person@example.com" }

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
  return { listItems: boom, saveItems: boom, getDays: boom, saveDay: boom, getWeek: boom, saveWeek: boom, applyTemplate: boom }
}

describe("checklist access", { concurrency: false }, () => {
  test("unauthenticated requests get no checklist data", async () => {
    const previousUrl = process.env.SUPABASE_URL
    const previousAnon = process.env.SUPABASE_ANON_KEY
    const previousPublic = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const previousSeed = process.env.CHECKLIST_SEED_JSON
    const previousNode = process.env.NODE_ENV
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    process.env.CHECKLIST_SEED_JSON = JSON.stringify([
      item({ id: "item-a", label: "Item A", category: "Body", publicStreak: true }),
    ])
    try {
      const hidden = await middleware(new NextRequest("https://example.com/me/checklist/api/items"))
      assert.equal(hidden.status, 404)
      assert.equal(await hidden.text(), "")
      assert.equal(hidden.headers.get("x-robots-tag")?.includes("noindex"), true)

      const redirect = await middleware(new NextRequest("https://example.com/me/checklist"))
      assert.equal(redirect.status, 307)
      assert.equal(new URL(redirect.headers.get("location") ?? "", "https://example.com").pathname, "/me/checklist/login")
      assert.equal((await redirect.text()).includes("Item A"), false)

      const missed = await itemsGet(new Request("https://example.com/me/checklist/api/items"), { user: null, store: trap() })
      assert.equal(missed.status, 404)
      assert.equal(await missed.text(), "")

      const day = await daysPost(new Request("https://example.com/me/checklist/api/days", {
        method: "POST",
        headers: { origin: "https://example.com", "content-type": "application/json" },
        body: JSON.stringify({ date: "2026-11-02", itemId: "item-a", checked: true }),
      }), { user: null, store: trap() })
      assert.equal(day.status, 404)
      assert.equal(await day.text(), "")

      setNodeEnv("production")
      const unconfigured = await itemsGet(new Request("https://example.com/me/checklist/api/items"), { user: USER })
      assert.equal(unconfigured.status, 503)
      const body = await unconfigured.text()
      assert.equal(body, JSON.stringify({ error: "storage not configured" }))
      assert.equal(body.includes("Item A"), false)
      assert.throws(() => {
        throw new StorageNotConfigured()
      }, StorageNotConfigured)
    } finally {
      restore("SUPABASE_URL", previousUrl)
      restore("SUPABASE_ANON_KEY", previousAnon)
      restore("NEXT_PUBLIC_SUPABASE_ANON_KEY", previousPublic)
      restore("CHECKLIST_SEED_JSON", previousSeed)
      setNodeEnv(previousNode)
    }
  })

  test("a signed-in user can read their store and cannot publish a refused streak", async () => {
    const store = createMemoryStore()
    await store.saveItems([item({ id: "item-a", label: "Item A", category: "Mind" })])
    const headers = { origin: "https://example.com", "content-type": "application/json" }
    const ok = await itemsGet(new Request("https://example.com/me/checklist/api/items", { headers }), { user: USER, store })
    assert.equal(ok.status, 200)
    const listed = (await ok.json()) as { items: Item[] }
    assert.deepEqual(listed.items.map((entry) => entry.label), ["Item A"])

    const refused = await itemsPut(new Request("https://example.com/me/checklist/api/items", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        items: [item({ id: "item-b", label: "Item B", category: "Money", publicStreak: true, note: "rent note" })],
      }),
    }), { user: USER, store })
    assert.equal(refused.status, 400)
    assert.equal(await refused.text(), JSON.stringify({ error: "public streak refused" }))
    assert.deepEqual((await store.listItems()).map((entry) => entry.id), ["item-a"])
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

  test("the app does not use the service role or an email allowlist", () => {
    const store = readFileSync("src/checklist/store.ts", "utf8")
    assert.match(store, /import "server-only"/)
    assert.match(store, /user_id/)
    assert.match(store, /claim_legacy_checklist/)
    assert.equal(store.includes("SUPABASE_SERVICE_ROLE_KEY"), false)
    assert.equal(store.includes("@upstash/redis"), false)
    const app = [...files("src"), ...files("app")]
      .filter((file) => !file.endsWith(".test.ts"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n")
    assert.equal(app.includes("SUPABASE_SERVICE_ROLE_KEY"), false)
    assert.equal(app.includes("CHECKLIST_ALLOWED_EMAILS"), false)
    assert.equal(app.includes("CHECKLIST_PASSPHRASE"), false)
    assert.equal(app.includes("CHECKLIST_SESSION_SECRET"), false)
    assert.equal(app.includes("CHECKLIST_PUBLIC_STREAK_IDS"), false)
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
