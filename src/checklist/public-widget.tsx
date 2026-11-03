import "server-only"
import type { Item } from "./model"
import { publishedStreakRows } from "./publish-streak"

/**
 * Streak counts for ids listed in CHECKLIST_PUBLIC_STREAK_IDS.
 * The publicStreak toggle cannot publish a row. Not mounted on the public site.
 */
export function PublicStreakWidget({
  items,
  today,
  doneOn,
}: {
  items: Item[]
  today: string
  doneOn: (itemId: string, day: string) => boolean
}) {
  const rows = publishedStreakRows(items, today, doneOn)
  if (rows.length === 0) return null
  return (
    <ul className="ck-public">
      {rows.map((row) => (
        <li key={row.id}>
          <span>{row.label}</span>
          <span>{row.streak}</span>
        </li>
      ))}
    </ul>
  )
}
