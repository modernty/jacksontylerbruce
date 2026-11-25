// Generated from design/tokens.json by scripts/tokens.mjs. Do not edit.
export const tokens = {
  "color": {
    "ink": "#111111",
    "accent": "#2E3A87",
    "accentSoft": "#E3E8FA",
    "paper": "#FAFAFA",
    "surface": "#FFFFFF",
    "well": "#F1F1EF",
    "studyMark": "#E66B36",
    "studyScreen": "#F4F3F1",
    "studySage": "#C4C8AA",
    "studySageDeep": "#D5D4B6",
    "studyLilac": "#DCD2DD",
    "studyMist": "#ECE9EC",
    "studySky": "#B6D6EE",
    "studyLily": "#A9B4F0",
    "studyLilyInk": "#2B3486",
    "studyLilySoft": "#ECEFFD",
    "remedyWashSky": "#EDF0F8",
    "remedyWashMist": "#F3F4F9",
    "remedyWashBlush": "#F6F3F7"
  },
  "inkAlpha": {
    "hover": 0.05,
    "wash": 0.06,
    "shadow": 0.07,
    "rule": 0.12,
    "hair": 0.2,
    "placeholder": 0.58,
    "muted": 0.45,
    "meta": 0.6,
    "quiet": 0.7
  },
  "font": {
    "sans": "'Aeonik Pro','Avenir Next',Avenir,'Segoe UI',sans-serif",
    "mono": "var(--plex),ui-monospace,monospace"
  },
  "size": {
    "display": "28px",
    "displaySmall": "26px",
    "header": "20px",
    "input": "16px",
    "body": "16px",
    "text": "15px",
    "small": "14px",
    "micro": "12px",
    "cardTitle": "15px",
    "tab": "14px",
    "company": "14px",
    "cardBody": "14px",
    "project": "13px",
    "label": "12px",
    "axis": "12px"
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
    "easeSlide": "cubic-bezier(.5,0,.1,1)",
    "quick": "160ms",
    "base": "250ms",
    "page": "320ms",
    "slide": "640ms",
    "slow": "450ms",
    "reveal": "600ms",
    "stagger": "40ms",
    "pulse": "2600ms",
    "load": "2100ms"
  }
} as const

/** Ink at an alpha from the ladder, as rgba for SVG and image generators. */
export function inkAt(alpha: keyof typeof tokens.inkAlpha): string {
  const hex = tokens.color.ink.slice(1)
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16))
  return `rgba(${r},${g},${b},${tokens.inkAlpha[alpha]})`
}
