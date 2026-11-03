export const CATEGORIES = ["Spirit", "Body", "Mind", "Money", "Rest"] as const

export type Category = (typeof CATEGORIES)[number]

export type Item = {
  id: string
  label: string
  category: Category
  order: number
  active: boolean
  publicStreak: boolean
  note?: string
  tags?: string[]
  /** The row that edits the day's spend figure. */
  track?: "spend"
}

export type DayLog = {
  date: string
  checks: Record<string, boolean>
  spend?: number
  note?: string
}

export type WeekTarget = {
  id: string
  label: string
  done: boolean
}

export type WeekTargets = {
  weekStart: string
  targets: WeekTarget[]
  sundayReview?: string
}

export type PublicStreakRow = {
  id: string
  label: string
  streak: number
}

export type SlippingItem = {
  id: string
  label: string
  missed: number
}
