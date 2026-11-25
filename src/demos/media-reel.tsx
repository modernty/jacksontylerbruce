"use client"

import { useEffect, useRef, useState } from "react"
import type { ReelSpec } from "@/src/content/demos"
import { MediaDemo } from "./media-demo"

/**
 * One plate, laid out sideways: the live demo first, then the core screens behind it, each with a
 * line on what it shows. Wider than the plate, it scrolls across, with buttons for a mouse.
 */
export function MediaReel({ reel }: { reel: ReelSpec }) {
  const track = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })

  useEffect(() => {
    const el = track.current
    if (!el) return
    const read = () => setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 4 })
    read()
    el.addEventListener("scroll", read, { passive: true })
    const observer = new ResizeObserver(read)
    observer.observe(el)
    return () => {
      el.removeEventListener("scroll", read)
      observer.disconnect()
    }
  }, [])

  const step = (way: 1 | -1) => {
    const el = track.current
    if (!el) return
    const card = el.querySelector<HTMLElement>(".reel-item")
    const by = card ? card.offsetWidth + 24 : el.clientWidth * 0.8
    el.scrollBy({ left: way * by, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  }

  return (
    <section className="frame media-reel" aria-label={reel.title}>
      <header className="story-head">
        <p className="chapter-kicker">{reel.kicker}</p>
        <h3>{reel.title}</h3>
        {reel.intro ? <p className="story-change">{reel.intro}</p> : null}
      </header>
      <div className="reel-track" ref={track} tabIndex={0} aria-label={`${reel.title}: scroll across`}>
        <figure className="reel-item reel-live">
          <MediaDemo demo={reel.demo} bare landing />
          <figcaption>
            <b>{reel.demo.title}</b>
            {reel.demo.caption ? <span>{reel.demo.caption}</span> : null}
          </figcaption>
        </figure>
        {reel.screens.map((screen) => (
          <figure key={screen.src} className="reel-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={screen.src} alt={screen.alt} loading="lazy" />
            <figcaption>
              <b>{screen.title}</b>
              <span>{screen.caption}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="reel-steps">
        <button type="button" className="gallery-step" onClick={() => step(-1)} disabled={edge.start} aria-label="Scroll left">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 2.5L4 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className="gallery-step" onClick={() => step(1)} disabled={edge.end} aria-label="Scroll right">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5L8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </section>
  )
}
