import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { SeedRefused, StorageNotConfigured } from "./errors"
import type { Item } from "./model"
import { createMemoryStore, openStore, storageConfigured } from "./store"

function setNodeEnv(value: string | undefined) {
  const env = process.env as Record<string, string | undefined>
  if (value === undefined) delete env.NODE_ENV
  else env.NODE_ENV = value
}

function item(partial: Partial<Item> & Pick<Item, "id" | "label" | "category">): Item {
  return { order: 0, active: true, publicStreak: false, ...partial }
}

describe("checklist store", { concurrency: false }, () => {

test("seed JSON is stored once and refused public streaks are not kept", async () => {
  const previous = process.env.CHECKLIST_SEED_JSON
  process.env.CHECKLIST_SEED_JSON = JSON.stringify([
    item({ id: "item-a", label: "Item A", category: "Body", order: 1, publicStreak: true }),
    item({ id: "item-b", label: "Item B", category: "Money", order: 0, publicStreak: true, note: "kept private" }),
  ])
  try {
    const store = createMemoryStore()
    const first = await store.listItems()
    assert.deepEqual(first.map((entry) => entry.id), ["item-b", "item-a"])
    assert.equal(first.find((entry) => entry.id === "item-a")?.publicStreak, true)
    assert.equal(first.find((entry) => entry.id === "item-b")?.publicStreak, false)
    assert.equal(first.find((entry) => entry.id === "item-b")?.note, "kept private")
    process.env.CHECKLIST_SEED_JSON = JSON.stringify([
      item({ id: "item-c", label: "Item C", category: "Rest", publicStreak: false }),
    ])
    const second = await store.listItems()
    assert.equal(second.some((entry) => entry.id === "item-c"), false)
  } finally {
    if (previous === undefined) delete process.env.CHECKLIST_SEED_JSON
    else process.env.CHECKLIST_SEED_JSON = previous
  }
})

test("a bad seed refuses without echoing the payload", async () => {
  const previous = process.env.CHECKLIST_SEED_JSON
  process.env.CHECKLIST_SEED_JSON = "[{\"label\":\"Item A\"}]"
  try {
    const store = createMemoryStore()
    await assert.rejects(store.listItems(), (error: unknown) => {
      assert.ok(error instanceof SeedRefused)
      assert.equal(String(error).includes("Item A"), false)
      return true
    })
  } finally {
    if (previous === undefined) delete process.env.CHECKLIST_SEED_JSON
    else process.env.CHECKLIST_SEED_JSON = previous
  }
})

test("saving a refused public streak does not write", async () => {
  const store = createMemoryStore()
  const saved = await store.saveItems([
    item({ id: "item-a", label: "Item A", category: "Mind", publicStreak: false }),
  ])
  assert.equal(saved[0]?.label, "Item A")
  await assert.rejects(
    store.saveItems([
      item({ id: "item-b", label: "Item B", category: "Money", publicStreak: true }),
    ]),
  )
  const items = await store.listItems()
  assert.deepEqual(items.map((entry) => entry.id), ["item-a"])
})

test("production without Supabase refuses storage and other environments keep an in-memory store", () => {
  const previousNode = process.env.NODE_ENV
  const previousUrl = process.env.SUPABASE_URL
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    setNodeEnv("production")
    assert.equal(storageConfigured(), false)
    assert.throws(() => openStore(), StorageNotConfigured)
    setNodeEnv("test")
    assert.equal(storageConfigured(), true)
    assert.equal(typeof openStore().listItems, "function")
  } finally {
    setNodeEnv(previousNode)
    if (previousUrl === undefined) delete process.env.SUPABASE_URL
    else process.env.SUPABASE_URL = previousUrl
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey
  }
})

})
