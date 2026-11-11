// Writes app/tokens.css and src/design/tokens.ts from design/tokens.json.
// `--check` exits non-zero when either file is stale, so CI catches hand edits.
import { readFileSync, writeFileSync } from "node:fs"

const root = new URL("..", import.meta.url)
const tokens = JSON.parse(readFileSync(new URL("design/tokens.json", root), "utf8"))
const header = "Generated from design/tokens.json by scripts/tokens.mjs. Do not edit."

const kebab = (name) => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)
const pct = (alpha) => `${Math.round(alpha * 100)}%`

function css() {
  const lines = []
  for (const [name, value] of Object.entries(tokens.color)) lines.push(`--${kebab(name)}:${value};`)
  for (const [name, alpha] of Object.entries(tokens.inkAlpha)) {
    lines.push(`--ink-${kebab(name)}:color-mix(in srgb,var(--ink) ${pct(alpha)},transparent);`)
  }
  for (const [name, value] of Object.entries(tokens.font)) lines.push(`--${name}:${value};`)
  for (const [name, value] of Object.entries(tokens.size)) lines.push(`--fs-${kebab(name)}:${value};`)
  for (const [name, value] of Object.entries(tokens.weight)) lines.push(`--fw-${kebab(name)}:${value};`)
  for (const [name, value] of Object.entries(tokens.track)) lines.push(`--track-${kebab(name)}:${value};`)
  for (const [name, value] of Object.entries(tokens.radius)) lines.push(`--radius-${kebab(name)}:${value};`)
  for (const [name, value] of Object.entries(tokens.motion)) lines.push(`--motion-${kebab(name)}:${value};`)
  return `/* ${header} */\n:root{\n${lines.map((line) => `  ${line}`).join("\n")}\n}\n`
}

function ts() {
  const rest = Object.fromEntries(Object.entries(tokens).filter(([key]) => !key.startsWith("$")))
  return `// ${header}\nexport const tokens = ${JSON.stringify(rest, null, 2)} as const\n\n/** Ink at an alpha from the ladder, as rgba for SVG and image generators. */\nexport function inkAt(alpha: keyof typeof tokens.inkAlpha): string {\n  const hex = tokens.color.ink.slice(1)\n  const [r, g, b] = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16))\n  return \`rgba(\${r},\${g},\${b},\${tokens.inkAlpha[alpha]})\`\n}\n`
}

const outputs = [
  ["app/tokens.css", css()],
  ["src/design/tokens.ts", ts()],
]

if (process.argv.includes("--check")) {
  const stale = outputs.filter(([path, text]) => {
    try {
      return readFileSync(new URL(path, root), "utf8") !== text
    } catch {
      return true
    }
  })
  if (stale.length) {
    console.error(`Stale tokens: ${stale.map(([path]) => path).join(", ")}. Run npm run tokens.`)
    process.exit(1)
  }
  console.log("Tokens are current.")
} else {
  for (const [path, text] of outputs) writeFileSync(new URL(path, root), text)
  console.log(`Wrote ${outputs.map(([path]) => path).join(", ")}`)
}
