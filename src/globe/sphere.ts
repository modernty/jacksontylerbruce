/**
 * Orthographic projection of a unit sphere, with no clipping: points on the far side still
 * project, and `front` says which side they are on so they can be drawn faded or dashed.
 */

export type View = { lng: number; lat: number }
export type Projected = { x: number; y: number; front: boolean }

const RAD = Math.PI / 180
const round = (value: number) => Math.round(value * 10) / 10

type Vec = [number, number, number]

function unit(lat: number, lng: number, lift = 1): Vec {
  const phi = lat * RAD
  const lambda = lng * RAD
  return [lift * Math.cos(phi) * Math.sin(lambda), lift * Math.sin(phi), lift * Math.cos(phi) * Math.cos(lambda)]
}

/** Turns the sphere so the view's centre faces the viewer (+z). */
function turn([x, y, z]: Vec, view: View): Vec {
  const a = -view.lng * RAD
  const b = view.lat * RAD
  const x1 = x * Math.cos(a) + z * Math.sin(a)
  const z1 = -x * Math.sin(a) + z * Math.cos(a)
  return [x1, y * Math.cos(b) - z1 * Math.sin(b), y * Math.sin(b) + z1 * Math.cos(b)]
}

export function project(lat: number, lng: number, view: View, radius: number, cx: number, cy: number, lift = 1): Projected {
  const [x, y, z] = turn(unit(lat, lng, lift), view)
  // A lifted point (an arc) behind the sphere stays visible while it is outside the disc.
  const outside = x * x + y * y > 1
  // Rounded so the server render and the browser agree to the digit.
  return { x: round(cx + radius * x), y: round(cy - radius * y), front: z >= 0 || (lift > 1 && outside) }
}

/** Points along the great circle from a to b, as [lat, lng], via spherical interpolation. */
export function greatCircle(a: { lat: number; lng: number }, b: { lat: number; lng: number }, steps = 48): { lat: number; lng: number; t: number }[] {
  const p = unit(a.lat, a.lng)
  const q = unit(b.lat, b.lng)
  const dot = Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]))
  const omega = Math.acos(dot)
  const out: { lat: number; lng: number; t: number }[] = []
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps
    const s = Math.sin(omega) || 1
    const wa = omega ? Math.sin((1 - t) * omega) / s : 1 - t
    const wb = omega ? Math.sin(t * omega) / s : t
    const v: Vec = [wa * p[0] + wb * q[0], wa * p[1] + wb * q[1], wa * p[2] + wb * q[2]]
    const length = Math.hypot(...v) || 1
    out.push({ lat: Math.asin(v[1] / length) / RAD, lng: Math.atan2(v[0], v[2]) / RAD, t })
  }
  return out
}

/** Angular distance in degrees. */
export function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const p = unit(a.lat, a.lng)
  const q = unit(b.lat, b.lng)
  return Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]))) / RAD
}

/** Splits a projected polyline into runs on the same side, as SVG path data for each side. */
export function splitPath(points: Projected[]): { front: string; back: string } {
  let front = ""
  let back = ""
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    const previous = points[index - 1]
    const move = !previous || previous.front !== point.front
    const step = `${move ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    if (point.front) front += step
    else back += step
    // Join the seam so the line does not gap where it crosses the rim.
    if (previous && previous.front !== point.front) {
      const join = `L${point.x.toFixed(1)} ${point.y.toFixed(1)}`
      if (previous.front) front += join
      else back += join
    }
  }
  return { front, back }
}
