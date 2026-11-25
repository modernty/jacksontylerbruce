"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { track } from "@vercel/analytics"
import { AnswerStream, type AnswerGroup } from "./answer-stream"
import type { CareerEntry } from "@/src/content/career"
import { ProjectChat } from "./project-chat"
import { useViewMode } from "./view-mode"
import type { Openable } from "@/src/content/demos"
import { MediaDemo } from "@/src/demos/media-demo"
import { MediaStudy } from "@/src/demos/media-study"
import { MediaPortal } from "@/src/demos/media-portal"
import { MediaReel } from "@/src/demos/media-reel"
import type { PortalSections } from "@/src/content/portals"

const TOP = 120
const BREAK = 900
/** The width from which the gallery sits beside the text. Matches the stylesheet. */
const PAIR_MIN = 769
/** Hiding the media: how long the text and media take to fade out, then how long the text rests out of
 *  sight in its new place before fading back in. The fades' lengths match the stylesheet. */
const LEAVE_MS = 960
const REST_MS = 160
/** What the text lines up with in the first plate: the first heading, picture or demo it shows. */
const LEAD_MARK = ".chapter-kicker, h3, .media-demo-stage, img, video"

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

/** A section of the project, told in the answer: its heading, its paragraphs, and a list after them. */
export type ProjectSection = { id: string; title: string; paragraphs: string[]; tail?: ReactNode }

type Pieces = {
  slug: string
  /** The demo and study chapters this project shows in its media, ahead of the images. */
  openable: Openable
  /** The tiles behind the project's portal, when it has one. */
  portal?: PortalSections
  head: ReactNode
  /** Ids the lead paragraph answers to, so deep links keep working in both views. */
  leadIds: string[]
  lead: string[]
  meta: ReactNode
  sections: ProjectSection[]
  media: ReactNode
  /** False when the project has no images yet, so there is no gallery to open. */
  hasImages: boolean
  /** Every public project's name by slug, so answers can open other projects as tabs. */
  names: Record<string, string>
  /** Career entries by role id, for resume-style answers in this tab. */
  careers: Record<string, CareerEntry>
}

const galleryIcon = (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M1.5 8.5l2.8-2.6 2.2 2 1.6-1.4 2.4 2.1" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
)

/**
 * One project, two ways to read it. As a conversation: the project arrives the way the chat answers,
 * section by section, with its media (the demo, the study's chapters, the images) beside it. Or boring
 * view's info beside the same media, all at once.
 */
export function WorkView({ slug, openable, portal, head, leadIds, lead, meta, sections, media, hasImages, names, careers }: Pieces) {
  const { boring } = useViewMode()
  // A project with media loads already paired: text on the left, media on the right, from the first
  // paint, so nothing slides into place. The media itself waits, then fades in (see the stylesheet).
  // On a phone the media is a sheet, so it closes again on arrival and waits behind "Show media".
  const [gallery, setGallery] = useState(true)
  // True while the gallery is the one the page opened with: that one fades in late, after the text.
  const [arriving, setArriving] = useState(true)
  // The text starts level with the top of the media, once the media's place is measured.
  const [placed, setPlaced] = useState(false)

  // Media is the portal into the work first, then the reel, the demo, the study's chapters (and the site it ends on), then the images.
  const hasMedia = hasImages || !!openable.demo || !!openable.study || !!openable.reel || !!(openable.portal && portal)
  // Landscape media gets a wider stage than a phone demo or portrait photos would.
  const wide =
    !!openable.wideMedia ||
    !!openable.portal ||
    !!openable.reel ||
    openable.demo?.frame === "desktop" ||
    !!openable.study?.site ||
    !!openable.study?.chapters.some((chapter) => chapter.story || (chapter.image && chapter.image.frame !== "phone"))
  const mediaItems = (
    <>
      {openable.portal && portal ? <MediaPortal portal={openable.portal} sections={portal} /> : null}
      {openable.reel ? <MediaReel reel={openable.reel} /> : null}
      {openable.demo ? <MediaDemo demo={openable.demo} /> : null}
      {openable.study ? <MediaStudy study={openable.study} /> : null}
      {openable.study?.site ? <MediaDemo demo={openable.study.site} /> : null}
      {hasImages ? media : null}
    </>
  )
  const openGallery = useCallback(() => {
    if (!hasMedia) return
    // Opened by hand, it comes in at once, and the text glides up to meet it.
    setArriving(false)
    setGallery(true)
    track("gallery_opened", { slug })
  }, [hasMedia, slug])
  // Hiding the media fades the text and the media out together; the text comes back centred, as it
  // sits with no gallery. On a phone the media is a sheet over the text, so it simply closes.
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])
  const closeGallery = useCallback(() => {
    const fade = matchMedia(`(min-width: ${PAIR_MIN}px)`).matches && !matchMedia("(prefers-reduced-motion: reduce)").matches
    window.clearTimeout(leaveTimer.current)
    if (fade) {
      setLeaving(true)
      leaveTimer.current = window.setTimeout(() => {
        setGallery(false)
        // A beat in the new place, still hidden, so the move is never seen, then it fades back in.
        leaveTimer.current = window.setTimeout(() => setLeaving(false), REST_MS)
      }, LEAVE_MS)
    } else setGallery(false)
  }, [])

  // On arrival: no media, reading view, or a phone closes the gallery the page opened with. ?media
  // (a demo picked in the chat) keeps it open on any screen, and shows it at once.
  useEffect(() => {
    const url = new URL(window.location.href)
    const asked = url.searchParams.has("media")
    if (asked) {
      url.searchParams.delete("media")
      window.history.replaceState(window.history.state, "", url)
    }
    const paired = matchMedia(`(min-width: ${PAIR_MIN}px)`).matches
    if (!hasMedia || boring || (!paired && !asked)) setGallery(false)
    if (asked && !paired) setArriving(false)
    // Read once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!gallery) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeGallery()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [gallery, closeGallery])
  // The plates: which one is showing, so the bar can count them and step through.
  const scroller = useRef<HTMLDivElement>(null)
  const [plates, setPlates] = useState({ at: 0, total: 0 })
  const plateList = () => [...(scroller.current?.querySelectorAll<HTMLElement>(":scope > :not(.media), :scope > .media > *") ?? [])]
  // Where the text starts: level with the top of the first plate's content, which sits centred in
  // the panel. Measured before paint, and again when the panel changes size.
  useLayoutEffect(() => {
    if (!gallery || leaving) return
    const panel = scroller.current
    if (!panel || !matchMedia(`(min-width: ${PAIR_MIN}px)`).matches) {
      setPlaced(true)
      return
    }
    const place = () => {
      const plate = plateList()[0]
      const top = plate?.querySelector(LEAD_MARK)?.getBoundingClientRect().top
      if (top) document.body.style.setProperty("--lead-top", `${Math.round(top + window.scrollY)}px`)
      setPlaced(true)
    }
    place()
    // The first plate can settle after it mounts (a demo sizes itself once it knows its room), so it
    // is watched too.
    const observer = new ResizeObserver(place)
    observer.observe(panel)
    const first = plateList()[0]
    if (first) observer.observe(first)
    first?.querySelectorAll(".media-demo-stage").forEach((stage) => observer.observe(stage))
    return () => observer.disconnect()
  }, [gallery, leaving])

  useEffect(() => {
    if (!gallery) return
    const list = plateList()
    setPlates({ at: 0, total: list.length })
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setPlates({ at: list.indexOf(entry.target as HTMLElement), total: list.length })
      }
    }, { root: scroller.current, threshold: 0.6 })
    list.forEach((plate) => observer.observe(plate))
    return () => observer.disconnect()
  }, [gallery])
  // The buttons move a plate at a time; the wheel and trackpad scroll freely, with no snapping.
  const toPlate = (k: number) => plateList()[k]?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })
  const [leadId, ...aliases] = leadIds
  const anchors = aliases.map((id) => <span key={id} id={id} />)
  // The answer: the description, the facts, then each section in turn.
  // The media toggle sits right after the description, arriving when the description has.
  const mediaToggle = hasMedia && !boring ? (
    <div className="work-actions">
      <button type="button" className="preview-close media-toggle" aria-expanded={gallery} onClick={gallery ? closeGallery : openGallery}>
        {gallery ? "Hide media" : "Show media"}
        {galleryIcon}
      </button>
    </div>
  ) : null
  const groups = useMemo<AnswerGroup[]>(() => [
    { id: leadId, className: "answer-lead", paragraphs: lead, control: mediaToggle },
    { className: "answer-facts", head: meta },
    ...sections.map((section) => ({ id: section.id, head: <h2>{section.title}</h2>, paragraphs: section.paragraphs, tail: section.tail })),
    // The toggle's label follows the gallery's state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [leadId, lead, meta, sections, hasMedia, boring, gallery, closeGallery, openGallery])

  if (boring) {
    return (
      <div className="split">
        <StickyColumn>
          {head}
          {anchors}
          <AnswerStream id={slug} groups={groups} instant />
        </StickyColumn>
        <div className="split-media">{hasMedia ? mediaItems : media}</div>
      </div>
    )
  }

  // What follows the answer: a project with no media shows its placeholder here instead.
  const after = hasMedia ? null : <div className="answer-media">{media}</div>

  return (
    <div className={["work-stage", gallery && hasMedia && "galleried", wide && "wide", leaving && "leaving", arriving && "arriving", placed && "placed"].filter(Boolean).join(" ")} data-project={slug}>
      <article className="column">
        {head}
        {anchors}
        <AnswerStream id={slug} groups={groups}>{after}</AnswerStream>
        <ProjectChat slug={slug} names={names} careers={careers} hasImages={hasMedia} onImages={openGallery} />
      </article>
      {gallery && hasMedia ? (
        <>
          <button type="button" className="sheet-scrim" aria-label="Hide media" onClick={closeGallery} />
          <aside className="gallery" aria-label="Media">
            <div className="gallery-bar">
              {plates.total > 1 ? (
                <>
                  <p className="gallery-count" aria-live="polite">{plates.at + 1} / {plates.total}</p>
                  <button type="button" className="gallery-step" onClick={() => toPlate(plates.at - 1)} disabled={plates.at === 0} aria-label="Previous">
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 7.5L6 4l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button type="button" className="gallery-step" onClick={() => toPlate(plates.at + 1)} disabled={plates.at === plates.total - 1} aria-label="Next">
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </>
              ) : null}
              <button type="button" className="preview-close" onClick={closeGallery} aria-label="Hide media">
                Close
                <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {/* One plate to a page: a scroll moves to the next. Only the plates scroll, never the bar above. */}
            <div className="gallery-scroll" ref={scroller}>{mediaItems}</div>
          </aside>
        </>
      ) : null}
    </div>
  )
}
