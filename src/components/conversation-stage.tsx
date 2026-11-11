"use client"

import { track } from "@vercel/analytics"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import type { CareerEntry } from "@/src/content/career"
import type { Image as MediaImage } from "@/src/content/schema"
import { Travel } from "@/src/globe/travel"
import type { GlobePlace } from "@/src/globe/types"
import { Grain } from "@/src/plates/grain"
import { chatAnswer } from "./chat-answer"
import { IntroStream } from "./intro-stream"
import { StarterPrompts, askHere } from "./starter-prompts"
import { ChatThread, readLines, HOME_CHAT, HOME_PREVIEW, CHAT_CLOSE_PANEL, follow, resetChat, sessionId, type Asker, type Go, type Panel, type ReplyExtra } from "./chat-thread"
import { openTab } from "./project-tabs"

export type ProjectPreview = { slug: string; name: string; summary: string; meta: string; cover: MediaImage | null }

type Picked = { slug: string; list: string[] }
/** What sits beside the chat: a project preview, or a view the answer called for. */
/** only narrows the globe to one kind of place, e.g. the places lived. */
type Shown = ({ kind: "project" } & Picked) | { kind: Panel; only?: "lived" }

const SCROLL_KEY = "home-chat-scroll"
const WELCOME = [
  "Welcome",
  "One craft, many mediums. Every project starts with one core idea and time spent inside the problem.",
  "How can I help you?",
]
/** How long the greeting fades before the exchange takes its place. Matches --motion-page. */
const HANDOFF_MS = 320

/**
 * The empty conversation is already the thread. The greeting streams in, then the composer and
 * the quick-start pills take their place under it. Remounting (a new conversation) plays it again.
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
    const hero = document.querySelector<HTMLElement>(".hero-work")
    if (!hero) return
    if (ready) hero.removeAttribute("inert")
    else hero.setAttribute("inert", "")
    return () => hero.removeAttribute("inert")
  }, [ready])

  return (
    <div className={leaving ? "conv-empty ready leaving" : ready ? "conv-empty ready" : "conv-empty"}>
      <IntroStream
        id="home-welcome"
        paragraphs={WELCOME}
        remember={false}
        heading
        textClassName="min-h-0 max-w-none text-[18px] leading-[26px] tracking-[-0.01em]"
        tint={false}
        emphasis={2}
        onDone={finish}
      />
      <div className="composer-slot" ref={slotRef} aria-hidden="true" />
      <div className="quick">
        <p className="quick-label">Quick start</p>
        <StarterPrompts className="quick-links" links onPick={askHere} />
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
export function ConversationStage({ previews, places, timeline, careers }: { previews: ProjectPreview[]; places: GlobePlace[]; timeline: string; careers: CareerEntry[] }) {
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
    // The title and intro above the slot can change height (fonts, wrapping), which moves it.
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
      if (event.key === "Escape") setShown(null)
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

  const openPage = (href: string, panel: Panel) => {
    track("view_opened_from_chat", { panel })
    router.push(href)
  }

  const close = () => setShown(null)
  const panel = shown && shown.kind !== "project" ? shown.kind : null
  // An answer about places lived shows only those; home always stays.
  const livedOnly = shown?.kind === "globe" && shown.only === "lived"
  const globePlaces = livedOnly ? places.filter((place) => place.kind === "lived" || place.home) : places
  const open = !!preview || !!panel

  const arrow = (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3.5 8.5l5-5M4.5 3.5h4v4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  const closeButton = (
    <button type="button" className="preview-close" onClick={close} aria-label="Close preview">
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
    <div className={open ? "conv previewing" : "conv"}>
      <div className="conv-chat">
        {active && reveal ? (
          <div className="conv-tools">
            <button type="button" className="btn ghost with-icon" onClick={startOver}>
              New chat
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
      {panel ? (
        <>
          <button type="button" className="sheet-scrim" aria-label="Close preview" onClick={close} />
          <aside className={`preview view-${panel}`} aria-label={panel === "globe" ? "Places" : "Career timeline"}>
            {closeButton}
            <div className="frame">
              {panel === "globe" ? <Travel key={livedOnly ? "lived" : "all"} places={globePlaces} fit="panel" /> : <div className="panel-timeline" dangerouslySetInnerHTML={{ __html: timeline }} />}
            </div>
            <div className="preview-info">
              <h2>{panel === "globe" ? "Places" : "Career"}</h2>
              <p className="summary">{panel === "globe" ? (livedOnly ? "Places lived. Drag the globe to turn it." : "Places lived and travelled. Drag the globe to turn it.") : "Each role and the projects under it, from 2019 at the top to now."}</p>
              {/* Places stay in the conversation: the globe has no page of its own to open. */}
              {panel === "timeline" ? (
                <div className="preview-actions">
                  <button type="button" className="btn with-icon open" onClick={() => openPage("/timeline#axis", panel)}>
                    Open the timeline
                    {arrow}
                  </button>
                </div>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
      {preview ? (
        <>
          <button type="button" className="sheet-scrim" aria-label="Close preview" onClick={() => setPicked(null)} />
          <aside className="preview" aria-label={`${preview.name} preview`}>
            <button type="button" className="preview-close" onClick={() => setPicked(null)} aria-label="Close preview">
              Close
              <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
            {preview.cover ? (
              <figure className="frame">
                <Image
                  key={preview.slug}
                  src={preview.cover.src}
                  alt={preview.cover.alt}
                  width={preview.cover.width}
                  height={preview.cover.height}
                  sizes="(max-width: 768px) 100vw, 560px"
                  placeholder="blur"
                  blurDataURL={preview.cover.blur}
                  unoptimized={preview.cover.src.endsWith(".gif")}
                />
              </figure>
            ) : (
              <figure className="frame">
                <Grain key={preview.slug} slug={preview.slug} label={preview.name} />
              </figure>
            )}
            <div className="preview-info">
            <h2>{preview.name}</h2>
            {preview.meta ? <p className="meta">{preview.meta}</p> : null}
            <p className="summary">{preview.summary}</p>
            <div className="preview-actions">
              {previous ? (
                <button type="button" className="btn ghost with-chevron prev" onClick={() => pick(previous, picked?.list ?? [])}>
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M7.5 2.5L4 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Previous project
                </button>
              ) : null}
              <button type="button" className="btn primary with-icon open" onClick={() => openFull(preview.slug)}>
                Open full project
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3.5 8.5l5-5M4.5 3.5h4v4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {next ? (
                <button type="button" className="btn ghost with-chevron next" onClick={() => pick(next, picked?.list ?? [])}>
                  Next project
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M4.5 2.5L8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : null}
            </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  )
}
