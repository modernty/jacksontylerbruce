import { ChecklistInputError, PublicStreakRefused } from "./errors"
import type { Item } from "./model"
import { publicStreakAllowed } from "./public"

export function assertPublicStreaks(items: Item[]): void {
  for (const item of items) {
    if (item.publicStreak && !publicStreakAllowed(item)) throw new PublicStreakRefused()
  }
}

export function normalizeItems(items: Item[]): Item[] {
  const cleaned = items.map(cleanItem)
  if (cleaned.some((item) => item.label.length === 0)) throw new ChecklistInputError("invalid items")
  if (new Set(cleaned.map((item) => item.id)).size !== cleaned.length) throw new ChecklistInputError("invalid items")
  assertPublicStreaks(cleaned)
  return cleaned
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((item, index) => ({ ...item, order: index }))
}

function cleanItem(item: Item): Item {
  const next: Item = {
    id: item.id.trim(),
    label: item.label.trim(),
    category: item.category,
    order: item.order,
    active: item.active,
    publicStreak: item.publicStreak,
  }
  const note = item.note?.trim()
  if (note) next.note = note
  const tags = (item.tags ?? []).map((tag) => tag.trim()).filter(Boolean)
  if (tags.length) next.tags = tags
  if (item.track === "spend") next.track = "spend"
  return next
}
