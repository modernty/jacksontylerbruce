"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { quietPage } from "./chrome"
import { HOME_CHAT, closeHomePanel, handOff } from "./chat-thread"
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
            // The name puts the conversation back on its own. The chat stays; the panel beside it closes.
            if (path === "/chat") event.preventDefault()
            closeHomePanel()
          }}
        >
          Jackson, <em>Tyler</em> Bruce
        </Link>
        {/* LinkedIn and the location sit beside the name, at the left with the chat. */}
        <span className={project ? "contact on-project" : "contact"}>
          <a href={linkedin} className="top-link external" target="_blank" rel="noreferrer">
            <span>LinkedIn</span>
            {/* It leaves the site, so it ends on the arrow out instead of leading with a dot. */}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.5 7.5l5-5M3.5 2.5h4v4" />
            </svg>
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
      <Link href="/chat" onClick={() => closeHomePanel()}>Jackson, <em>Tyler</em> Bruce</Link>
    </header>
  )
}
