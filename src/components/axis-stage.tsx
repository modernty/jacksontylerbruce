"use client"

import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const anchor = mode === "projects" ? "projects" : mode === "focus" ? "focus" : "axis"
  const svg = withMode(desktop, mode)
  const phone = withMode(mobile, mode)

  useEffect(() => {
    const stage = ref.current
    if (!stage) return
    const controller = new AbortController()
    bindTimeline(stage, cards, controller.signal, (href) => router.push(href))
    return () => controller.abort()
  }, [svg, cards, router])

  return (
    <section className="tlw" id={anchor} ref={ref} data-mode={mode}>
      {annotation ? <p className="note">{annotation}</p> : null}
      <div className="d" tabIndex={0} aria-label="Career timeline. Arrow keys step through projects; Enter opens one.">
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="card-slot">
          <div className="card" aria-live="polite">
            <div className="card-head">
              <h3 />
              <span className="when" />
            </div>
            <p className="fo" />
            <p className="sm" />
          </div>
        </div>
      </div>
      <div className={mode === "focus" ? "m mf" : "m"} dangerouslySetInnerHTML={{ __html: phone }} />
    </section>
  )
}
