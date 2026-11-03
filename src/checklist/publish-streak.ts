import "server-only"
import type { Item, PublicStreakRow } from "./model"
import { isPrivateItem } from "./public"
import { streakEnding } from "./streaks"

/** Comma-separated ids. Missing or blank means nothing is public. */
export function parsePublicStreakIds(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set()
  return new Set(raw.split(",").map((id) => id.trim()).filter(Boolean))
}

/**
 * Deny by default. The publicStreak toggle is not a publish grant.
 * An item is included only when its id is listed, it is active, it is not Money, and it is not tagged private.
 */
export function publishedStreakRows(
  items: Item[],
  today: string,
  doneOn: (itemId: string, day: string) => boolean,
  allowlist = parsePublicStreakIds(process.env.CHECKLIST_PUBLIC_STREAK_IDS),
): PublicStreakRow[] {
  return items
    .filter((item) => item.active && allowlist.has(item.id) && item.category !== "Money" && !isPrivateItem(item))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((item) => ({
      id: item.id,
      label: item.label,
      streak: streakEnding(today, (day) => doneOn(item.id, day)),
    }))
}
