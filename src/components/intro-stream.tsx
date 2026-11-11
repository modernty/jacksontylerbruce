"use client"

import { useEffect, useMemo, useState } from "react"
import { StreamingText } from "@/src/components/assistant-ui/elements/streaming-text"

const WORD_MS = 45
const START_MS = 350

const words = (text: string) => text.split(" ").filter(Boolean).length

/**
 * Streams the project introduction in on load, paragraph after paragraph.
 * The full text is in the page for screen readers and no-JS visitors. Reduced motion, a link to
 * something further down, or coming back to a project already seen this session shows it at once.
 * Whatever follows the introduction waits until it has finished.
 */
export function IntroStream({ id, paragraphs, children }: { id: string; paragraphs: string[]; children?: React.ReactNode }) {
  const total = useMemo(() => paragraphs.reduce((sum, paragraph) => sum + words(paragraph), 0), [paragraphs])
  const [count, setCount] = useState(0)
  const done = count >= total

  useEffect(() => {
    const hash = decodeURIComponent(location.hash.slice(1))
    const deepLink = hash ? document.getElementById(hash)?.closest(".after") : null
    let seen = false
    try {
      seen = sessionStorage.getItem(`intro-seen:${id}`) === "1"
    } catch {
      // Without storage the intro streams every time.
    }
    if (seen || deepLink || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(total)
      return
    }
    let timer = 0
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        setCount((current) => {
          if (current + 1 >= total) window.clearInterval(timer)
          return current + 1
        })
      }, WORD_MS)
    }, START_MS)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(timer)
    }
  }, [total, id])

  // Remembered once it has finished, so leaving mid-stream plays it again next time.
  useEffect(() => {
    if (!done || total === 0) return
    try {
      sessionStorage.setItem(`intro-seen:${id}`, "1")
    } catch {
      // Not remembered.
    }
  }, [done, total, id])

  let offset = 0
  return (
    <>
      <div className="sr">
        {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <noscript>
        {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </noscript>
      <div className="stream" aria-hidden>
        {paragraphs.map((paragraph) => {
          const start = offset
          offset += words(paragraph)
          const shown = count - start
          if (shown <= 0) return null
          return (
            <StreamingText
              key={paragraph}
              segments={[{ text: paragraph }]}
              count={shown}
              streaming={!done && shown < words(paragraph)}
              className="min-h-0 max-w-none text-[15px] leading-6"
            />
          )
        })}
      </div>
      <div className={done ? "after on" : "after"}>{children}</div>
    </>
  )
}
