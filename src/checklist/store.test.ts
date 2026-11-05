import assert from "node:assert/strict"
import { describe, test } from "node:test"
import type { Item } from "./model"
import { TEMPLATE_ITEMS } from "./template"
import { createMemoryStore, visibleTo, withUser } from "./store"

function item(partial: Partial<Item> & Pick<Item, "id" | "label" | "category">): Item {
  return { order: 0, active: true, publicStreak: false, ...partial }
}

describe("checklist store", { concurrency: false }, () => {
  test("a new list is empty until the template is applied once", async () => {
    const store = createMemoryStore()
    assert.deepEqual(await store.listItems(), [])
    const started = await store.applyTemplate()
    assert.deepEqual(started.map((entry) => entry.label), TEMPLATE_ITEMS.map((entry) => entry.label))
    assert.equal(started.every((entry) => entry.publicStreak === false), true)
    await store.saveItems([item({ id: "item-a", label: "Item A", category: "Mind" })])
    const again = await store.applyTemplate()
    assert.deepEqual(again.map((entry) => entry.id), ["item-a"])
  })

  test("saving a refused public streak does not write", async () => {
    const store = createMemoryStore()
    await store.saveItems([item({ id: "item-a", label: "Item A", category: "Mind" })])
    await assert.rejects(store.saveItems([
      item({ id: "item-b", label: "Item B", category: "Money", publicStreak: true }),
    ]))
    assert.deepEqual((await store.listItems()).map((entry) => entry.id), ["item-a"])
  })

  test("rows are stamped for one user and hidden from another", () => {
    const row = withUser({ id: "item-a", label: "Item A" }, "user-a")
    assert.equal(row.user_id, "user-a")
    const rows = [
      { user_id: "user-a", id: "item-a" },
      { user_id: "user-b", id: "item-b" },
    ]
    assert.deepEqual(visibleTo(rows, "user-a").map((entry) => entry.id), ["item-a"])
    assert.deepEqual(visibleTo(rows, "user-b").map((entry) => entry.id), ["item-b"])
    assert.deepEqual(visibleTo(rows, "user-c"), [])
  })
})
