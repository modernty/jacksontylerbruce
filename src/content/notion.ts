import data from "@/content/notion-projects.json"
import { principleFor } from "./principles"

/** One project's facts from the Notion intake, keyed by the site's slug. Confidential details are already left out. */
export type NotionProject = { notionId: string; order?: number; circa?: string; glance?: string; standard?: string; role?: string; context?: string[] }

export const NOTION_PROJECTS = data.projects as Record<string, NotionProject>

/** Every line of Notion detail for one project, for the model and for checking what it writes. */
export function notionLines(slug: string): string[] {
  const entry = NOTION_PROJECTS[slug]
  const principle = principleFor(slug)
  const stance = principle ? `Stance: ${principle.title} ${principle.body}` : undefined
  if (!entry) return stance ? [stance] : []
  return [entry.glance, entry.standard, stance, entry.role ? `Role: ${entry.role}` : undefined, ...(entry.context ?? [])].filter((line): line is string => !!line)
}
