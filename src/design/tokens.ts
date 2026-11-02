// Generated from design/tokens.json by scripts/tokens.mjs. Do not edit.
export const tokens = {
  "color": {
    "ink": "#2E3A87",
    "paper": "#FBFBF8",
    "surface": "#FFFFFF"
  },
  "inkAlpha": {
    "hover": 0.05,
    "wash": 0.06,
    "shadow": 0.07,
    "rule": 0.12,
    "hair": 0.2,
    "placeholder": 0.38,
    "muted": 0.45,
    "meta": 0.6,
    "quiet": 0.7
  },
  "font": {
    "sans": "'Aeonik Pro','Avenir Next',Avenir,'Segoe UI',sans-serif",
    "mono": "var(--plex),ui-monospace,monospace"
  },
  "size": {
    "header": "20px",
    "input": "16px",
    "body": "16px",
    "cardTitle": "15px",
    "tab": "13px",
    "company": "12.5px",
    "cardBody": "12px",
    "project": "11.5px",
    "label": "11px",
    "axis": "10px"
  },
  "weight": {
    "regular": 400,
    "medium": 500,
    "semibold": 600
  },
  "track": {
    "header": "-.01em",
    "label": ".06em"
  },
  "radius": {
    "card": "14px",
    "pill": "999px",
    "stack": "20px"
  },
  "stroke": {
    "role": 0.75,
    "projects": 0.6,
    "focus": 0.55,
    "hair": 0.5
  },
  "motion": {
    "ease": "cubic-bezier(.22,1,.36,1)",
    "easeMove": "cubic-bezier(.3,.7,.3,1)",
    "quick": "160ms",
    "base": "250ms",
    "page": "320ms",
    "load": "2100ms"
  }
} as const

/** Ink at an alpha from the ladder, as rgba for SVG and image generators. */
export function inkAt(alpha: keyof typeof tokens.inkAlpha): string {
  const hex = tokens.color.ink.slice(1)
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16))
  return `rgba(${r},${g},${b},${tokens.inkAlpha[alpha]})`
}
