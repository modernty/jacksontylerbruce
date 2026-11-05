"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { CATEGORIES, type Category, type Item } from "../model"
import { publicStreakAllowed } from "../public"

export function ItemsEditor({ items: initial }: { items: Item[] }) {
  const [items, setItems] = useState(initial)
  const [label, setLabel] = useState("")
  const [category, setCategory] = useState<Category>("Body")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const active = [...items].filter((item) => item.active).sort((a, b) => a.order - b.order)
  const inactive = items.filter((item) => !item.active)

  async function commit(next: Item[]) {
    const previous = items
    setItems(next)
    setError(null)
    const response = await fetch("/me/checklist/api/items", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: next }),
    })
    if (response.status === 404) {
      window.location.assign("/me/checklist/login")
      return
    }
    if (!response.ok) {
      setItems(previous)
      const body = (await response.json().catch(() => null)) as { error?: string } | null
      setError(body?.error === "public streak refused"
        ? "Public streaks are refused for Money and private items."
        : "Could not save.")
      return
    }
    const body = (await response.json()) as { items: Item[] }
    setItems(body.items)
  }

  function patch(id: string, update: (item: Item) => Item) {
    void commit(items.map((item) => (item.id === id ? update(item) : item)))
  }

  function move(id: string, delta: number) {
    const index = active.findIndex((item) => item.id === id)
    const swap = active[index + delta]
    const current = active[index]
    if (!swap || !current) return
    void commit(items.map((item) => {
      if (item.id === current.id) return { ...item, order: swap.order }
      if (item.id === swap.id) return { ...item, order: current.order }
      return item
    }))
  }

  return (
    <section>
      <h1>Items</h1>
      <p className="ck-kicker">Add, edit, reorder, archive</p>
      {items.length === 0 ? (
        <button
          type="button"
          className="ck-submit"
          onClick={() => {
            void fetch("/me/checklist/api/template", { method: "POST" }).then(async (response) => {
              if (response.status === 404) {
                window.location.assign("/me/checklist/login")
                return
              }
              if (!response.ok) {
                setError("Could not start.")
                return
              }
              const body = (await response.json()) as { items: Item[] }
              setItems(body.items)
              router.refresh()
            })
          }}
        >
          Start from template
        </button>
      ) : null}
      {error ? <p className="ck-error" role="alert">{error}</p> : null}
      <form
        className="ck-add"
        onSubmit={(event) => {
          event.preventDefault()
          const nextLabel = label.trim()
          if (!nextLabel) return
          setLabel("")
          void commit([...items, {
            id: crypto.randomUUID(),
            label: nextLabel,
            category,
            order: items.length,
            active: true,
            publicStreak: false,
          }])
        }}
      >
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="New item" aria-label="New item" maxLength={120} />
        <select value={category} aria-label="Category" onChange={(event) => setCategory(event.target.value as Category)}>
          {CATEGORIES.map((entry) => <option key={entry}>{entry}</option>)}
        </select>
        <button className="ck-submit" type="submit">Add</button>
      </form>
      {active.map((item, index) => (
        <ItemRow
          key={item.id}
          item={item}
          first={index === 0}
          last={index === active.length - 1}
          onPatch={(update) => patch(item.id, update)}
          onMove={(delta) => move(item.id, delta)}
        />
      ))}
      {inactive.length > 0 ? (
        <section>
          <h2>Archived</h2>
          {inactive.map((item) => (
            <div key={item.id} className="ck-actions">
              <span>{item.label}</span>
              <button type="button" className="ck-mini" onClick={() => patch(item.id, (current) => ({ ...current, active: true }))}>
                Restore
              </button>
            </div>
          ))}
        </section>
      ) : null}
    </section>
  )
}

function ItemRow({
  item,
  first,
  last,
  onPatch,
  onMove,
}: {
  item: Item
  first: boolean
  last: boolean
  onPatch: (update: (item: Item) => Item) => void
  onMove: (delta: number) => void
}) {
  const [label, setLabel] = useState(item.label)
  const [note, setNote] = useState(item.note ?? "")
  const priv = (item.tags ?? []).some((tag) => tag.toLowerCase() === "private")
  const streakAllowed = publicStreakAllowed({ ...item, tags: priv ? ["private"] : [] })

  return (
    <div className="ck-edit">
      <input
        value={label}
        aria-label={`Name for ${item.label}`}
        maxLength={120}
        onChange={(event) => setLabel(event.target.value)}
        onBlur={() => {
          const next = label.trim()
          if (!next || next === item.label) {
            setLabel(item.label)
            return
          }
          onPatch((current) => ({ ...current, label: next }))
        }}
      />
      <select
        value={item.category}
        aria-label={`Category for ${item.label}`}
        onChange={(event) => onPatch((current) => {
          const category = event.target.value as Item["category"]
          const next = { ...current, category }
          if (!publicStreakAllowed(next)) next.publicStreak = false
          return next
        })}
      >
        {CATEGORIES.map((entry) => <option key={entry}>{entry}</option>)}
      </select>
      <input
        value={note}
        aria-label={`Note for ${item.label}`}
        placeholder="Note"
        maxLength={500}
        onChange={(event) => setNote(event.target.value)}
        onBlur={() => onPatch((current) => ({ ...current, note: note.trim() || undefined }))}
      />
      <select
        value={item.track ?? "check"}
        aria-label={`Input for ${item.label}`}
        onChange={(event) => onPatch((current) => {
          const next = { ...current }
          if (event.target.value === "spend") next.track = "spend"
          else delete next.track
          return next
        })}
      >
        <option value="check">Check</option>
        <option value="spend">Spend</option>
      </select>
      <div className="ck-actions">
        <label className="ck-check">
          <input
            type="checkbox"
            checked={priv}
            onChange={(event) => onPatch((current) => withPrivate(current, event.target.checked))}
          />
          Private
        </label>
        <label className="ck-check">
          <input
            type="checkbox"
            checked={item.publicStreak}
            disabled={!streakAllowed}
            onChange={(event) => onPatch((current) => ({ ...current, publicStreak: event.target.checked }))}
          />
          Public streak
        </label>
        <button type="button" className="ck-mini" disabled={first} onClick={() => onMove(-1)}>Up</button>
        <button type="button" className="ck-mini" disabled={last} onClick={() => onMove(1)}>Down</button>
        <button type="button" className="ck-mini" onClick={() => onPatch((current) => ({ ...current, active: false }))}>
          Archive
        </button>
      </div>
    </div>
  )
}

function withPrivate(item: Item, on: boolean): Item {
  const tags = (item.tags ?? []).filter((tag) => tag.toLowerCase() !== "private")
  if (on) tags.push("private")
  const next: Item = { ...item, publicStreak: on ? false : item.publicStreak }
  if (tags.length) next.tags = tags
  else delete next.tags
  if (!publicStreakAllowed(next)) next.publicStreak = false
  return next
}
