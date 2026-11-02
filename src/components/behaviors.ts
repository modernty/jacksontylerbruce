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
  // Matches the CSS switch to the vertical timeline.
  const mobile = matchMedia("(max-width: 768px)").matches
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

/**
 * Hovering or focusing a project fills the card under the graph, in the timeline and projects
 * views alike. Clicking a project, or pressing Enter on it, opens its page. Arrow keys step through.
 * The projects view draws names without hooks (the SVG matches the design generator byte for
 * byte), so its names are made focusable here.
 */
export function bindTimeline(stage: HTMLElement, cards: TimelineCard[], signal: AbortSignal, open: (href: string) => void) {
  const desk = stage.querySelector<HTMLElement>(".d")
  const card = stage.querySelector<HTMLElement>(".card")
  const mode = stage.dataset.mode === "projects" ? "projects" : "timeline"
  const group = desk?.querySelector<SVGGElement>(`[data-m=${mode}]`)
  if (!desk || !card || !group || cards.length === 0) return
  const title = card.querySelector("h3")
  const when = card.querySelector(".when")
  const focus = card.querySelector(".fo")
  const summary = card.querySelector(".sm")
  if (!title || !when || !focus || !summary) return

  const byName = new Map(cards.map((item) => [item.t, item]))
  const items: SVGElement[] =
    mode === "timeline"
      ? [...group.querySelectorAll<SVGGElement>(".pj")]
      : [...group.querySelectorAll<SVGTextElement>('text[font-weight="600"]')].filter((node) => byName.has(node.textContent ?? ""))
  if (mode === "projects") {
    for (const node of items) {
      node.classList.add("pjn")
      node.setAttribute("tabindex", "0")
      node.setAttribute("role", "button")
      node.setAttribute("aria-label", node.textContent ?? "")
    }
  }
  const nameOf = (node: Element) => node.getAttribute("aria-label") ?? node.textContent ?? ""
  let current = -1
  let hide = 0

  const placeThemes = (timeline: SVGGElement) => {
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
    const next = (index + items.length) % items.length
    const node = items[next]
    const project = node ? byName.get(nameOf(node)) : undefined
    if (!node || !project) return
    current = next
    window.clearTimeout(hide)
    items.forEach((item) => item.classList.toggle("act", item === node))
    if (mode === "timeline") {
      group.classList.add("pv")
      placeThemes(group)
    }
    title.textContent = project.t
    when.textContent = project.d
    focus.textContent = project.f.split(" \u00b7 ").join(", ")
    summary.textContent = project.s
    card.classList.add("on")
  }

  const clear = () => {
    group.classList.remove("pv")
    card.classList.remove("on")
    items.forEach((item) => item.classList.remove("act"))
    current = -1
  }
  const leave = () => {
    hide = window.setTimeout(clear, 180)
  }
  const openAt = (index: number) => {
    const node = items[index]
    const href = node ? byName.get(nameOf(node))?.u : undefined
    if (href) open(href)
  }

  items.forEach((node, index) => {
    node.addEventListener("mouseenter", () => show(index), { signal })
    node.addEventListener("mouseleave", leave, { signal })
    node.addEventListener("focus", () => show(index), { signal })
    node.addEventListener("click", () => openAt(index), { signal })
  })
  document.addEventListener("keydown", (event) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
    if (current < 0) {
      if (!step || !desk.contains(document.activeElement)) return
      const focused = items.findIndex((item) => item === document.activeElement || item.contains(document.activeElement))
      show(focused >= 0 ? focused + step : step > 0 ? 0 : items.length - 1)
      event.preventDefault()
      return
    }
    if (step) {
      show(current + step)
      event.preventDefault()
    }
    if (event.key === "Enter") {
      openAt(current)
      event.preventDefault()
    }
    if (event.key === "Escape") {
      window.clearTimeout(hide)
      clear()
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    }
  }, { signal })
}
