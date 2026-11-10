"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import type { CareerEntry } from "@/src/content/career"
import { chatAnswer } from "./chat-answer"
import { askJson, ChatThread, follow, sessionId, type Asker, type Go, type Panel } from "./chat-thread"
import { openTab } from "./project-tabs"
import { IMAGES_STARTER, PROJECT_STARTERS, StarterPrompts, askHere } from "./starter-prompts"

type ChatData = { answer?: string; error?: string; projects?: string[]; roles?: string[]; panel?: Panel; expects?: "category"; go?: Go }

/** Asks the main conversation, for questions that reach past this project. */
async function askConversation(q: string, expects?: "category", listed?: string[]): Promise<ChatData> {
  try {
    const response = await fetch("/api/ask/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q, sessionId: sessionId(), expects, listed }),
    })
    return (await response.json()) as ChatData
  } catch {
    return { answer: "I couldn't reach the site just now. Try asking again." }
  }
}

/**
 * The conversation in one project's tab. Questions about the project are answered from its own
 * content; anything wider (the work, career, travel) is answered here too, by the main
 * conversation, in the same style, so the visitor stays in the tab. Other projects open as tabs.
 */
export function ProjectChat({ slug, names, careers, hasImages, onImages }: { slug: string; names: Record<string, string>; careers: Record<string, CareerEntry>; hasImages?: boolean; onImages?: () => void }) {
  const router = useRouter()
  const [active, setActive] = useState(true)
  const wide = useCallback(
    async (q: string, last?: { projects?: string[]; expects?: "category" }) => {
      const data = await askConversation(q, last?.expects, last?.projects)
      const answer = data.answer ?? data.error ?? "Something went wrong. Try asking again."
      const projects = data.projects?.filter((item) => names[item])
      const roles = data.roles?.filter((id) => careers[id])
      const panel = data.panel
      // Nothing to show here: the answer points at a page (About, say), which opens as before.
      if (data.go && data.go.href !== "/chat" && !projects?.length && !roles?.length && !panel) follow({ ...data.go, chat: false }, q, router)
      return { answer, projects, roles, panel, expects: data.expects }
    },
    [names, careers, router],
  )
  const ask = useCallback<Asker>(
    async (q, last) => {
      // A short reply to the conversation's last offer ("brand") goes back to the conversation.
      if (last?.expects === "category") return wide(q, last)
      let go: Go | undefined
      const answer = await askJson("/api/ask/project", { slug, q }, "answer", (data) => {
        go = data.go as Go | undefined
        // Asking for images opens the gallery beside the conversation, once the answer has started.
        if (data.view === "images") window.setTimeout(() => onImages?.(), 500)
      })
      const leaving = go as Go | undefined
      if (!leaving) return answer
      // Another project opens in its own tab; "go back" goes back.
      if (leaving.href.startsWith("/work/")) {
        openTab(leaving.href.slice("/work/".length))
        follow(leaving, q, router)
        return answer
      }
      if (leaving.href === "back") {
        follow(leaving, q, router)
        return answer
      }
      // Everything else (the work, career, travel) is answered in this tab.
      return wide(q, last)
    },
    [slug, router, onImages, wide],
  )

  const onProject = (target: string) => {
    openTab(target)
    router.push(`/work/${target}`)
  }
  const onPanel = (kind: Panel) => router.push(kind === "globe" ? "/about" : "/timeline#axis")

  return (
    <>
      {active ? null : <StarterPrompts className="project-prompts" items={hasImages ? [...PROJECT_STARTERS, IMAGES_STARTER] : PROJECT_STARTERS} onPick={askHere} />}
      <ChatThread
        storeKey={`project-chat:${slug}`}
        ask={ask}
        label="Conversation about this project"
        onActive={setActive}
        renderAnswer={(turn) => chatAnswer({ turn, names, careers, onProject, onPanel, plain: slug })}
      />
    </>
  )
}
