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
  "lzr-2": "brand",
  "usm-milan": "spatial",
  "usm-hue-man": "spatial",
}

export function disciplineOf(project: Pick<Project, "slug">): Discipline {
  return DISCIPLINE_BY_SLUG[project.slug] ?? "product"
}

type Sortable = Pick<Project, "start" | "end"> & { order?: number }

/** Ongoing work first, then by when it ended, then by when it started. */
const byDate = (a: Sortable, b: Sortable) => (b.end ?? Infinity) - (a.end ?? Infinity) || b.start - a.start

/**
 * Most recent first. Projects with a Notion Order follow it (1 is the most recent); a project
 * without one sits by its dates, just ahead of the first ordered project older than it.
 */
export function byRecent<T extends Sortable>(projects: readonly T[]): T[] {
  const ordered = projects.filter((project) => project.order != null).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  if (!ordered.length) return [...projects].sort(byDate)
  const result = [...ordered]
  // Newest first, each ahead of the first project already placed that is older than it.
  for (const project of projects.filter((item) => item.order == null).sort(byDate)) {
    const at = result.findIndex((other) => byDate(project, other) < 0)
    result.splice(at < 0 ? result.length : at, 0, project)
  }
  return result
}
