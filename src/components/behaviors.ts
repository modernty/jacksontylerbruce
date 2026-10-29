import type { TimelineCard } from "@/src/timeline/types"

const T = {
  axis: 520,
  axisStagger: 40,
  pillStart: 180,
  pillSpan: 700,
  pillDur: 520,
  dotPop: 220,
  label: 320,
  tick: 260,
  now: 420,
  ui: 480,
  uiStagger: 90,
  cards: 2000,
}
const EASE = "cubic-bezier(.22,1,.36,1)"
let played = false

function animate(el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  return el.animate(keyframes, { easing: EASE, fill: "backwards", ...options })
}

export function loadIn() {
  const root = document.documentElement
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
  if (reduce || played) {
    root.classList.remove("pre")
    return
  }
  played = true
  const stage = document.querySelector<HTMLElement>(".tlw")
  const mobile = matchMedia("(max-width: 600px)").matches
  const mode = stage?.dataset.mode
  const svg = document.querySelector(mobile ? ".m svg" : ".d svg")
  const motionRoot = document.querySelector(mobile ? ".m" : ".d .mode[data-m=timeline]")
  root.classList.remove("pre")
  if (!svg || !motionRoot || mode !== "timeline") {
    fadeChrome()
    return
  }
  const axis = mobile ? "scaleY" : "scaleX"
  const origin = mobile ? "top" : "left"
  const tmin = 2019
  const tmax = 2026.83
  const at = (value: number) => (value - tmin) / (tmax - tmin)
  svg.querySelectorAll(".bl").forEach((node, index) => {
    const el = node as HTMLElement
    el.style.transformOrigin = origin
    animate(el, [{ transform: `${axis}(0)` }, { transform: `${axis}(1)` }], { duration: T.axis, delay: index * T.axisStagger })
  })
  const years = [...svg.querySelectorAll(".yr")]
  years.forEach((node, index) => {
    animate(node, [{ opacity: 0 }, { opacity: Number(node.getAttribute("opacity") || 0.4) }], {
      duration: 300,
      delay: years.length ? (T.axis * index) / years.length : 0,
    })
  })
  let last = 0
  motionRoot.querySelectorAll(".rp").forEach((group) => {
    const delay = T.pillStart + at(Number((group as HTMLElement).dataset.t)) * T.pillSpan
    const pill = group.querySelector(".pr") as HTMLElement | null
    if (!pill) return
    pill.style.transformOrigin = origin
    animate(pill, [{ transform: `${axis}(0)` }, { transform: `${axis}(1)` }], { duration: T.pillDur, delay })
    const startDot = group.querySelector(".d0")
    if (startDot) animate(startDot, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay })
    const endDot = group.querySelector(".d1") as HTMLElement | null
    if (endDot) {
      endDot.style.transformBox = "fill-box"
      endDot.style.transformOrigin = "center"
      animate(endDot, [{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "scale(1)" }], {
        duration: T.dotPop,
        delay: delay + T.pillDur * 0.8,
        easing: "cubic-bezier(.34,1.56,.64,1)",
      })
    }
    const label = group.querySelector(".co")
    if (label) {
      animate(label, [{ opacity: 0, transform: mobile ? "translateX(-4px)" : "translateY(4px)" }, { opacity: 1, transform: "none" }], {
        duration: T.label,
        delay: delay + T.pillDur * 0.45,
      })
    }
    last = Math.max(last, delay + T.pillDur)
  })
  motionRoot.querySelectorAll(".tk").forEach((node) => {
    const el = node as HTMLElement
    const delay = T.pillStart + at(Number(el.dataset.t)) * T.pillSpan + T.pillDur * 0.6
    el.style.transformBox = "fill-box"
    el.style.transformOrigin = "top"
    animate(el, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: T.tick, delay })
  })
  motionRoot.querySelectorAll(".pj,.mpj").forEach((node) => {
    const el = node as HTMLElement
    const delay = T.pillStart + at(Number(el.dataset.t)) * T.pillSpan + T.pillDur * 0.6 + T.tick * 0.6
    animate(el, [{ opacity: 0 }, { opacity: Number(el.getAttribute("opacity") || 1) }], { duration: T.label, delay })
  })
  svg.querySelectorAll(".nowl").forEach((node) => {
    const el = node as HTMLElement
    el.style.transformOrigin = mobile ? "left" : "top"
    animate(el, [{ transform: `${mobile ? "scaleX" : "scaleY"}(0)` }, { transform: "none" }], { duration: T.now, delay: last - 120 })
  })
  svg.querySelectorAll(".nowt").forEach((node) => {
    animate(node, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: last + 120 })
  })
  motionRoot.querySelectorAll('.rp[data-cur="1"] .pr').forEach((node) => {
    animate(node, [{ strokeWidth: 1.5 }, { strokeWidth: 2.4 }, { strokeWidth: 1.5 }], {
      duration: 700,
      delay: last + T.now - 100,
      easing: "ease-in-out",
      fill: "none",
    })
  })
  fadeChrome(last + T.now * 0.5)
}

function fadeChrome(start = 0) {
  let step = 0
  for (const selector of [".seg", ".hero h1", ".shell"]) {
    document.querySelectorAll(selector).forEach((node) => {
      animate(node, [{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }], {
        duration: T.ui,
        delay: start + step * T.uiStagger,
      })
      step += 1
    })
  }
  document.querySelectorAll(".cards a").forEach((node, index) => {
    const opacity = Number(getComputedStyle(node).opacity) || 0.55
    animate(node, [{ opacity: 0, transform: "translateY(4px)" }, { opacity, transform: "none" }], {
      duration: T.ui,
      delay: start + 3 * T.uiStagger + T.ui + T.cards + index * 60,
    })
  })
}

export function bindComposer(shell: HTMLFormElement, signal: AbortSignal) {
  const input = shell.querySelector<HTMLTextAreaElement>(".input")
  const actions = shell.querySelector<HTMLElement>(".g")
  if (!input || !actions) return
  const canvas = document.createElement("canvas").getContext("2d")
  const line = 24
  const maxLines = 6
  const fits = () => {
    if (!canvas) return true
    const style = getComputedStyle(input)
    canvas.font = `${style.fontSize} ${style.fontFamily}`
    const available = shell.clientWidth - 26 - actions.offsetWidth - 6
    return !input.value.includes("\n") && canvas.measureText(input.value).width < available - 4
  }
  const fit = () => {
    const before = shell.offsetHeight
    const stacked = !fits()
    shell.classList.toggle("stack", stacked)
    shell.classList.toggle("has", Boolean(input.value.trim()))
    if (stacked) {
      input.style.height = "auto"
      const height = Math.min(input.scrollHeight, line * maxLines + 12)
      input.style.height = `${height}px`
      input.style.overflowY = input.scrollHeight > line * maxLines + 12 ? "auto" : "hidden"
    } else {
      input.style.height = ""
      input.style.overflowY = "hidden"
    }
    const after = shell.offsetHeight
    if (before !== after && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shell.animate([{ height: `${before}px` }, { height: `${after}px` }], { duration: 260, easing: EASE })
    }
  }
  input.addEventListener("input", fit, { signal })
  addEventListener("resize", fit, { signal })
  document.fonts.ready.then(fit).catch(() => fit())
  fit()
}

type Box = { left: number; right: number; top: number; bottom: number; width: number; height: number }

function overlaps(a: Box, b: Box) {
  return a.left < b.right + 4 && b.left < a.right + 4 && a.top < b.bottom && b.top < a.bottom
}

export function bindTimeline(stage: HTMLElement, cards: TimelineCard[], signal: AbortSignal) {
  const desk = stage.querySelector<HTMLElement>(".d")
  const card = stage.querySelector<HTMLElement>(".card")
  const timeline = desk?.querySelector<SVGGElement>("[data-m=timeline]")
  if (!desk || !card || !timeline || cards.length === 0) return
  let current = -1
  let hide = 0
  const title = card.querySelector("h3")
  const meta = card.querySelector(".meta")
  const focus = card.querySelector(".fo")
  const summary = card.querySelector(".sm")
  const link = card.querySelector("a")
  if (!title || !meta || !focus || !summary || !link) return

  const placeThemes = () => {
    const active = timeline.querySelector<SVGGElement>(".pj.act")
    const full = active?.querySelector<SVGTextElement>(".fa")
    const name = active?.querySelector<SVGTextElement>(".w4")
    if (!full || !name) return
    if (!full.dataset.x) {
      full.dataset.x = full.getAttribute("x") ?? ""
      full.dataset.a = full.getAttribute("text-anchor") ?? "start"
    }
    timeline.querySelectorAll(".hd2").forEach((node) => node.classList.remove("hd2"))
    const box = name.getBBox()
    const others = [...timeline.querySelectorAll(".pj:not(.act) .w4, .co .w6, .rp rect")].filter((node) => node.getBoundingClientRect().width > 0)
    const candidates: [number, number, string][] = [
      [box.x + box.width + 8, box.y + box.height - 2, "start"],
      [Number(full.dataset.x), box.y + box.height - 2, full.dataset.a || "start"],
      [box.x, box.y + box.height + 11, "start"],
      [box.x, box.y - 3, "start"],
      [box.x - 8, box.y + box.height - 2, "end"],
    ]
    let best: { score: number; x: number; y: number; anchor: string; hits: Element[] } | null = null
    for (const [x, y, anchor] of candidates) {
      full.setAttribute("x", String(x))
      full.setAttribute("y", String(y))
      full.setAttribute("text-anchor", anchor)
      const rect = full.getBoundingClientRect()
      const hits = others.filter((node) => overlaps(rect, node.getBoundingClientRect()))
      const score = hits.filter((node) => node.tagName === "rect").length * 100 + hits.length
      if (!best || score < best.score) best = { score, x, y, anchor, hits }
      if (!score) break
    }
    if (!best) return
    full.setAttribute("x", String(best.x))
    full.setAttribute("y", String(best.y))
    full.setAttribute("text-anchor", best.anchor)
    for (const hit of best.hits) {
      if (hit.tagName !== "rect") hit.closest(".pj")?.classList.add("hd2")
    }
  }

  const show = (index: number) => {
    const next = (index + cards.length) % cards.length
    current = next
    window.clearTimeout(hide)
    timeline.classList.add("pv")
    timeline.querySelectorAll(".pj").forEach((node) => node.classList.toggle("act", Number((node as HTMLElement).dataset.i) === next))
    placeThemes()
    const project = cards[next]
    const el = timeline.querySelector<SVGGElement>(`.pj[data-i="${next}"]`)
    if (!project || !el) return
    title.textContent = project.t
    meta.textContent = `${project.c} · ${project.d}`
    focus.textContent = project.f
    summary.textContent = project.s
    link.setAttribute("href", project.u)
    const mark = el.getBoundingClientRect()
    const host = desk.getBoundingClientRect()
    const cardWidth = card.offsetWidth
    const cardHeight = card.offsetHeight
    const obstacles = [...timeline.querySelectorAll(".pj text:not(.fo):not(.fa), .co .w6")]
      .map((node) => node.getBoundingClientRect())
      .filter((rect) => rect.width > 0)
    const left = mark.left - host.left
    const right = mark.right - host.left
    const top = mark.top - host.top
    const bottom = mark.bottom - host.top
    const viewport = document.documentElement.clientWidth
    const composer = document.querySelector(".hero .in")?.getBoundingClientRect().top ?? window.innerHeight
    const candidates = [
      [left, bottom + 10],
      [right - cardWidth, bottom + 10],
      [right + 14, top - cardHeight / 2],
      [left - cardWidth - 14, top - cardHeight / 2],
      [left, top - cardHeight - 10],
      [right - cardWidth, top - cardHeight - 10],
    ]
    let best = candidates[0]
    let bestScore = Number.POSITIVE_INFINITY
    for (const [x, y] of candidates) {
      const absX = host.left + x
      const absY = host.top + y
      let score = 0
      if (absX < 8 || absX + cardWidth > viewport - 8 || absY < 8 || absY + cardHeight > composer - 12) score += 1e6
      for (const obstacle of obstacles) {
        const overlapX = Math.max(0, Math.min(absX + cardWidth, obstacle.right) - Math.max(absX, obstacle.left))
        const overlapY = Math.max(0, Math.min(absY + cardHeight, obstacle.bottom) - Math.max(absY, obstacle.top))
        score += overlapX * overlapY
      }
      if (score < bestScore) {
        bestScore = score
        best = [x, y]
      }
    }
    card.style.left = `${best[0]}px`
    card.style.top = `${best[1]}px`
    card.classList.add("on")
  }

  const leave = () => {
    hide = window.setTimeout(() => {
      timeline.classList.remove("pv")
      card.classList.remove("on")
      timeline.querySelectorAll(".pj").forEach((node) => node.classList.remove("act"))
      current = -1
    }, 180)
  }

  timeline.querySelectorAll<SVGGElement>(".pj").forEach((node) => {
    node.addEventListener("mouseenter", () => show(Number(node.dataset.i)), { signal })
    node.addEventListener("mouseleave", leave, { signal })
    node.addEventListener("focus", () => show(Number(node.dataset.i)), { signal })
    node.addEventListener("click", () => show(Number(node.dataset.i)), { signal })
  })
  card.addEventListener("mouseenter", () => window.clearTimeout(hide), { signal })
  card.addEventListener("mouseleave", leave, { signal })
  card.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    button.addEventListener("click", () => show(current + Number(button.dataset.s)), { signal })
  })
  document.addEventListener("keydown", (event) => {
    if (current < 0) {
      if (!desk.contains(document.activeElement)) return
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
      const focused = document.activeElement?.closest(".pj")
      const index = focused ? Number((focused as HTMLElement).dataset.i) : event.key === "ArrowRight" ? -1 : 0
      show(index + (event.key === "ArrowRight" ? 1 : -1))
      event.preventDefault()
      return
    }
    if (event.key === "ArrowRight") {
      show(current + 1)
      event.preventDefault()
    }
    if (event.key === "ArrowLeft") {
      show(current - 1)
      event.preventDefault()
    }
    if (event.key === "Escape") {
      window.clearTimeout(hide)
      timeline.classList.remove("pv")
      card.classList.remove("on")
      current = -1
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    }
  }, { signal })
}
