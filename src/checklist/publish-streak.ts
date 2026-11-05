import type { Item, PublicStreakRow } from "./model"
import { publicStreakAllowed } from "./public"
import { streakEnding } from "./streaks"

/**
 * Per-user opt-in. publicStreak defaults off, so nothing is public until that
 * person turns it on. Money and private tags stay blocked even when the flag is set.
 */
export function publishedStreakRows(
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
