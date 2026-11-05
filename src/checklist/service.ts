import "server-only"
import { currentUser, type SessionUser } from "./auth"
import { ChecklistInputError, PublicStreakRefused, SeedRefused, StorageFailed, StorageNotConfigured } from "./errors"
import { dayKey, isMonday, weekStartMonday } from "./dates"
import { denied, json, originOk } from "./http"
import type { DayLog } from "./model"
import { dayPatchSchema, parseItems, parseWeek, blankWeek } from "./schema"
import { openStore, storageConfigured, type ChecklistStore } from "./store"

export type Gate = { store?: ChecklistStore | null; user?: SessionUser | null }

function resolveStore(gate?: Gate): ChecklistStore | null {
  if (gate && "store" in gate) return gate.store ?? null
  if (!storageConfigured()) return null
  return openStore()
}

async function authorized(gate?: Gate): Promise<boolean> {
  if (gate && "user" in gate) return Boolean(gate.user?.id)
  return Boolean(await currentUser())
}

function storage(): Response {
  return json({ error: "storage not configured" }, 503)
}

function failure(error: unknown): Response {
  if (error instanceof StorageNotConfigured) return storage()
  if (error instanceof StorageFailed) return json({ error: "checklist storage failed" }, 500)
  if (error instanceof SeedRefused) return json({ error: "checklist seed was refused" }, 500)
  if (error instanceof PublicStreakRefused) return json({ error: "public streak refused" }, 400)
  if (error instanceof ChecklistInputError) return json({ error: error.message }, 400)
  throw error
}

export async function itemsGet(_request: Request, gate?: Gate): Promise<Response> {
  if (!(await authorized(gate))) return denied()
  const store = resolveStore(gate)
  if (!store) return storage()
  try {
    return json({ items: await store.listItems() })
  } catch (error) {
    return failure(error)
  }
}

export async function itemsPut(request: Request, gate?: Gate): Promise<Response> {
  if (!(await authorized(gate))) return denied()
  if (!originOk(request)) return json({ error: "cross-site request refused" }, 403)
  const store = resolveStore(gate)
  if (!store) return storage()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "invalid items" }, 400)
  }
  const payload = body && typeof body === "object" && "items" in body ? (body as { items: unknown }).items : body
  try {
    const items = await store.saveItems(parseItems(payload))
    return json({ items })
  } catch (error) {
    return failure(error)
  }
}

export async function daysPost(request: Request, gate?: Gate): Promise<Response> {
  if (!(await authorized(gate))) return denied()
  if (!originOk(request)) return json({ error: "cross-site request refused" }, 403)
  const store = resolveStore(gate)
  if (!store) return storage()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "invalid day" }, 400)
  }
  const parsed = dayPatchSchema.safeParse(body)
  if (!parsed.success) return json({ error: "invalid day" }, 400)
  try {
    const items = await store.listItems()
    const [existing] = await store.getDays([parsed.data.date])
    const checks = { ...(existing?.checks ?? {}) }
    if (parsed.data.itemId) {
      if (!items.some((item) => item.id === parsed.data.itemId)) return json({ error: "unknown item" }, 400)
      if (parsed.data.checked !== undefined) checks[parsed.data.itemId] = parsed.data.checked
    }
    const next: DayLog = { date: parsed.data.date, checks }
    if (existing?.note) next.note = existing.note
    if (parsed.data.spend === null) {
      /* cleared */
    } else if (typeof parsed.data.spend === "number") next.spend = parsed.data.spend
    else if (existing?.spend !== undefined) next.spend = existing.spend
    return json({ day: await store.saveDay(next) })
  } catch (error) {
    return failure(error)
  }
}

export async function weekGet(request: Request, gate?: Gate): Promise<Response> {
  if (!(await authorized(gate))) return denied()
  const store = resolveStore(gate)
  if (!store) return storage()
  const requested = new URL(request.url).searchParams.get("week")
  if (requested && !isMonday(requested)) return json({ error: "invalid week" }, 400)
  const weekStart = requested || weekStartMonday(dayKey(new Date()))
  try {
    const stored = await store.getWeek(weekStart)
    return json({ week: stored ?? blankWeek(weekStart) })
  } catch (error) {
    return failure(error)
  }
}

export async function weekPut(request: Request, gate?: Gate): Promise<Response> {
  if (!(await authorized(gate))) return denied()
  if (!originOk(request)) return json({ error: "cross-site request refused" }, 403)
  const store = resolveStore(gate)
  if (!store) return storage()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "invalid week" }, 400)
  }
  const payload = body && typeof body === "object" && "week" in body ? (body as { week: unknown }).week : body
  try {
    return json({ week: await store.saveWeek(parseWeek(payload)) })
  } catch (error) {
    return failure(error)
  }
}

