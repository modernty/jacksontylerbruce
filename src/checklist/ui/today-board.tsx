"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { formatDay } from "../dates"
import { CATEGORIES, type DayLog, type Item, type SlippingItem } from "../model"

export function TodayBoard({
  today,
  items,
  log,
  streaks,
  slipping,
}: {
  today: string
  items: Item[]
  log: DayLog
  streaks: Record<string, number>
  slipping: SlippingItem[]
}) {
  const router = useRouter()
  const [checks, setChecks] = useState(log.checks)
  const [spend, setSpend] = useState(log.spend == null ? "" : String(log.spend))
  const [error, setError] = useState<string | null>(null)
  const active = items.filter((item) => item.active).sort((a, b) => a.order - b.order)
  const groups = CATEGORIES.map((category) => ({
    category,
    items: active.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0)

  async function toggle(item: Item) {
    const next = checks[item.id] !== true
    const previous = checks
    setChecks({ ...checks, [item.id]: next })
    setError(null)
    const response = await fetch("/me/checklist/api/days", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: today, itemId: item.id, checked: next }),
    })
    if (!response.ok) {
      setChecks(previous)
      if (response.status === 404) {
        window.location.assign("/me/checklist/login")
        return
      }
      setError("Could not save.")
      return
    }
    router.refresh()
  }

  async function saveSpend(value: string) {
    const trimmed = value.trim()
    const amount = trimmed === "" ? null : Number(trimmed)
    if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
      setError("Enter a spend amount.")
      return
    }
    setError(null)
    const response = await fetch("/me/checklist/api/days", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: today, spend: amount }),
    })
    if (!response.ok) {
      if (response.status === 404) window.location.assign("/me/checklist/login")
      else setError("Could not save.")
      return
    }
    router.refresh()
  }

  return (
    <section>
      <h1>Today</h1>
      <p className="ck-kicker">{formatDay(today, true)}</p>
      {error ? <p className="ck-error" role="alert">{error}</p> : null}
      {groups.length === 0 ? (
        <p className="ck-empty">No items yet. <a href="/me/checklist/items">Add one</a>.</p>
      ) : groups.map((group) => (
        <section key={group.category} className="ck-group">
          <h2>{group.category}</h2>
          {group.items.map((item) => {
            const on = checks[item.id] === true
            return (
              <div key={item.id} className="ck-item">
                <button type="button" className="ck-row" aria-pressed={on} onClick={() => void toggle(item)}>
                  <span className="ck-box" aria-hidden="true" />
                  <span className="ck-label">{item.label}</span>
                  <span className="ck-streak">{streaks[item.id] ?? 0}</span>
                </button>
                {item.note ? <p className="ck-note">{item.note}</p> : null}
                {item.track === "spend" ? (
                  <label className="ck-spend">
                    <span>Spend</span>
                    <input
                      inputMode="decimal"
                      value={spend}
                      aria-label={`Spend for ${item.label}`}
                      onChange={(event) => setSpend(event.target.value)}
                      onBlur={() => void saveSpend(spend)}
                    />
                  </label>
                ) : null}
              </div>
            )
          })}
        </section>
      ))}
      {slipping.length > 0 ? (
        <section>
          <h2>Slipping</h2>
          <ul>
            {slipping.map((item) => (
              <li key={item.id}>{item.label} · missed {item.missed} of 7</li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  )
}
