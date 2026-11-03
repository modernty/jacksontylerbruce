import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ChecklistInputError, SeedRefused, StorageFailed, StorageNotConfigured } from "./errors"
import { isRealDate } from "./dates"
import { normalizeItems } from "./items"
import type { Category, DayLog, Item, WeekTarget, WeekTargets } from "./model"
import { withoutRefusedPublicStreak } from "./public"
import { parseDay, parseItems, parseWeek } from "./schema"
import { checklistSupabase, supabaseEnv } from "./supabase"

export type ChecklistStore = {
  listItems(): Promise<Item[]>
  saveItems(items: Item[]): Promise<Item[]>
  getDays(dates: string[]): Promise<DayLog[]>
  saveDay(log: DayLog): Promise<DayLog>
  getWeek(weekStart: string): Promise<WeekTargets | null>
  saveWeek(week: WeekTargets): Promise<WeekTargets>
}

let devStore: ChecklistStore | null = null
let remoteStore: ChecklistStore | null = null

export function storageConfigured(): boolean {
  if (supabaseEnv()) return true
  return process.env.NODE_ENV !== "production"
}

export function openStore(): ChecklistStore {
  if (supabaseEnv()) {
    if (!remoteStore) remoteStore = createSupabaseStore(checklistSupabase())
    return remoteStore
  }
  if (process.env.NODE_ENV === "production") throw new StorageNotConfigured()
  if (!devStore) devStore = createMemoryStore()
  return devStore
}

export function createMemoryStore(): ChecklistStore {
  let items: Item[] | null = null
  const days = new Map<string, DayLog>()
  const weeks = new Map<string, WeekTargets>()
  return {
    async listItems() {
      if (items === null) items = readSeed() ?? []
      items = items.map((item) => withoutRefusedPublicStreak(item))
      return items
    },
    async saveItems(next) {
      items = normalizeItems(next)
      return items
    },
    async getDays(dates) {
      assertDates(dates)
      return dates.map((date) => days.get(date) ?? { date, checks: {} })
    },
    async saveDay(log) {
      const parsed = assertDay(log)
      days.set(parsed.date, parsed)
      return parsed
    },
    async getWeek(weekStart) {
      return weeks.get(weekStart) ?? null
    },
    async saveWeek(week) {
      const parsed = parseWeek(week)
      weeks.set(parsed.weekStart, parsed)
      return parsed
    },
  }
}

type ItemRow = {
  id: string
  label: string
  category: Category
  sort_order: number
  active: boolean
  public_streak: boolean
  note: string | null
  tags: string[] | null
  track: "spend" | null
}

type DayRow = {
  day: string
  checks: Record<string, boolean> | null
  spend: number | string | null
  note: string | null
}

type WeekRow = {
  week_start: string
  targets: WeekTarget[] | null
  sunday_review: string | null
}

export function createSupabaseStore(db: SupabaseClient): ChecklistStore {
  return {
    async listItems() {
      const { data, error } = await db.from("checklist_items").select("id, label, category, sort_order, active, public_streak, note, tags, track").order("sort_order")
      if (error) throw new StorageFailed()
      const rows = (data ?? []) as ItemRow[]
      if (rows.length === 0) {
        const seeded = readSeed()
        if (!seeded) return []
        const { error: insertError } = await db.from("checklist_items").upsert(seeded.map(toItemRow))
        if (insertError) throw new StorageFailed()
        return seeded
      }
      let items: Item[]
      try {
        items = parseItems(rows.map(fromItemRow))
      } catch {
        throw new ChecklistInputError("invalid items")
      }
      const cleaned = items.map((item) => withoutRefusedPublicStreak(item))
      if (cleaned.some((item, index) => item.publicStreak !== items[index]?.publicStreak)) {
        const { error: updateError } = await db.from("checklist_items").upsert(cleaned.map(toItemRow))
        if (updateError) throw new StorageFailed()
      }
      return cleaned
    },
    async saveItems(next) {
      const items = normalizeItems(next)
      const { error } = await db.from("checklist_items").upsert(items.map(toItemRow))
      if (error) throw new StorageFailed()
      const ids = items.map((item) => item.id)
      const removal = ids.length === 0
        ? db.from("checklist_items").delete().neq("id", "")
        : db.from("checklist_items").delete().not("id", "in", `(${ids.map((id) => `"${id}"`).join(",")})`)
      const { error: deleteError } = await removal
      if (deleteError) throw new StorageFailed()
      return items
    },
    async getDays(dates) {
      assertDates(dates)
      if (dates.length === 0) return []
      const { data, error } = await db.from("checklist_day_logs").select("day, checks, spend, note").in("day", dates)
      if (error) throw new StorageFailed()
      const byDay = new Map<string, DayLog>()
      for (const row of (data ?? []) as DayRow[]) {
        const log = fromDayRow(row)
        if (log) byDay.set(log.date, log)
      }
      return dates.map((date) => byDay.get(date) ?? { date, checks: {} })
    },
    async saveDay(log) {
      const parsed = assertDay(log)
      const { error } = await db.from("checklist_day_logs").upsert(toDayRow(parsed))
      if (error) throw new StorageFailed()
      return parsed
    },
    async getWeek(weekStart) {
      const { data, error } = await db.from("checklist_week_targets").select("week_start, targets, sunday_review").eq("week_start", weekStart).maybeSingle()
      if (error) throw new StorageFailed()
      if (!data) return null
      return fromWeekRow(data as WeekRow)
    },
    async saveWeek(week) {
      const parsed = parseWeek(week)
      const { error } = await db.from("checklist_week_targets").upsert(toWeekRow(parsed))
      if (error) throw new StorageFailed()
      return parsed
    },
  }
}

function readSeed(): Item[] | null {
  const raw = process.env.CHECKLIST_SEED_JSON
  if (!raw?.trim()) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new SeedRefused()
  }
  try {
    return normalizeItems(parseItems(parsed).map((item) => withoutRefusedPublicStreak(item)))
  } catch (error) {
    if (error instanceof SeedRefused) throw error
    throw new SeedRefused()
  }
}

function assertDates(dates: string[]) {
  if (dates.some((date) => !isRealDate(date))) throw new ChecklistInputError("invalid day")
}

function assertDay(log: DayLog): DayLog {
  const parsed = parseDay(log)
  if (Object.keys(parsed.checks).length > 400) throw new ChecklistInputError("invalid day")
  return parsed
}

function toItemRow(item: Item): ItemRow {
  return {
    id: item.id,
    label: item.label,
    category: item.category,
    sort_order: item.order,
    active: item.active,
    public_streak: item.publicStreak,
    note: item.note ?? null,
    tags: item.tags ?? [],
    track: item.track ?? null,
  }
}

function fromItemRow(row: ItemRow): Item {
  const item: Item = {
    id: row.id,
    label: row.label,
    category: row.category,
    order: row.sort_order,
    active: row.active,
    publicStreak: row.public_streak,
  }
  if (row.note) item.note = row.note
  if (row.tags?.length) item.tags = row.tags
  if (row.track === "spend") item.track = "spend"
  return item
}

function toDayRow(log: DayLog): DayRow {
  return {
    day: log.date,
    checks: log.checks,
    spend: log.spend ?? null,
    note: log.note ?? null,
  }
}

function fromDayRow(row: DayRow): DayLog | null {
  const spend = typeof row.spend === "string" ? Number(row.spend) : row.spend
  const candidate: DayLog = {
    date: String(row.day).slice(0, 10),
    checks: row.checks ?? {},
  }
  if (typeof spend === "number" && Number.isFinite(spend)) candidate.spend = spend
  if (row.note) candidate.note = row.note
  try {
    return parseDay(candidate)
  } catch {
    return null
  }
}

function toWeekRow(week: WeekTargets): WeekRow {
  return {
    week_start: week.weekStart,
    targets: week.targets,
    sunday_review: week.sundayReview ?? null,
  }
}

function fromWeekRow(row: WeekRow): WeekTargets {
  const week: WeekTargets = {
    weekStart: String(row.week_start).slice(0, 10),
    targets: row.targets ?? [],
  }
  if (row.sunday_review) week.sundayReview = row.sunday_review
  return parseWeek(week)
}
