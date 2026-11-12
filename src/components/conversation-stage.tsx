"use client"

import { track } from "@vercel/analytics"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import type { CareerEntry } from "@/src/content/career"
import type { Image as MediaImage } from "@/src/content/schema"
import { LoadingImage } from "@/src/plates/loading-image"
import { TimelineModal, desktopTimeline, phoneTimeline } from "./timeline-modal"
import { Travel } from "@/src/globe/travel"
import type { GlobePlace } from "@/src/globe/types"
import { Grain } from "@/src/plates/grain"
import { chatAnswer } from "./chat-answer"
import { IntroStream } from "./intro-stream"
import { StarterPrompts, askHere } from "./starter-prompts"
import { ChatThread, readLines, HOME_CHAT, HOME_PREVIEW, CHAT_CLOSE_PANEL, follow, resetChat, sessionId, type Asker, type Go, type Panel, type ReplyExtra } from "./chat-thread"
import { openTab } from "./project-tabs"
import { holdComposer } from "./composer"

export type ProjectPreview = { slug: string; name: string; summary: string; meta: string; cover: MediaImage | null }

type Picked = { slug: string; list: string[] }
/** What sits beside the chat: a project preview, or a view the answer called for. */
/** only narrows the globe to one kind of place, e.g. the places lived. */
type Shown = ({ kind: "project" } & Picked) | { kind: Panel; only?: "lived" }

const SCROLL_KEY = "home-chat-scroll"
const WELCOME = ["Welcome, how can I help you?", "One craft, many mediums. Every project starts with one core idea and time spent inside the problem."]
const GREETING_TEXT = "min-h-0 max-w-none text-[18px] leading-[26px] tracking-[-0.01em]"
/** How long the greeting fades before the exchange takes its place. Matches --motion-page. */
const HANDOFF_MS = 320
/** How long the chat takes to slide aside for a preview. Matches --motion-slide. */
const SLIDE_MS = 640

/**
 * The empty conversation is already the thread, in three groups: the welcome, the composer, and
 * the quick start. The welcome streams in, then the composer and quick start take their place.
 * Remounting (a new conversation) plays it again.
 */
function Opening({ slotRef, leaving }: { slotRef: RefObject<HTMLDivElement | null>; leaving: boolean }) {
  const [finished, setFinished] = useState(false)
  const [ready, setReady] = useState(false)
  const finish = useCallback(() => setFinished(true), [])

  useEffect(() => {
    if (!finished) return
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    const hold = window.setTimeout(() => setReady(true), reduce ? 0 : HANDOFF_MS)
    return () => window.clearTimeout(hold)
  }, [finished])

  // The composer lives in the page chrome. Keep it out of reach until it is on screen.
  useEffect(() => {
    holdComposer(!ready)
    return () => holdComposer(false)
  }, [ready])

  return (
    <div className={leaving ? "conv-empty ready leaving" : ready ? "conv-empty ready" : "conv-empty"}>
      <div className="opening-group opening-welcome">
        <IntroStream id="home-welcome" paragraphs={WELCOME} remember={false} heading textClassName={GREETING_TEXT} tint={false} emphasis={0} onDone={finish} />
      </div>
      <div className="opening-group opening-composer">
        <div className="composer-slot" ref={slotRef} aria-hidden="true" />
      </div>
      <div className="opening-group quick">
        <p className="quick-label">Quick start</p>
        <StarterPrompts className="quick-links" onPick={askHere} />
      </div>
    </div>
  )
}


function readShown(): Shown | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(HOME_PREVIEW) ?? "null") as Partial<Shown & Picked> | null
    if (!parsed) return null
    if (parsed.kind === "globe" || parsed.kind === "timeline") return { kind: parsed.kind }
    return typeof parsed.slug === "string" && Array.isArray(parsed.list) ? { kind: "project", slug: parsed.slug, list: parsed.list } : null
  } catch {
    return null
  }
}

function keepShown(picked: Shown | null) {
  try {
    if (picked) sessionStorage.setItem(HOME_PREVIEW, JSON.stringify(picked))
    else sessionStorage.removeItem(HOME_PREVIEW)
  } catch {
    // The preview still shows, it just is not restored.
  }
}

/**
 * The main conversation. Work questions come back as a list of project names; picking one moves
 * the chat left and previews the project beside it (a bottom sheet on phones), with previous and
 * next following the list the chat gave. "Open full project" opens it in a tab.
 */
export function ConversationStage({ previews, places, timeline, careers }: { previews: ProjectPreview[]; places: GlobePlace[]; timeline: { desktop: string; mobile: string }; careers: CareerEntry[] }) {
  const router = useRouter()
  const bySlug = useRef(new Map(previews.map((item) => [item.slug, item])))
  const byRole = useRef(Object.fromEntries(careers.map((item) => [item.id, item])))
  const names = useRef(Object.fromEntries(previews.map((item) => [item.slug, item.name])))
  const [shown, setShownState] = useState<Shown | null>(null)
  const [active, setActive] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [arrive, setArrive] = useState(false)
  const slotRef = useRef<HTMLDivElement>(null)
  const onActive = useCallback((next: boolean, restored: boolean) => {
    setActive(next)
    if (!next) {
      setReveal(false)
      setArrive(false)
      return
    }
    // A conversation already in this session is shown at once. A new question fades the greeting first.
    if (restored) setReveal(true)
  }, [])

  useEffect(() => {
    if (!active || reveal) return
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    const hold = window.setTimeout(() => {
      setReveal(true)
      setArrive(true)
    }, reduce ? 0 : HANDOFF_MS)
    return () => window.clearTimeout(hold)
  }, [active, reveal])

  // Before the first question the composer sits under the welcome, in a slot its own height.
  // It stays there while the greeting fades, then returns to the bottom once the exchange is shown.
  const docked = !active || !reveal
  useEffect(() => {
    const slot = slotRef.current
    if (!docked || !slot) return
    const root = document.documentElement
    const shell = document.querySelector<HTMLElement>(".hero-work .shell")
    const place = () => {
      if (shell) root.style.setProperty("--composer-h", `${shell.offsetHeight}px`)
      root.style.setProperty("--empty-bottom", `${Math.round(slot.getBoundingClientRect().top)}px`)
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(slot)
    // The welcome above the slot can change height (streaming, fonts, wrapping), which moves it.
    const opening = slot.closest(".conv-empty")
    if (opening) observer.observe(opening)
    if (slot.parentElement) observer.observe(slot.parentElement)
    if (shell) observer.observe(shell)
    window.addEventListener("resize", place)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", place)
      root.style.removeProperty("--empty-bottom")
      root.style.removeProperty("--composer-h")
    }
  }, [docked])
  const picked = shown?.kind === "project" ? shown : null
  // Read when a question is sent, so the server knows which project "that" means.
  const openRef = useRef<string | undefined>(undefined)
  openRef.current = picked?.slug

  const setShown = useCallback((next: Shown | null) => {
    setShownState(next)
    keepShown(next)
  }, [])
  const setPicked = useCallback((next: Picked | null) => setShown(next ? { kind: "project", ...next } : null), [setShown])

  // Come back to the conversation as it was left: the open preview and the scroll position.
  useEffect(() => {
    const saved = readShown()
    if (saved && (saved.kind !== "project" || bySlug.current.has(saved.slug))) setShownState(saved)
    let y = 0
    try {
      y = Number(sessionStorage.getItem(SCROLL_KEY) ?? 0)
    } catch {
      // Starts at the top.
    }
    const restore = window.setTimeout(() => window.scrollTo(0, y), 60)
    const save = () => {
      try {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
      } catch {
        // Not kept.
      }
    }
    // Saved as the visitor scrolls: by the time the page unmounts, navigation has already reset it.
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(save)
    }
    const started = window.setTimeout(() => window.addEventListener("scroll", onScroll, { passive: true }), 120)
    return () => {
      window.clearTimeout(restore)
      window.clearTimeout(started)
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  useEffect(() => {
    const onClose = () => setShown(null)
    window.addEventListener(CHAT_CLOSE_PANEL, onClose)
    return () => window.removeEventListener(CHAT_CLOSE_PANEL, onClose)
  }, [setShown])

  useEffect(() => {
    if (!shown) return
    const onKey = (event: KeyboardEvent) => {
      // Escape in the expanded timeline closes only that window; the panel under it stays.
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) setShown(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [shown, setShown])

  const ask: Asker = useCallback(
    async (q: string, last?: ReplyExtra, more?) => {
      try {
        const response = await fetch("/api/ask/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q, sessionId: sessionId(), expects: last?.expects, listed: last?.projects, open: openRef.current, history: more?.history }),
        })
        type Reply = { answer?: string; error?: string; go?: Go } & ReplyExtra
        // An answer the model works on streams its status first, one JSON line at a time.
        const data = response.headers.get("content-type")?.includes("ndjson") ? await readLines<Reply>(response, more?.onStatus) : ((await response.json()) as Reply)
        const projects = data.projects?.filter((slug) => bySlug.current.has(slug))
        if (projects?.length === 1) setPicked({ slug: projects[0], list: projects })
        if (data.panel === "globe" || data.panel === "timeline") setShown({ kind: data.panel, only: data.placeKind })
        if (data.go) follow(data.go, q, router)
        const roles = data.roles?.filter((id) => id in byRole.current)
        return { answer: data.answer ?? data.error ?? "Something went wrong. Try asking again.", projects, roles, expects: data.expects, panel: data.panel, followUps: data.followUps, contact: data.contact, source: data.source, sources: data.sources, nudge: data.nudge, placeKind: data.placeKind }
      } catch {
        return "The site couldn't be reached just now. Try asking again."
      }
    },
    [router, setPicked, setShown],
  )

  const pick = (slug: string, list: string[]) => {
    setPicked({ slug, list })
    track("project_previewed", { slug })
  }

  const preview = picked ? bySlug.current.get(picked.slug) : undefined
  const at = picked ? picked.list.indexOf(picked.slug) : -1
  const previous = picked && at > 0 ? picked.list[at - 1] : null
  const next = picked && at >= 0 && at < picked.list.length - 1 ? picked.list[at + 1] : null

  const openFull = (slug: string) => {
    openTab(slug)
    track("project_opened_from_chat", { slug })
    router.push(`/work/${slug}`)
  }

  const [expanded, setExpanded] = useState(false)
  const expand = () => {
    track("view_opened_from_chat", { panel: "timeline" })
    setExpanded(true)
  }

  const close = () => setShown(null)
  const panel = shown && shown.kind !== "project" ? shown.kind : null
  // An answer about places lived shows only those; home always stays.
  const livedOnly = shown?.kind === "globe" && shown.only === "lived"
  const globePlaces = livedOnly ? places.filter((place) => place.kind === "lived" || place.home) : places
  const open = !!preview || !!panel
  // The chat slides left first. What comes in on the right lands once the slide is 90% done, so its
  // own entrance (the fade, the globe drawing on, the timeline growing) plays where it can be seen.
  // Phones have nothing to slide: the sheet rises at once.
  const [landed, setLanded] = useState(false)
  if (!open && landed) setLanded(false)
  useEffect(() => {
    if (!open || landed) return
    const still = matchMedia("(max-width: 768px), (prefers-reduced-motion: reduce)").matches
    const timer = window.setTimeout(() => setLanded(true), still ? 0 : SLIDE_MS * 0.9)
    return () => window.clearTimeout(timer)
  }, [open, landed])

  const chevron = (direction: "left" | "right") => (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d={direction === "left" ? "M7.5 2.5L4 6l3.5 3.5" : "M4.5 2.5L8 6l-3.5 3.5"} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  const closeButton = (onClose: () => void) => (
    <button type="button" className="preview-close" onClick={onClose} aria-label="Close preview">
      Close
      <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </button>
  )

  // The one conversation clears and starts again; project tabs keep their own quick threads.
  const startOver = () => {
    setShown(null)
    resetChat(HOME_CHAT)
    try {
      sessionStorage.removeItem(SCROLL_KEY)
    } catch {
      // Not kept.
    }
    window.scrollTo(0, 0)
  }

  return (
    <div className={open ? `conv previewing${panel ? ` showing-${panel}` : ""}` : "conv"}>
      <div className="conv-chat">
        {active && reveal ? (
          <div className="conv-tools">
            <button type="button" className="btn ghost with-icon" onClick={startOver} aria-label="New chat">
              <span className="label">New chat</span>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : (
          <Opening slotRef={slotRef} leaving={active && !reveal} />
        )}
        <ChatThread
          storeKey={HOME_CHAT}
          ask={ask}
          label="Conversation about the work"
          onActive={onActive}
          hold={active && !reveal}
          concealed={!reveal}
          tint={false}
          arrive={arrive}
          renderAnswer={(turn) =>
            chatAnswer({ turn, names: names.current, careers: byRole.current, onProject: pick, onPanel: (kind, only) => setShown({ kind, only }), current: picked?.slug ?? panel ?? undefined })
          }
        />
      </div>
      <TimelineModal open={expanded} onClose={() => setExpanded(false)} desktop={timeline.desktop} mobile={timeline.mobile} />
      {panel && landed ? (
        <>
          <button type="button" className="sheet-scrim" aria-label="Close preview" onClick={close} />
          <aside className={`preview view-${panel}`} aria-label={panel === "globe" ? "Places" : "Career timeline"}>
            {/* The bar comes first so that, when the row is too narrow for both, it wraps above the info. */}
            <header className="preview-head">
              <div className="preview-bar">
                {panel === "timeline" ? (
                  <button type="button" className="icon-btn expand" onClick={expand} aria-label="Expand the timeline">
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M7 1.5h3.5V5M5 10.5H1.5V7M10.5 1.5L7 5M1.5 10.5L5 7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : null}
                {closeButton(close)}
              </div>
              <div className="preview-info">
                <h2>{panel === "globe" ? "Places" : "Career"}</h2>
                <p className="summary">{panel === "globe" ? (livedOnly ? "Places lived. Drag the globe to turn it." : "Places lived and travelled. Drag the globe to turn it.") : "Each role and the projects under it, from 2019 to now."}</p>
              </div>
            </header>
            <div className="frame">
              {panel === "globe" ? <Travel key={livedOnly ? "lived" : "all"} places={globePlaces} fit="panel" /> : (
                <>
                  <div className="panel-timeline desk" ref={desktopTimeline} dangerouslySetInnerHTML={{ __html: timeline.desktop }} />
                  <div className="panel-timeline phone" ref={phoneTimeline} dangerouslySetInnerHTML={{ __html: timeline.mobile }} />
                </>
              )}
            </div>
          </aside>
        </>
      ) : null}
      {preview && landed ? (
        <>
          <button type="button" className="sheet-scrim" aria-label="Close preview" onClick={() => setPicked(null)} />
          <aside className="preview" aria-label={`${preview.name} preview`}>
            <header className="preview-head">
              <div className="preview-bar">
                <button type="button" className="icon-btn prev" onClick={() => previous && pick(previous, picked?.list ?? [])} disabled={!previous} aria-label="Previous project">
                  {chevron("left")}
                </button>
                <button type="button" className="icon-btn next" onClick={() => next && pick(next, picked?.list ?? [])} disabled={!next} aria-label="Next project">
                  {chevron("right")}
                </button>
                {closeButton(() => setPicked(null))}
              </div>
              <div className="preview-info">
                <h2>{preview.name}</h2>
                {preview.meta ? <p className="meta">{preview.meta}</p> : null}
                <p className="summary">{preview.summary}</p>
              </div>
            </header>
            {preview.cover ? (
              <figure className="frame">
                <LoadingImage
                  key={preview.slug}
                  src={preview.cover.src}
                  alt={preview.cover.alt}
                  width={preview.cover.width}
                  height={preview.cover.height}
                  sizes="(max-width: 768px) 100vw, 560px"
                  fit="fill"
                />
              </figure>
            ) : (
              <figure className="frame">
                <Grain key={preview.slug} slug={preview.slug} label={preview.name} />
              </figure>
            )}
            <footer className="preview-foot">
              <button type="button" className="btn primary with-chevron open" onClick={() => openFull(preview.slug)}>
                Open full project
                {chevron("right")}
              </button>
            </footer>
          </aside>
        </>
      ) : null}
    </div>
  )
}
