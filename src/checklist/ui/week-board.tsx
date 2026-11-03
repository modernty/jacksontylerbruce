"use client"

import { useState } from "react"
import { addDays, formatDay } from "../dates"
import type { WeekTargets } from "../model"

export function WeekBoard({
  week: initial,
  weekStart,
  weekEnd,
  currentWeek,
  isSunday,
}: {
  week: WeekTargets
  weekStart: string
  weekEnd: string
  currentWeek: string
  isSunday: boolean
}) {
  const [week, setWeek] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const nextWeek = addDays(weekStart, 7)

  async function commit(next: WeekTargets) {
    const previous = week
    const payload: WeekTargets = {
      weekStart: next.weekStart,
      targets: next.targets,
    }
    const review = next.sundayReview?.trim()
    if (review) payload.sundayReview = review
    setWeek(payload)
    setError(null)
    const response = await fetch("/me/checklist/api/week", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ week: payload }),
    })
    if (response.status === 404) {
      window.location.assign("/me/checklist/login")
      return
    }
    if (!response.ok) {
      setWeek(previous)
      setError("Could not save.")
      return
    }
    const body = (await response.json()) as { week: WeekTargets }
    setWeek(body.week)
  }

  return (
    <section>
      <h1>Week</h1>
      <p className="ck-kicker">{formatDay(weekStart)} – {formatDay(weekEnd)}</p>
      <div className="ck-links">
        <a href={`/me/checklist/week?week=${addDays(weekStart, -7)}`}>Previous</a>
        {nextWeek <= currentWeek ? <a href={`/me/checklist/week?week=${nextWeek}`}>Next</a> : <span />}
      </div>
      {error ? <p className="ck-error" role="alert">{error}</p> : null}
      <div className="ck-week">
        {week.targets.map((target, index) => (
          <div key={target.id} className="ck-item">
            <button
              type="button"
              className="ck-row"
              aria-pressed={target.done}
              onClick={() => void commit({
                ...week,
                targets: week.targets.map((entry) => entry.id === target.id ? { ...entry, done: !entry.done } : entry),
              })}
            >
              <span className="ck-box" aria-hidden="true" />
              <span className="ck-label">{target.label || "Untitled"}</span>
            </button>
            <input
              value={target.label}
              aria-label={`Target ${index + 1}`}
              maxLength={160}
              placeholder="Target"
              onChange={(event) => setWeek({
                ...week,
                targets: week.targets.map((entry) => entry.id === target.id ? { ...entry, label: event.target.value } : entry),
              })}
              onBlur={() => void commit(week)}
            />
          </div>
        ))}
        <div className="ck-actions">
          {week.targets.length < 5 ? (
            <button
              type="button"
              className="ck-mini"
              onClick={() => void commit({
                ...week,
                targets: [...week.targets, { id: `target-${crypto.randomUUID()}`, label: "", done: false }],
              })}
            >
              Add target
            </button>
          ) : null}
          {week.targets.length > 3 ? (
            <button
              type="button"
              className="ck-mini"
              onClick={() => void commit({ ...week, targets: week.targets.slice(0, -1) })}
            >
              Remove last
            </button>
          ) : null}
        </div>
        <label>
          <span className="ck-kicker">{isSunday ? "Sunday review" : "Sunday review"}</span>
          <textarea
            value={week.sundayReview ?? ""}
            aria-label="Sunday review"
            maxLength={2000}
            onChange={(event) => setWeek({ ...week, sundayReview: event.target.value })}
            onBlur={() => void commit(week)}
          />
        </label>
      </div>
    </section>
  )
}
