/** America/Santo_Domingo is UTC−4 all year. It does not observe DST. */
export const ZONE = "America/Santo_Domingo"

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

export function isRealDate(day: string): boolean {
  const match = DAY.exec(day)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const date = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, date))
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === date
}

export function dayKey(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant)
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ""
  const day = `${pick("year")}-${pick("month")}-${pick("day")}`
  if (!isRealDate(day)) throw new Error("checklist date could not be resolved")
  return day
}

export function addDays(day: string, delta: number): string {
  if (!isRealDate(day)) throw new Error("invalid day")
  const [year, month, date] = day.split("-").map(Number)
  const utc = new Date(Date.UTC(year, month - 1, date))
  utc.setUTCDate(utc.getUTCDate() + delta)
  return utc.toISOString().slice(0, 10)
}

/** 0 = Monday … 6 = Sunday, for a calendar date already in the checklist zone. */
export function weekdayIndex(day: string): number {
  if (!isRealDate(day)) throw new Error("invalid day")
  const [year, month, date] = day.split("-").map(Number)
  const js = new Date(Date.UTC(year, month - 1, date)).getUTCDay()
  return (js + 6) % 7
}

export function isMonday(day: string): boolean {
  return isRealDate(day) && weekdayIndex(day) === 0
}

export function weekStartMonday(day: string): string {
  return addDays(day, -weekdayIndex(day))
}

export function daysEnding(today: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(today, -index))
}

export function formatDay(day: string, withWeekday = false): string {
  if (!isRealDate(day)) return day
  const [year, month, date] = day.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    weekday: withWeekday ? "short" : undefined,
  }).format(new Date(Date.UTC(year, month - 1, date)))
}

/** Minutes east of UTC for an instant, as observed in the checklist zone. */
export function zoneOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant)
  const pick = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? "0")
  let hour = pick("hour")
  if (hour === 24) hour = 0
  const asUtc = Date.UTC(pick("year"), pick("month") - 1, pick("day"), hour, pick("minute"), pick("second"))
  return Math.round((asUtc - instant.getTime()) / 60000)
}
