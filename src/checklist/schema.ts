import { z } from "zod"
import { ChecklistInputError } from "./errors"
import { isMonday, isRealDate } from "./dates"
import { CATEGORIES, type DayLog, type Item, type WeekTargets } from "./model"

const id = z.string().trim().regex(/^[A-Za-z0-9_-]{1,80}$/)

export const itemSchema = z.object({
  id,
  label: z.string().trim().min(1).max(120),
  category: z.enum(CATEGORIES),
  order: z.number().int().min(0).max(10000),
  active: z.boolean(),
  publicStreak: z.boolean(),
  note: z.string().trim().max(500).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  track: z.literal("spend").optional(),
})

export const itemsSchema = z.array(itemSchema).max(200)

export const daySchema = z.object({
  date: z.string().refine(isRealDate),
  checks: z.record(z.string(), z.boolean()),
  spend: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  note: z.string().trim().max(2000).optional(),
})

export const weekSchema = z.object({
  weekStart: z.string().refine(isMonday),
  targets: z.array(z.object({
    id,
    label: z.string().trim().max(160),
    done: z.boolean(),
  })).min(3).max(5),
  sundayReview: z.string().trim().max(2000).optional(),
})

export const dayPatchSchema = z.object({
  date: z.string().refine(isRealDate),
  itemId: id.optional(),
  checked: z.boolean().optional(),
  spend: z.number().finite().nonnegative().max(1_000_000_000).nullable().optional(),
}).refine((patch) => patch.itemId !== undefined || patch.spend !== undefined, { message: "empty patch" })

export function parseItems(value: unknown): Item[] {
  const parsed = itemsSchema.safeParse(value)
  if (!parsed.success) throw new ChecklistInputError("invalid items")
  return parsed.data
}

export function parseDay(value: unknown): DayLog {
  const parsed = daySchema.safeParse(value)
  if (!parsed.success) throw new ChecklistInputError("invalid day")
  return parsed.data
}

export function parseWeek(value: unknown): WeekTargets {
  const parsed = weekSchema.safeParse(value)
  if (!parsed.success) throw new ChecklistInputError("invalid week")
  const ids = new Set(parsed.data.targets.map((target) => target.id))
  if (ids.size !== parsed.data.targets.length) throw new ChecklistInputError("invalid week")
  return parsed.data
}

export function blankWeek(weekStart: string): WeekTargets {
  if (!isMonday(weekStart)) throw new ChecklistInputError("invalid week")
  return {
    weekStart,
    targets: [1, 2, 3].map((number) => ({ id: `target-${number}`, label: "", done: false })),
  }
}
