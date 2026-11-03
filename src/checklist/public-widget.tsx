import "server-only"
import type { Item } from "./model"
import { publicStreakRows } from "./public"

/**
 * Streak counts for items the server allows to be public.
 * Not mounted on the public site.
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
  const rows = publicStreakRows(items, today, doneOn)
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
