import { clientLabel, employerPublicName } from "@/src/content/employer"
import type { Catalog } from "@/src/content/schema"
import type { TimelineCard, TimelineModel } from "./types"
import { yearSpan } from "./svg"

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
  const names: Record<string, string> = {}
  for (const theme of catalog.themes) names[theme.key] = theme.name
  const projects = catalog.projects
    .filter((project) => options.includeFlagged || !project.flagged)
    .map((project) => {
      const client = clients.get(project.clientId)
      const org = project.orgLabel ?? (client ? clientLabel(client) : "")
      return {
        name: project.name,
        start: project.start,
        end: project.end ?? NOW,
        org,
        lane: project.lane,
        focus: themes.get(project.themeIds[0])?.key ?? "",
        themes: project.themeIds.map((id) => themes.get(id)?.key ?? "").filter(Boolean),
        onTimeline: project.onTimeline,
      }
    })
  return {
    now: NOW,
    ink: "#2E3A87",
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
  return model.projects.filter((project) => project.onTimeline).sort((a, b) => a.start - b.start).map((project) => {
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
