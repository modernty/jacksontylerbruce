import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createAuthClient } from "./auth"
import { ChecklistInputError, StorageFailed } from "./errors"
import { isRealDate } from "./dates"
import { authConfigured } from "./env"
import { normalizeItems } from "./items"
import type { Category, DayLog, Item, WeekTarget, WeekTargets } from "./model"
import { withoutRefusedPublicStreak } from "./public"
import { parseDay, parseItems, parseWeek } from "./schema"
import { TEMPLATE_ITEMS } from "./template"

export type ChecklistStore = {
  listItems(): Promise<Item[]>
  saveItems(items: Item[]): Promise<Item[]>
  getDays(dates: string[]): Promise<DayLog[]>
  saveDay(log: DayLog): Promise<DayLog>
  getWeek(weekStart: string): Promise<WeekTargets | null>
  saveWeek(week: WeekTargets): Promise<WeekTargets>
  applyTemplate(): Promise<Item[]>
}

export function storageConfigured(): boolean {
  return authConfigured()
}

/** Session client plus RLS. Returns null when nobody is signed in. */
export async function openSessionStore(): Promise<ChecklistStore | null> {
  if (!authConfigured()) return null
  const db = await createAuthClient()
  const { data, error } = await db.auth.getUser()
  if (error || !data.user) return null
  // Best-effort. The function no-ops unless the caller is the legacy owner.
  await db.rpc("claim_legacy_checklist")
  return createSupabaseStore(db, data.user.id)
}

export function createMemoryStore(): ChecklistStore {
  let items: Item[] = []
  const days = new Map<string, DayLog>()
  const weeks = new Map<string, WeekTargets>()
  return {
    async listItems() {
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
    async applyTemplate() {
      if (items.length > 0) return items
      items = normalizeItems(TEMPLATE_ITEMS.map((item) => ({ ...item })))
      return items
    },
  }
}

export function withUser<T extends object>(row: T, userId: string): T & { user_id: string } {
  return { ...row, user_id: userId }
}

export function visibleTo<T extends { user_id?: string | null }>(rows: T[], userId: string): T[] {
  return rows.filter((row) => row.user_id === userId)
}

type ItemRow = {
  user_id?: string | null
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
  user_id?: string | null
  day: string
  checks: Record<string, boolean> | null
  spend: number | string | null
  note: string | null
}

type WeekRow = {
  user_id?: string | null
  week_start: string
  targets: WeekTarget[] | null
  sunday_review: string | null
}

export function createSupabaseStore(db: SupabaseClient, userId: string): ChecklistStore {
  return {
    async listItems() {
      const { data, error } = await db.from("checklist_items").select("user_id, id, label, category, sort_order, active, public_streak, note, tags, track").eq("user_id", userId).order("sort_order")
      if (error) throw new StorageFailed()
      const rows = visibleTo((data ?? []) as ItemRow[], userId)
      let items: Item[]
      try {
        items = parseItems(rows.map(fromItemRow))
      } catch {
        throw new ChecklistInputError("invalid items")
      }
      const cleaned = items.map((item) => withoutRefusedPublicStreak(item))
      if (cleaned.some((item, index) => item.publicStreak !== items[index]?.publicStreak)) {
        const { error: updateError } = await db.from("checklist_items").upsert(cleaned.map((item) => withUser(toItemRow(item), userId)), { onConflict: "user_id,id" })
        if (updateError) throw new StorageFailed()
      }
      return cleaned
    },
    async saveItems(next) {
      const items = normalizeItems(next)
      if (items.length > 0) {
        const { error } = await db.from("checklist_items").upsert(items.map((item) => withUser(toItemRow(item), userId)), { onConflict: "user_id,id" })
        if (error) throw new StorageFailed()
      }
      const ids = items.map((item) => item.id)
      const removal = ids.length === 0
        ? db.from("checklist_items").delete().eq("user_id", userId)
        : db.from("checklist_items").delete().eq("user_id", userId).not("id", "in", `(${ids.map((id) => `"${id}"`).join(",")})`)
      const { error: deleteError } = await removal
      if (deleteError) throw new StorageFailed()
      return items
    },
    async getDays(dates) {
      assertDates(dates)
      if (dates.length === 0) return []
      const { data, error } = await db.from("checklist_day_logs").select("user_id, day, checks, spend, note").eq("user_id", userId).in("day", dates)
      if (error) throw new StorageFailed()
      const byDay = new Map<string, DayLog>()
      for (const row of visibleTo((data ?? []) as DayRow[], userId)) {
        const log = fromDayRow(row)
        if (log) byDay.set(log.date, log)
      }
      return dates.map((date) => byDay.get(date) ?? { date, checks: {} })
    },
    async saveDay(log) {
      const parsed = assertDay(log)
      const { error } = await db.from("checklist_day_logs").upsert(withUser(toDayRow(parsed), userId), { onConflict: "user_id,day" })
      if (error) throw new StorageFailed()
      return parsed
    },
    async getWeek(weekStart) {
      const { data, error } = await db.from("checklist_week_targets").select("user_id, week_start, targets, sunday_review").eq("user_id", userId).eq("week_start", weekStart).maybeSingle()
      if (error) throw new StorageFailed()
      if (!data || !visibleTo([data as WeekRow], userId).length) return null
      return fromWeekRow(data as WeekRow)
    },
    async saveWeek(week) {
      const parsed = parseWeek(week)
      const { error } = await db.from("checklist_week_targets").upsert(withUser(toWeekRow(parsed), userId), { onConflict: "user_id,week_start" })
      if (error) throw new StorageFailed()
      return parsed
    },
    async applyTemplate() {
      const { data, error } = await db.from("checklist_items").select("user_id, id").eq("user_id", userId)
      if (error) throw new StorageFailed()
      if (visibleTo((data ?? []) as Array<{ user_id?: string | null; id: string }>, userId).length > 0) return this.listItems()
      return this.saveItems(TEMPLATE_ITEMS.map((item) => ({ ...item })))
    },
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

function toItemRow(item: Item): Omit<ItemRow, "user_id"> {
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

function toDayRow(log: DayLog): Omit<DayRow, "user_id"> {
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

function toWeekRow(week: WeekTargets): Omit<WeekRow, "user_id"> {
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
