import type { Item } from "./model"

/** Neutral starters. Not a personal list. */
export const TEMPLATE_ITEMS: Item[] = [
  { id: "template-spirit", label: "Reflection", category: "Spirit", order: 0, active: true, publicStreak: false },
  { id: "template-body", label: "Movement", category: "Body", order: 1, active: true, publicStreak: false },
  { id: "template-mind", label: "Study", category: "Mind", order: 2, active: true, publicStreak: false },
  { id: "template-money", label: "Spending", category: "Money", order: 3, active: true, publicStreak: false, track: "spend" },
  { id: "template-rest", label: "Sleep", category: "Rest", order: 4, active: true, publicStreak: false },
]
