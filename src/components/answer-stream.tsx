"use client"

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react"
import { StreamingText } from "@/src/components/assistant-ui/elements/streaming-text"

const WORD_MS = 45
const START_MS = 350
/** A heading, or a block that arrives whole, takes this many words' time to fade in. */
const HEAD_TICKS = 8
/** The breath between one section and the next. */
const GAP_TICKS = 10

/** One section of the answer: an optional heading, paragraphs that stream, and anything that fades in after them. */
export type AnswerGroup = {
  id?: string
  className?: string
  head?: ReactNode
  paragraphs?: string[]
  tail?: ReactNode
  /** A control that follows the section once it has arrived, like the media toggle after the
   *  description. Shown once, outside the hidden copy, so it stays one focusable button. */
  control?: ReactNode
}

const words = (text: string) => text.split(" ").filter(Boolean).length

type Placed = { group: AnswerGroup; start: number; headAt: number; paras: { text: string; at: number; length: number }[]; tailAt: number; end: number }

function place(groups: AnswerGroup[]) {
  let at = 0
  const placed: Placed[] = groups.map((group, index) => {
    if (index > 0) at += GAP_TICKS
    const start = at
    const headAt = at
    if (group.head) at += HEAD_TICKS
    const paras = (group.paragraphs ?? []).map((text) => {
      const para = { text, at, length: words(text) }
      at += para.length
      return para
    })
    const tailAt = at
    if (group.tail) at += HEAD_TICKS
    return { group, start, headAt, paras, tailAt, end: at }
  })
  return { placed, total: at }
}

/**
 * A project told the way the chat answers: each section arrives in turn, its heading fading in and
 * its text streaming word by word. The full text is in the page for screen readers and no-JS
 * visitors. Reduced motion, a link to a section, or coming back to a project already seen this
 * session shows it at once. Whatever follows waits until it has finished.
 */
export function AnswerStream({ id, groups, children, instant = false, onDone }: { id: string; groups: AnswerGroup[]; children?: ReactNode; instant?: boolean; onDone?: () => void }) {
  const { placed, total } = useMemo(() => place(groups), [groups])
  const [count, setCount] = useState(instant ? total : 0)
  const done = count >= total

  useEffect(() => {
    if (instant) return
    const hash = decodeURIComponent(location.hash.slice(1))
    const deepLink = !!hash && groups.some((group) => group.id === hash)
    let seen = false
    try {
      seen = sessionStorage.getItem(`intro-seen:${id}`) === "1"
    } catch {
      // Without storage the answer streams every time.
    }
    if (seen || deepLink || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(total)
      // The section asked for exists only now, so it is brought into view again.
      if (deepLink) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }))
      return
    }
    let timer = 0
    const begin = window.setTimeout(() => {
      timer = window.setInterval(() => {
        setCount((current) => {
          if (current + 1 >= total) window.clearInterval(timer)
          return current + 1
        })
      }, WORD_MS)
    }, START_MS)
    return () => {
      window.clearTimeout(begin)
      window.clearInterval(timer)
    }
    // Groups are static content for a page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, id, instant])

  // Whatever sits below the answer waits for it: told once, when the last word is in.
  useEffect(() => {
    if (done || total === 0) onDone?.()
    // onDone is the page's own setter; telling it again changes nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, total])

  // Remembered once it has finished, so leaving mid-stream plays it again next time.
  useEffect(() => {
    if (!done || total === 0 || instant) return
    try {
      sessionStorage.setItem(`intro-seen:${id}`, "1")
    } catch {
      // Not remembered.
    }
  }, [done, total, id, instant])

  const copy = groups.map((group, index) => (
    <div key={group.id ?? index}>
      {group.head}
      {(group.paragraphs ?? []).map((text) => <p key={text}>{text}</p>)}
      {group.tail}
    </div>
  ))

  return (
    <>
      {instant ? null : (
        <>
          <div className="sr">{copy}</div>
          <noscript>{copy}</noscript>
        </>
      )}
      <div className="answer">
        {placed.map(({ group, headAt, paras, tailAt, end }, index) => (
          // Every section is in the page from the start, empty until its turn, so links to it land.
          // The streamed words are hidden from screen readers, which read the full copy above.
          <Fragment key={group.id ?? index}>
          <section id={group.id} className={["answer-section", group.className].filter(Boolean).join(" ")} aria-hidden={instant ? undefined : true}>
            {group.head && count > headAt ? <div className="answer-in">{group.head}</div> : null}
            {paras.map((para) => {
              const shown = count - para.at
              if (shown <= 0) return null
              return (
                <StreamingText
                  key={para.text}
                  segments={[{ text: para.text }]}
                  count={shown}
                  streaming={!done && shown < para.length}
                  tint
                  className="answer-text min-h-0 max-w-none text-[16px] leading-[24px] tracking-[-.01em]"
                />
              )
            })}
            {group.tail && count > tailAt ? <div className="answer-in">{group.tail}</div> : null}
          </section>
          {group.control && count >= end ? <div className="answer-in answer-control">{group.control}</div> : null}
          </Fragment>
        ))}
      </div>
      <div className={done ? "after on" : "after"}>{children}</div>
    </>
  )
}
