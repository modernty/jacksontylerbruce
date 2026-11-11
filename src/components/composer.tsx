"use client"

import { track } from "@vercel/analytics"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { targetPath } from "@/src/analytics/scrub"
import { DEFAULT_PILLS } from "@/src/router/pills"
import { bindComposer, loadIn } from "./behaviors"
import { usePills } from "./pills"
import { CHAT_ASK, CHAT_RESET, HOME_CHAT, handOff } from "./chat-thread"
import { StarterPrompts } from "./starter-prompts"
import { CONTACT_EVENT, mailtoLink } from "./mailto"
import { inlineChat, quietPage } from "./chrome"

function sessionId(): string {
  const key = "ask-session"
  const existing = sessionStorage.getItem(key)
  if (existing) return existing
  const next = crypto.randomUUID()
  sessionStorage.setItem(key, next)
  return next
}

const mailIcon = (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
    <path d="M3 5.5l7 5.5 7-5.5" strokeLinejoin="round" />
  </svg>
)

export function Composer({ email }: { email: string }) {
  const router = useRouter()
  const path = usePathname()
  const project = path.startsWith("/work/")
  const quiet = quietPage(path)
  const inline = inlineChat(path)
  const params = useSearchParams()
  const shellRef = useRef<HTMLFormElement>(null)
  const pills = usePills()
  const shown = pills.length ? pills : DEFAULT_PILLS
  // The timeline offers the conversation's starting questions on top of the composer, until one
  // is picked or a conversation has started.
  const [started, setStarted] = useState(true)
  useEffect(() => {
    try {
      setStarted((JSON.parse(sessionStorage.getItem(HOME_CHAT) ?? "[]") as unknown[]).length > 0)
    } catch {
      setStarted(false)
    }
  }, [path])
  const prompts = path === "/timeline" && !started
  // Email mode: the composer writes a note to Tyler instead of asking a question.
  const [emailing, setEmailing] = useState(false)
  // The conversation starts or clears from the prompts and the New conversation button too.
  useEffect(() => {
    const onAsk = () => setStarted(true)
    const onReset = (event: Event) => {
      if ((event as CustomEvent<string>).detail === HOME_CHAT) setStarted(false)
    }
    const onContact = () => {
      setEmailing(true)
      shellRef.current?.querySelector<HTMLTextAreaElement>(".input")?.focus()
    }
    window.addEventListener(CHAT_ASK, onAsk)
    window.addEventListener(CHAT_RESET, onReset)
    window.addEventListener(CONTACT_EVENT, onContact)
    return () => {
      window.removeEventListener(CHAT_ASK, onAsk)
      window.removeEventListener(CHAT_RESET, onReset)
      window.removeEventListener(CONTACT_EVENT, onContact)
    }
  }, [])
  // A note to Tyler uses the tall composer. The chat itself stays one line.
  const tall = quiet && emailing

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    const controller = new AbortController()
    const input = shell.querySelector<HTMLTextAreaElement>(".input")
    const q = params.get("q")
    if (input && q && !input.value) input.value = q
    bindComposer(shell, controller.signal)
    const start = () => loadIn()
    if (document.fonts.status === "loaded") start()
    else document.fonts.ready.then(start).catch(start)
    return () => controller.abort()
  }, [params])

  async function submit() {
    const shell = shellRef.current
    const input = shell?.querySelector<HTMLTextAreaElement>(".input")
    const q = input?.value.trim() ?? ""
    if (!q || !input) return
    if (emailing) {
      track("email_composed", { length: q.length })
      window.location.href = mailtoLink(email, q)
      input.value = ""
      input.dispatchEvent(new Event("input"))
      setEmailing(false)
      return
    }
    setStarted(true)
    // Sent: the composer empties at once, wherever the answer appears.
    input.value = ""
    input.dispatchEvent(new Event("input"))
    if (inline) {
      // Project and about pages answer in their own column instead of routing to another view.
      window.dispatchEvent(new CustomEvent(CHAT_ASK, { detail: q }))
      return
    }
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q, sessionId: sessionId() }),
    })
    const data = (await response.json()) as { href?: string; handoff?: boolean; intent?: string; source?: string }
    track("ask_submitted", { status: response.status, intent: data.intent ?? "none", source: data.source ?? "none" })
    if (data.handoff) handOff(HOME_CHAT, q)
    // Work lists are answered in the conversation, which lists the projects to preview.
    if (data.intent === "projects" || data.intent === "focus") {
      handOff(HOME_CHAT, q)
      router.push("/chat")
      return
    }
    if (data.href) router.push(data.href)
  }

  return (
    <section className={quiet ? "hero hero-work" : "hero"} aria-label="Ask about the work">
      <div className="in">
        {quiet ? null : (
          <>
            <h1>What are you looking for?</h1>
            <div className="cards">
              {shown.map((pill, index) => (
                <Link
                  key={pill.href + pill.label}
                  href={pill.href}
                  onClick={() => track("suggestion_clicked", { position: index + 1, target: targetPath(pill.href) })}
                >
                  {pill.label}
                </Link>
              ))}
            </div>
          </>
        )}
        {prompts ? (
          <StarterPrompts
            className="composer-prompts"
            onPick={(question) => {
              setStarted(true)
              handOff(HOME_CHAT, question)
              router.push("/chat")
            }}
          />
        ) : null}
        <form
          className={tall ? "shell tall" : "shell"}
          ref={shellRef}
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <textarea
            className="input"
            rows={1}
            maxLength={400}
            placeholder={emailing ? "Write a note" : project ? "Ask about this project" : quiet ? "Ask anything" : "Ask anything about the work…"}
            aria-label={emailing ? "Write a note" : project ? "Ask about this project" : "Ask anything about the work"}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <div className="row">
          {tall ? (
            <button
              type="button"
              className={emailing ? "email-pill on" : "email-pill"}
              aria-pressed={emailing}
              onClick={() => {
                setEmailing((on) => !on)
                shellRef.current?.querySelector<HTMLTextAreaElement>(".input")?.focus()
              }}
            >
              {mailIcon}
              {emailing ? "Composing an email" : "Contact"}
              {emailing ? (
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              ) : null}
            </button>
          ) : null}
          <div className="g">
            <button className="ib voice" type="button" title="Voice" aria-label="Voice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>
            <button className="ib send" type="submit" title="Send" aria-label="Send">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--paper)" strokeWidth="2">
                <path d="M12 19V5M6 11l6-6 6 6" />
              </svg>
            </button>
          </div>
          </div>
        </form>
      </div>
    </section>
  )
}
