"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { MessagePair } from "@/src/components/assistant-ui/elements/message-pair"
import { CONTACT_EVENT } from "./mailto"

/** The composer sends this on pages that hold a conversation, instead of routing to another view. */
export const CHAT_ASK = "chat:ask"
/** Clears one conversation, named by its store key, so it starts again empty. */
export const CHAT_RESET = "chat:reset"
/** Closes the panel beside the home chat. The conversation stays. */
export const CHAT_CLOSE_PANEL = "chat:close-panel"
export const HOME_PREVIEW = "home-chat-preview"

/** Drops the open preview and tells the chat, if it is on screen, to close it. */
export function closeHomePanel() {
  try {
    sessionStorage.removeItem(HOME_PREVIEW)
  } catch {
    // The panel still closes on this page.
  }
  window.dispatchEvent(new Event(CHAT_CLOSE_PANEL))
}

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
/** followUps are suggested next prompts, in the visitor's words; contact adds the contact link. */
/** source says who answered (the site, or the model for a question outside it); sources are pages it cites; nudge shows the note about general questions. */
export type ReplyExtra = { projects?: string[]; roles?: string[]; expects?: "category"; panel?: Panel; followUps?: string[]; contact?: boolean; source?: "site" | "open" | "work"; sources?: { title: string; url: string }[]; nudge?: boolean; placeKind?: "lived" }

/** What the model is doing while an answer is on its way. */
export type Status = "thinking" | "searching" | "reading"
const STATUS_LABEL: Record<Status, string> = { thinking: "Thinking", searching: "Searching the web", reading: "Reading the work" }

/** One earlier exchange, sent with a question so a follow-up reads in context. */
export type Past = { q: string; a: string; source?: "site" | "open" | "work" }
const HISTORY_TURNS = 6

type Turn = { id: number; question: string; words: string[]; shown: number; pending: boolean; status?: Status } & ReplyExtra

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
          followUps: Array.isArray(item.followUps) ? item.followUps.filter((text): text is string => typeof text === "string").slice(0, 3) : undefined,
          contact: item.contact === true ? true : undefined,
          source: item.source === "open" || item.source === "site" || item.source === "work" ? item.source : undefined,
          sources: Array.isArray(item.sources)
            ? item.sources.filter((entry) => typeof entry?.title === "string" && typeof entry?.url === "string" && entry.url.startsWith("https://")).slice(0, 3)
            : undefined,
          nudge: item.nudge === true ? true : undefined,
          placeKind: item.placeKind === "lived" ? "lived" : undefined,
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
export type Asker = (question: string, last?: ReplyExtra, more?: { history: Past[]; onStatus: (status: Status) => void }) => Promise<string | ({ answer: string } & ReplyExtra)>

/** Where a reply sends the visitor. handoff and chat both carry the question into the main conversation. */
export type Go = { href: string; handoff?: boolean; chat?: boolean }

/** The main conversation, at /chat. */
export const HOME_CHAT = "home-chat"
const MOVE_MS = 700

/** Leaves a question unanswered in a conversation, which answers it when its page opens. */
export function handOff(key: string, question: string) {
  const id = load(key).reduce((max, item) => Math.max(max, item.id + 1), 0)
  record(key, { id, question, answer: null })
}

/** Moves on once the reply has started, so the visitor sees why the page is changing. */
export function follow(go: Go, question: string, router: { push: (href: string) => void; back: () => void }) {
  if (go.handoff || go.chat) handOff(HOME_CHAT, question)
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
    return "The site couldn't be reached just now. Try asking again."
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
  hold = false,
  tint = true,
  arrive = false,
  concealed = false,
}: {
  storeKey: string
  ask: Asker
  label: string
  /** `restored` is true when the turns were already in this session, not just sent. */
  onActive?: (active: boolean, restored: boolean) => void
  /** Keep the answer from streaming, and the thread out of sight, until the handoff is ready. */
  hold?: boolean
  /** Fresh answer words arrive in their final colour instead of settling from a light tint. */
  tint?: boolean
  /** Fade the thread in once, when it takes the greeting's place. */
  arrive?: boolean
  /** Hide the thread until the greeting has faded, including the frame before the handoff starts. */
  concealed?: boolean
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
  const restored = useRef(false)
  const seen = useRef(false)

  const run = useCallback(
    async (id: number, question: string) => {
      record(storeKey, { id, question, answer: null })
      setTurns((all) => all.map((turn) => (turn.id === id ? { ...turn, words: [WAITING], shown: 1, pending: true } : turn)))
      const answered = load(storeKey).filter((item) => item.id < id && item.answer !== null)
      const previous = answered[answered.length - 1]
      const history: Past[] = answered.slice(-HISTORY_TURNS).map((item) => ({ q: item.question.slice(0, 400), a: (item.answer ?? "").slice(0, 4000), source: item.source }))
      const onStatus = (status: Status) => setTurns((all) => all.map((turn) => (turn.id === id && turn.pending ? { ...turn, status } : turn)))
      const reply = await ask(question, previous ? { projects: previous.projects, expects: previous.expects } : undefined, { history, onStatus })
      const { answer, ...extra }: { answer: string } & ReplyExtra = typeof reply === "string" ? { answer: reply } : reply
      record(storeKey, { id, question, answer, ...extra })
      const words = answer.split(/\s+/).filter(Boolean)
      setTurns((all) => all.map((turn) => (turn.id === id ? { id, question, words, shown: reduce.current ? words.length : 0, pending: false, ...extra } : turn)))
    },
    [storeKey, ask],
  )

  useEffect(() => {
    reduce.current = matchMedia("(prefers-reduced-motion: reduce)").matches
    // Bring back the conversation as it stood, without replaying the reveal.
    const stored = load(storeKey)
    restored.current = stored.length > 0
    nextId.current = stored.reduce((max, item) => Math.max(max, item.id + 1), 0)
    setTurns(stored.map((item) => {
      const words = item.answer ? item.answer.split(/\s+/).filter(Boolean) : []
      return { id: item.id, question: item.question, words, shown: words.length, pending: item.answer === null, projects: item.projects, roles: item.roles, expects: item.expects, panel: item.panel, followUps: item.followUps, contact: item.contact, source: item.source, sources: item.sources, nudge: item.nudge, placeKind: item.placeKind }
    }))
    for (const item of stored) if (item.answer === null) void run(item.id, item.question)

    const onAsk = (event: Event) => {
      const question = (event as CustomEvent<string>).detail.trim()
      if (!question) return
      restoring.current = false
      restored.current = false
      const id = nextId.current++
      setTurns((all) => [...all, { id, question, words: [], shown: 0, pending: true }])
      void run(id, question)
    }
    const onReset = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== storeKey) return
      nextId.current = 0
      restored.current = false
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
    onActive?.(active, restored.current)
  }, [active, onActive])

  const revealing = turns.some((turn) => !turn.pending && turn.shown < turn.words.length)
  useEffect(() => {
    if (!revealing || hold || concealed) return
    const timer = window.setInterval(() => {
      setTurns((all) => all.map((turn) => (!turn.pending && turn.shown < turn.words.length ? { ...turn, shown: turn.shown + 1 } : turn)))
    }, WORD_MS)
    return () => window.clearInterval(timer)
  }, [revealing, hold, concealed])

  // Keep the newest turn above the composer: when it is added, when its answer arrives, and once it has fully revealed.
  const newest = turns[turns.length - 1]
  const stage = newest ? `${turns.length}:${newest.pending}:${newest.shown >= newest.words.length}` : ""
  useEffect(() => {
    // A restored conversation waits where it is; only new questions pull the page down.
    // The first message stays at the top of the feed while its answer streams in underneath.
    if (hold || concealed || turns.length === 0) return
    if (!seen.current) {
      seen.current = true
      if (storeKey === HOME_CHAT && !restoring.current) window.scrollTo(0, 0)
      return
    }
    if (restoring.current) return
    if (storeKey === HOME_CHAT && turns.length < 2) return
    if (stage) last.current?.scrollIntoView({ behavior: reduce.current ? "auto" : "smooth", block: "end" })
  }, [stage, hold, concealed, turns.length])
  useEffect(() => {
    if (turns.length === 0) seen.current = false
  }, [turns.length])

  if (turns.length === 0) return null
  return (
    <section className={hold || concealed ? "chat held" : arrive ? "chat arrive" : "chat"} aria-label={label} aria-live="polite">
      {turns.map((turn, index) => (
        <div key={turn.id} ref={index === turns.length - 1 ? last : undefined}>
          <MessagePair
            userMessage={turn.question}
            words={turn.words}
            visibleWords={turn.shown}
            streaming={turn.pending || turn.shown < turn.words.length}
            tint={tint}
            status={turn.pending && turn.status ? STATUS_LABEL[turn.status] : undefined}
            className="max-w-none gap-4 text-[15px]"
            onCopy={turn.pending ? undefined : () => void navigator.clipboard?.writeText(turn.words.join(" "))}
            onRegenerate={turn.pending ? undefined : () => void run(turn.id, turn.question)}
            final={renderAnswer && !turn.pending ? renderAnswer({ id: turn.id, answer: turn.words.join(" "), projects: turn.projects, roles: turn.roles, expects: turn.expects, panel: newestAction(turns, index) ? turn.panel : undefined, placeKind: turn.placeKind }) : undefined}
          />
          {after && !turn.pending && turn.shown >= turn.words.length ? after(turn) : null}
          {!turn.pending && turn.shown >= turn.words.length && turn.sources?.length ? (
            <p className="chat-sources">
              {turn.sources.map((entry) => (
                <a key={entry.url} className="chat-link" href={entry.url} target="_blank" rel="noreferrer noopener">
                  {entry.title}
                </a>
              ))}
            </p>
          ) : null}
          {index === turns.length - 1 && !turn.pending && turn.shown >= turn.words.length && turn.nudge ? (
            <p className="chat-nudge">Yo, use your own subscriptions for general questions.</p>
          ) : null}
          {index === turns.length - 1 && !turn.pending && turn.shown >= turn.words.length && (turn.followUps?.length || turn.contact) ? (
            <section className="follow-ups" aria-label="Follow up">
              <p className="follow-label">Follow up</p>
              <p className="prompts">
              {turn.contact ? (
                <button type="button" onClick={() => window.dispatchEvent(new Event(CONTACT_EVENT))}>
                  Start a conversation
                </button>
              ) : null}
              {turn.followUps?.map((text) => (
                <button key={text} type="button" onClick={() => window.dispatchEvent(new CustomEvent(CHAT_ASK, { detail: text }))}>
                  {text}
                </button>
              ))}
              </p>
            </section>
          ) : null}
        </div>
      ))}
    </section>
  )
}

/**
 * One action at a time: the link that opens a view ("Open globe", "Open timeline") shows only on
 * the newest answer that offers that same view. An older answer keeps its words and loses the link.
 * Different views (the full globe, the lived-only globe, the timeline) each keep their newest link.
 */
function newestAction(turns: { panel?: Panel; placeKind?: "lived" }[], index: number): boolean {
  const turn = turns[index]
  if (!turn.panel) return false
  return !turns.slice(index + 1).some((later) => later.panel === turn.panel && later.placeKind === turn.placeKind)
}

/** Reads a newline-delimited JSON reply: status lines as they arrive, then the reply itself. */
export async function readLines<T>(response: Response, onStatus?: (status: Status) => void): Promise<T> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error("no body")
  const decoder = new TextDecoder()
  let buffer = ""
  let reply: T | null = null
  const take = (line: string) => {
    if (!line.trim()) return
    const data = JSON.parse(line) as { status?: Status; reply?: T }
    if (data.status === "thinking" || data.status === "searching" || data.status === "reading") onStatus?.(data.status)
    if (data.reply) reply = data.reply
  }
  for (;;) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    lines.forEach(take)
    if (done) break
  }
  take(buffer)
  if (!reply) throw new Error("no reply")
  return reply
}
