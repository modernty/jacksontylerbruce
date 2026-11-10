"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Travel } from "@/src/globe/travel"
import type { GlobePlace } from "@/src/globe/types"
import { useRouter } from "next/navigation"
import { ABOUT_STARTERS, StarterPrompts, askHere } from "./starter-prompts"
import { ABOUT_OPEN, CHAT_ASK, ChatThread, follow, sessionId, type Go } from "./chat-thread"

const SLIDE_MS = 700
const FADE_MS = 360
const EASE = "cubic-bezier(.22,1,.36,1)"

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * About is the globe, centred. Once a conversation starts the globe slides right and the chat
 * fades in on the left. "Hide chat", under the name in the top bar, reverses that; once hidden,
 * "Show chat" brings it back, and the next question does too.
 */
export function AboutStage({ places, title }: { places: GlobePlace[]; title: string }) {
  const [active, setActive] = useState(false)
  const [open, setOpenState] = useState(true)
  const [focus, setFocus] = useState<string | null>(null)
  const view = useRef<HTMLDivElement>(null)
  const chat = useRef<HTMLDivElement>(null)
  const lastRect = useRef<DOMRect | null>(null)
  const docked = active && open
  const router = useRouter()

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    try {
      sessionStorage.setItem(ABOUT_OPEN, next ? "1" : "0")
    } catch {
      // Not remembered, still applied.
    }
  }, [])

  useEffect(() => {
    try {
      if (sessionStorage.getItem(ABOUT_OPEN) === "0") setOpenState(false)
    } catch {
      // Open by default.
    }
    // A new question always brings the conversation back.
    const reopen = () => setOpen(true)
    window.addEventListener(CHAT_ASK, reopen)
    return () => window.removeEventListener(CHAT_ASK, reopen)
  }, [setOpen])

  // Slide the globe from where it was to where it now sits, then fade the chat in.
  useLayoutEffect(() => {
    const element = view.current
    if (!element) return
    const before = lastRect.current
    const after = element.getBoundingClientRect()
    lastRect.current = after
    if (!before || reduced() || (before.left === after.left && before.width === after.width)) return
    const dx = before.left + before.width / 2 - (after.left + after.width / 2)
    const dy = before.top + before.height / 2 - (after.top + after.height / 2)
    const scale = before.width / after.width
    element.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${scale})` }, { transform: "none" }], { duration: SLIDE_MS, easing: EASE })
    if (docked) {
      const fadeIn = [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }]
      chat.current?.animate(fadeIn, { duration: FADE_MS, delay: SLIDE_MS * 0.6, easing: EASE, fill: "backwards" })
      document.querySelector(".hero-work .in")?.animate(fadeIn, { duration: FADE_MS, delay: SLIDE_MS * 0.6, easing: EASE, fill: "backwards" })
    }
  }, [docked])

  // Keep the remembered position current when the window changes size.
  useEffect(() => {
    const element = view.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      lastRect.current = element.getBoundingClientRect()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Hiding fades the chat out first, then lets the globe slide back.
  const hide = () => {
    const element = chat.current
    if (!element || reduced()) {
      setOpen(false)
      return
    }
    const fadeOut = [{ opacity: 1 }, { opacity: 0 }]
    document.querySelector(".hero-work .in")?.animate(fadeOut, { duration: FADE_MS * 0.6, easing: EASE })
    element.animate(fadeOut, { duration: FADE_MS * 0.6, easing: EASE, fill: "forwards" }).finished.then(
      (animation) => {
        setOpen(false)
        animation.cancel()
      },
      () => setOpen(false),
    )
  }

  const onActive = useCallback((next: boolean) => setActive(next), [])

  const ask = useCallback(async (q: string) => {
    try {
      const response = await fetch("/api/ask/about", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q, sessionId: sessionId() }),
      })
      const data = (await response.json()) as { answer?: string; placeId?: string | null; error?: string; go?: Go }
      if (data.placeId) setFocus(data.placeId)
      if (data.go) follow(data.go, q, router)
      return data.answer ?? data.error ?? "Something went wrong. Try asking again."
    } catch {
      return "I couldn't reach the site just now. Try asking again."
    }
  }, [router])

  return (
    <div className={docked ? "stage docked" : active ? "stage collapsed" : "stage"}>
      <div className="stage-chat" ref={chat}>
        <h1 className="sr">{title}</h1>
        {docked ? (
          <button type="button" className="chat-toggle" onClick={hide} aria-expanded="true">
            Hide chat
          </button>
        ) : active ? (
          <button type="button" className="chat-toggle" onClick={() => setOpen(true)} aria-expanded="false">
            Show chat
          </button>
        ) : null}
        {active ? null : <StarterPrompts className="about-prompts" items={ABOUT_STARTERS} onPick={askHere} />}
        <ChatThread storeKey="about-chat" ask={ask} label="Conversation about Tyler" onActive={onActive} />
      </div>
      <div className="stage-view" ref={view}>
        <Travel places={places} focusId={focus} />
      </div>
    </div>
  )
}
