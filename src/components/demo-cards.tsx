"use client"

import type { ProjectPreview } from "./conversation-stage"
import { ClampText } from "./clamp-text"

/**
 * The demos an answer offers, as rows in the conversation between the answer and its follow-ups:
 * the client's mark, the project and what it is. Picking one opens its demo.
 */
export function DemoCards({ projects, current, onPick }: { projects: ProjectPreview[]; current?: string; onPick: (slug: string) => void }) {
  if (!projects.length) return null
  return (
    <ul className="demo-cards" aria-label="Case studies">
      {projects.map((project) => (
        <li key={project.slug}>
          <button type="button" className="demo-card" aria-pressed={current === project.slug} onClick={() => onPick(project.slug)}>
            <span className="demo-card-logo" aria-hidden="true">
              {project.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={project.logo} alt="" />
              ) : (
                <span>{project.name.slice(0, 1)}</span>
              )}
            </span>
            <span className="demo-card-text">
              <span className="demo-card-name">{project.name}</span>
              <ClampText as="span" className="demo-card-desc" text={project.summary} lines={2} />
            </span>
            <svg className="demo-card-chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3.5l4.5 4.5L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}
