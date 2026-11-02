"use client"

import { useCallback } from "react"
import { askJson, ChatThread } from "./chat-thread"

/** The conversation about one project, answered from that project's own content. */
export function ProjectChat({ slug }: { slug: string }) {
  const ask = useCallback((q: string) => askJson("/api/ask/project", { slug, q }, "answer"), [slug])
  return <ChatThread storeKey={`project-chat:${slug}`} ask={ask} label="Conversation about this project" />
}
