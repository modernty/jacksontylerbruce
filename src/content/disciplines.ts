import type { Project } from "./schema"

/** The kind of work a project is, for grouping in the conversation. Product design unless listed here. */
export const DISCIPLINES = [
  { key: "product", label: "Product design", words: ["product", "product design", "ux", "ui", "app", "apps", "software", "digital"] },
  { key: "brand", label: "Brand", words: ["brand", "branding", "brands", "identity", "identities", "logo", "logos"] },
  { key: "spatial", label: "Spatial", words: ["spatial", "space", "spaces", "exhibition", "exhibitions", "furniture", "physical", "installation"] },
] as const

export type Discipline = (typeof DISCIPLINES)[number]["key"]

/** Projects that are not product design. Edit this list to move a project between groups. */
export const DISCIPLINE_BY_SLUG: Record<string, Discipline> = {
  "lazarus-brand": "brand",
  "chatter-brand": "brand",
  "jet-brand": "brand",
  "usm-milan": "spatial",
  "usm-hue-man": "spatial",
}

export function disciplineOf(project: Pick<Project, "slug">): Discipline {
  return DISCIPLINE_BY_SLUG[project.slug] ?? "product"
}

/** Ongoing work first, then by when it ended, then by when it started. */
export function byRecent<T extends Pick<Project, "start" | "end">>(projects: readonly T[]): T[] {
  return [...projects].sort((a, b) => (b.end ?? Infinity) - (a.end ?? Infinity) || b.start - a.start)
}
