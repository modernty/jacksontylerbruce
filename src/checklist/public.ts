import type { Item, PublicStreakRow } from "./model"
import { streakEnding } from "./streaks"

export function isPrivateItem(item: Pick<Item, "tags">): boolean {
  return (item.tags ?? []).some((tag) => tag.trim().toLowerCase() === "private")
}

/** Money, and anything tagged private, cannot store a public streak. Listing an id is what publishes one. */
export function publicStreakAllowed(item: Pick<Item, "category" | "tags">): boolean {
  if (item.category === "Money") return false
  if (isPrivateItem(item)) return false
  return true
}

export function withoutRefusedPublicStreak<T extends Pick<Item, "category" | "tags" | "publicStreak">>(item: T): T {
  if (item.publicStreak && !publicStreakAllowed(item)) return { ...item, publicStreak: false }
  return item
}

export function publicStreakRows(
  items: Item[],
  today: string,
  doneOn: (itemId: string, day: string) => boolean,
): PublicStreakRow[] {
  return items
    .filter((item) => item.active && item.publicStreak && publicStreakAllowed(item))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((item) => ({
      id: item.id,
      label: item.label,
      streak: streakEnding(today, (day) => doneOn(item.id, day)),
    }))
}
