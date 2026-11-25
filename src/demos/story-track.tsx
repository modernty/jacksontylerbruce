"use client"

import { useEffect, useRef } from "react"
import type { StorySpec } from "@/src/content/demos"

/** How long each screen holds, in ms. A step with two screens fills its bar across both. */
const DUR = 6500

/** With several chapters on screen, the arrow keys go to the one that came into view last. */
export const storyKeys: { owner: HTMLElement | null } = { owner: null }

type Flat = { src: string; alt: string; focus?: string; later?: string; delay?: number; step: number }

const zoomOf = (spec?: string) => Number((spec || "50 50 1").split(" ")[2])

/**
 * One chapter of a story: the steps play on a timer while the chapter is on screen, and a camera
 * moves in on the part of each screen that matters (Lily, mostly) and back out for the next.
 * Clicking a step jumps to it; it can be paused, and the arrow keys step through while it is in view.
 * It starts from the first step whenever it comes into view. It sits in a project's media.
 */
export function StoryTrack({ when, title, change, story }: { when: string; title: string; change?: string; story: StorySpec }) {
  const track = useRef<HTMLDivElement>(null)
  const frames: Flat[] = story.steps.flatMap((step, index) => step.frames.map((frame) => ({ ...frame, step: index })))

  useEffect(() => {
    const root = track.current
    if (!root) return
    const cam = root.querySelector<HTMLElement>(".story-cam")!
    const shots = [...root.querySelectorAll<HTMLImageElement>(".story-frame")]
    const buttons = [...root.querySelectorAll<HTMLButtonElement>(".story-steps button")]
    const cap = root.querySelector<HTMLElement>(".story-cap")!
    const toggle = root.querySelector<HTMLButtonElement>(".story-pause")!
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    const n = shots.length
    let cur = 0
    let step = -1
    let camZ = 1
    let inView = false
    let paused = false
    let startedAt = 0
    let left = DUR
    let timer: ReturnType<typeof setTimeout> | undefined
    let later: ReturnType<typeof setTimeout> | undefined
    let pre: ReturnType<typeof setTimeout> | undefined
    let snap: ReturnType<typeof setTimeout> | undefined
    const stepOf = (i: number) => frames[i].step
    const framesIn = (s: number) => frames.filter((frame) => frame.step === s).length || 1

    /** The camera: centre on a focus, clamped so the screen's edges never show. */
    function aim(spec: string | undefined, delay: string) {
      const [fx, fy, z] = (spec || "50 50 1").split(" ").map(Number)
      camZ = z
      const x = Math.max(0, Math.min(100 - 100 / z, fx - 50 / z))
      const y = Math.max(0, Math.min(100 - 100 / z, fy - 50 / z))
      cam.style.transitionDelay = delay
      cam.style.transform = `scale(${z}) translate(${-x}%, ${-y}%)`
    }
    function cut(spec: string | undefined) {
      cam.style.transition = "none"
      aim(spec, "0s")
      void cam.offsetWidth
      cam.style.transition = ""
    }
    function caption(s: number) {
      const item = story.steps[s]
      cap.querySelector("b")!.textContent = item.title
      cap.querySelector("small")!.textContent = `${s + 1} / ${story.steps.length}`
      cap.querySelector("span")!.textContent = item.why
      cap.classList.remove("is-in")
      void cap.offsetWidth
      cap.classList.add("is-in")
    }
    function fill() {
      root!.classList.remove("is-run")
      // Paused, the current step's bar shows whole rather than stopped at the start.
      if (!inView || reduce || paused) return
      void root!.offsetWidth
      root!.classList.add("is-run")
    }
    function show(i: number) {
      const prev = shots[cur]
      cur = i
      clearTimeout(later)
      clearTimeout(pre)
      const s = stepOf(i)
      const fresh = s !== step
      step = s
      buttons.forEach((button, k) => (k === s ? button.setAttribute("aria-current", "step") : button.removeAttribute("aria-current")))
      if (fresh) {
        root!.style.setProperty("--dur", `${DUR * framesIn(s)}ms`)
        fill()
        caption(s)
      }
      const z = zoomOf(frames[i].focus)
      if (camZ > 1 && z <= 1 && prev && prev !== shots[i]) {
        // Zoomed in and the next screen is whole: no zoom-out. The old screen keeps its zoom
        // while it fades away, and the camera snaps back underneath the new one.
        prev.style.transformOrigin = "0 0"
        prev.style.transform = cam.style.transform
        cut("50 50 1")
        clearTimeout(snap)
        snap = setTimeout(() => (prev.style.transform = ""), 700)
      } else {
        aim(frames[i].focus, z > 1 ? ".6s" : "0s")
      }
      shots.forEach((shot, k) => shot.classList.toggle("is-on", k === i))
      // A screen can land whole first, then move in on Lily partway through.
      const move = frames[i].later
      if (inView && !paused && move) later = setTimeout(() => aim(move, "0s"), frames[i].delay ?? 1200)
      // When the next screen continues this step zoomed in (a card opening up), move there
      // just before the swap, so the zoom anticipates the change.
      const next = frames[(i + 1) % n]
      if (inView && !paused && !reduce && n > 1 && next.step === s && zoomOf(next.focus) > 1 && next.focus !== (frames[i].later || frames[i].focus))
        pre = setTimeout(() => aim(next.focus, "0s"), DUR - 1700)
    }
    /** Holds the current screen for ms (a full screen's time unless resuming), then moves on. */
    function play(ms = DUR) {
      clearTimeout(timer)
      if (paused) return
      if (!inView || reduce) {
        root!.classList.remove("is-run")
        return
      }
      startedAt = performance.now()
      left = ms
      timer = setTimeout(() => {
        show((cur + 1) % n)
        play()
      }, ms)
    }
    function setPaused(next: boolean) {
      paused = next
      root!.classList.toggle("is-paused", next)
      toggle.setAttribute("aria-pressed", String(next))
      toggle.setAttribute("aria-label", next ? "Play" : "Pause")
      if (next) {
        clearTimeout(timer)
        clearTimeout(later)
        clearTimeout(pre)
        left = Math.max(400, left - (performance.now() - startedAt))
      } else {
        play(left)
      }
    }
    /** Jumps to a step's first screen; paused, it stays there. */
    function goTo(k: number) {
      const s = (k + story.steps.length) % story.steps.length
      const i = frames.findIndex((frame) => frame.step === s)
      step = -1
      show(Math.max(0, i))
      play()
    }
    const onClick = (k: number) => () => goTo(k)
    const onToggle = () => setPaused(!paused)
    toggle.addEventListener("click", onToggle)
    const onKey = (event: KeyboardEvent) => {
      if (!inView || storyKeys.owner !== root || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return
      if ((event.target as HTMLElement)?.closest?.("input, textarea, [contenteditable]")) return
      event.preventDefault()
      goTo(step + (event.key === "ArrowRight" ? 1 : -1))
    }
    window.addEventListener("keydown", onKey)
    const handlers = buttons.map((button, k) => {
      const handler = onClick(k)
      button.addEventListener("click", handler)
      return handler
    })
    const observer = new IntersectionObserver((entries) => {
      const entering = entries[0].isIntersecting && !inView
      inView = entries[0].isIntersecting
      if (!inView && storyKeys.owner === root) storyKeys.owner = null
      // Coming into view, it starts again from the first step, playing.
      if (entering) {
        storyKeys.owner = root
        cur = 0
        if (paused) setPaused(false)
      }
      // Entering or leaving view: put the camera at the opening framing at once, so coming back
      // never starts with a correction.
      clearTimeout(later)
      clearTimeout(pre)
      cut(frames[cur].focus)
      step = -1
      show(cur)
      play()
    }, { threshold: 0.5 })
    observer.observe(root)
    show(0)
    return () => {
      observer.disconnect()
      if (storyKeys.owner === root) storyKeys.owner = null
      buttons.forEach((button, k) => button.removeEventListener("click", handlers[k]))
      toggle.removeEventListener("click", onToggle)
      window.removeEventListener("keydown", onKey)
      ;[timer, later, pre, snap].forEach(clearTimeout)
    }
    // The story is static content; frames is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story])

  return (
    <div className="story" ref={track} style={{ "--n": story.steps.length } as React.CSSProperties}>
      {/* Stacked like the other case studies: the heading, the screen, then what the section says. */}
      <header className="story-head">
        <p className="chapter-kicker">{when}</p>
        <h3>{title}</h3>
        {change ? <p className="story-change">{change}</p> : null}
      </header>
      <div className="story-screen">
        <div className="story-cam">
          {frames.map((frame, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={frame.src} className={index === 0 ? "story-frame is-on" : "story-frame"} src={frame.src} alt={frame.alt} width={2400} height={1600} loading={index === 0 ? "eager" : "lazy"} />
          ))}
        </div>
      </div>
      <div className="story-controls">
        <button type="button" className="story-pause" aria-pressed="false" aria-label="Pause">
          <svg className="if-playing" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5v7M8 2.5v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          <svg className="if-paused" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 2.5l6 3.5-6 3.5z" fill="currentColor" /></svg>
        </button>
      <ol className="story-steps" aria-label="Steps">
        {story.steps.map((item) => (
          <li key={item.title}>
            <button type="button">
              <b>{item.title}</b>
              <span className="sr-only">{item.why}</span>
            </button>
          </li>
        ))}
      </ol>
      </div>
      <div className="story-cap" aria-hidden="true"><b /><small /><span /></div>
    </div>
  )
}
