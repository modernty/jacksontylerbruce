"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { askJson, ChatThread, follow, type Go } from "./chat-thread"
import { useViewMode } from "./view-mode"

/** The conversation about one project, answered from that project's own content. */
export function ProjectChat({ slug }: { slug: string }) {
  const router = useRouter()
  const { setBoring } = useViewMode()
  const ask = useCallback(
    (q: string) =>
      askJson("/api/ask/project", { slug, q }, "answer", (data) => {
        if (data.go) follow(data.go as Go, q, router)
        // The photos sit in the two-column view; the conversation is kept for when they toggle back.
        if (data.view === "images") window.setTimeout(() => setBoring(true), 700)
      }),
    [slug, router, setBoring],
  )
  return <ChatThread storeKey={`project-chat:${slug}`} ask={ask} label="Conversation about this project" />
}
