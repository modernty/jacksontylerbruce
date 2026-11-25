"use client"

import type { ReactNode } from "react"
import type { CareerEntry } from "@/src/content/career"
import { CareerCards } from "./career-cards"
import type { Panel, ReplyExtra } from "./chat-thread"

/**
 * Finds each listed project's name in the answer, as a whole word, taking the last time it
 * appears so a company name that starts the same way ("Chatter Social") stays plain text.
 */
export function linkRanges(text: string, names: { slug: string; name: string }[]): { start: number; end: number; slug: string }[] {
  const ranges: { start: number; end: number; slug: string }[] = []
  const word = (char: string | undefined) => !!char && /[\p{L}\p{N}]/u.test(char)
  for (const { slug, name } of [...names].sort((a, b) => b.name.length - a.name.length)) {
    let at = text.lastIndexOf(name)
    while (at >= 0 && (word(text[at - 1]) || word(text[at + name.length]))) at = text.lastIndexOf(name, at - 1)
    if (at < 0) continue
    const end = at + name.length
    if (ranges.some((range) => at < range.end && end > range.start)) continue
    ranges.push({ start: at, end, slug })
  }
  return ranges.sort((a, b) => a.start - b.start)
}

export type AnswerProps = {
  turn: { answer: string } & ReplyExtra
  /** Public project names by slug. */
  names: Record<string, string>
  /** Career entries by role id, for resume-style answers. */
  careers: Record<string, CareerEntry>
  /** Opens a project the answer names, with the list it came from. */
  onProject: (slug: string, list: string[]) => void
  /** Shows the view the answer called for, or hides it when it is the one showing. */
  /** only narrows the globe to the places the answer was about. */
  onPanel: (kind: Panel, only?: "lived") => void
  /** The project or view open now, shown pressed. */
  current?: string
  /** When the globe is open, whether it shows only the places lived. */
  currentOnly?: "lived"
  /** A project shown as plain text, e.g. the one this tab is about. */
  plain?: string
}

const globeIcon = (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.08" />
    <path d="M1.4 6h9.2M6 1.4c1.4 1.3 2.1 2.9 2.1 4.6S7.4 9.3 6 10.6M6 1.4C4.6 2.7 3.9 4.3 3.9 6s.7 3.3 2.1 4.6" fill="none" stroke="currentColor" strokeWidth="0.99" />
  </svg>
)

/**
 * The view an answer offers, below its words: a secondary button that reads Show while the view is
 * closed and Hide while it is the one open, like the media toggle on a project.
 */
function ViewAction({ kind, only, open, onPanel }: { kind: Panel; only?: "lived"; open: boolean; onPanel: AnswerProps["onPanel"] }) {
  const noun = kind === "globe" ? (only === "lived" ? "places lived" : "globe") : "timeline"
  return (
    <div className={`chat-view-action is-${kind}`}>
      <button type="button" className="preview-close chat-action" aria-pressed={open} onClick={() => onPanel(kind, only)}>
        {open ? "Hide" : "Show"} {noun}
        {kind === "globe" ? globeIcon : null}
      </button>
    </div>
  )
}

/**
 * One answer, styled the same in every conversation: project names as links in the sentence,
 * career as a resume list (two text styles: facts in Medium, summary in Regular), and a link
 * to the globe or timeline. Null means the plain words are enough, so it is called as a
 * function rather than rendered as a component (an element is never null).
 */
export function chatAnswer({ turn, names, careers, onProject, onPanel, current, currentOnly, plain }: AnswerProps): ReactNode {
  const link = (slug: string, label: string, list: string[]) =>
    slug === plain ? (
      label
    ) : (
      <button key={slug} type="button" className="chat-link" aria-pressed={current === slug} onClick={() => onProject(slug, list)}>
        {label}
      </button>
    )

  const roles = (turn.roles ?? []).flatMap((id) => careers[id] ?? [])
  if (roles.length) {
    return (
      <>
        {turn.answer}
        {/* The timeline toggle sits on top of the list it shows beside. */}
        {turn.panel === "timeline" ? <ViewAction kind="timeline" open={current === "timeline"} onPanel={onPanel} /> : null}
        <CareerCards roles={roles} names={names} link={link} />
        <ol className="career">
          {roles.map((role) => {
            const named = role.projects.filter((slug) => names[slug])
            return (
              <li key={role.id}>
                <p className="career-facts">
                  <span>{role.dates}</span>
                  <span>{role.name}</span>
                  <span className="career-title">{role.title}</span>
                  {role.sizes ? <span>{role.sizes}</span> : null}
                </p>
                {role.summary || named.length ? (
                  <p className="career-summary">
                    {role.summary}
                    {named.length ? (
                      <>
                        {role.summary ? " " : ""}
                        Projects:{" "}
                        {named.map((slug, index) => (
                          <span key={slug}>
                            {index ? (index === named.length - 1 ? " and " : ", ") : ""}
                            {link(slug, names[slug], named)}
                          </span>
                        ))}
                        .
                      </>
                    ) : null}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ol>
      </>
    )
  }

  if (turn.panel) {
    const kind = turn.panel
    const open = current === kind && (kind !== "globe" || currentOnly === turn.placeKind)
    return [turn.answer, <ViewAction key="view" kind={kind} only={turn.placeKind} open={open} onPanel={onPanel} />]
  }

  // Projects shown as cards under the answer need no links in it.
  if (turn.cards) return null
  const list = (turn.projects ?? []).filter((slug) => names[slug])
  if (!list.length) return null
  const listed = list.map((slug) => ({ slug, name: names[slug] }))
  const ranges = linkRanges(turn.answer, listed)
  const parts: ReactNode[] = []
  let from = 0
  for (const range of ranges) {
    parts.push(turn.answer.slice(from, range.start))
    parts.push(link(range.slug, turn.answer.slice(range.start, range.end), list))
    from = range.end
  }
  parts.push(turn.answer.slice(from))
  // Projects the answer lists without naming them in its words.
  listed
    .filter((item) => !ranges.some((range) => range.slug === item.slug))
    .forEach((item, index) => {
      parts.push(index === 0 ? " " : ", ")
      parts.push(link(item.slug, item.name, list))
    })
  return parts
}
