"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { DemoSpec } from "@/src/content/demos"

/** The page each kind of demo is laid out on, and the part of it the tile shows. */
const PAGES = {
  // The phone sits centred on its page, so the crop trims the page's empty band above and below it:
  // the phone's top then sits at the tile's top, level with whatever lines up beside it.
  phone: { page: { width: 780, height: 920 }, crop: { width: 440, height: 874, top: 23 } },
  desktop: { page: { width: 1280, height: 820 }, crop: { width: 1280, height: 820, top: 0 } },
}

/**
 * A demo in a project's media, live and scaled to fit. One that plays itself plays here, takes no
 * input, and can be paused; a site can be clicked through where it sits.
 */
export function MediaDemo({ demo, bare = false, landing = false }: { demo: DemoSpec; bare?: boolean; landing?: boolean }) {
  const stage = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  // Anything that plays on its own can be stopped (WCAG 2.2.2).
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const fit = () => setBox({ width: el.clientWidth, height: el.clientHeight })
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    fit()
    return () => observer.disconnect()
  }, [])
  // The prototype listens for pause and play; sent again on load so a reload keeps the choice.
  const tell = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ demo: paused ? "pause" : "play" }, window.location.origin)
  }, [paused])
  useEffect(tell, [tell])
  // A demo that waits to be landed on hears when it comes into view and when it leaves, and
  // starts (or stops) its own playing then. Told again on load, since a lazy frame can load late.
  const inView = useRef(false)
  const land = useCallback(() => {
    if (landing) frame.current?.contentWindow?.postMessage({ demo: inView.current ? "land" : "leave" }, window.location.origin)
  }, [landing])
  useEffect(() => {
    const el = stage.current
    if (!landing || !el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === inView.current) return
      inView.current = entry.isIntersecting
      land()
    }, { threshold: 0.6 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [landing, land])
  const { page, crop } = PAGES[demo.frame]
  const scale = box.width ? Math.min(box.width / crop.width, box.height / crop.height) : 0
  const plays = demo.kind === "autoplay"
  const stageEl = (
    <div className="media-demo-stage" ref={stage}>
      {scale ? (
        <div className="media-demo-crop" style={{ width: crop.width * scale, height: crop.height * scale }}>
          <iframe
            ref={frame}
            onLoad={() => {
              tell()
              if (inView.current) land()
            }}
            src={demo.src}
            title={demo.title}
            tabIndex={plays ? -1 : undefined}
            aria-hidden={plays ? true : undefined}
            loading="lazy"
            className={plays ? "watch-only" : undefined}
            style={{ width: page.width, height: page.height, left: (-(page.width - crop.width) / 2) * scale, top: -crop.top * scale, transform: `scale(${scale})` }}
          />
        </div>
      ) : null}
    </div>
  )
  // Bare is the live stage alone, for a plate that captions it itself.
  if (bare) return <div className={`media-demo ${demo.frame}`}>{stageEl}</div>
  return (
    <figure className={`frame media-demo ${demo.frame}`}>
      {stageEl}
      <figcaption className="media-demo-caption">
        {plays ? (
          <button type="button" className="story-pause" aria-pressed={paused} aria-label={paused ? "Play the demo" : "Pause the demo"} onClick={() => setPaused((on) => !on)}>
            {paused ? (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 2.5l6 3.5-6 3.5z" fill="currentColor" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5v7M8 2.5v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            )}
          </button>
        ) : null}
        <span>{plays ? "Demo" : "Live site"} · {demo.title}</span>
        {demo.caption ? <small>{demo.caption}</small> : null}
      </figcaption>
    </figure>
  )
}
