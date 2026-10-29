import "server-only"
import { loadCatalog } from "@/src/content/catalog"
import { employerPublicName } from "@/src/content/employer"
import { publishCatalog } from "@/src/content/publish"
import { containsBlocked } from "@/src/content/guard"
import type { Project, Role, Theme } from "@/src/content/schema"
import {
  careerAnnotation,
  compareAnnotation,
  focusAnnotation,
  followUpsFor,
  projectsAnnotation,
  roleAnnotation,
  sectionHref,
  sheetAnswer,
} from "@/src/content/answers"
import type { ViewSpec } from "./types"

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
  const topic = sheet ? (partial.intent === "off_topic" ? "off_topic" : partial.intent) : ""
  const authored = partial.annotation ?? (sheet ? sheetAnswer(topic).body : "")
  return {
    ...partial,
    annotation: authored,
    followUps: followUpsFor(partial.intent, partial.focusIds),
    source: "keyword",
  }
}

export function keywordRoute(question: string): ViewSpec {
  const catalog = publishCatalog()
  const q = normalize(question).trim()
  const flagged = loadCatalog().projects.filter((project) => project.flagged)
  if (!q) return view({ intent: "off_topic", focusIds: [], filter: "sheet", href: "/sheet?topic=off_topic#answer", confidence: 0.4 })
  if (containsBlocked(question) || flagged.some((project) => mentionsProject(q, project))) {
    return view({ intent: "decline", focusIds: [], filter: "sheet", href: "/sheet?topic=decline#answer", confidence: 0.95 })
  }
  const employer = catalog.roles.find((role) => role.employer)
  if (employer && hasPhrase(q, employerPublicName())) return roleView(employer)
  if (/\b(ignore (all |your |previous )?instructions|system prompt|jailbreak|developer mode|blocklist|disregard (the |your )?rules)\b/.test(q)) {
    return view({ intent: "decline", focusIds: [], filter: "sheet", href: "/sheet?topic=decline#answer", confidence: 0.98 })
  }

  const projects = catalog.projects.filter((project) => mentionsProject(q, project))
  if (projects.length >= 2) {
    const ids = projects.slice(0, 4).map((project) => project.id)
    return view({
      intent: "compare",
      focusIds: ids,
      filter: "timeline",
      href: `/timeline?focus=${ids.join(",")}#axis`,
      confidence: 0.9,
      annotation: compareAnnotation(catalog, ids),
    })
  }

  const roleHit = catalog.roles.find((role) => mentionsRole(q, role))
  if (roleHit && /\bat\b/.test(q)) {
    return roleView(roleHit)
  }
  if (projects.length === 1) return projectView(projects[0], question)
  if (roleHit) return roleView(roleHit)

  const theme = themeHit(q, catalog.themes)
  if (theme) {
    return view({
      intent: "focus",
      focusIds: [theme.id],
      filter: "focus",
      href: `/focus/${theme.slug}#focus`,
      confidence: 0.86,
      annotation: focusAnnotation(theme, catalog),
    })
  }

  if (/\b(where (are|do) you|where are you based|located|location|time zone|timezone|which city|where do you live|based)\b/.test(q)) {
    return view({ intent: "location", focusIds: ["place:miami"], filter: "sheet", href: "/sheet?topic=location#answer", confidence: 0.92 })
  }
  if (/\bwhy\b.*\bhire\b|\bshould i hire\b|\bhire you\b/.test(q)) {
    return view({ intent: "about", focusIds: ["profile:tyler"], filter: "sheet", href: "/sheet?topic=about#answer", confidence: 0.9 })
  }
  if (/\b(available|availability|full-time|full time|freelance|open to|book a call|reach you|contact)\b/.test(q)) {
    return view({ intent: "availability", focusIds: ["profile:tyler"], filter: "sheet", href: "/sheet?topic=availability#answer", confidence: 0.88 })
  }
  if (/\b(process|vague brief|how do you (work|approach|start)|design process|way of working)\b/.test(q)) {
    return view({ intent: "process", focusIds: ["profile:tyler"], filter: "sheet", href: "/sheet?topic=process#answer", confidence: 0.86 })
  }
  if (/\b(career|timeline|resume|\bcv\b|walk me through)\b/.test(q)) {
    return view({
      intent: "career",
      focusIds: ["profile:tyler"],
      filter: "timeline",
      href: "/timeline#axis",
      confidence: 0.9,
      annotation: careerAnnotation(catalog),
    })
  }
  if (/\b(projects|case stud|portfolio|your work)\b/.test(q)) {
    return view({
      intent: "projects",
      focusIds: [],
      filter: "projects",
      href: "/timeline/projects#projects",
      confidence: 0.84,
      annotation: projectsAnnotation(catalog),
    })
  }
  if (/\b(poem|recipe|weather|joke|score|lottery|homework)\b/.test(q)) {
    return view({ intent: "off_topic", focusIds: [], filter: "sheet", href: "/sheet?topic=off_topic#answer", confidence: 0.9 })
  }
  return view({ intent: "off_topic", focusIds: [], filter: "sheet", href: "/sheet?topic=off_topic#answer", confidence: 0.35 })
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

function projectView(project: Project, question: string): ViewSpec {
  return view({
    intent: "project",
    focusIds: [project.id],
    filter: "work",
    href: sectionHref(project, question),
    confidence: 0.93,
    annotation: project.summary,
  })
}

function roleView(role: Role): ViewSpec {
  return view({
    intent: "role",
    focusIds: [role.id],
    filter: "timeline",
    href: `/timeline?role=${role.id}#axis`,
    confidence: 0.9,
    annotation: roleAnnotation(role),
  })
}

export function withQuestion(href: string, question: string): string {
  const url = new URL(href, "http://portfolio.local")
  url.searchParams.set("q", question)
  return `${url.pathname}${url.search}${url.hash}`
}
