"use client"

import { CHAT_ASK } from "./chat-thread"

/** The questions a visitor can start with, as chat bubbles. Every empty conversation shows its own set, in the same style. */
export const STARTERS = ["Show me recent projects", "Show me brand work", "Walk me through your career"]

/** Starting questions on a project page, answered from that project's own content. */
export const PROJECT_STARTERS = ["What was your role?", "How did you approach it?", "What was the outcome?"]
export const IMAGES_STARTER = "Show me images"

/** Starting questions on About, answered by the globe. */
export const ABOUT_STARTERS = ["Where are you based?", "Where have you lived?", "Where have you travelled?"]

/** Asks a question in the conversation on this page. */
export const askHere = (question: string) => window.dispatchEvent(new CustomEvent(CHAT_ASK, { detail: question }))

export function StarterPrompts({ onPick, className, items = STARTERS }: { onPick: (question: string) => void; className?: string; items?: readonly string[] }) {
  return (
    <p className={className ? `prompts ${className}` : "prompts"}>
      {items.map((label) => (
        <button key={label} type="button" onClick={() => onPick(label)}>
          {label}
        </button>
      ))}
    </p>
  )
}
