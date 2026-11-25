"use client"

import { useLayoutEffect, useRef } from "react"

/**
 * Text cut to a number of lines on a whole word, ending in an ellipsis.
 * CSS line-clamp makes room for its ellipsis by cutting into the last word ("stabi…"); this never does.
 * The full text stays available to screen readers.
 */
export function ClampText({ text, lines = 2, className, as: Tag = "p" }: { text: string; lines?: number; className?: string; as?: "p" | "span" }) {
  const shown = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = shown.current
    if (!el) return
    const fit = () => {
      el.textContent = text
      const max = parseFloat(getComputedStyle(el).lineHeight) * lines + 1
      if (el.offsetHeight <= max) return
      const words = text.split(/\s+/)
      // Fewest words cut: binary search for the longest prefix that fits with the ellipsis.
      let low = 1
      let high = words.length - 1
      while (low < high) {
        const mid = Math.ceil((low + high) / 2)
        el.textContent = `${words.slice(0, mid).join(" ")}…`
        if (el.offsetHeight <= max) low = mid
        else high = mid - 1
      }
      el.textContent = `${words.slice(0, low).join(" ").replace(/[\s,;:.–—-]+$/, "")}…`
    }
    fit()
    // Refit only when the width changes; the fit itself changes the height.
    let width = el.clientWidth
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return
      width = el.clientWidth
      fit()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [text, lines])
  return (
    <Tag className={className} title={text} style={Tag === "span" ? { display: "block" } : undefined}>
      <span ref={shown} aria-hidden="true" style={{ display: "block" }}>{text}</span>
      <span className="sr-only">{text}</span>
    </Tag>
  )
}
