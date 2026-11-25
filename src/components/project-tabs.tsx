"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const TABS_KEY = "open-tabs"
const TABS_EVENT = "tabs:change"
const MAX_TABS = 6

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(TABS_KEY) ?? "[]")
    return Array.isArray(parsed) ? parsed.filter((slug): slug is string => typeof slug === "string") : []
  } catch {
    return []
  }
}

function write(slugs: string[]) {
  try {
    sessionStorage.setItem(TABS_KEY, JSON.stringify(slugs))
  } catch {
    // Not kept, but the current tab still opens.
  }
  window.dispatchEvent(new Event(TABS_EVENT))
}

/** Adds a project tab beside the conversation, newest last. */
export function openTab(slug: string) {
  const rest = read().filter((item) => item !== slug)
  write([...rest, slug].slice(-MAX_TABS))
}

/**
 * The conversation and the projects opened from it, as tabs under the name. Closing the tab
 * you are on, or picking Conversation, goes back to the chat as it was left.
 */
export function ProjectTabs({ names }: { names: Record<string, string> }) {
  const path = usePathname()
  const router = useRouter()
  const [tabs, setTabs] = useState<string[]>([])

  useEffect(() => {
    const sync = () => setTabs(read().filter((slug) => names[slug]))
    sync()
    window.addEventListener(TABS_EVENT, sync)
    return () => window.removeEventListener(TABS_EVENT, sync)
  }, [names])

  const current = path.startsWith("/work/") ? path.slice("/work/".length).split(/[/?#]/)[0] : null
  // A project page is always one of the tabs, however the visitor got there (a shared link, another
  // window), so the way back to the conversation is always beside the name.
  useEffect(() => {
    if (current && names[current] && !read().includes(current)) openTab(current)
  }, [current, names])
  const shown = path === "/chat" || (current !== null && !!names[current])
  const list = current && names[current] && !tabs.includes(current) ? [...tabs, current] : tabs
  if (!shown || !list.length) return null

  const close = (slug: string) => {
    write(read().filter((item) => item !== slug))
    if (slug === current) router.push("/chat")
  }

  return (
    <nav className="tabs" aria-label="Open tabs">
      <Link href="/chat" className="tab" aria-current={path === "/chat" ? "page" : undefined}>
        Conversation
      </Link>
      {list.map((slug) => (
        <span key={slug} className="tab" aria-current={slug === current ? "page" : undefined}>
          <Link href={`/work/${slug}`}>{names[slug]}</Link>
          <button type="button" className="tab-close" onClick={() => close(slug)} aria-label={`Close ${names[slug]}`}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      ))}
    </nav>
  )
}
