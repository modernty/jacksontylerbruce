import type { PublicCatalog } from "./publish"

/** One role as the conversation lists it, resume style. */
export type CareerEntry = { id: string; name: string; title: string; dates: string; summary: string; sizes: string; projects: string[] }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const en = "–"

/** Roles store fractional years (2022.78 is October 2022); the resume shows the month. */
export function monthLabel(year: number): string {
  const whole = Math.floor(year)
  const month = Math.min(11, Math.floor((year - whole) * 12 + 1e-9))
  return `${MONTHS[month]} ${whole}`
}

/** Every public role, newest first, with its dates, summary and the projects under it. */
export function careerEntries(catalog: PublicCatalog): CareerEntry[] {
  return [...catalog.roles]
    .sort((a, b) => (b.end ?? Infinity) - (a.end ?? Infinity) || b.start - a.start)
    .map((role) => {
      const projects = catalog.projects.filter((project) => project.roleId === role.id)
      const start = role.since ?? monthLabel(role.start)
      const end = role.end === null ? "Now" : monthLabel(role.end)
      return {
        id: role.id,
        name: role.name,
        title: role.title,
        dates: `${start} ${en} ${end}`,
        summary: role.summary ?? "",
        sizes: [role.team, role.company].filter(Boolean).join(" · "),
        projects: projects.map((project) => project.slug),
      }
    })
}
