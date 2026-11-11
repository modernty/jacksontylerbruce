"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import borders from "./borders.gen.json"
import { regionOf } from "./regions"
import { distance, greatCircle, project, splitPath, type Projected, type View } from "./sphere"
import type { GlobePlace, GlobeProps } from "./types"

/**
 * Two framings of the same globe. Wide leaves a broad margin for the callout (the About page);
 * panel is nearly square with a much larger sphere, for the preview beside the chat.
 */
const LAYOUTS = {
  wide: { W: 1200, H: 600, CX: 600, CY: 300, R: 232 },
  panel: { W: 900, H: 780, CX: 555, CY: 390, R: 340 },
} as const
const SPIN = 4
const IDLE_MS = 4000
const HIT = 14

const kindLabel = (place: GlobePlace) => (place.home ? "Home" : place.kind === "lived" ? "Lived" : "Travelled")

type Hub = { lat: number; lng: number }

/** The middle of each region's places, then the shortest links that join every region once. */
function regionLinks(places: GlobePlace[]): [Hub, Hub][] {
  const sums = new Map<string, [number, number, number]>()
  for (const place of places) {
    const region = regionOf(place.country)
    const phi = (place.lat * Math.PI) / 180
    const lambda = (place.lng * Math.PI) / 180
    const [x, y, z] = sums.get(region) ?? [0, 0, 0]
    sums.set(region, [x + Math.cos(phi) * Math.sin(lambda), y + Math.sin(phi), z + Math.cos(phi) * Math.cos(lambda)])
  }
  const hubs: Hub[] = [...sums.values()].map(([x, y, z]) => {
    const length = Math.hypot(x, y, z) || 1
    return { lat: (Math.asin(y / length) * 180) / Math.PI, lng: (Math.atan2(x, z) * 180) / Math.PI }
  })
  const links: [Hub, Hub][] = []
  const joined = new Set([0])
  while (joined.size < hubs.length) {
    let best = { from: -1, to: -1, d: Infinity }
    for (const from of joined) {
      for (let to = 0; to < hubs.length; to += 1) {
        if (joined.has(to)) continue
        const d = distance(hubs[from], hubs[to])
        if (d < best.d) best = { from, to, d }
      }
    }
    if (best.to < 0) break
    const { from, to } = best
    links.push([hubs[from], hubs[to]])
    joined.add(to)
  }
  return links
}
const LINES = borders as [number, number][][]

/**
 * Markers borrow from the timeline: a dot for places travelled, a ring around a dot for places
 * lived (like the role pill's ends), and a double ring with a slow pulse for home (like NOW).
 */
function Mark({ place, at }: { place: GlobePlace; at: Projected }) {
  const className = at.front ? "mark" : "mark back"
  if (place.home) {
    return (
      <g className={className}>
        {at.front ? <circle className="pulse" cx={at.x} cy={at.y} r={9} /> : null}
        <circle className="ring" cx={at.x} cy={at.y} r={9} />
        <circle className="ring" cx={at.x} cy={at.y} r={5} />
        <circle className="dot" cx={at.x} cy={at.y} r={2} />
      </g>
    )
  }
  if (place.kind === "lived") {
    return (
      <g className={className}>
        <circle className="ring" cx={at.x} cy={at.y} r={5.5} />
        <circle className="dot" cx={at.x} cy={at.y} r={1.8} />
      </g>
    )
  }
  return <circle className={`${className} dot`} cx={at.x} cy={at.y} r={2.4} />
}

/**
 * A see-through line globe: outline, equator and faint country borders, places marked in the
 * timeline's language, faint arcs joining the regions of the world, and a callout on a leader.
 */
export function Globe({ places, focusId, onHover, fit = "wide" }: GlobeProps) {
  const { W, H, CX, CY, R } = LAYOUTS[fit]
  const home = places.find((place) => place.home) ?? places[0]
  const [view, setView] = useState<View>(() => ({ lng: (home?.lng ?? 0) + 35, lat: 28 }))
  const [hovered, setHovered] = useState<string | null>(null)
  // True while the pointer is over the sphere (or dragging it): the outline and borders show then.
  const [lit, setLit] = useState(false)
  const svg = useRef<SVGSVGElement>(null)
  const state = useRef({ view, target: view, idleAt: 0, dragging: null as null | { x: number; y: number; view: View }, motion: true })

  const countries = useMemo(() => new Set(places.map((place) => place.country)).size, [places])
  const links = useMemo(() => regionLinks(places), [places])

  // Turn to a place picked elsewhere (the list, or the chat).
  useEffect(() => {
    const place = places.find((item) => item.id === focusId)
    if (!place) return
    const current = state.current.target
    const loops = Math.round((current.lng - place.lng) / 360)
    state.current.target = { lng: place.lng + loops * 360, lat: Math.max(-60, Math.min(60, place.lat)) }
    state.current.idleAt = performance.now()
  }, [focusId, places])

  useEffect(() => {
    const element = svg.current
    if (!element) return
    const live = state.current
    live.motion = !matchMedia("(prefers-reduced-motion: reduce)").matches
    live.idleAt = performance.now()
    let frame = 0
    let last = performance.now()
    let visible = true

    const tick = (now: number) => {
      const seconds = Math.min(0.05, (now - last) / 1000)
      last = now
      if (live.motion && !live.dragging && !focusId && now - live.idleAt > IDLE_MS) {
        live.target = { ...live.target, lng: live.target.lng - SPIN * seconds }
      }
      const ease = live.motion ? Math.min(1, seconds * 5) : 1
      const next = {
        lng: live.view.lng + (live.target.lng - live.view.lng) * ease,
        lat: live.view.lat + (live.target.lat - live.view.lat) * ease,
      }
      if (Math.abs(next.lng - live.view.lng) > 0.001 || Math.abs(next.lat - live.view.lat) > 0.001) {
        live.view = next
        setView(next)
      }
      if (visible && !document.hidden) frame = requestAnimationFrame(tick)
    }
    const resume = () => {
      cancelAnimationFrame(frame)
      if (visible && !document.hidden) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }
    const seen = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting)
      resume()
    })
    seen.observe(element)
    document.addEventListener("visibilitychange", resume)
    resume()
    return () => {
      cancelAnimationFrame(frame)
      seen.disconnect()
      document.removeEventListener("visibilitychange", resume)
    }
  }, [focusId])

  const at = (place: { lat: number; lng: number }, lift = 1) => project(place.lat, place.lng, view, R, CX, CY, lift)

  const toLocal = (event: React.PointerEvent): { x: number; y: number } => {
    const matrix = svg.current?.getScreenCTM()?.inverse()
    if (!matrix) return { x: 0, y: 0 }
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix)
    return { x: point.x, y: point.y }
  }

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const local = toLocal(event)
    state.current.dragging = { x: local.x, y: local.y, view: state.current.target }
    state.current.idleAt = performance.now()
    setLit(true)
  }
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const local = toLocal(event)
    const live = state.current
    live.idleAt = performance.now()
    const over = Math.hypot(local.x - CX, local.y - CY) <= R * 1.04
    if (over !== lit && !live.dragging) setLit(over)
    if (live.dragging) {
      const scale = 90 / R
      live.target = {
        lng: live.dragging.view.lng - (local.x - live.dragging.x) * scale,
        lat: Math.max(-70, Math.min(70, live.dragging.view.lat + (local.y - live.dragging.y) * scale)),
      }
      return
    }
    let best: { id: string; d: number } | null = null
    for (const place of places) {
      const spot = at(place)
      if (!spot.front) continue
      const d = Math.hypot(spot.x - local.x, spot.y - local.y)
      if (d < HIT && (!best || d < best.d)) best = { id: place.id, d }
    }
    const id = best?.id ?? null
    if (id !== hovered) {
      setHovered(id)
      onHover?.(id)
    }
  }
  const onPointerUp = (event?: React.PointerEvent<SVGSVGElement>) => {
    state.current.dragging = null
    state.current.idleAt = performance.now()
    // A finger lifting off leaves nothing hovering, so the lines fade again.
    if (event?.pointerType === "touch") setLit(false)
  }

  const ring = (points: { lat: number; lng: number }[]) => splitPath(points.map((point) => at(point)))
  // Borders on the near side only, faint, so they read as texture rather than a map.
  const outlines = LINES.map((line) => splitPath(line.map(([lng, lat]) => at({ lat, lng }))).front).join("")
  const equator = ring(Array.from({ length: 181 }, (_, index) => ({ lat: 0, lng: -180 + index * 2 })))
  const arcs = links.map(([from, to], index) => {
    const lift = 0.04 + 0.22 * Math.pow(distance(from, to) / 180, 0.8)
    return { id: `link-${index}`, ...splitPath(greatCircle(from, to).map((point) => at(point, 1 + lift * Math.sin(Math.PI * point.t)))) }
  })

  const named = places.find((place) => place.id === (hovered ?? focusId)) ?? home
  const namedAt = named ? at(named) : null
  const meta = named
    ? [named.country, `${named.lat.toFixed(2)}°, ${named.lng.toFixed(2)}°`, named.home ? `Home · ${places.length} places, ${countries} countries` : kindLabel(named)]
    : []
  const textX = 40
  const textY = Math.max(48, Math.min(H - 110, (namedAt?.y ?? CY) - 40))
  // The leader runs flat from under the label, then bends to the place.
  const shelf = textY + 14
  const elbowX = namedAt ? Math.min(namedAt.x - 24, CX - R - 24) : 0

  // Far side first, so the front draws over it.
  const ordered = [...places].map((place) => ({ place, spot: at(place) })).sort((a, b) => Number(a.spot.front) - Number(b.spot.front))

  return (
    <svg
      ref={svg}
      className={lit ? "globe-svg lit" : "globe-svg"}
      viewBox={`0 0 ${W} ${H}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        onPointerUp()
        setLit(false)
        if (hovered) onHover?.(null)
        setHovered(null)
      }}
    >
      <circle className="rim" cx={CX} cy={CY} r={R} />
      <path className="borders" d={outlines} />
      <path className="line back" d={equator.back} />
      {arcs.map((arc) => <path key={`${arc.id}-back`} className="arc back" d={arc.back} />)}
      {ordered.map(({ place, spot }) => (
        <Mark key={place.id} place={place} at={spot} />
      ))}
      <path className="line" d={equator.front} />
      {arcs.map((arc) => <path key={`${arc.id}-front`} className="arc" d={arc.front} />)}
      {named && namedAt?.front ? (
        <g className="callout">
          <path className="leader" d={`M${textX} ${shelf}H${elbowX}L${namedAt.x} ${namedAt.y}`} />
          <circle className="leader-end" cx={namedAt.x} cy={namedAt.y} r={1.5} />
          <text className="name" x={textX} y={textY}>{named.name}</text>
          <text className="meta" x={textX} y={shelf + 22}>
            {meta.map((line, index) => (
              <tspan key={line} x={textX} dy={index === 0 ? 0 : 18}>{line}</tspan>
            ))}
          </text>
        </g>
      ) : null}
    </svg>
  )
}
