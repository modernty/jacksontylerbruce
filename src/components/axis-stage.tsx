"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { bindTimeline } from "./behaviors"
import type { TimelineCard } from "@/src/timeline/types"

export function withMode(svg: string, mode: "timeline" | "projects" | "focus"): string {
  return svg.replace(/class="mode(?: on)?" data-m="(timeline|projects|focus)"/g, (_match, name: string) => {
    return `class="mode${name === mode ? " on" : ""}" data-m="${name}"`
  })
}

export function AxisStage({
  mode,
  desktop,
  mobile,
  cards,
  annotation,
}: {
  mode: "timeline" | "projects" | "focus"
  desktop: string
  mobile: string
  cards: TimelineCard[]
  annotation?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const path = usePathname()
  const focusHref = path.startsWith("/focus/") ? path : "/focus/ai"
  const svg = withMode(desktop, mode)
  const phone = withMode(mobile, mode)

  useEffect(() => {
    const stage = ref.current
    if (!stage) return
    const controller = new AbortController()
    bindTimeline(stage, cards, controller.signal)
    return () => controller.abort()
  }, [svg, cards])

  return (
    <section className="tlw" ref={ref} data-mode={mode}>
      <nav className="seg">
        <Link href="/timeline" className={mode === "timeline" ? "on" : undefined}>Timeline</Link>
        <Link href="/timeline/projects" className={mode === "projects" ? "on" : undefined}>Projects</Link>
        <Link href={focusHref} className={mode === "focus" ? "on" : undefined}>Focus</Link>
      </nav>
      {annotation ? <p className="note">{annotation}</p> : null}
      <div className="d" tabIndex={0} aria-label="Career timeline, use arrow keys to step through projects">
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="card" role="dialog" aria-live="polite">
          <h3 />
          <div className="meta" />
          <div className="fo" />
          <div className="sm" />
          <div className="row">
            <a href="/timeline">Open project →</a>
            <div className="nav">
              <button type="button" data-s="-1" aria-label="Previous project">←</button>
              <button type="button" data-s="1" aria-label="Next project">→</button>
            </div>
          </div>
        </div>
      </div>
      <div className={mode === "focus" ? "m mf" : "m"} dangerouslySetInnerHTML={{ __html: phone }} />
    </section>
  )
}
