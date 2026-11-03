import assert from "node:assert/strict"
import { test } from "node:test"
import { addDays, dayKey, isMonday, weekStartMonday, weekdayIndex, zoneOffsetMinutes } from "./dates"
import { PublicStreakRefused } from "./errors"
import { normalizeItems } from "./items"
import type { Item } from "./model"
import { publicStreakAllowed, publicStreakRows } from "./public"
import { isSlipping, missedInWindow, streakEnding } from "./streaks"

function item(partial: Partial<Item> & Pick<Item, "id" | "label" | "category">): Item {
  return {
    order: 0,
    active: true,
    publicStreak: false,
    ...partial,
  }
}

test("Santo Domingo day starts at 04:00 UTC and does not shift in summer", () => {
  assert.equal(zoneOffsetMinutes(new Date("2026-01-15T12:00:00Z")), -240)
  assert.equal(zoneOffsetMinutes(new Date("2026-07-15T12:00:00Z")), -240)
  assert.equal(dayKey(new Date("2026-03-15T03:59:59.999Z")), "2026-03-14")
  assert.equal(dayKey(new Date("2026-03-15T04:00:00.000Z")), "2026-03-15")
  assert.equal(dayKey(new Date("2026-07-15T03:59:59.999Z")), "2026-07-14")
  assert.equal(dayKey(new Date("2026-07-15T04:00:00.000Z")), "2026-07-15")
  assert.equal(dayKey(new Date("2026-11-02T03:59:59.999Z")), "2026-11-01")
  assert.equal(dayKey(new Date("2026-11-02T04:00:00.000Z")), "2026-11-02")
})

test("weeks start on Monday in the checklist calendar", () => {
  assert.equal(weekdayIndex("2026-11-02"), 0)
  assert.equal(isMonday("2026-11-02"), true)
  assert.equal(weekStartMonday("2026-11-02"), "2026-11-02")
  assert.equal(weekStartMonday("2026-11-01"), "2026-10-26")
  assert.equal(weekStartMonday("2026-11-08"), "2026-11-02")
  assert.equal(weekStartMonday(dayKey(new Date("2026-11-02T03:30:00Z"))), "2026-10-26")
  assert.equal(weekStartMonday(dayKey(new Date("2026-11-02T04:30:00Z"))), "2026-11-02")
  assert.equal(addDays("2026-03-01", -1), "2026-02-28")
  assert.equal(addDays("2024-03-01", -1), "2024-02-29")
})

test("streaks count consecutive days ending today or yesterday", () => {
  const today = "2026-11-02"
  const done = new Set(["2026-10-31", "2026-11-01", "2026-11-02"])
  assert.equal(streakEnding(today, (day) => done.has(day)), 3)

  const openToday = new Set(["2026-10-31", "2026-11-01"])
  assert.equal(streakEnding(today, (day) => openToday.has(day)), 2)

  const gapYesterday = new Set(["2026-10-31", "2026-11-02"])
  assert.equal(streakEnding(today, (day) => gapYesterday.has(day)), 1)

  const cold = new Set(["2026-10-30"])
  assert.equal(streakEnding(today, (day) => cold.has(day)), 0)
  assert.equal(streakEnding(today, () => false), 0)
})

test("slipping means three or more misses in the last seven days", () => {
  const today = "2026-11-02"
  const misses = new Set(["2026-11-02", "2026-11-01", "2026-10-31"])
  assert.equal(missedInWindow(today, 7, (day) => !misses.has(day)), 3)
  assert.equal(isSlipping(today, (day) => !misses.has(day)), true)
  assert.equal(isSlipping(today, (day) => !new Set(["2026-11-02", "2026-11-01"]).has(day)), false)
  assert.equal(isSlipping(today, () => true), false)
  assert.equal(isSlipping(today, () => false), true)
})

test("public streaks drop Money, private tags, and inactive items", () => {
  const items = [
    item({ id: "a", label: "Item A", category: "Body", order: 0, publicStreak: true }),
    item({ id: "b", label: "Item B", category: "Money", order: 1, publicStreak: true, note: "rent note" }),
    item({ id: "c", label: "Item C", category: "Mind", order: 2, publicStreak: true, tags: ["Private"] }),
    item({ id: "d", label: "Item D", category: "Rest", order: 3, publicStreak: false }),
    item({ id: "e", label: "Item E", category: "Spirit", order: 4, publicStreak: true, active: false }),
  ]
  assert.equal(publicStreakAllowed(items[0]), true)
  assert.equal(publicStreakAllowed(items[1]), false)
  assert.equal(publicStreakAllowed(items[2]), false)
  const rows = publicStreakRows(items, "2026-11-02", (id, day) => id === "a" && day === "2026-11-02")
  assert.deepEqual(rows, [{ id: "a", label: "Item A", streak: 1 }])
  assert.throws(() => normalizeItems([items[1]]), PublicStreakRefused)
  assert.equal(normalizeItems([{ ...items[1], publicStreak: false }])[0]?.publicStreak, false)
})
