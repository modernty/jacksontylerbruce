"use client"

import { useEffect, useMemo, useState } from "react"
import { StreamingText } from "@/src/components/assistant-ui/elements/streaming-text"

const WORD_MS = 45
const START_MS = 350

const words = (text: string) => text.split(" ").filter(Boolean).length

/**
 * Streams the introduction in on load, paragraph after paragraph.
 * The full text is in the page for screen readers and no-JS visitors. Reduced motion, a link to
 * something further down, or coming back to a project already seen this session shows it at once.
 * Whatever follows the introduction waits until it has finished. `onDone` fires then too.
 */
export function IntroStream({
  id,
  paragraphs,
  children,
  remember = true,
  heading = false,
  textClassName = "min-h-0 max-w-none text-[15px] leading-6",
  tint = true,
  emphasis,
  onDone,
}: {
  id: string
  paragraphs: string[]
  children?: React.ReactNode
  /** Remember a finished stream for this id, so the next visit shows it at once. */
  remember?: boolean
  /** The first paragraph is the page heading for screen readers. */
  heading?: boolean
  textClassName?: string
  /** Fresh words stay in their final colour instead of arriving light and settling. */
  tint?: boolean
  /** Paragraph index set in medium, counted from zero. */
  emphasis?: number
  onDone?: () => void
}) {
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
    if ((remember && seen) || deepLink || matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
  }, [total, id, remember])

  // Remembered once it has finished, so leaving mid-stream plays it again next time.
  useEffect(() => {
    if (!done || total === 0) return
    onDone?.()
    if (!remember) return
    try {
      sessionStorage.setItem(`intro-seen:${id}`, "1")
    } catch {
      // Not remembered.
    }
  }, [done, total, id, remember, onDone])

  const copy = paragraphs.map((paragraph, index) =>
    heading && index === 0 ? <h1 key={paragraph}>{paragraph}</h1> : <p key={paragraph}>{paragraph}</p>,
  )
  let offset = 0
  return (
    <>
      <div className="sr">{copy}</div>
      <noscript>{copy}</noscript>
      <div className="stream" aria-hidden>
        {paragraphs.map((paragraph, index) => {
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
              tint={tint}
              className={index === emphasis ? `${textClassName} emphasis` : textClassName}
            />
          )
        })}
      </div>
      <div className={done ? "after on" : "after"}>{children}</div>
    </>
  )
}
