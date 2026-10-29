import { F, I, add, div, fmt, maxN, mul, sub, tw, type N } from "./num"
import type { ProjectMark, TimelineModel } from "./types"

const INK = "#2E3A87"

function pill(x1: N, y1: N, x2: N, y2: N, cur: boolean, h = 12, sw = 1.5, op = 1): string {
  const r = div(I(h), I(2))
  const rect =
    y1.v === y2.v
      ? `<rect x="${fmt(sub(x1, r))}" y="${fmt(sub(y1, r))}" width="${fmt(add(sub(x2, x1), I(h)))}" height="${h}" rx="${fmt(r)}"`
      : `<rect x="${fmt(sub(x1, r))}" y="${fmt(sub(y1, r))}" width="${h}" height="${fmt(add(sub(y2, y1), I(h)))}" rx="${fmt(r)}"`
  let drawing = `${rect} class="pr" fill="#FBFBF8" stroke="${INK}" stroke-width="${fmt(F(sw))}" stroke-opacity="${op}"/>`
  const dot = h >= 12 ? F(2.6) : I(2)
  drawing += `<circle class="d0" cx="${fmt(x1)}" cy="${fmt(y1)}" r="${fmt(dot)}" fill="${INK}" fill-opacity="${op}"/>`
  if (!cur) {
    drawing += `<circle class="d1" cx="${fmt(x2)}" cy="${fmt(y2)}" r="${fmt(dot)}" fill="${INK}" fill-opacity="${op}"/>`
  }
  return drawing
}

function themeLine(model: TimelineModel, name: string): string {
  const project = model.projects.find((item) => item.name === name)
  const keys = project ? project.themes : []
  return keys.map((key) => model.names[key]).join(" · ")
}

function lanesFor(count: number): N[] {
  if (count > 1) {
    const step = div(I(220), I(Math.max(count, 2) - 1))
    return Array.from({ length: count }, (_, index) => add(I(70), mul(I(index), step)))
  }
  return [I(150)]
}

export function desktopSvg(model: TimelineModel, width = 1120, height = 340): string {
  const now = model.now
  const x0 = I(150)
  const x1 = sub(I(width), I(110))
  const span = sub(F(now), I(2019))
  const locate = (when: number): N => add(x0, mul(div(sub(F(when), I(2019)), span), sub(x1, x0)))
  const parts: string[] = [
    `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" font-family="Aeonik Pro" fill="${INK}">`,
  ]
  parts.push(
    `<line class="nowl" x1="${fmt(x1)}" y1="30" x2="${fmt(x1)}" y2="${height - 16}" stroke="${INK}" stroke-opacity=".35" stroke-dasharray="2 3"/><text x="${fmt(x1)}" y="${height - 4}" text-anchor="middle" font-size="10" font-weight="600" letter-spacing=".08em" class="nowt">NOW</text>`,
  )
  for (let year = 2019; year < 2027; year += 1) {
    parts.push(
      `<text class="yr" x="${fmt(locate(year))}" y="${height - 4}" text-anchor="middle" font-size="10" opacity=".4">${year}</text>`,
    )
  }
  const lanes = [I(78), I(170), I(262)]
  const timelineGroup: string[] = ['<g class="mode on" data-m="timeline">']
  for (const laneY of lanes) {
    timelineGroup.push(
      `<line class="bl" x1="${fmt(sub(x0, I(40)))}" y1="${fmt(laneY)}" x2="${fmt(x1)}" y2="${fmt(laneY)}" stroke="${INK}" stroke-opacity=".1"/>`,
    )
  }
  const rows = new Map<string, number>()
  const timeline = model.projects.filter((project) => project.onTimeline).sort((a, b) => a.start - b.start)
  timeline.forEach((project, index) => {
    const name = project.name
    const lane = project.lane
    const xx = add(locate(project.start), I(4))
    let row = 0
    const focus = model.names[project.themes[0]]
    const full = themeLine(model, name)
    const widthGuess = add(add(mul(tw(name, F(11.5)), F(1.22)), I(8)), mul(tw(focus, I(11)), F(1.15))).v
    while ((rows.get(`${lane}:${row}`) ?? -1e9) > xx.v - 6) row += 1
    rows.set(`${lane}:${row}`, xx.v + widthGuess)
    const ly = add(add(lanes[lane], I(24)), mul(I(row), I(15)))
    let fx = add(add(add(xx, I(4)), mul(tw(name, F(11.5)), F(1.22))), I(8))
    let anchor = "start"
    if (add(fx, mul(tw(full, I(11)), F(1.15))).v > width - 4) {
      fx = sub(xx, I(6))
      anchor = "end"
    }
    const laneTop = lanes[lane]
    timelineGroup.push(
      `<line class="tk" data-t="${fmt(F(project.start))}" x1="${fmt(xx)}" y1="${fmt(add(laneTop, I(8)))}" x2="${fmt(xx)}" y2="${fmt(sub(ly, I(10)))}" stroke="${INK}" stroke-opacity=".3"/>` +
        `<g class="pj" tabindex="0" role="button" aria-label="${name}" data-i="${index}" data-t="${fmt(F(project.start))}">` +
        `<rect x="${fmt(xx)}" y="${fmt(sub(ly, I(11)))}" width="${fmt(add(mul(tw(name, F(11.5)), F(1.1)), I(8)))}" height="15" fill="transparent"/>` +
        `<text class="w4" x="${fmt(add(xx, I(4)))}" y="${fmt(ly)}" font-size="11.5">${name}</text>` +
        `<text class="w6" x="${fmt(add(xx, I(4)))}" y="${fmt(ly)}" font-size="11.5" font-weight="600">${name}</text>` +
        `<text class="fo" x="${fmt(fx)}" y="${fmt(ly)}" text-anchor="${anchor}" font-size="11">${focus}</text>` +
        `<text class="fa" x="${fmt(fx)}" y="${fmt(ly)}" text-anchor="${anchor}" font-size="11">${full}</text></g>`,
    )
  })
  for (const role of model.roles) {
    const y = lanes[role.lane]
    const xa = locate(role.start)
    const current = role.end == null
    const xb = current ? x1 : locate(role.end as number)
    const label = (weight: number, cls: string) =>
      `<text class="${cls}" font-size="12.5" font-weight="${weight}"><tspan x="${fmt(sub(xa, I(6)))}" y="${fmt(sub(y, I(26)))}">${role.name}</tspan><tspan x="${fmt(sub(xa, I(6)))}" y="${fmt(sub(y, I(12)))}">${role.year}</tspan></text>`
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
      `<line x1="${fmt(sub(x0, I(40)))}" y1="${fmt(laneY)}" x2="${fmt(x1)}" y2="${fmt(laneY)}" stroke="${INK}" stroke-opacity=".08"/>`,
    )
  }
  for (const { item, index } of placed) {
    const y = projectLanes[index]
    const xa = locate(item.start)
    const xb = locate(item.end)
    const current = item.end >= now
    projectGroup.push(
      pill(xa, y, xb, y, current, 9, 1.2) +
        `<text x="${fmt(sub(xa, I(4)))}" y="${fmt(sub(y, I(10)))}" font-size="12.5" font-weight="600">${item.name}</text>` +
        `<text x="${fmt(sub(xa, I(4)))}" y="${fmt(add(y, I(19)))}" font-size="10" opacity=".45">${item.org}</text>`,
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
      `<line x1="${fmt(sub(x0, I(40)))}" y1="${fmt(sub(y, I(7)))}" x2="${fmt(x1)}" y2="${fmt(sub(y, I(7)))}" stroke="${INK}" stroke-opacity=".1"/>` +
        `<text x="${fmt(sub(x0, I(140)))}" y="${fmt(add(y, F(3.5)))}" font-size="11" font-weight="600" letter-spacing=".06em">${block.label}</text>`,
    )
    for (const item of block.items) {
      const yy = add(y, mul(I(item.row), rowH))
      const spots = positions.get(item.name) ?? []
      spots.push({ x: item.xa, y: yy })
      positions.set(item.name, spots)
      focusGroup.push(
        pill(item.xa, yy, item.xb, yy, item.current, 7, 1.1) +
          `<text x="${fmt(sub(item.xa, I(9)))}" y="${fmt(add(yy, F(3.5)))}" text-anchor="end" font-size="10">${item.name}</text>`,
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
  return parts.join("")
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
    parts.push(`<text class="yr" x="4" y="${fmt(add(locate(year), I(3)))}" font-size="9" opacity=".4">'${String(year).slice(2)}</text>`)
  }
  parts.push(
    `<line class="nowl" x1="4" y1="${fmt(y1)}" x2="${width - 4}" y2="${fmt(y1)}" stroke="${INK}" stroke-opacity=".35" stroke-dasharray="2 3"/><text x="4" y="${fmt(add(y1, I(14)))}" font-size="9" font-weight="600">NOW</text>`,
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
        `<text font-size="11.5" font-weight="600"><tspan x="${fmt(labelX)}" y="${fmt(add(ya, I(4)))}">${role.name}</tspan>` +
        `<tspan dx="6" font-weight="400" opacity=".75">${role.year}</tspan></text></g></g>`,
    )
  }
  let last = -99
  const timeline = model.projects.filter((project) => project.onTimeline).sort((a, b) => a.start - b.start)
  for (const project of timeline) {
    const yy = Math.max(locate(project.start).v + 16, last + 13)
    last = yy
    timelineGroup.push(
      `<text class="mpj" data-t="${fmt(F(project.start))}" x="${width - 4}" y="${fmt(F(yy))}" text-anchor="end" font-size="10.5" opacity=".6">${project.name}</text>`,
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
    projectGroup.push(pill(x, ya, x, yb, project.end >= now, 9, 1.2))
    const yy = Math.max(ya.v + 4, last + 26)
    last = yy
    projectGroup.push(
      `<line x1="${fmt(add(x, I(6)))}" y1="${fmt(ya)}" x2="${fmt(sub(labelX, I(4)))}" y2="${fmt(sub(F(yy), I(4)))}" stroke="${INK}" stroke-opacity=".2"/>` +
        `<text x="${fmt(labelX)}" y="${fmt(F(yy))}" font-size="11.5" font-weight="600">${project.name}</text>` +
        `<text x="${fmt(labelX)}" y="${fmt(add(F(yy), I(12)))}" font-size="9.5" opacity=".45">${project.org}</text>`,
    )
  })
  parts.push(...projectGroup, "</g>")
  const focusGroup: string[] = ['<g class="mode" data-m="focus">']
  const locateX = (when: number): N => add(I(150), mul(div(sub(F(when), I(2019)), span), sub(I(width), I(160))))
  let yy = add(y0, I(4))
  for (const [key, label] of model.focus) {
    focusGroup.push(
      `<text x="4" y="${fmt(add(yy, I(8)))}" font-size="10" font-weight="600" letter-spacing=".06em">${label}</text>` +
        `<line x1="4" y1="${fmt(add(yy, I(13)))}" x2="${width - 4}" y2="${fmt(add(yy, I(13)))}" stroke="${INK}" stroke-opacity=".1"/>`,
    )
    yy = add(yy, I(28))
    const matching = model.projects.filter((project) => project.themes.includes(key)).sort((a, b) => a.start - b.start)
    for (const project of matching) {
      focusGroup.push(
        `<text x="4" y="${fmt(add(yy, F(3.5)))}" font-size="10.5">${project.name}</text>` +
          pill(locateX(project.start), yy, locateX(project.end), yy, project.end >= now, 8, 1.1),
      )
      yy = add(yy, I(15))
    }
    yy = add(yy, I(8))
  }
  parts.push(...focusGroup, "</g>")
  parts.push(...focusGroup, "</g></svg>")
  return parts.join("")
}

export function yearSpan(start: number, end: number, now: number): string {
  const opened = Math.trunc(start)
  const closed = end >= now ? null : Math.trunc(end)
  if (closed == null) return `${opened}–`
  if (opened === closed) return String(opened)
  return `${opened}–${String(closed).slice(2)}`
}
