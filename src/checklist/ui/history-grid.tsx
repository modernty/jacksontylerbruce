"use client"

import { useState } from "react"
import { formatDay } from "../dates"
import type { DayLog, Item } from "../model"

export function HistoryGrid({
  items,
  days: initial,
  streaks,
}: {
  items: Item[]
  days: DayLog[]
  streaks: Record<string, number>
}) {
  const [days, setDays] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const recent = days.slice(-7)

  async function toggle(itemId: string, date: string, checked: boolean) {
    const previous = days
    setDays(days.map((day) => day.date === date ? { ...day, checks: { ...day.checks, [itemId]: checked } } : day))
    setError(null)
    const response = await fetch("/me/checklist/api/days", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, itemId, checked }),
    })
    if (!response.ok) {
      setDays(previous)
      if (response.status === 404) window.location.assign("/me/checklist/login")
      else setError("Could not save.")
    }
  }

  return (
    <section>
      <h1>History</h1>
      <p className="ck-kicker">Seven and thirty days</p>
      {error ? <p className="ck-error" role="alert">{error}</p> : null}
      {items.length === 0 ? <p>No items yet.</p> : (
        <>
          <Grid title="7 days" items={items} days={recent} streaks={streaks} onToggle={toggle} />
          <Grid title="30 days" items={items} days={days} streaks={streaks} onToggle={toggle} />
        </>
      )}
    </section>
  )
}

function Grid({
  title,
  items,
  days,
  streaks,
  onToggle,
}: {
  title: string
  items: Item[]
  days: DayLog[]
  streaks: Record<string, number>
  onToggle: (itemId: string, date: string, checked: boolean) => void
}) {
  return (
    <section>
      <h2>{title}</h2>
      <div className="ck-grid">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              {days.map((day) => <th key={day.date}>{formatDay(day.date, days.length <= 7)}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <th>
                  {item.label}
                  <span className="ck-streak">{streaks[item.id] ?? 0}</span>
                </th>
                {days.map((day) => {
                  const on = day.checks[item.id] === true
                  return (
                    <td key={day.date}>
                      <button
                        type="button"
                        className="ck-cell"
                        aria-pressed={on}
                        aria-label={`${item.label} on ${day.date}`}
                        onClick={() => onToggle(item.id, day.date, !on)}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
