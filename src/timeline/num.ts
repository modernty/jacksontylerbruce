/** Python-style numbers so SVG text matches design/source/gen.py. */
export type N = { v: number; f: boolean }

export const I = (v: number): N => ({ v, f: false })
export const F = (v: number): N => ({ v, f: true })

export const add = (x: N, y: N): N => ({ v: x.v + y.v, f: x.f || y.f })
export const sub = (x: N, y: N): N => ({ v: x.v - y.v, f: x.f || y.f })
export const mul = (x: N, y: N): N => ({ v: x.v * y.v, f: x.f || y.f })
export const div = (x: N, y: N): N => ({ v: x.v / y.v, f: true })

export function maxN(x: N, y: N): N {
  return x.v >= y.v ? x : y
}

export function fmt(n: N): string {
  if (!n.f) return String(n.v)
  if (Number.isInteger(n.v)) return n.v.toFixed(1)
  return String(n.v)
}

export function tw(text: string, size: N): N {
  return mul(mul(I(text.length), size), F(0.55))
}
