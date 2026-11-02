"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { DEFAULT_PILLS } from "@/src/router/pills"
import { bindComposer, loadIn } from "./behaviors"
import { usePills } from "./pills"
import { PROJECT_ASK } from "./project-chat"

function sessionId(): string {
  const key = "ask-session"
  const existing = sessionStorage.getItem(key)
  if (existing) return existing
  const next = crypto.randomUUID()
  sessionStorage.setItem(key, next)
  return next
}

export function Composer() {
  const router = useRouter()
  const project = usePathname().startsWith("/work/")
  const params = useSearchParams()
  const shellRef = useRef<HTMLFormElement>(null)
  const pills = usePills()
  const shown = pills.length ? pills : DEFAULT_PILLS

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
    if (!q) return
    if (project && input) {
      // Project pages answer in their own column instead of routing to another view.
      window.dispatchEvent(new CustomEvent(PROJECT_ASK, { detail: q }))
      input.value = ""
      input.dispatchEvent(new Event("input"))
      return
    }
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q, sessionId: sessionId() }),
    })
    const data = (await response.json()) as { href?: string }
    if (data.href) router.push(data.href)
  }

  return (
    <section className={project ? "hero hero-work" : "hero"}>
      <div className="in">
        {project ? null : (
          <>
            <h1>What are you looking for?</h1>
            <div className="cards">
              {shown.map((pill) => (
                <Link key={pill.href + pill.label} href={pill.href}>{pill.label}</Link>
              ))}
            </div>
          </>
        )}
        <form
          className="shell"
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
            placeholder={project ? "Let’s talk about it" : "Ask anything about my work…"}
            aria-label={project ? "Talk about this project" : "Ask anything about my work"}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <div className="g">
            <button className="ib voice" type="button" title="Voice" aria-label="Voice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>
            <button className="ib send" type="submit" title="Send">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--paper)" strokeWidth="2">
                <path d="M12 19V5M6 11l6-6 6 6" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
