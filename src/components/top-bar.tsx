"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { quietPage } from "./chrome"
import { CHAT_CHANGED, CHAT_RESET, HOME_CHAT, handOff, hasTurns, startNewChat } from "./chat-thread"
import { ProjectTabs } from "./project-tabs"
import { askHere } from "./starter-prompts"

/** Whether the home conversation has started, kept in step as turns are saved and cleared. */
function useChatStarted(): boolean {
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const sync = () => setStarted(hasTurns(HOME_CHAT))
    sync()
    window.addEventListener(CHAT_CHANGED, sync)
    window.addEventListener(CHAT_RESET, sync)
    return () => {
      window.removeEventListener(CHAT_CHANGED, sync)
      window.removeEventListener(CHAT_RESET, sync)
    }
  }, [])
  return started
}

const LOCATION_PROMPT = "Where are you located?"

/**
 * The header: the name (home, back to the conversation as it was left), the open project tabs beside
 * it, and at the far right New chat (once a chat has started), LinkedIn and the location.
 */
export function TopBar({ location, place, linkedin, names }: { location: string; place?: string; linkedin: string; names: Record<string, string> }) {
  const path = usePathname()
  const router = useRouter()
  const project = path.startsWith("/work/")
  const started = useChatStarted()
  if (quietPage(path)) {
    return (
      <header className="top top-work">
        <Link
          href="/chat"
          onClick={(event) => {
            // The name goes home: back to the conversation, kept as it was. On it already, to its top.
            if (path === "/chat") {
              event.preventDefault()
              window.scrollTo(0, 0)
            }
          }}
        >
          Jackson, Tyler Bruce
        </Link>
        <ProjectTabs names={names} />
        <span className={project ? "contact on-project" : "contact"}>
          {started ? (
            <button
              type="button"
              className="top-link new-chat"
              onClick={() => {
                // A new conversation: the chat and its panel clear; open tabs stay.
                startNewChat()
                if (path !== "/chat") router.push("/chat")
                else window.scrollTo(0, 0)
              }}
            >
              <span>New chat</span>
            </button>
          ) : null}
          <a href={linkedin} className="top-link external" target="_blank" rel="noreferrer">
            <span>LinkedIn</span>
          </a>
          <Link
            href="/chat"
            className="top-link"
            aria-label={`Where are you located? ${place ?? location}`}
            onClick={(event) => {
              // The globe asks the conversation where Tyler is; the answer opens the globe beside it.
              if (path === "/chat") {
                event.preventDefault()
                askHere(LOCATION_PROMPT)
              } else {
                handOff(HOME_CHAT, LOCATION_PROMPT)
              }
            }}
          >
            <span>{place ?? location}</span>
          </Link>
        </span>
      </header>
    )
  }
  // Every other page (the 404, for one) carries the same name, and nothing else.
  return (
    <header className="top top-work">
      <Link href="/chat" onClick={() => startNewChat()}>Jackson, Tyler Bruce</Link>
    </header>
  )
}
