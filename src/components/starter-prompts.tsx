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
export const PROJECT_STARTERS = ["What was Tyler's role?", "How was it approached?", "What was the outcome?"]
export const IMAGES_STARTER = "Show the images"

/** Asks a question in the conversation on this page. */
export const askHere = (question: string) => window.dispatchEvent(new CustomEvent(CHAT_ASK, { detail: question }))

export function StarterPrompts({ onPick, className, items = STARTERS, links = false }: { onPick: (question: string) => void; className?: string; items?: readonly string[]; links?: boolean }) {
  // The first visit's pills rotate after hydration, so the server and client agree on the first render.
  const [shown, setShown] = useState(items)
  useEffect(() => {
    setShown(items === STARTERS && QA_PILLS.length > 3 ? rotatePills(Date.now() / 1000) : items)
  }, [items])
  return (
    <p className={className ? `prompts ${className}` : "prompts"}>
      {shown.map((label) => (
        <button key={label} type="button" onClick={() => onPick(label)}>
          {label}
          {links ? null : (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M7 11.5v-9M3 6.5l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ))}
    </p>
  )
}
