"use client"

import { useRouter } from "next/navigation"
import { useCallback, type ReactNode } from "react"
import { askJson, ChatThread, follow, sessionId, type Asker, type Go } from "./chat-thread"
import { linkRanges } from "./conversation-stage"
import { openTab } from "./project-tabs"

type ChatData = { answer?: string; error?: string; projects?: string[]; expects?: "category"; go?: Go }

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
 * content; anything wider (all the work, a type of work) is answered here too, by the main
 * conversation, so the visitor stays in the tab. Projects it names open as their own tabs.
 */
export function ProjectChat({ slug, names, onImages }: { slug: string; names: Record<string, string>; onImages?: () => void }) {
  const router = useRouter()
  const wide = useCallback(
    async (q: string, last?: { projects?: string[]; expects?: "category" }) => {
      const data = await askConversation(q, last?.expects, last?.projects)
      const answer = data.answer ?? data.error ?? "Something went wrong. Try asking again."
      const projects = data.projects?.filter((item) => names[item])
      // Pages other than the conversation (About, the timeline) still open as before.
      if (data.go && data.go.href !== "/chat" && !projects?.length) follow({ ...data.go, chat: false }, q, router)
      return { answer, projects, expects: data.expects }
    },
    [names, router],
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
      // Questions the main conversation would take stay in this tab instead.
      if (leaving.chat) return wide(q, last)
      follow(leaving, q, router)
      return answer
    },
    [slug, router, onImages, wide],
  )

  const open = (target: string) => {
    openTab(target)
    router.push(`/work/${target}`)
  }

  const renderAnswer = ({ answer, projects }: { answer: string; projects?: string[] }) => {
    if (!projects?.length) return null
    // The project this tab is about stays plain text; only other projects open as tabs.
    const listed = projects.filter((item) => item !== slug).map((item) => ({ slug: item, name: names[item] }))
    const parts: ReactNode[] = []
    let from = 0
    const ranges = linkRanges(answer, listed)
    for (const range of ranges) {
      parts.push(answer.slice(from, range.start))
      parts.push(
        <button key={range.slug} type="button" className="chat-link" onClick={() => open(range.slug)}>
          {answer.slice(range.start, range.end)}
        </button>,
      )
      from = range.end
    }
    parts.push(answer.slice(from))
    // Projects the answer lists without naming them in its words.
    const unnamed = listed.filter((item) => !ranges.some((range) => range.slug === item.slug))
    unnamed.forEach((item, index) => {
      parts.push(index === 0 ? " " : ", ")
      parts.push(
        <button key={item.slug} type="button" className="chat-link" onClick={() => open(item.slug)}>
          {item.name}
        </button>,
      )
    })
    return parts
  }

  return <ChatThread storeKey={`project-chat:${slug}`} ask={ask} label="Conversation about this project" renderAnswer={renderAnswer} />
}
