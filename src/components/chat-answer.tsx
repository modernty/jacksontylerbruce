"use client"

import type { ReactNode } from "react"
import type { CareerEntry } from "@/src/content/career"
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
  /** Opens the view the answer called for. */
  onPanel: (kind: Panel) => void
  /** The project or view open now, shown pressed. */
  current?: string
  /** A project shown as plain text, e.g. the one this tab is about. */
  plain?: string
}

/**
 * One answer, styled the same in every conversation: project names as links in the sentence,
 * career as a resume list (two text styles: facts in Medium, summary in Regular), and a link
 * to the globe or timeline. Null means the plain words are enough, so it is called as a
 * function rather than rendered as a component (an element is never null).
 */
export function chatAnswer({ turn, names, careers, onProject, onPanel, current, plain }: AnswerProps): ReactNode {
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
        <ol className="career">
          {roles.map((role) => {
            const named = role.projects.filter((slug) => names[slug])
            return (
              <li key={role.id}>
                <p className="career-facts">
                  <span>{role.name}</span>
                  <span>{role.title}</span>
                  <span>{role.dates}</span>
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
    return [
      turn.answer,
      " ",
      <button key="view" type="button" className="chat-link" aria-pressed={current === kind} onClick={() => onPanel(kind)}>
        {kind === "globe" ? "See the globe" : "See the timeline"}
      </button>,
    ]
  }

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
