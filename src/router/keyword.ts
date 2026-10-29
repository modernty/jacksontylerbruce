import "server-only"
import { loadCatalog } from "@/src/content/catalog"
import { employerPublicName } from "@/src/content/employer"
import { publishCatalog } from "@/src/content/publish"
import { wordCount } from "@/src/content/guard"
import type { Project, Role, Theme } from "@/src/content/schema"
import { followUpsFor, sheetCopy } from "./pills"
import type { Intent, ViewSpec } from "./types"

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
}

function hasPhrase(haystack: string, phrase: string): boolean {
  const needle = normalize(phrase).trim()
  if (!needle) return false
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(haystack)
}

function view(partial: Omit<ViewSpec, "annotation" | "followUps" | "source"> & { annotation?: string }): ViewSpec {
  const sheet = partial.filter === "sheet"
  const topic = sheet ? partial.intent : ""
  const authored = partial.annotation ?? (sheet ? sheetCopy(topic === "off_topic" ? "off_topic" : partial.intent).body : "")
  return {
    ...partial,
    annotation: authored,
    followUps: followUpsFor(partial.intent),
    source: "keyword",
  }
}

function projectHref(project: Project): string {
  return `/work/${project.slug}#${project.sections[0]?.id ?? "summary"}`
}

export function keywordRoute(question: string): ViewSpec {
  const catalog = publishCatalog()
  const q = normalize(question).trim()
  const flagged = loadCatalog().projects.filter((project) => project.flagged)
  if (!q) return view({ intent: "off_topic", focusIds: [], filter: "sheet", href: "/sheet?topic=off_topic", confidence: 0.4 })
  if (flagged.some((project) => mentionsProject(q, project))) {
    return view({ intent: "decline", focusIds: [], filter: "sheet", href: "/sheet?topic=decline", confidence: 0.95 })
  }
  const employer = catalog.roles.find((role) => role.employer)
  if (employer && hasPhrase(q, employerPublicName())) return roleView(employer)
  if (/\b(ignore (all |your |previous )?instructions|system prompt|jailbreak|developer mode)\b/.test(q)) {
    return view({ intent: "decline", focusIds: [], filter: "sheet", href: "/sheet?topic=decline", confidence: 0.98 })
  }

  const projects = catalog.projects.filter((project) => mentionsProject(q, project))
  if (projects.length >= 2) {
    const ids = projects.slice(0, 4).map((project) => project.id)
    return view({
      intent: "compare",
      focusIds: ids,
      filter: "timeline",
      href: `/timeline?focus=${ids.join(",")}`,
      confidence: 0.9,
      annotation: annotationFor("compare", ids),
    })
  }

  const roleHit = catalog.roles.find((role) => mentionsRole(q, role))
  if (roleHit && /\bat\b/.test(q)) {
    return roleView(roleHit)
  }
  if (projects.length === 1) return projectView(projects[0])
  if (roleHit) return roleView(roleHit)

  const theme = themeHit(q, catalog.themes)
  if (theme) {
    return view({
      intent: "focus",
      focusIds: [theme.id],
      filter: "focus",
      href: `/focus/${theme.slug}`,
      confidence: 0.86,
      annotation: `These are the public projects tagged ${theme.name}.`,
    })
  }

  if (/\b(where (are|do) you|where are you based|located|location|time zone|timezone|which city|where do you live|based)\b/.test(q)) {
    return view({ intent: "location", focusIds: ["place:miami"], filter: "sheet", href: "/sheet?topic=location", confidence: 0.92 })
  }
  if (/\bwhy\b.*\bhire\b|\bshould i hire\b|\bhire you\b/.test(q)) {
    return view({ intent: "about", focusIds: ["profile:tyler"], filter: "sheet", href: "/sheet?topic=about", confidence: 0.9 })
  }
  if (/\b(available|availability|full-time|full time|freelance|open to|book a call|reach you|contact)\b/.test(q)) {
    return view({ intent: "availability", focusIds: ["profile:tyler"], filter: "sheet", href: "/sheet?topic=availability", confidence: 0.88 })
  }
  if (/\b(process|vague brief|how do you (work|approach|start)|design process|way of working)\b/.test(q)) {
    return view({ intent: "process", focusIds: ["profile:tyler"], filter: "sheet", href: "/sheet?topic=process", confidence: 0.86 })
  }
  if (/\b(career|timeline|resume|\bcv\b|walk me through)\b/.test(q)) {
    return view({
      intent: "career",
      focusIds: ["profile:tyler"],
      filter: "timeline",
      href: "/timeline",
      confidence: 0.9,
      annotation: "Roles run from Joba Studio in 2019 to the open roles in 2026, on one time axis.",
    })
  }
  if (/\b(projects|case stud|portfolio|your work)\b/.test(q)) {
    return view({
      intent: "projects",
      focusIds: [],
      filter: "projects",
      href: "/timeline/projects",
      confidence: 0.84,
      annotation: "The project row is every public engagement, on the same years as the timeline.",
    })
  }
  if (/\b(poem|recipe|weather|joke|score|lottery|homework)\b/.test(q)) {
    return view({ intent: "off_topic", focusIds: [], filter: "sheet", href: "/sheet?topic=off_topic", confidence: 0.9 })
  }
  return view({ intent: "off_topic", focusIds: [], filter: "sheet", href: "/sheet?topic=off_topic", confidence: 0.35 })
}

function mentionsProject(q: string, project: Project): boolean {
  if (hasPhrase(q, normalize(project.name))) return true
  return project.aliases.some((alias) => hasPhrase(q, alias))
}

function mentionsRole(q: string, role: Role): boolean {
  const phrases = role.employer ? [employerPublicName(), ...role.aliases] : [role.name, ...role.aliases]
  return phrases.some((phrase) => hasPhrase(q, phrase))
}

function themeHit(q: string, themes: Theme[]): Theme | undefined {
  const rules: { slug: string; pattern: RegExp }[] = [
    { slug: "trust", pattern: /\btrust\b/ },
    { slug: "architecture", pattern: /\b(architecture|information architecture)\b/ },
    { slug: "spatial", pattern: /\bspatial\b/ },
    { slug: "material", pattern: /\bmaterial\b/ },
    { slug: "identity", pattern: /\b(identity|brand)\b/ },
    { slug: "finance", pattern: /\bfinance\b/ },
    { slug: "systems", pattern: /\bsystems?\b/ },
    { slug: "ai", pattern: /\b(ai|artificial intelligence|machine learning)\b/ },
  ]
  for (const rule of rules) {
    if (rule.pattern.test(q)) return themes.find((theme) => theme.slug === rule.slug)
  }
  return undefined
}

function projectView(project: Project): ViewSpec {
  const catalog = publishCatalog()
  const themes = project.themeIds.map((id) => catalog.themes.find((theme) => theme.id === id)?.name).filter(Boolean)
  const annotation = `${project.name} is public work across ${themes.join(", ")}.`
  return view({
    intent: "project",
    focusIds: [project.id],
    filter: "work",
    href: projectHref(project),
    confidence: 0.93,
    annotation: wordCount(annotation) <= 40 ? annotation : project.summary,
  })
}

function roleView(role: Role): ViewSpec {
  const name = role.employer ? employerPublicName() : role.name
  return view({
    intent: "role",
    focusIds: [role.id],
    filter: "timeline",
    href: `/timeline?role=${role.id}`,
    confidence: 0.9,
    annotation: `${name} is on the timeline as ${role.title}, ${role.yearLabel}.`,
  })
}

function annotationFor(intent: Intent, ids: string[]): string {
  if (intent === "compare") {
    const catalog = publishCatalog()
    const names = ids.map((id) => catalog.projects.find((project) => project.id === id)?.name).filter(Boolean)
    if (names.length >= 2) return `${names[0]} and ${names[1]} are both on the public timeline.`
  }
  return ""
}

export function withQuestion(href: string, question: string): string {
  const url = new URL(href, "http://portfolio.local")
  url.searchParams.set("q", question)
  return `${url.pathname}${url.search}${url.hash}`
}
