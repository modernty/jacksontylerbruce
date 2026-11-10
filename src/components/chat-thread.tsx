"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { MessagePair } from "@/src/components/assistant-ui/elements/message-pair"

/** The composer sends this on pages that hold a conversation, instead of routing to another view. */
export const CHAT_ASK = "chat:ask"
/** Clears one conversation, named by its store key, so it starts again empty. */
export const CHAT_RESET = "chat:reset"

/** Empties a conversation and tells its thread to start over. */
export function resetChat(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Nothing kept to clear.
  }
  window.dispatchEvent(new CustomEvent(CHAT_RESET, { detail: key }))
}

const WORD_MS = 45
const WAITING = "…"

/** Extra structure a reply can carry: project slugs to list, and what the reply asked the visitor for. */
/** What a reply opens beside the chat besides projects: the globe or the timeline. */
export type Panel = "globe" | "timeline"
export type ReplyExtra = { projects?: string[]; roles?: string[]; expects?: "category"; panel?: Panel }

type Turn = { id: number; question: string; words: string[]; shown: number; pending: boolean } & ReplyExtra

/**
 * Each conversation lives in session storage while the tab is open, so it survives switching
 * views, reloading and visiting other pages. Text only, capped, so it stays small.
 */
type Stored = { id: number; question: string; answer: string | null } & ReplyExtra
const MAX_TURNS = 50

function load(key: string): Stored[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]")
    return Array.isArray(parsed)
      ? parsed
        .filter((item): item is Stored => typeof item?.id === "number" && typeof item?.question === "string" && (typeof item?.answer === "string" || item?.answer === null))
        .map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          projects: Array.isArray(item.projects) ? item.projects.filter((slug): slug is string => typeof slug === "string") : undefined,
          expects: item.expects === "category" ? "category" : undefined,
          panel: item.panel === "globe" || item.panel === "timeline" ? item.panel : undefined,
          roles: Array.isArray(item.roles) ? item.roles.filter((id): id is string => typeof id === "string") : undefined,
        }))
      : []
  } catch {
    return []
  }
}

/** Saves one turn by id. It reads storage fresh, so an answer that lands after the view has switched is still kept. */
function record(key: string, turn: Stored) {
  try {
    const rest = load(key).filter((item) => item.id !== turn.id)
    const next = [...rest, turn].sort((a, b) => a.id - b.id).slice(-MAX_TURNS)
    sessionStorage.setItem(key, JSON.stringify(next))
  } catch {
    // Storage full or blocked: the conversation still works, it just is not kept.
  }
}

export function sessionId(): string {
  const key = "ask-session"
  try {
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const next = crypto.randomUUID()
    sessionStorage.setItem(key, next)
    return next
  } catch {
    return "anonymous"
  }
}

/** Answers one question. `last` is what the previous reply asked for, so a short answer like "brand" reads in context. */
export type Asker = (question: string, last?: ReplyExtra) => Promise<string | ({ answer: string } & ReplyExtra)>

/** Where a reply sends the visitor. handoff continues on About; chat continues in the main conversation. */
export type Go = { href: string; handoff?: boolean; chat?: boolean }

const ABOUT_CHAT = "about-chat"
/** The main conversation, at /chat. */
export const HOME_CHAT = "home-chat"
export const ABOUT_OPEN = "about-chat-open"
const MOVE_MS = 700

/** Leaves a question unanswered in a conversation, which answers it when its page opens. */
export function handOff(key: string, question: string) {
  const id = load(key).reduce((max, item) => Math.max(max, item.id + 1), 0)
  record(key, { id, question, answer: null })
}

/** Leaves a question unanswered in the About conversation, which answers it when the page opens. */
export function handOffToAbout(question: string) {
  handOff(ABOUT_CHAT, question)
  try {
    sessionStorage.setItem(ABOUT_OPEN, "1")
  } catch {
    // The conversation opens by default.
  }
}

/** Moves on once the reply has started, so the visitor sees why the page is changing. */
export function follow(go: Go, question: string, router: { push: (href: string) => void; back: () => void }) {
  if (go.handoff) handOffToAbout(question)
  if (go.chat) handOff(HOME_CHAT, question)
  window.setTimeout(() => (go.href === "back" ? router.back() : router.push(go.href)), MOVE_MS)
}

/** Posts JSON and reads one text field from the reply, with plain-language failures. */
export async function askJson(url: string, body: Record<string, unknown>, field: string, onReply?: (data: Record<string, unknown>) => void): Promise<string> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, sessionId: sessionId() }),
    })
    const data = (await response.json()) as Record<string, unknown>
    onReply?.(data)
    const text = data[field] ?? data.error
    return typeof text === "string" && text ? text : "Something went wrong. Try asking again."
  } catch {
    return "I couldn't reach the site just now. Try asking again."
  }
}

/**
 * One conversation, one Message pair per turn. It takes questions from the composer, answers
 * them with `ask`, and keeps them under `storeKey` for the session. `onActive` reports whether
 * there is a conversation yet, so a page can change layout once one starts.
 */
export function ChatThread({
  storeKey,
  ask,
  label,
  onActive,
  after,
  renderAnswer,
}: {
  storeKey: string
  ask: Asker
  label: string
  onActive?: (active: boolean) => void
  /** Renders under a finished answer, from the structure the reply carried. */
  after?: (turn: { id: number } & ReplyExtra) => ReactNode
  /** Renders a finished answer in place of its plain words, e.g. with project names as links. */
  renderAnswer?: (turn: { id: number; answer: string } & ReplyExtra) => ReactNode
}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const nextId = useRef(0)
  const last = useRef<HTMLDivElement>(null)
  const reduce = useRef(false)
  const restoring = useRef(true)

  const run = useCallback(
    async (id: number, question: string) => {
      record(storeKey, { id, question, answer: null })
      setTurns((all) => all.map((turn) => (turn.id === id ? { ...turn, words: [WAITING], shown: 1, pending: true } : turn)))
      const previous = load(storeKey).filter((item) => item.id < id && item.answer !== null).pop()
      const reply = await ask(question, previous ? { projects: previous.projects, expects: previous.expects } : undefined)
      const { answer, projects, roles, expects, panel } = typeof reply === "string" ? { answer: reply, projects: undefined, roles: undefined, expects: undefined, panel: undefined } : reply
      record(storeKey, { id, question, answer, projects, roles, expects, panel })
      const words = answer.split(/\s+/).filter(Boolean)
      setTurns((all) => all.map((turn) => (turn.id === id ? { ...turn, words, shown: reduce.current ? words.length : 0, pending: false, projects, roles, expects, panel } : turn)))
    },
    [storeKey, ask],
  )

  useEffect(() => {
    reduce.current = matchMedia("(prefers-reduced-motion: reduce)").matches
    // Bring back the conversation as it stood, without replaying the reveal.
    const stored = load(storeKey)
    nextId.current = stored.reduce((max, item) => Math.max(max, item.id + 1), 0)
    setTurns(stored.map((item) => {
      const words = item.answer ? item.answer.split(/\s+/).filter(Boolean) : []
      return { id: item.id, question: item.question, words, shown: words.length, pending: item.answer === null, projects: item.projects, roles: item.roles, expects: item.expects, panel: item.panel }
    }))
    for (const item of stored) if (item.answer === null) void run(item.id, item.question)

    const onAsk = (event: Event) => {
      const question = (event as CustomEvent<string>).detail.trim()
      if (!question) return
      restoring.current = false
      const id = nextId.current++
      setTurns((all) => [...all, { id, question, words: [], shown: 0, pending: true }])
      void run(id, question)
    }
    const onReset = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== storeKey) return
      nextId.current = 0
      setTurns([])
    }
    window.addEventListener(CHAT_ASK, onAsk)
    window.addEventListener(CHAT_RESET, onReset)
    return () => {
      window.removeEventListener(CHAT_ASK, onAsk)
      window.removeEventListener(CHAT_RESET, onReset)
    }
  }, [run, storeKey])

  const active = turns.length > 0
  useEffect(() => {
    onActive?.(active)
  }, [active, onActive])

  const revealing = turns.some((turn) => !turn.pending && turn.shown < turn.words.length)
  useEffect(() => {
    if (!revealing) return
    const timer = window.setInterval(() => {
      setTurns((all) => all.map((turn) => (!turn.pending && turn.shown < turn.words.length ? { ...turn, shown: turn.shown + 1 } : turn)))
    }, WORD_MS)
    return () => window.clearInterval(timer)
  }, [revealing])

  // Keep the newest turn above the composer: when it is added, when its answer arrives, and once it has fully revealed.
  const newest = turns[turns.length - 1]
  const stage = newest ? `${turns.length}:${newest.pending}:${newest.shown >= newest.words.length}` : ""
  useEffect(() => {
    // A restored conversation waits where it is; only new questions pull the page down.
    if (restoring.current) return
    if (stage) last.current?.scrollIntoView({ behavior: reduce.current ? "auto" : "smooth", block: "end" })
  }, [stage])

  if (turns.length === 0) return null
  return (
    <section className="chat" aria-label={label} aria-live="polite">
      {turns.map((turn, index) => (
        <div key={turn.id} ref={index === turns.length - 1 ? last : undefined}>
          <MessagePair
            userMessage={turn.question}
            words={turn.words}
            visibleWords={turn.shown}
            streaming={turn.pending || turn.shown < turn.words.length}
            className="max-w-none gap-4 text-[15px]"
            onCopy={turn.pending ? undefined : () => void navigator.clipboard?.writeText(turn.words.join(" "))}
            onRegenerate={turn.pending ? undefined : () => void run(turn.id, turn.question)}
            final={renderAnswer && !turn.pending ? renderAnswer({ id: turn.id, answer: turn.words.join(" "), projects: turn.projects, roles: turn.roles, expects: turn.expects, panel: turn.panel }) : undefined}
          />
          {after && !turn.pending && turn.shown >= turn.words.length ? after(turn) : null}
        </div>
      ))}
    </section>
  )
}
