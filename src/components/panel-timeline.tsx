"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { desktopSvg } from "@/src/timeline/svg"
import type { TimelineModel } from "@/src/timeline/types"
import { desktopTimeline } from "./timeline-modal"

/** Space left clear on each side of the drawing, inside the panel. */
const SIDE = 36

/**
 * The career timeline in the chat's side panel, drawn at the width it is shown at: the time axis (the
 * role bars, the lanes, the years) spans the panel less 36px each side, while the type keeps one real
 * size, 12px on an ordinary desktop and 16px from 2000px wide. Until it is measured it shows the
 * server's drawing.
 */
export function PanelTimeline({ model, fallback }: { model: TimelineModel; fallback: string }) {
  const holder = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<{ width: number; type: number } | null>(null)

  useLayoutEffect(() => {
    const el = holder.current
    if (!el) return
    const read = () => {
      const width = Math.max(560, Math.round(el.clientWidth - SIDE * 2))
      const type = innerWidth >= 2000 ? 16 : 12
      if (el.clientWidth) setFit((was) => (was && was.width === width && was.type === type ? was : { width, type }))
    }
    read()
    const sizes = new ResizeObserver(read)
    sizes.observe(el)
    return () => sizes.disconnect()
  }, [])

  const drawing = useMemo(() => (fit ? desktopSvg(model, fit.width, 340, { edge: true, type: fit.type }) : fallback), [fit, model, fallback])

  // Grow it in once, when the fitted drawing first shows.
  const fitted = fit !== null
  useEffect(() => {
    if (fitted && holder.current) desktopTimeline(holder.current)
  }, [fitted])

  return <div className="panel-timeline desk fitted" ref={holder} dangerouslySetInnerHTML={{ __html: drawing }} />
}
