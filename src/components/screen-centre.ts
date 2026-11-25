"use client"

import { useCallback, useRef } from "react"

/**
 * Centres what a frame holds on the screen, not on the frame: a frame sits under its panel's heading,
 * so its own middle is lower than the screen's. The content moves up toward the screen's middle as far
 * as the frame's spare room allows, never past the frame's top. Phones keep the frame's own centring.
 */
export function useScreenCentre() {
  const stop = useRef<(() => void) | null>(null)
  return useCallback((frame: HTMLElement | null) => {
    stop.current?.()
    stop.current = null
    if (!frame) return
    const place = () => {
      if (!matchMedia("(min-width: 769px)").matches) {
        frame.style.removeProperty("--lift")
        return
      }
      // The drawing or picture itself: a wrapper around it may fill the frame.
      const art = [...frame.querySelectorAll("svg, img, video, canvas, .grain")].map((el) => el.getBoundingClientRect()).filter((r) => r.height > 40)
      const tall = art.length ? Math.max(...art.map((r) => r.height)) : frame.getBoundingClientRect().height
      const box = frame.getBoundingClientRect()
      const lift = Math.max(0, Math.min((box.top + box.bottom) / 2 - innerHeight / 2, (box.height - tall) / 2))
      frame.style.setProperty("--lift", `${Math.round(lift)}px`)
    }
    const sizes = new ResizeObserver(place)
    const watch = () => {
      sizes.disconnect()
      sizes.observe(frame)
      for (const child of frame.querySelectorAll("svg, img, video, canvas, .grain")) sizes.observe(child)
      place()
    }
    // A turning globe changes its drawing every frame: look again at most once a frame.
    let queued = 0
    const children = new MutationObserver(() => {
      if (!queued) queued = requestAnimationFrame(() => { queued = 0; watch() })
    })
    children.observe(frame, { childList: true, subtree: true })
    addEventListener("resize", place)
    watch()
    stop.current = () => {
      sizes.disconnect()
      children.disconnect()
      cancelAnimationFrame(queued)
      removeEventListener("resize", place)
    }
  }, [])
}
