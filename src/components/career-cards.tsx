import type { ReactNode } from "react"
import type { CareerEntry } from "@/src/content/career"

/**
 * The career as cards, one per role, in the order given (newest first in an answer). Desktop answers
 * show these; phones show the resume list instead. Each project under a role comes from `link`.
 */
export function CareerCards({ roles, names, link }: { roles: CareerEntry[]; names: Record<string, string>; link: (slug: string, label: string, list: string[]) => ReactNode }) {
  return (
    <ol className="career-cards">
      {roles.map((role) => {
        const projects = role.projects.filter((slug) => names[slug])
        return (
          <li key={role.id} className="career-card">
            <p className="career-when">{role.dates}</p>
            <h3 className="career-name">{role.name}</h3>
            <p className="career-role">{role.title}</p>
            {role.summary ? <p className="career-about">{role.summary}</p> : null}
            {projects.length ? (
              <p className="career-work">
                {projects.map((slug, index) => (
                  <span key={slug}>
                    {link(slug, names[slug], projects)}
                    {index < projects.length - 1 ? ", " : null}
                  </span>
                ))}
              </p>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
