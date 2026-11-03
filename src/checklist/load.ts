import "server-only"
import { addDays, dayKey, daysEnding, isMonday, weekStartMonday, weekdayIndex } from "./dates"
import type { DayLog, Item, SlippingItem, WeekTargets } from "./model"
import { missedInWindow, streakEnding } from "./streaks"
import { blankWeek } from "./schema"
import { openStore, storageConfigured } from "./store"

export type ChecklistView = {
  today: string
  items: Item[]
  active: Item[]
  log: DayLog
  days: DayLog[]
  streaks: Record<string, number>
  slipping: SlippingItem[]
  weekStart: string
  weekEnd: string
  isSunday: boolean
  currentWeek: string
  week: WeekTargets
}

export function checklistReady(): boolean {
  return storageConfigured()
}

export async function loadChecklist(now = new Date(), requestedWeek?: string): Promise<ChecklistView> {
  const store = openStore()
  const today = dayKey(now)
  const items = await store.listItems()
  const active = items.filter((item) => item.active).sort((a, b) => a.order - b.order)
  const history = await readHistory(today, active.map((item) => item.id))
  const streaks: Record<string, number> = {}
  const slipping: SlippingItem[] = []
  for (const item of active) {
    const done = (day: string) => history.get(day)?.checks[item.id] === true
    streaks[item.id] = streakEnding(today, done)
    const missed = missedInWindow(today, 7, done)
    if (missed >= 3) slipping.push({ id: item.id, label: item.label, missed })
  }
  const currentWeek = weekStartMonday(today)
  const weekStart = requestedWeek && isMonday(requestedWeek) ? requestedWeek : currentWeek
  const stored = await store.getWeek(weekStart)
  const days = daysEnding(today, 30).reverse().map((date) => history.get(date) ?? { date, checks: {} })
  return {
    today,
    items,
    active,
    log: history.get(today) ?? { date: today, checks: {} },
    days,
    streaks,
    slipping,
    weekStart,
    weekEnd: addDays(weekStart, 6),
    isSunday: weekdayIndex(today) === 6,
    currentWeek,
    week: stored ?? blankWeek(weekStart),
  }
}

async function readHistory(today: string, itemIds: string[]): Promise<Map<string, DayLog>> {
  const store = openStore()
  const map = new Map<string, DayLog>()
  const chunk = 90
  const max = 730
  let start = 0
  while (start < max) {
    const count = Math.min(chunk, max - start)
    const dates = Array.from({ length: count }, (_, index) => addDays(today, -(start + index)))
    const logs = await store.getDays(dates)
    for (const log of logs) map.set(log.date, log)
    const open = itemIds.some((id) => dates.every((date) => map.get(date)?.checks[id] === true))
    start += count
    if (!open) break
  }
  return map
}
