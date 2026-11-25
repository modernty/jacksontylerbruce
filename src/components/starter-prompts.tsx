"use client"

import { useEffect, useState } from "react"
import { CHAT_ASK } from "./chat-thread"

/** The same pace as the welcome above it. */
const WORD_MS = 45

/**
 * The questions a first visit starts with: the case studies, the career, and how a project starts.
 * Each is answered from the site's own content, so they never call the model.
 */
export const STARTERS: readonly string[] = ["Show me some case studies", "Tell me about your experience", "How do you start a project?"]

/** Starting questions on a project page, answered from that project's own content. */
export const PROJECT_STARTERS = ["How was it approached?", "What was the outcome?", "What are the core ideas?"]
export const IMAGES_STARTER = "Show the media"

/** Asks a question in the conversation on this page. */
export const askHere = (question: string) => window.dispatchEvent(new CustomEvent(CHAT_ASK, { detail: question }))

/**
 * Prompts read as a paragraph: inline spans wrap mid-question like text, which a <button> cannot.
 * Each still acts as a button: focusable, and Enter or Space asks it.
 * With stream, the words come in one at a time once it turns true, like the welcome; words not yet
 * shown hold their place, so nothing moves as they arrive.
 */
export function PromptLinks({ items, className, stream }: { items: { label: string; pick: () => void }[]; className?: string; stream?: boolean }) {
  const total = items.reduce((sum, item) => sum + item.label.split(" ").length, 0)
  const [count, setCount] = useState(stream === undefined ? Infinity : 0)
  useEffect(() => {
    if (stream === undefined) return
    if (!stream) {
      setCount(0)
      return
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(Infinity)
      return
    }
    const timer = window.setInterval(() => {
      setCount((current) => {
        if (current + 1 >= total) window.clearInterval(timer)
        return current + 1
      })
    }, WORD_MS)
    return () => window.clearInterval(timer)
  }, [stream, total])
  let at = 0
  return (
    <p className={className ? `prompts prompt-links ${className}` : "prompts prompt-links"}>
      {items.map((item, index) => {
        const words = item.label.split(" ")
        const from = at
        at += words.length
        return (
          <span key={item.label}>
            <span
              role="button"
              tabIndex={0}
              className="prompt-link"
              aria-label={item.label}
              onClick={item.pick}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return
                event.preventDefault()
                item.pick()
              }}
            >
              {count === Infinity
                ? item.label
                : words.map((word, k) => (
                    <span key={k} aria-hidden="true" className={from + k < count ? "fade-in animate-in fill-mode-both duration-500 motion-reduce:animate-none" : "invisible"}>
                      {word}
                      {k < words.length - 1 ? " " : ""}
                    </span>
                  ))}
            </span>
            {index < items.length - 1 ? " " : null}
          </span>
        )
      })}
    </p>
  )
}

/** The starting questions, asked in this conversation when picked. */
export function StarterPrompts({ onPick, className, items = STARTERS, stream }: { onPick: (question: string) => void; className?: string; items?: readonly string[]; stream?: boolean }) {
  return <PromptLinks className={className} stream={stream} items={items.map((label) => ({ label, pick: () => onPick(label) }))} />
}
