"use client"

import { useEffect, useState } from "react"
import { QA_PILLS, rotatePills } from "@/src/content/qa"
import { CHAT_ASK } from "./chat-thread"

/**
 * The questions a first visit starts with: the Notion Q&A rows marked Pill, three at a time.
 * They are answered from the Q&A, so they never call the model.
 */
export const STARTERS: readonly string[] = rotatePills(0)

/** Starting questions on a project page, answered from that project's own content. */
export const PROJECT_STARTERS = ["What was your role?", "How was it approached?", "What was the outcome?"]
export const IMAGES_STARTER = "Show the images"

/** Asks a question in the conversation on this page. */
export const askHere = (question: string) => window.dispatchEvent(new CustomEvent(CHAT_ASK, { detail: question }))

/**
 * Prompts read as a paragraph: inline spans wrap mid-question like text, which a <button> cannot.
 * Each still acts as a button: focusable, and Enter or Space asks it.
 */
export function StarterPrompts({ onPick, className, items = STARTERS }: { onPick: (question: string) => void; className?: string; items?: readonly string[] }) {
  // The first visit's pills rotate after hydration, so the server and client agree on the first render.
  const [shown, setShown] = useState(items)
  useEffect(() => {
    setShown(items === STARTERS && QA_PILLS.length > 3 ? rotatePills(Date.now() / 1000) : items)
  }, [items])
  return (
    <p className={className ? `prompts prompt-links ${className}` : "prompts prompt-links"}>
      {shown.map((label, index) => (
        <span key={label}>
          <span
            role="button"
            tabIndex={0}
            className="prompt-link"
            onClick={() => onPick(label)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return
              event.preventDefault()
              onPick(label)
            }}
          >
            {label}
          </span>
          {index < shown.length - 1 ? " " : null}
        </span>
      ))}
    </p>
  )
}
