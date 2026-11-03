import { addDays } from "./dates"

const CAP = 3660

/** Consecutive done days ending today, or yesterday when today is still open. */
export function streakEnding(today: string, done: (day: string) => boolean): number {
  const start = done(today) ? today : addDays(today, -1)
  if (!done(start)) return 0
  let count = 0
  let cursor = start
  while (done(cursor)) {
    count += 1
    if (count >= CAP) break
    cursor = addDays(cursor, -1)
  }
  return count
}

export function missedInWindow(today: string, days: number, done: (day: string) => boolean): number {
  let missed = 0
  for (let index = 0; index < days; index += 1) {
    if (!done(addDays(today, -index))) missed += 1
  }
  return missed
}

/** Missed on 3 or more of the last 7 days, including today. */
export function isSlipping(today: string, done: (day: string) => boolean): boolean {
  return missedInWindow(today, 7, done) >= 3
}
