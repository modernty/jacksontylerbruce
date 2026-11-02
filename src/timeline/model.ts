import { clientLabel, employerPublicName } from "@/src/content/employer"
import type { Catalog } from "@/src/content/schema"
import type { TimelineCard, TimelineModel } from "./types"
import { yearSpan } from "./svg"
import { tokens } from "@/src/design/tokens"

export const NOW = 2026.83

const FOCUS: [string, string][] = [
  ["AI", "AI"],
  ["Trust", "TRUST IN AI"],
  ["Systems", "SYSTEMS"],
  ["Arch", "ARCHITECTURE"],
  ["Spatial", "SPATIAL"],
  ["Material", "MATERIAL"],
  ["Identity", "IDENTITY"],
  ["Finance", "FINANCE"],
]

export function toTimelineModel(catalog: Catalog, options: { includeFlagged?: boolean } = {}): TimelineModel {
  const themes = new Map(catalog.themes.map((theme) => [theme.id, theme]))
  const clients = new Map(catalog.clients.map((client) => [client.id, client]))
  const roles = new Map(catalog.roles.map((role) => [role.id, role]))
  const names: Record<string, string> = {}
  for (const theme of catalog.themes) names[theme.key] = theme.name
  const projects = catalog.projects
    .filter((project) => options.includeFlagged || !project.flagged)
    .map((project) => {
      const client = clients.get(project.clientId)
      const role = roles.get(project.roleId)
      const org = project.orgLabel ?? (client ? clientLabel(client) : "")
      return {
        name: project.name,
        start: project.start,
        end: project.end ?? NOW,
        // On the timeline, projects stack under their role's left edge, in its lane.
        anchor: role?.start ?? project.start,
        org,
        lane: role?.lane ?? project.lane,
        focus: themes.get(project.themeIds[0])?.key ?? "",
        themes: project.themeIds.map((id) => themes.get(id)?.key ?? "").filter(Boolean),
        onTimeline: project.onTimeline,
      }
    })
  return {
    now: NOW,
    ink: tokens.color.ink,
    roles: catalog.roles.filter((role) => role.listed).map((role) => ({
      name: (role.employer ? employerPublicName() : role.name).toUpperCase(),
      year: role.yearLabel,
      start: role.start,
      end: role.end,
      lane: role.lane,
    })),
    projects,
    focus: FOCUS,
    names,
  }
}

export function timelineCards(catalog: Catalog, options: { includeFlagged?: boolean } = {}): TimelineCard[] {
  const model = toTimelineModel(catalog, options)
  const byName = new Map(catalog.projects.map((project) => [project.name, project]))
  // Every public project, so the projects view (which also shows work kept off the timeline) has cards too.
  return [...model.projects].sort((a, b) => a.start - b.start).map((project) => {
    const source = byName.get(project.name)
    const section = source?.sections[0]?.id ?? "summary"
    const themes = project.themes.map((key) => model.names[key]).join(" \u00b7 ")
    return {
      t: project.name,
      c: project.org,
      d: yearSpan(project.start, project.end, model.now),
      f: themes,
      s: source?.summary ?? "",
      u: source ? `/work/${source.slug}#${section}` : "/timeline",
    }
  })
}
