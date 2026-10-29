export const INTENTS = [
  "career",
  "projects",
  "project",
  "focus",
  "role",
  "location",
  "about",
  "process",
  "availability",
  "compare",
  "off_topic",
  "decline",
] as const

export type Intent = (typeof INTENTS)[number]

export const FILTERS = ["timeline", "projects", "focus", "work", "sheet"] as const
export type FilterName = (typeof FILTERS)[number]

export type Pill = { label: string; href: string }

export type ViewSpec = {
  intent: Intent
  focusIds: string[]
  filter: FilterName
  href: string
  annotation: string
  followUps: Pill[]
  confidence: number
  source: "keyword" | "model"
}
