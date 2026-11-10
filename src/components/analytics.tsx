"use client"

import { track } from "@vercel/analytics"
import { Analytics } from "@vercel/analytics/next"
import { useEffect } from "react"
import { scrubUrl } from "@/src/analytics/scrub"

/** Vercel Web Analytics with question text stripped from every URL before it leaves the browser. */
export function SiteAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: scrubUrl(event.url) })} />
}

export function TrackOnMount({ name, props }: { name: string; props: Record<string, string> }) {
  const key = JSON.stringify(props)
  useEffect(() => {
    track(name, JSON.parse(key) as Record<string, string>)
  }, [name, key])
  return null
}
