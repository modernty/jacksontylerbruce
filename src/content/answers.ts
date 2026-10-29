import "server-only"
import { clientLabel } from "./employer"
import { wordCount } from "./guard"
import { publishCatalog, type PublicCatalog } from "./publish"
import type { Project, Role, Theme } from "./schema"
import { DEFAULT_PILLS } from "@/src/router/pills"
import type { Intent, Pill } from "@/src/router/types"

const FILLERS: Pill[] = [
  { label: "Walk me through your career", href: "/timeline#axis" },
  { label: "Show me your projects", href: "/timeline/projects#projects" },
  DEFAULT_PILLS[0],
]

function mentions(q: string, phrase: string): boolean {
  const needle = phrase.toLowerCase().trim()
  if (!needle) return false
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(q)
}

export function sectionHref(project: Project, question = ""): string {
  const q = question.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
  const hit = project.sections.find((section) => mentions(q, section.title) || mentions(q, section.id.replace(/-/g, " ")))
  return `/work/${project.slug}#${hit?.id ?? project.sections[0]?.id ?? "summary"}`
}

export function focusAnnotation(theme: Theme, catalog: PublicCatalog): string {
  const names = catalog.projects.filter((project) => project.themeIds.includes(theme.id)).map((project) => project.name)
  const detailed = `${theme.name}: ${names.join(", ")}.`
  if (names.length && wordCount(detailed) <= 40) return detailed
  return `Public projects tagged ${theme.name}.`
}

export function careerAnnotation(catalog: PublicCatalog): string {
  const listed = catalog.roles.filter((role) => role.listed)
  const first = listed[0]
  const open = listed.filter((role) => role.end == null).length
  if (!first) return "The public timeline is the record of the work."
  const year = first.yearLabel.slice(0, 4)
  return `Roles run from ${first.name} in ${year} to ${open} open roles, on one time axis.`
}

export function projectsAnnotation(catalog: PublicCatalog): string {
  return `The project row lists ${catalog.projects.length} public projects.`
}

export function roleAnnotation(role: Role): string {
  const name = role.employer ? role.name : role.name
  return `${name} is on the timeline as ${role.title}, ${role.yearLabel}.`
}

export function compareAnnotation(catalog: PublicCatalog, ids: string[]): string {
  const names = ids.map((id) => catalog.projects.find((project) => project.id === id)?.name).filter(Boolean)
  if (names.length >= 2) return `${names[0]} and ${names[1]} are both on the public timeline.`
  return projectsAnnotation(catalog)
}

export function sheetAnswer(topic: string, catalog: PublicCatalog = publishCatalog()): {
  title: string
  body: string
  facts: string[]
  cta: Pill
} {
  const timeline: Pill = { label: "See the timeline →", href: "/timeline#axis" }
  const projects: Pill = { label: "See the projects →", href: "/timeline/projects#projects" }
  const open = catalog.roles.filter((role) => role.listed && role.end == null)
  const themeNames = catalog.themes.map((theme) => theme.name)
  if (topic === "location") {
    const facts = [catalog.profile.name, catalog.profile.location]
    return {
      title: catalog.profile.location,
      body: `${catalog.profile.name} is based in ${catalog.profile.location}.`,
      facts,
      cta: timeline,
    }
  }
  if (topic === "about") {
    const facts = [catalog.profile.name, catalog.profile.title]
    return {
      title: catalog.profile.title,
      body: `${catalog.profile.name} is a ${catalog.profile.title}.`,
      facts,
      cta: projects,
    }
  }
  if (topic === "availability") {
    const facts = [catalog.profile.location, ...open.flatMap((role) => [role.name, role.title, role.since ?? role.yearLabel])]
    const roles = open.map((role) => `${role.name} (${role.title}, ${role.since ?? role.yearLabel})`).join("; ")
    return {
      title: "Open roles",
      body: roles ? `Open roles: ${roles}. Based in ${catalog.profile.location}.` : `Based in ${catalog.profile.location}.`,
      facts,
      cta: timeline,
    }
  }
  if (topic === "process") {
    return {
      title: "Focuses",
      body: `The public focuses are ${themeNames.join(", ")}.`,
      facts: themeNames,
      cta: { label: "See a focus →", href: "/focus/systems#focus" },
    }
  }
  if (topic === "decline") {
    return {
      title: "Not on this site",
      body: `Ask about the public work of ${catalog.profile.name}.`,
      facts: [catalog.profile.name],
      cta: timeline,
    }
  }
  return {
    title: catalog.profile.name,
    body: `${catalog.profile.name} is based in ${catalog.profile.location}. The public work is on the timeline.`,
    facts: [catalog.profile.name, catalog.profile.location],
    cta: timeline,
  }
}

export function followUpsFor(intent: Intent, focusIds: string[] = [], catalog: PublicCatalog = publishCatalog()): Pill[] {
  if (intent === "career" || intent === "projects" || intent === "off_topic" || intent === "decline") return DEFAULT_PILLS
  const projects = catalog.projects
  let picks: Project[] = []
  if (intent === "focus" && focusIds[0]) {
    picks = projects.filter((project) => project.themeIds.includes(focusIds[0]))
  } else if (intent === "project" && focusIds[0]) {
    const current = projects.find((project) => project.id === focusIds[0])
    picks = current
      ? projects.filter((project) => project.id !== current.id && project.themeIds.some((id) => current.themeIds.includes(id)))
      : []
  } else if (intent === "role" && focusIds[0]) {
    const clientIds = new Set(catalog.clients.filter((client) => client.roleId === focusIds[0]).map((client) => client.id))
    picks = projects.filter((project) => clientIds.has(project.clientId))
  }
  const pills: Pill[] = picks.slice(0, 3).map((project) => ({
    label: `Show ${project.name}`,
    href: sectionHref(project),
  }))
  for (const filler of FILLERS) {
    if (pills.length >= 3) break
    if (!pills.some((pill) => pill.href === filler.href)) pills.push(filler)
  }
  return pills.slice(0, 3)
}

export function factText(catalog: PublicCatalog = publishCatalog()): string {
  return [
    catalog.profile.name,
    catalog.profile.location,
    catalog.profile.title,
    catalog.employer,
    ...catalog.roles.flatMap((role) => [role.name, role.title, role.yearLabel, role.since ?? ""]),
    ...catalog.clients.map((client) => clientLabel({ name: client.name, usesEmployerName: false })),
    ...catalog.projects.flatMap((project) => [project.name, project.summary, ...project.sections.flatMap((section) => [section.title, section.body])]),
    ...catalog.themes.flatMap((theme) => [theme.name, theme.label]),
    ...catalog.places.map((place) => place.name),
    "open roles",
    "public projects",
    "public focuses",
    "timeline",
  ].filter(Boolean).join("\n")
}

export function anchorExists(href: string, catalog: PublicCatalog = publishCatalog()): boolean {
  const url = new URL(href, "http://portfolio.local")
  const hash = decodeURIComponent(url.hash.replace(/^#/, ""))
  if (!hash) return false
  if (url.pathname === "/timeline") return hash === "axis"
  if (url.pathname === "/timeline/projects") return hash === "projects"
  if (url.pathname.startsWith("/focus/")) {
    const slug = url.pathname.slice("/focus/".length)
    return hash === "focus" && catalog.themes.some((theme) => theme.slug === slug)
  }
  if (url.pathname === "/sheet") return hash === "answer"
  if (url.pathname.startsWith("/work/")) {
    const slug = url.pathname.slice("/work/".length)
    const project = catalog.projects.find((item) => item.slug === slug)
    return Boolean(project && project.sections.some((section) => section.id === hash))
  }
  return false
}
