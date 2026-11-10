"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef } from "react"
import { bindTimeline } from "./behaviors"
import type { TimelineCard } from "@/src/timeline/types"

export function withMode(svg: string, mode: "timeline" | "projects" | "focus"): string {
  return svg.replace(/class="mode(?: on)?" data-m="(timeline|projects|focus)"/g, (_match, name: string) => {
    return `class="mode${name === mode ? " on" : ""}" data-m="${name}"`
  })
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}

/** Mobile project labels become links to their case study, with a row-tall tap target. */
export function linkMobile(svg: string, cards: TimelineCard[]): string {
  const hrefs = new Map(cards.map((card) => [card.t, card.u]))
  return svg.replace(/<text class="mpj"([^>]*) y="([\d.]+)"([^>]*)>([^<]+)<\/text>/g, (match, before: string, y: string, after: string, name: string) => {
    const href = hrefs.get(name.replace(/&amp;/g, "&"))
    if (!href) return match
    const top = (Number(y) - 10).toFixed(1)
    return `<a class="mpl" href="${escapeAttr(href)}" aria-label="${escapeAttr(name)}"><rect x="150" y="${top}" width="192" height="13" fill="transparent"/>${match}</a>`
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
  const focusSlug = path.startsWith("/focus/") ? path.slice("/focus/".length) : "ai"
  const focusHref = `/focus/${focusSlug}#focus`
  const anchor = mode === "projects" ? "projects" : mode === "focus" ? "focus" : "axis"
  const svg = withMode(desktop, mode)
  const phone = linkMobile(withMode(mobile, mode), cards)
  const cardTitle = useId()

  useEffect(() => {
    const stage = ref.current
    if (!stage) return
    const controller = new AbortController()
    bindTimeline(stage, cards, controller.signal)
    return () => controller.abort()
  }, [svg, cards])

  return (
    <section className="tlw" id={anchor} ref={ref} data-mode={mode}>
      <nav className="seg">
        <Link href="/timeline#axis" className={mode === "timeline" ? "on" : undefined}>Timeline</Link>
        <Link href="/timeline/projects#projects" className={mode === "projects" ? "on" : undefined}>Projects</Link>
        <Link href={focusHref} className={mode === "focus" ? "on" : undefined}>Focus</Link>
      </nav>
      {annotation ? <p className="note">{annotation}</p> : null}
      <div className="d" role="group" tabIndex={0} aria-label="Career timeline, use arrow keys to step through projects">
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="card" role="dialog" aria-labelledby={cardTitle} aria-live="polite" inert>
          <h3 id={cardTitle} />
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
