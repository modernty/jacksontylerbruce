"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { DiagramSpec } from "@/src/content/demos"
import { storyKeys } from "./story-track"

/** How long each step holds, in ms: long enough for its animation to play out and be read. */
const DUR = [7000, 7000, 6000, 7000]
const STAGES = ["why", "all", "onboarding", "lily"] as const
const TASKS = ["Triage tickets", "Draft replies", "Answer FAQs", "Look up orders", "Issue refunds", "Update accounts"]
/** The trust line's rungs, placed along it (x, y in % of the plot). The first three happen in onboarding. */
const RUNGS = [
  { label: "Helps you set up", x: 19.22, y: 80.48 },
  { label: "Introduces you to Desk", x: 32.47, y: 68.29 },
  { label: "Suggests what to do next", x: 45.72, y: 56.1 },
  { label: "Drafts work for your approval", x: 58.97, y: 43.9 },
  { label: "Acts on its own", x: 73.05, y: 30.95 },
  { label: "Runs your Desk", x: 87.13, y: 18 },
]
const LILY = "/studies/botpress/lily.svg"

/**
 * Where support is going, as a diagram in four steps: support tasks flip to AI one by one and the
 * team moves up to directing agents; then the trust line draws in, its onboarding rungs light up,
 * and Lily climbs it. Plays while in view, like the story chapters, with the same controls.
 * Ported from the Botpress concept site.
 */
export function TrustDiagram({ when, title, change, diagram }: { when: string; title: string; change?: string; diagram: DiagramSpec }) {
  const root = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  const [inView, setInView] = useState(false)
  const [reduce, setReduce] = useState(false)
  // The first step's animation: how many tasks have flipped to AI, and whether the team has moved up.
  const [flipped, setFlipped] = useState(0)
  const [up, setUp] = useState(false)
  const left = useRef(DUR[0])
  const startedAt = useRef(0)

  useEffect(() => setReduce(matchMedia("(prefers-reduced-motion: reduce)").matches), [])

  // In view, it starts again from the first step, playing.
  useEffect(() => {
    const el = root.current
    if (!el) return
    let was = false
    const observer = new IntersectionObserver(([entry]) => {
      const now = entry.isIntersecting
      if (now && !was) {
        storyKeys.owner = el
        setStep(0)
        setPaused(false)
        left.current = DUR[0]
      }
      if (!now && storyKeys.owner === el) storyKeys.owner = null
      was = now
      setInView(now)
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => {
      observer.disconnect()
      if (storyKeys.owner === el) storyKeys.owner = null
    }
  }, [])

  const goTo = useCallback((k: number) => {
    const next = (k + STAGES.length) % STAGES.length
    left.current = DUR[next]
    setStep(next)
  }, [])

  // The timer: holds the step for what is left of its time, then moves on.
  useEffect(() => {
    if (!inView || paused || reduce) return
    startedAt.current = performance.now()
    const timer = window.setTimeout(() => goTo(step + 1), left.current)
    return () => {
      window.clearTimeout(timer)
      left.current = Math.max(400, left.current - (performance.now() - startedAt.current))
    }
  }, [step, inView, paused, reduce, goTo])

  // Step one plays its tasks flipping, then the team stepping up, picking up where it left off after a
  // pause. It rewinds only once it is out of sight: off screen, or after the next step has faded it out.
  const flippedNow = useRef(0)
  flippedNow.current = flipped
  useEffect(() => {
    if (reduce) {
      setFlipped(TASKS.length)
      setUp(true)
      return
    }
    if (!inView) {
      setFlipped(0)
      setUp(false)
      return
    }
    if (step !== 0) {
      const rewind = window.setTimeout(() => {
        setFlipped(0)
        setUp(false)
      }, 600)
      return () => window.clearTimeout(rewind)
    }
    if (paused) return
    const from = flippedNow.current
    const timers = TASKS.slice(from).map((_, k) => window.setTimeout(() => setFlipped(from + k + 1), 600 + k * 450))
    timers.push(window.setTimeout(() => setUp(true), 600 + (TASKS.length - from) * 450 + 300))
    return () => timers.forEach(window.clearTimeout)
  }, [step, inView, paused, reduce])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!inView || storyKeys.owner !== root.current || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return
      if ((event.target as HTMLElement)?.closest?.("input, textarea, [contenteditable]")) return
      event.preventDefault()
      goTo(step + (event.key === "ArrowRight" ? 1 : -1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [inView, step, goTo])

  const stage = STAGES[step]
  const current = diagram.steps[step]
  const running = inView && !reduce && !paused
  return (
    <div
      ref={root}
      className={["story", "diagram", running && "is-run", paused && "is-paused"].filter(Boolean).join(" ")}
      style={{ "--n": STAGES.length, "--dur": `${DUR[step]}ms` } as React.CSSProperties}
    >
      <header className="story-head">
        <p className="chapter-kicker">{when}</p>
        <h3>{title}</h3>
        {change ? <p className="story-change">{change}</p> : null}
      </header>
      <div className="story-screen diagram-screen" data-stage={stage} role="img" aria-label={`${current.title}. ${current.why}`}>
        <div className={up ? "shift is-up" : "shift"} aria-hidden="true">
          <div className="shift-tier">
            <span className="shift-k">The team moves up to</span>
            <b>Directing agents</b>
          </div>
          <i className="shift-link" />
          <div className="shift-box">
            <span className="shift-k">Customer support</span>
            <div className="shift-tiles">
              {TASKS.map((task, i) => (
                <span key={task} className={i < flipped ? "tile is-ai" : "tile"}>
                  <span className="tile-in">
                    <span className="tile-f">{task}</span>
                    <span className="tile-b">{task}<em>✦ AI</em></span>
                  </span>
                </span>
              ))}
            </div>
          </div>
          <span className="shift-who">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4.2" /><path d="M3.5 22c0-4.7 3.8-8 8.5-8s8.5 3.3 8.5 8z" /></svg>
          </span>
        </div>
        <div className={step > 0 ? "curve is-drawn" : "curve"} data-stage={stage} aria-hidden="true">
          <svg viewBox="0 0 640 420">
            <line className="curve-axis" x1="70" y1="370" x2="610" y2="370" />
            <line className="curve-axis" x1="70" y1="370" x2="70" y2="20" />
            <text className="curve-axis-k" x="610" y="398" textAnchor="end">Trust level →</text>
            <text className="curve-axis-k" x="0" y="0" transform="translate(44 370) rotate(-90)">Stakes of the task →</text>
            <line className="curve-line" x1="70" y1="370" x2="600" y2="50" pathLength={1} />
            <line className="curve-hl" x1="123" y1="338" x2="292.6" y2="235.6" />
            <line className="curve-hl-all" x1="70" y1="370" x2="600" y2="50" />
          </svg>
          {RUNGS.map((rung, i) => (
            <div key={rung.label} className={i < 3 ? "curve-pt is-onb" : "curve-pt"} style={{ "--i": i, "--x": `${rung.x}%`, "--y": `${rung.y}%` } as React.CSSProperties}>
              <i className="curve-dot" />
              <span className="curve-lab">{rung.label}</span>
            </div>
          ))}
          <span className="curve-callout">Where the relationship starts</span>
          <span className="curve-callout curve-callout-lily">Every step builds trust in Lily</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="curve-lily" src={LILY} alt="" />
        </div>
      </div>
      <div className="story-controls">
        <button type="button" className="story-pause" aria-pressed={paused} aria-label={paused ? "Play" : "Pause"} onClick={() => setPaused((on) => !on)}>
          <svg className="if-playing" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5v7M8 2.5v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          <svg className="if-paused" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 2.5l6 3.5-6 3.5z" fill="currentColor" /></svg>
        </button>
        <ol className="story-steps" aria-label="Steps">
          {diagram.steps.map((item, k) => (
            <li key={item.label}>
              <button type="button" aria-current={k === step ? "step" : undefined} onClick={() => goTo(k)}>
                <b>{item.label}</b>
                <span className="sr-only">{item.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div key={step} className="story-cap is-in" aria-hidden="true">
        <b>{current.title}</b>
        <small>{step + 1} / {STAGES.length}</small>
        <span>{current.why}</span>
      </div>
    </div>
  )
}
