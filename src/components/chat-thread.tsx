"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { MessagePair } from "@/src/components/assistant-ui/elements/message-pair"
import { CONTACT_EVENT } from "./mailto"
import { PromptLinks } from "./starter-prompts"

/** The composer sends this on pages that hold a conversation, instead of routing to another view. */
export const CHAT_ASK = "chat:ask"
/** Clears one conversation, named by its store key, so it starts again empty. */
export const CHAT_RESET = "chat:reset"
/** Closes the panel beside the home chat. The conversation stays. */
export const CHAT_CLOSE_PANEL = "chat:close-panel"
/** Stops the answer in flight: what has appeared stays, the rest is dropped. */
export const CHAT_STOP = "chat:stop"
/** Says whether an answer is in flight, so the composer can offer Stop in place of Send. */
export const CHAT_STREAMING = "chat:streaming"
/** Said in place of an answer stopped before any of it arrived. */
const STOPPED = "Stopped."
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
/** Where the home conversation keeps its scroll position. */
export const HOME_SCROLL = "home-chat-scroll"

/**
 * A new conversation: the home chat and its panel clear, and it opens at the top. Project tabs, and
 * each project's own chat, are left as they are.
 */
export function startNewChat() {
  closeHomePanel()
  try {
    sessionStorage.removeItem(HOME_SCROLL)
  } catch {
    // Not kept.
  }
  resetChat(HOME_CHAT)
}

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
export type ReplyExtra = { projects?: string[]; roles?: string[]; expects?: "category"; panel?: Panel; followUps?: string[]; contact?: boolean; source?: "site" | "open" | "work"; sources?: { title: string; url: string }[]; nudge?: boolean; placeKind?: "lived"; cards?: "demo" }

/** What the model is doing while an answer is on its way. */
export type Status = "thinking" | "searching" | "reading"
const STATUS_LABEL: Record<Status, string> = { thinking: "Thinking", searching: "Searching the web", reading: "Reading the work" }

/** One earlier exchange, sent with a question so a follow-up reads in context. */
export type Past = { q: string; a: string; source?: "site" | "open" | "work" }
const HISTORY_TURNS = 6

/** live marks an answer that arrived in this visit, so what follows its text plays in; a restored one is simply there. */
type Turn = { id: number; question: string; words: string[]; shown: number; pending: boolean; status?: Status; live?: boolean } & ReplyExtra

/**
 * The parts of an answer that follow its text, played in one by one. The fade itself is in the
 * stylesheet (.turn.live), so it holds from the first paint; here they are only put in order.
 */
const PARTS = ".chat-action, .career-cards > li, ol.career > li, .demo-cards > li, .chat-sources, .chat-nudge"
/** When the first part starts after the text, the gap between parts, and how long each takes. Match globals.css. */
const PART_START_MS = 500
const PART_STEP_MS = 260
const PART_MS = 600
/** The least time the thinking state shows before an answer starts to stream. */
const THINKING_MIN_MS = 2000
/** A breath after the last part before the follow-ups begin. */
const FOLLOW_GAP_MS = 400

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
          followUps: Array.isArray(item.followUps) ? item.followUps.filter((text): text is string => typeof text === "string").slice(0, 4) : undefined,
          contact: item.contact === true ? true : undefined,
          source: item.source === "open" || item.source === "site" || item.source === "work" ? item.source : undefined,
          sources: Array.isArray(item.sources)
            ? item.sources.filter((entry) => typeof entry?.title === "string" && typeof entry?.url === "string" && entry.url.startsWith("https://")).slice(0, 3)
            : undefined,
          nudge: item.nudge === true ? true : undefined,
          placeKind: item.placeKind === "lived" ? "lived" : undefined,
          cards: item.cards === "demo" ? "demo" : undefined,
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
  // Answers stopped while still on their way: when they land, they are dropped.
  const stopped = useRef(new Set<number>())

  const run = useCallback(
    async (id: number, question: string) => {
      stopped.current.delete(id)
      record(storeKey, { id, question, answer: null })
      setTurns((all) => all.map((turn) => (turn.id === id ? { ...turn, words: [WAITING], shown: 1, pending: true } : turn)))
      const answered = load(storeKey).filter((item) => item.id < id && item.answer !== null)
      const previous = answered[answered.length - 1]
      const history: Past[] = answered.slice(-HISTORY_TURNS).map((item) => ({ q: item.question.slice(0, 400), a: (item.answer ?? "").slice(0, 4000), source: item.source }))
      const onStatus = (status: Status) => setTurns((all) => all.map((turn) => (turn.id === id && turn.pending ? { ...turn, status } : turn)))
      const started = Date.now()
      const reply = await ask(question, previous ? { projects: previous.projects, expects: previous.expects } : undefined, { history, onStatus })
      // Thinking shows for at least two seconds, so a fast answer still reads as considered.
      const rest = THINKING_MIN_MS - (Date.now() - started)
      if (rest > 0) await new Promise((done) => window.setTimeout(done, rest))
      if (stopped.current.has(id)) return
      const { answer, ...extra }: { answer: string } & ReplyExtra = typeof reply === "string" ? { answer: reply } : reply
      record(storeKey, { id, question, answer, ...extra })
      const words = answer.split(/\s+/).filter(Boolean)
      setTurns((all) => all.map((turn) => (turn.id === id ? { id, question, words, shown: reduce.current ? words.length : 0, pending: false, live: !reduce.current, ...extra } : turn)))
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
      return { id: item.id, question: item.question, words, shown: words.length, pending: item.answer === null, projects: item.projects, roles: item.roles, expects: item.expects, panel: item.panel, followUps: item.followUps, contact: item.contact, source: item.source, sources: item.sources, nudge: item.nudge, placeKind: item.placeKind, cards: item.cards }
    }))
    for (const item of stored) if (item.answer === null) void run(item.id, item.question)

    const onAsk = (event: Event) => {
      const question = (event as CustomEvent<string>).detail.trim()
      if (!question) return
      restoring.current = false
      restored.current = false
      const id = nextId.current++
      setTurns((all) => [...all, { id, question, words: [], shown: 0, pending: true, live: !reduce.current }])
      void run(id, question)
    }
    const onReset = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== storeKey) return
      nextId.current = 0
      restored.current = false
      last.current?.closest<HTMLElement>("main")?.style.removeProperty("--chat-tail")
      setTurns([])
    }
    window.addEventListener(CHAT_ASK, onAsk)
    window.addEventListener(CHAT_RESET, onReset)
    return () => {
      window.removeEventListener(CHAT_ASK, onAsk)
      window.removeEventListener(CHAT_RESET, onReset)
    }
  }, [run, storeKey])

  // Stop keeps what the visitor has already read, so the answer ends where they stopped it.
  const turnsNow = useRef<Turn[]>([])
  turnsNow.current = turns
  useEffect(() => {
    const onStop = () => {
      const next = turnsNow.current.map((turn): Turn => {
        if (turn.pending) {
          stopped.current.add(turn.id)
          return { id: turn.id, question: turn.question, words: [STOPPED], shown: 1, pending: false }
        }
        if (turn.shown < turn.words.length) return { ...turn, words: turn.words.slice(0, Math.max(1, turn.shown)), shown: Math.max(1, turn.shown), followUps: undefined }
        return turn
      })
      for (const turn of next) {
        const before = turnsNow.current.find((item) => item.id === turn.id)
        if (before && (before.pending || before.shown < before.words.length)) {
          const kept = load(storeKey).find((item) => item.id === turn.id)
          record(storeKey, { ...kept, id: turn.id, question: turn.question, answer: turn.words.join(" "), followUps: undefined })
        }
      }
      setTurns(next)
    }
    window.addEventListener(CHAT_STOP, onStop)
    return () => window.removeEventListener(CHAT_STOP, onStop)
  }, [storeKey])

  const active = turns.length > 0
  useEffect(() => {
    onActive?.(active, restored.current)
  }, [active, onActive])

  const revealing = turns.some((turn) => !turn.pending && turn.shown < turn.words.length)
  const inFlight = turns.some((turn) => turn.pending || turn.shown < turn.words.length)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(CHAT_STREAMING, { detail: inFlight }))
  }, [inFlight])
  useEffect(() => () => void window.dispatchEvent(new CustomEvent(CHAT_STREAMING, { detail: false })), [])
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
  // Every conversation, home included, sits on the composer: a new question starts at the bottom and
  // the exchange grows upward from there, the newest turn kept just above the composer.
  const centred = false
  const growing = useRef(false)
  growing.current = !!newest && (newest.pending || newest.shown < newest.words.length)
  const phase = newest ? `${turns.length}:${newest.pending ? "asked" : "answering"}` : ""
  useEffect(() => {
    // A restored conversation waits where it is; only new questions move the page.
    if (hold || concealed || turns.length === 0) return
    if (!seen.current) {
      seen.current = true
      if (!centred && storeKey === HOME_CHAT && !restoring.current) window.scrollTo(0, 0)
      if (!centred) return
    }
    if (restoring.current) return
    if (centred) return
    if (stage) last.current?.scrollIntoView({ behavior: reduce.current ? "auto" : "smooth", block: "end" })
  }, [stage, hold, concealed, turns.length, centred, storeKey])
  useEffect(() => {
    // Sent: the question eases into the middle. Answering: the answer takes the middle and is
    // followed as it grows, until it settles. Scrolling by hand lets go until the next question.
    if (!centred || hold || concealed || !phase || restoring.current) return
    const asked = phase.endsWith("asked")
    let frame = 0
    let still = 0
    let taken = false
    const take = () => {
      taken = true
      cancelAnimationFrame(frame)
    }
    const onKey = (event: KeyboardEvent) => {
      if (["PageUp", "PageDown", "Home", "End"].includes(event.key) || (event.key.startsWith("Arrow") && !(event.target as HTMLElement)?.closest?.("input,textarea,[contenteditable]"))) take()
    }
    // Room below the thread only once it overflows: until then the page does not scroll at all.
    const main = last.current?.closest<HTMLElement>("main")
    const roomBelow = () => {
      if (!main) return
      const tail = parseFloat(main.style.getPropertyValue("--chat-tail")) || 0
      const want = document.documentElement.scrollHeight - tail > innerHeight + 1 ? Math.round(innerHeight / 2) : 0
      if (want !== tail) main.style.setProperty("--chat-tail", `${want}px`)
    }
    const follow = () => {
      roomBelow()
      const pair = last.current?.firstElementChild
      const el = (asked ? pair?.firstElementChild : pair?.children[1]) as HTMLElement | null | undefined
      if (!el || taken) return
      const top = 96
      const composer = document.querySelector<HTMLElement>(".shell")
      const bottom = (composer ? composer.getBoundingClientRect().top : innerHeight - 120) - 16
      const box = el.getBoundingClientRect()
      // Taller than the space between the top bar and the composer: keep its start in view instead.
      const off = box.height > bottom - top - 32 ? box.top - (top + 16) : box.top + box.height / 2 - (top + bottom) / 2
      const goal = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, scrollY + off))
      const gap = goal - scrollY
      if (Math.abs(gap) < 0.5) still++
      else {
        still = 0
        window.scrollTo({ top: reduce.current ? goal : scrollY + gap * 0.14, behavior: "instant" })
      }
      if (growing.current || still < 20) frame = requestAnimationFrame(follow)
    }
    frame = requestAnimationFrame(follow)
    window.addEventListener("wheel", take, { passive: true })
    window.addEventListener("touchmove", take, { passive: true })
    window.addEventListener("keydown", onKey)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("wheel", take)
      window.removeEventListener("touchmove", take)
      window.removeEventListener("keydown", onKey)
    }
  }, [phase, centred, hold, concealed])
  useEffect(() => {
    if (turns.length === 0) seen.current = false
  }, [turns.length])

  // After a live answer's text: its parts fade in one by one, then the follow-ups stream in.
  const [followOpen, setFollowOpen] = useState<number | null>(null)
  const finished = newest && newest.live && !newest.pending && newest.shown >= newest.words.length ? newest.id : null
  useLayoutEffect(() => {
    if (finished === null) return
    const parts = [...(last.current?.querySelectorAll<HTMLElement>(PARTS) ?? [])].filter((part) => part.getClientRects().length > 0)
    parts.forEach((part, index) => {
      part.style.setProperty("--part", String(index))
    })
    const wait = (parts.length ? PART_START_MS + (parts.length - 1) * PART_STEP_MS + PART_MS : PART_START_MS) + FOLLOW_GAP_MS
    const timer = window.setTimeout(() => setFollowOpen(finished), wait)
    return () => window.clearTimeout(timer)
  }, [finished])

  if (turns.length === 0) return null
  return (
    <section className={hold || concealed ? "chat held" : arrive ? "chat arrive" : "chat"} aria-label={label} aria-live="polite">
      {turns.map((turn, index) => (
        <div key={turn.id} ref={index === turns.length - 1 ? last : undefined} className={turn.live ? "turn live" : "turn"}>
          <MessagePair
            userMessage={turn.question}
            words={turn.words}
            visibleWords={turn.shown}
            streaming={turn.pending || turn.shown < turn.words.length}
            tint={tint}
            status={turn.pending ? STATUS_LABEL[turn.status ?? "thinking"] : undefined}
            className="max-w-none gap-12 text-[15px]"
            onCopy={turn.pending ? undefined : () => void navigator.clipboard?.writeText(turn.words.join(" "))}
            onRegenerate={turn.pending ? undefined : () => void run(turn.id, turn.question)}
            final={renderAnswer && !turn.pending ? renderAnswer({ id: turn.id, answer: turn.words.join(" "), projects: turn.projects, roles: turn.roles, expects: turn.expects, panel: newestAction(turns, index) ? turn.panel : undefined, placeKind: turn.placeKind, cards: turn.cards }) : undefined}
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
          {index === turns.length - 1 && !turn.pending && turn.shown >= turn.words.length && (turn.followUps?.length || turn.contact) && (!turn.live || followOpen === turn.id) ? (
            <section className="follow-ups" aria-label="Follow up">
              <p className="follow-label">Follow up</p>
              <PromptLinks
                stream={turn.live ? true : undefined}
                items={[
                  ...(turn.contact ? [{ label: "Start a conversation", pick: () => window.dispatchEvent(new Event(CONTACT_EVENT)) }] : []),
                  ...(turn.followUps ?? []).map((text) => ({ label: text, pick: () => window.dispatchEvent(new CustomEvent(CHAT_ASK, { detail: text })) })),
                ]}
              />
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
