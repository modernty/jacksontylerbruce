/** Aeonik Pro is licensed and is never committed. Faces load only when the host is set. */
export function fontFaceCss(): string {
  const raw = process.env.NEXT_PUBLIC_FONT_BASE_URL?.trim().replace(/\/$/, "")
  if (!raw || !/^https:\/\/[A-Za-z0-9._~:/?#\[\]@!$&*+,;=%-]+$/.test(raw)) return ""
  if (/['"();\\<>]/.test(raw)) return ""
  const faces = [
    ["600", "semibold"],
    ["400", "regular"],
  ]
  return faces
    .map(([weight, name]) => `@font-face{font-family:'Aeonik Pro';font-weight:${weight};font-style:normal;font-display:swap;src:url('${raw}/aeonikpro-${name}.otf') format('opentype')}`)
    .join("")
}
