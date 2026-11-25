import { F, I, add, div, fmt, maxN, mul, sub, tw, type N } from "./num"
import type { ProjectMark, TimelineModel } from "./types"
import { tokens } from "@/src/design/tokens"

const INK = tokens.color.ink
const PAPER = tokens.color.paper

/** Every plain line (lanes, ticks, NOW) takes the hairline weight from the tokens. */
function hairlines(svg: string): string {
  return svg.replace(/<line /g, `<line stroke-width="${tokens.stroke.hair}" `)
}

function pill(x1: N, y1: N, x2: N, y2: N, cur: boolean, h = 12, sw: number = tokens.stroke.role, op = 1): string {
  const r = div(I(h), I(2))
  const rect =
    y1.v === y2.v
      ? `<rect x="${fmt(sub(x1, r))}" y="${fmt(sub(y1, r))}" width="${fmt(add(sub(x2, x1), I(h)))}" height="${h}" rx="${fmt(r)}"`
      : `<rect x="${fmt(sub(x1, r))}" y="${fmt(sub(y1, r))}" width="${h}" height="${fmt(add(sub(y2, y1), I(h)))}" rx="${fmt(r)}"`
  let drawing = `${rect} class="pr" fill="${PAPER}" stroke="${INK}" stroke-width="${fmt(F(sw))}" stroke-opacity="${op}"/>`
  const dot = h >= 12 ? F(2.6) : I(2)
  drawing += `<circle class="d0" cx="${fmt(x1)}" cy="${fmt(y1)}" r="${fmt(dot)}" fill="${INK}" fill-opacity="${op}"/>`
  if (!cur) {
    drawing += `<circle class="d1" cx="${fmt(x2)}" cy="${fmt(y2)}" r="${fmt(dot)}" fill="${INK}" fill-opacity="${op}"/>`
  }
  return drawing
}

function lanesFor(count: number): N[] {
  if (count > 1) {
    const step = div(I(220), I(Math.max(count, 2) - 1))
    return Array.from({ length: count }, (_, index) => add(I(70), mul(I(index), step)))
  }
  return [I(150)]
}

/**
 * The desktop drawing. `edge` runs the years nearly edge to edge, leaving just room for the first
 * role's label on the left and NOW on the right; it suits the timeline mode alone (the focus mode
 * needs the left margin for its labels). `type` sets every label of the timeline mode to one size,
 * meant to be shown unscaled (the drawing made at the width it is shown at); the rows and the
 * drawing's height grow with it, so only the time axis stretches with the width.
 */
export function desktopSvg(model: TimelineModel, width = 1120, drawnHeight = 340, { edge = false, type }: { edge?: boolean; type?: number } = {}): string {
  const now = model.now
  const k = type ? type / 13 : 1
  const v = (n: number): N => I(Math.round(n * k))
  const height = Math.round(drawnHeight * k)
  const size = (n: number) => type ?? n
  // Edge to edge, the margins balance the ink: the lanes start just left of the first label, and the
  // right margin holds the labels of the newest roles, which run past NOW.
  const x0 = I(edge ? 56 : 150)
  const x1 = sub(I(width), I(edge ? Math.round(96 * k) : 110))
  const lineStart = edge ? sub(x0, I(10)) : sub(x0, I(40))
  const span = sub(F(now), I(2019))
  const locate = (when: number): N => add(x0, mul(div(sub(F(when), I(2019)), span), sub(x1, x0)))
  const parts: string[] = [
    `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" font-family="Aeonik Pro" fill="${INK}">`,
  ]
  parts.push(
    `<line class="nowl" x1="${fmt(x1)}" y1="${fmt(v(30))}" x2="${fmt(x1)}" y2="${height - Math.round(16 * k)}" stroke="${INK}" stroke-opacity=".35" stroke-dasharray="2 3"/><text x="${fmt(x1)}" y="${height - 4}" text-anchor="middle" font-size="${size(12)}" font-weight="600" letter-spacing=".08em" class="nowt">NOW</text>`,
  )
  for (let year = 2019; year < 2027; year += 1) {
    parts.push(
      `<text class="yr" x="${fmt(locate(year))}" y="${height - 4}" text-anchor="middle" font-size="${size(12)}" opacity=".4">${year}</text>`,
    )
  }
  const lanes = [v(78), v(170), v(262)]
  const timelineGroup: string[] = ['<g class="mode on" data-m="timeline">']
  for (const laneY of lanes) {
    timelineGroup.push(
      `<line class="bl" x1="${fmt(lineStart)}" y1="${fmt(laneY)}" x2="${fmt(x1)}" y2="${fmt(laneY)}" stroke="${INK}" stroke-opacity=".1"/>`,
    )
  }
  const rows = new Map<string, number>()
  const timeline = model.projects.filter((project) => project.onTimeline).sort((a, b) => a.start - b.start)
  timeline.forEach((project, index) => {
    const name = project.name
    const lane = project.lane
    // Each role's projects stack under its left edge, one row each, in start order, their names
    // aligned with the role's name and dates above; the tick drops from the bar's first dot.
    const xx = locate(project.anchor)
    const tx = sub(xx, I(6))
    // A name that would run into the next role along this lane breaks onto a second line.
    const next = model.roles.filter((role) => role.lane === lane && role.start > project.anchor).map((role) => locate(role.start).v)
    const room = next.length ? Math.min(...next) - tx.v - 12 : Infinity
    const lines = tw(name, F(size(13))).v > room ? splitName(name) : [name]
    const key = `${lane}:${fmt(xx)}`
    const row = rows.get(key) ?? 0
    rows.set(key, row + lines.length)
    const ly = add(add(lanes[lane], v(24)), mul(I(row), v(15)))
    const label = (cls: string, weight: string) =>
      `<text class="${cls}" x="${fmt(tx)}" y="${fmt(ly)}" font-size="${size(13)}"${weight}>` +
      lines.map((line, at) => `<tspan x="${fmt(tx)}" y="${fmt(add(ly, mul(I(at), v(15))))}">${line}</tspan>`).join("") +
      `</text>`
    const laneTop = lanes[lane]
    timelineGroup.push(
      `<line class="tk" data-t="${fmt(F(project.anchor))}" x1="${fmt(xx)}" y1="${fmt(add(laneTop, I(8)))}" x2="${fmt(xx)}" y2="${fmt(sub(ly, v(10)))}" stroke="${INK}" stroke-opacity=".3"/>` +
        `<g class="pj" tabindex="0" role="button" aria-label="${name}" data-i="${index}" data-t="${fmt(F(project.anchor))}">` +
        `<rect x="${fmt(tx)}" y="${fmt(sub(ly, v(11)))}" width="${fmt(add(mul(tw(lines.reduce((a, b) => (a.length >= b.length ? a : b)), (type ? F(type * 0.885) : F(11.5))), F(1.1)), I(8)))}" height="${Math.round(15 * k) * lines.length}" fill="transparent"/>` +
        label("w4", "") +
        label("w6", ' font-weight="600"') +
        `</g>`,
    )
  })
  for (const role of model.roles) {
    const y = lanes[role.lane]
    const xa = locate(role.start)
    const current = role.end == null
    const xb = current ? x1 : locate(role.end as number)
    const label = (weight: number, cls: string) =>
      `<text class="${cls}" font-size="${size(14)}" font-weight="${weight}"><tspan x="${fmt(sub(xa, I(6)))}" y="${fmt(sub(y, type ? add(v(18), I(Math.round(type * 1.2))) : I(32)))}">${role.name}</tspan><tspan x="${fmt(sub(xa, I(6)))}" y="${fmt(sub(y, v(18)))}">${role.year}</tspan></text>`
    timelineGroup.push(
      `<g class="rp" data-t="${fmt(F(role.start))}" data-cur="${current ? 1 : 0}">${pill(xa, y, xb, y, current)}<g class="co">${label(600, "w6")}${label(400, "w4")}</g></g>`,
    )
  }
  parts.push(...timelineGroup, "</g>")

  const { placed, count } = greedy(model.projects, locate)
  const projectLanes = lanesFor(count)
  const projectGroup: string[] = ['<g class="mode" data-m="projects">']
  for (const laneY of projectLanes) {
    projectGroup.push(
      `<line x1="${fmt(lineStart)}" y1="${fmt(laneY)}" x2="${fmt(x1)}" y2="${fmt(laneY)}" stroke="${INK}" stroke-opacity=".08"/>`,
    )
  }
  for (const { item, index } of placed) {
    const y = projectLanes[index]
    const xa = locate(item.start)
    const xb = locate(item.end)
    const current = item.end >= now
    projectGroup.push(
      pill(xa, y, xb, y, current, 9, tokens.stroke.projects) +
        `<text x="${fmt(sub(xa, I(4)))}" y="${fmt(sub(y, I(10)))}" font-size="14" font-weight="600">${item.name}</text>` +
        `<text x="${fmt(sub(xa, I(4)))}" y="${fmt(add(y, I(19)))}" font-size="12" opacity=".45">${item.org}</text>`,
    )
  }
  parts.push(...projectGroup, "</g>")

  const focusGroup: string[] = ['<g class="mode" data-m="focus">']
  const positions = new Map<string, { x: N; y: N }[]>()
  const blocks: { label: string; items: { name: string; xa: N; xb: N; current: boolean; row: number }[]; count: number }[] = []
  for (const [key, label] of model.focus) {
    const ends: N[] = []
    const items: { name: string; xa: N; xb: N; current: boolean; row: number }[] = []
    const matching = model.projects.filter((project) => project.themes.includes(key)).sort((a, b) => a.start - b.start)
    for (const project of matching) {
      const xa = locate(project.start)
      const xb = locate(project.end)
      const left = sub(sub(xa, I(14)), tw(project.name, F(10.5)))
      let placedRow = -1
      for (let row = 0; row < ends.length; row += 1) {
        if (ends[row].v < left.v) {
          ends[row] = add(xb, I(8))
          placedRow = row
          break
        }
      }
      if (placedRow < 0) {
        ends.push(add(xb, I(8)))
        placedRow = ends.length - 1
      }
      items.push({ name: project.name, xa, xb, current: project.end >= now, row: placedRow })
    }
    blocks.push({ label, items, count: ends.length })
  }
  const total = blocks.reduce((sum, block) => sum + block.count, 0)
  const room = div(sub(sub(I(height), I(56)), mul(I(9), I(blocks.length))), I(total))
  const rowH = room.v < 13 ? room : I(13)
  let y = I(34)
  for (const block of blocks) {
    focusGroup.push(
      `<line x1="${fmt(lineStart)}" y1="${fmt(sub(y, I(7)))}" x2="${fmt(x1)}" y2="${fmt(sub(y, I(7)))}" stroke="${INK}" stroke-opacity=".1"/>` +
        `<text x="${fmt(sub(x0, I(140)))}" y="${fmt(add(y, F(3.5)))}" font-size="12" font-weight="600" letter-spacing=".06em">${block.label}</text>`,
    )
    for (const item of block.items) {
      const yy = add(y, mul(I(item.row), rowH))
      const spots = positions.get(item.name) ?? []
      spots.push({ x: item.xa, y: yy })
      positions.set(item.name, spots)
      focusGroup.push(
        pill(item.xa, yy, item.xb, yy, item.current, 7, tokens.stroke.focus) +
          `<text x="${fmt(sub(item.xa, I(9)))}" y="${fmt(add(yy, F(3.5)))}" text-anchor="end" font-size="12">${item.name}</text>`,
      )
    }
    y = add(y, add(mul(I(block.count), rowH), I(9)))
  }
  const links: string[] = []
  for (const spots of positions.values()) {
    for (let index = 0; index < spots.length - 1; index += 1) {
      const from = spots[index]
      const to = spots[index + 1]
      links.push(
        `<line x1="${fmt(from.x)}" y1="${fmt(add(from.y, I(4)))}" x2="${fmt(to.x)}" y2="${fmt(sub(to.y, I(4)))}" stroke="${INK}" stroke-opacity=".14" stroke-dasharray="1 3"/>`,
      )
    }
  }
  focusGroup.splice(1, 0, ...links)
  parts.push(...focusGroup, "</g></svg>")
  return hairlines(parts.join(""))
}

/** A name on two lines, broken at the space nearest its middle. */
function splitName(name: string): string[] {
  const spaces = [...name.matchAll(/ /g)].map((match) => match.index ?? 0)
  if (!spaces.length) return [name]
  const cut = spaces.reduce((best, at) => (Math.abs(at - name.length / 2) < Math.abs(best - name.length / 2) ? at : best))
  return [name.slice(0, cut), name.slice(cut + 1)]
}

function greedy(items: ProjectMark[], locate: (when: number) => N) {
  const ends: N[] = []
  const placed: { item: ProjectMark; index: number }[] = []
  const ordered = [...items].sort((a, b) => a.start - b.start)
  const size = F(12.5)
  for (const item of ordered) {
    const start = sub(locate(item.start), I(6))
    const stop = add(maxN(locate(item.end), add(start, tw(item.name, size))), I(14))
    let found = -1
    for (let index = 0; index < ends.length; index += 1) {
      if (ends[index].v < start.v) {
        ends[index] = stop
        found = index
        break
      }
    }
    if (found < 0) {
      ends.push(stop)
      found = ends.length - 1
    }
    placed.push({ item, index: found })
  }
  return { placed, count: ends.length }
}

export function mobileSvg(model: TimelineModel): string {
  const now = model.now
  const width = 342
  const height = 860
  const y0 = I(20)
  const y1 = sub(I(height), I(30))
  const span = sub(F(now), I(2019))
  const locate = (when: number): N => add(y0, mul(div(sub(F(when), I(2019)), span), sub(y1, y0)))
  const parts: string[] = [
    `<svg viewBox="0 0 ${width} ${height}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Aeonik Pro" fill="${INK}">`,
  ]
  for (let year = 2019; year < 2027; year += 1) {
    parts.push(`<text class="yr" x="4" y="${fmt(add(locate(year), I(3)))}" font-size="11" opacity=".4">'${String(year).slice(2)}</text>`)
  }
  parts.push(
    `<line class="nowl" x1="4" y1="${fmt(y1)}" x2="${width - 4}" y2="${fmt(y1)}" stroke="${INK}" stroke-opacity=".35" stroke-dasharray="2 3"/><text x="4" y="${fmt(add(y1, I(14)))}" font-size="11" font-weight="600">NOW</text>`,
  )
  const timelineGroup: string[] = ['<g class="mode on" data-m="timeline">']
  const lanes = [I(36), I(56), I(76)]
  const labelX = I(104)
  for (const role of model.roles) {
    const x = lanes[role.lane]
    const ya = locate(role.start)
    const current = role.end == null
    const yb = current ? y1 : locate(role.end as number)
    timelineGroup.push(
      `<g class="rp" data-t="${fmt(F(role.start))}" data-cur="${current ? 1 : 0}">${pill(x, ya, x, yb, current)}` +
        `<g class="co"><line x1="${fmt(add(x, I(8)))}" y1="${fmt(ya)}" x2="${fmt(sub(labelX, I(4)))}" y2="${fmt(ya)}" stroke="${INK}" stroke-opacity=".2"/>` +
        `<text font-size="13" font-weight="600"><tspan x="${fmt(labelX)}" y="${fmt(add(ya, I(4)))}">${role.name}</tspan>` +
        `<tspan dx="6" font-weight="400" opacity=".75">${role.year}</tspan></text></g></g>`,
    )
  }
  let last = -99
  const timeline = model.projects.filter((project) => project.onTimeline).sort((a, b) => a.start - b.start)
  for (const project of timeline) {
    const yy = Math.max(locate(project.start).v + 16, last + 13)
    last = yy
    timelineGroup.push(
      `<text class="mpj" data-t="${fmt(F(project.start))}" x="${width - 4}" y="${fmt(F(yy))}" text-anchor="end" font-size="12" opacity=".6">${project.name}</text>`,
    )
  }
  parts.push(...timelineGroup, "</g>")
  const projectGroup: string[] = ['<g class="mode" data-m="projects">']
  last = -99
  const ordered = [...model.projects].sort((a, b) => a.start - b.start)
  ordered.forEach((project, index) => {
    const x = add(I(36), mul(I(index % 3), I(18)))
    const ya = locate(project.start)
    const yb = locate(project.end)
    projectGroup.push(pill(x, ya, x, yb, project.end >= now, 9, tokens.stroke.projects))
    const yy = Math.max(ya.v + 4, last + 26)
    last = yy
    projectGroup.push(
      `<line x1="${fmt(add(x, I(6)))}" y1="${fmt(ya)}" x2="${fmt(sub(labelX, I(4)))}" y2="${fmt(sub(F(yy), I(4)))}" stroke="${INK}" stroke-opacity=".2"/>` +
        `<text x="${fmt(labelX)}" y="${fmt(F(yy))}" font-size="13" font-weight="600">${project.name}</text>` +
        `<text x="${fmt(labelX)}" y="${fmt(add(F(yy), I(12)))}" font-size="11" opacity=".45">${project.org}</text>`,
    )
  })
  parts.push(...projectGroup, "</g>")
  const focusGroup: string[] = ['<g class="mode" data-m="focus">']
  const locateX = (when: number): N => add(I(150), mul(div(sub(F(when), I(2019)), span), sub(I(width), I(160))))
  let yy = add(y0, I(4))
  for (const [key, label] of model.focus) {
    focusGroup.push(
      `<text x="4" y="${fmt(add(yy, I(8)))}" font-size="12" font-weight="600" letter-spacing=".06em">${label}</text>` +
        `<line x1="4" y1="${fmt(add(yy, I(13)))}" x2="${width - 4}" y2="${fmt(add(yy, I(13)))}" stroke="${INK}" stroke-opacity=".1"/>`,
    )
    yy = add(yy, I(28))
    const matching = model.projects.filter((project) => project.themes.includes(key)).sort((a, b) => a.start - b.start)
    for (const project of matching) {
      focusGroup.push(
        `<text x="4" y="${fmt(add(yy, F(3.5)))}" font-size="12">${project.name}</text>` +
          pill(locateX(project.start), yy, locateX(project.end), yy, project.end >= now, 8, tokens.stroke.focus),
      )
      yy = add(yy, I(15))
    }
    yy = add(yy, I(8))
  }
  parts.push(...focusGroup, "</g>")
  parts.push(...focusGroup, "</g></svg>")
  return hairlines(parts.join(""))
}

export function yearSpan(start: number, end: number, now: number): string {
  const opened = Math.trunc(start)
  const closed = end >= now ? null : Math.trunc(end)
  if (closed == null) return `${opened}–`
  if (opened === closed) return String(opened)
  return `${opened}–${String(closed).slice(2)}`
}
