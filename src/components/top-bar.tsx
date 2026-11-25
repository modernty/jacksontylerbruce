"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { quietPage } from "./chrome"
import { HOME_CHAT, closeHomePanel, handOff } from "./chat-thread"
import { CONTACT_EVENT } from "./mailto"
import { askHere } from "./starter-prompts"
import { BoringToggle } from "./view-mode"

const LOCATION_PROMPT = "Where are you located?"

/** The name and location, on every page with the plain chat bar. The rest keeps the index label. */
export function TopBar({ location, place, email, linkedin }: { location: string; place?: string; email: string; linkedin: string }) {
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
        {/* Mail, LinkedIn and the location sit beside the name, at the left with the chat. */}
        <span className={project ? "contact on-project" : "contact"}>
          <a
            href={`mailto:${email}`}
            className="icon-link mail-link"
            aria-label="Contact"
            title="Contact"
            onClick={(event) => {
              // With a composer on the page, write the note there; otherwise the plain mail link.
              const shell = document.querySelector<HTMLElement>(".hero-work .shell")
              if (!shell || shell.offsetParent === null) return
              event.preventDefault()
              window.dispatchEvent(new Event(CONTACT_EVENT))
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
              <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
              <path d="M3 5.5l7 5.5 7-5.5" strokeLinejoin="round" />
            </svg>
          </a>
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
