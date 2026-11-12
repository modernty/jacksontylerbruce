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
export function TopBar({ location, email, linkedin }: { location: string; email: string; linkedin: string }) {
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
        <span className="right">
          {project ? <BoringToggle /> : null}
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
            <a href={linkedin} className="icon-link" target="_blank" rel="noreferrer" aria-label="LinkedIn" title="LinkedIn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
                <rect x="2.5" y="2.5" width="15" height="15" rx="2.5" />
                <path d="M6.5 9v4.5M6.5 6.4v.1M9.5 13.5V9M9.5 11c0-1.2.9-2 2-2s2 .8 2 2v2.5" strokeLinecap="round" />
              </svg>
            </a>
          </span>
          <Link
            href="/chat"
            className="icon-link"
            aria-label={`Where are you located? ${location}`}
            title={location}
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
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
              <circle cx="10" cy="10" r="7.5" />
              <path d="M2.5 10h15M10 2.5c2 2.1 3 4.6 3 7.5s-1 5.4-3 7.5c-2-2.1-3-4.6-3-7.5s1-5.4 3-7.5z" />
            </svg>
          </Link>
        </span>
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
