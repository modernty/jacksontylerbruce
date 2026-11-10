"use client"

import { track } from "@vercel/analytics"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import type { CareerEntry } from "@/src/content/career"
import type { Image as MediaImage } from "@/src/content/schema"
import { Travel } from "@/src/globe/travel"
import type { GlobePlace } from "@/src/globe/types"
import { Grain } from "@/src/plates/grain"
import { CHAT_ASK, ChatThread, HOME_CHAT, follow, resetChat, sessionId, type Asker, type Go, type Panel, type ReplyExtra } from "./chat-thread"
import { openTab } from "./project-tabs"

export type ProjectPreview = { slug: string; name: string; summary: string; meta: string; cover: MediaImage | null }

type Picked = { slug: string; list: string[] }
/** What sits beside the chat: a project preview, or a view the answer called for. */
type Shown = ({ kind: "project" } & Picked) | { kind: Panel }

const PREVIEW_KEY = "home-chat-preview"
const SCROLL_KEY = "home-chat-scroll"
const STARTERS = ["Show me recent projects", "Show me brand work", "Walk me through your career"]

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

function readShown(): Shown | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(PREVIEW_KEY) ?? "null") as Partial<Shown & Picked> | null
    if (!parsed) return null
    if (parsed.kind === "globe" || parsed.kind === "timeline") return { kind: parsed.kind }
    return typeof parsed.slug === "string" && Array.isArray(parsed.list) ? { kind: "project", slug: parsed.slug, list: parsed.list } : null
  } catch {
    return null
  }
}

function keepShown(picked: Shown | null) {
  try {
    if (picked) sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(picked))
    else sessionStorage.removeItem(PREVIEW_KEY)
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
  const byRole = useRef(new Map(careers.map((item) => [item.id, item])))
  const [shown, setShownState] = useState<Shown | null>(null)
  const [active, setActive] = useState(false)
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
    if (!shown) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShown(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [shown, setShown])

  const ask: Asker = useCallback(
    async (q: string, last?: ReplyExtra) => {
      try {
        const response = await fetch("/api/ask/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q, sessionId: sessionId(), expects: last?.expects, listed: last?.projects, open: openRef.current }),
        })
        const data = (await response.json()) as { answer?: string; error?: string; go?: Go } & ReplyExtra
        const projects = data.projects?.filter((slug) => bySlug.current.has(slug))
        if (projects?.length === 1) setPicked({ slug: projects[0], list: projects })
        if (data.panel === "globe" || data.panel === "timeline") setShown({ kind: data.panel })
        if (data.go) follow(data.go, q, router)
        const roles = data.roles?.filter((id) => byRole.current.has(id))
        return { answer: data.answer ?? data.error ?? "Something went wrong. Try asking again.", projects, roles, expects: data.expects, panel: data.panel }
      } catch {
        return "I couldn't reach the site just now. Try asking again."
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
        {active ? (
          <div className="conv-tools">
            <button type="button" className="btn ghost with-icon" onClick={startOver}>
              New conversation
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="conv-empty">
            <h1>What would you like to see?</h1>
            <p className="cards">
              {STARTERS.map((label) => (
                <button key={label} type="button" onClick={() => window.dispatchEvent(new CustomEvent(CHAT_ASK, { detail: label }))}>
                  {label}
                </button>
              ))}
            </p>
          </div>
        )}
        <ChatThread
          storeKey={HOME_CHAT}
          ask={ask}
          label="Conversation about the work"
          onActive={setActive}
          renderAnswer={(turn) => {
            const list = turn.projects ?? []
            const roles = (turn.roles ?? []).flatMap((id) => byRole.current.get(id) ?? [])
            if (roles.length) {
              // Resume style. Two text styles only: the role facts in Medium, the summary in Regular.
              return (
                <>
                  {turn.answer}
                  <ol className="career">
                    {roles.map((role) => {
                      const named = role.projects.flatMap((slug) => bySlug.current.get(slug) ?? [])
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
                                  {named.map((item, index) => (
                                    <span key={item.slug}>
                                      {index ? (index === named.length - 1 ? " and " : ", ") : ""}
                                      <button type="button" className="chat-link" aria-pressed={picked?.slug === item.slug} onClick={() => pick(item.slug, role.projects)}>
                                        {item.name}
                                      </button>
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
                <button key="view" type="button" className="chat-link" aria-pressed={panel === kind} onClick={() => setShown({ kind })}>
                  {kind === "globe" ? "See the globe" : "See the timeline"}
                </button>,
              ]
            }
            if (!list.length) return null
            const names = list.flatMap((slug) => {
              const item = bySlug.current.get(slug)
              return item ? [{ slug, name: item.name }] : []
            })
            const parts: ReactNode[] = []
            let from = 0
            for (const range of linkRanges(turn.answer, names)) {
              parts.push(turn.answer.slice(from, range.start))
              parts.push(
                <button key={range.slug} type="button" className="chat-link" aria-pressed={picked?.slug === range.slug} onClick={() => pick(range.slug, list)}>
                  {turn.answer.slice(range.start, range.end)}
                </button>,
              )
              from = range.end
            }
            parts.push(turn.answer.slice(from))
            return parts
          }}
        />
      </div>
      {panel ? (
        <>
          <button type="button" className="sheet-scrim" aria-label="Close preview" onClick={close} />
          <aside className={`preview view-${panel}`} aria-label={panel === "globe" ? "Places" : "Career timeline"}>
            {closeButton}
            <div className="frame">
              {panel === "globe" ? <Travel places={places} /> : <div className="panel-timeline" dangerouslySetInnerHTML={{ __html: timeline }} />}
            </div>
            <div className="preview-info">
              <h2>{panel === "globe" ? "Places" : "Career"}</h2>
              <p className="summary">{panel === "globe" ? "Where Tyler has lived and travelled. Drag the globe to turn it." : "Each role and the projects under it, from 2019 at the top to now."}</p>
              <div className="preview-actions">
                <button type="button" className="btn with-icon open" onClick={() => openPage(panel === "globe" ? "/about" : "/timeline#axis", panel)}>
                  {panel === "globe" ? "Open About" : "Open the timeline"}
                  {arrow}
                </button>
              </div>
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
              <button type="button" className="btn with-icon open" onClick={() => openFull(preview.slug)}>
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
