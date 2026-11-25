"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { quietPage } from "./chrome"
import { HOME_CHAT, handOff, startNewChat } from "./chat-thread"
import { askHere } from "./starter-prompts"
import { BoringToggle } from "./view-mode"

const LOCATION_PROMPT = "Where are you located?"

/** The name and location, on every page with the plain chat bar. The rest keeps the index label. */
export function TopBar({ location, place, linkedin }: { location: string; place?: string; linkedin: string }) {
  const path = usePathname()
  const project = path.startsWith("/work/")
  if (quietPage(path)) {
    return (
      <header className="top top-work">
        <Link
          href="/chat"
          onClick={(event) => {
            // The name starts a new chat: the conversation and its panel clear, open tabs stay.
            startNewChat()
            if (path === "/chat") {
              event.preventDefault()
              window.scrollTo(0, 0)
            }
          }}
        >
          Jackson, Tyler Bruce
        </Link>
        {/* LinkedIn and the location sit beside the name, at the left with the chat. */}
        <span className={project ? "contact on-project" : "contact"}>
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
        <span className="right">{project ? <BoringToggle /> : null}</span>
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
