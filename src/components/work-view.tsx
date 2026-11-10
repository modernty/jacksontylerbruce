"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { track } from "@vercel/analytics"
import { IntroStream } from "./intro-stream"
import type { CareerEntry } from "@/src/content/career"
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
  /** False when the project has no images yet, so there is no gallery to open. */
  hasImages: boolean
  /** Every public project's name by slug, so answers can open other projects as tabs. */
  names: Record<string, string>
  /** Career entries by role id, for resume-style answers in this tab. */
  careers: Record<string, CareerEntry>
  cta: ReactNode
}

const chevronDown = (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const galleryIcon = (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M1.5 8.5l2.8-2.6 2.2 2 1.6-1.4 2.4 2.1" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
)

/** One project, two ways to read it: a conversation in one column, or boring view's info beside photos. */
export function WorkView({ slug, head, leadIds, lead, meta, sections, media, hasImages, names, careers, cta }: Pieces) {
  const { boring } = useViewMode()
  const [more, setMore] = useState(false)
  const [gallery, setGallery] = useState(false)
  const openGallery = useCallback(() => {
    if (!hasImages) return
    setGallery(true)
    track("gallery_opened", { slug })
  }, [hasImages, slug])

  useEffect(() => {
    if (!gallery) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGallery(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [gallery])
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

  // The images live in the gallery now; more info keeps the facts and the sections.
  const after = (
    <>
      <div className="work-actions">
        <button type="button" className="btn ghost with-icon more-toggle" aria-expanded={more} onClick={() => setMore((open) => !open)}>
          {more ? "Less info" : "More info"}
          {chevronDown}
        </button>
        {hasImages ? (
          <button type="button" className="btn ghost with-icon" aria-expanded={gallery} onClick={openGallery}>
            Open gallery
            {galleryIcon}
          </button>
        ) : null}
      </div>
      {/* Browsers open a <details> on their own when the URL points inside it; onToggle keeps the button in step. */}
      <details className="more" open={more} onToggle={(event) => setMore(event.currentTarget.open)} suppressHydrationWarning>
        <summary hidden>More info</summary>
        {meta}
        {sections}
        {hasImages ? null : media}
        {cta}
      </details>
    </>
  )

  return (
    <div className={gallery ? "work-stage galleried" : "work-stage"}>
      <article className="column">
        {head}
        <div className="lead" id={leadId}>
          {anchors}
          <IntroStream id={slug} paragraphs={lead}>{after}</IntroStream>
        </div>
        <ProjectChat slug={slug} names={names} careers={careers} hasImages={hasImages} onImages={openGallery} />
      </article>
      {gallery ? (
        <>
          <button type="button" className="sheet-scrim" aria-label="Close gallery" onClick={() => setGallery(false)} />
          <aside className="gallery" aria-label="Gallery">
            <button type="button" className="preview-close" onClick={() => setGallery(false)} aria-label="Close gallery">
              Close
              <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
            {/* Only the images scroll, so they never pass under the Close button. */}
            <div className="gallery-scroll">{media}</div>
          </aside>
        </>
      ) : null}
    </div>
  )
}
