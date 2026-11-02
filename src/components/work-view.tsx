"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { IntroStream } from "./intro-stream"
import { ProjectChat } from "./project-chat"
import { useViewMode } from "./view-mode"

const TOP = 120
const BREAK = 900

/**
 * Pins the info column while the photos scroll. A column taller than the window scrolls with the
 * page until its end is in view, then stops there.
 */
function StickyColumn({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const column = ref.current
    if (!column) return
    const place = () => {
      column.style.top = window.innerWidth < BREAK ? "" : `${Math.min(TOP, window.innerHeight - 24 - column.offsetHeight)}px`
    }
    const observer = new ResizeObserver(place)
    observer.observe(column)
    window.addEventListener("resize", place)
    place()
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", place)
    }
  }, [])
  return <aside className="info" ref={ref}>{children}</aside>
}

type Pieces = {
  slug: string
  head: ReactNode
  /** Ids the lead paragraph answers to, so deep links keep working in both views. */
  leadIds: string[]
  lead: string[]
  meta: ReactNode
  sections: ReactNode
  media: ReactNode
  cta: ReactNode
}

/** One project, two ways to read it: a conversation in one column, or boring view's info beside photos. */
export function WorkView({ slug, head, leadIds, lead, meta, sections, media, cta }: Pieces) {
  const { boring } = useViewMode()
  const [leadId, ...aliases] = leadIds
  const anchors = aliases.map((id) => <span key={id} id={id} />)

  if (boring) {
    return (
      <div className="split">
        <StickyColumn>
          {head}
          <div className="lead" id={leadId}>
            {anchors}
            {lead.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          {meta}
          {sections}
          {cta}
        </StickyColumn>
        {media}
      </div>
    )
  }

  const more = sections || media ? (
    // Browsers open a <details> on their own when the URL points inside it, before hydration.
    <details className="more" suppressHydrationWarning>
      <summary><span className="closed">more info</span><span className="opened">less info</span></summary>
      {meta}
      {sections}
      {media}
      {cta}
    </details>
  ) : null

  return (
    <article className="column">
      {head}
      <div className="lead" id={leadId}>
        {anchors}
        <IntroStream id={slug} paragraphs={lead}>{more}</IntroStream>
      </div>
      <ProjectChat slug={slug} />
    </article>
  )
}
