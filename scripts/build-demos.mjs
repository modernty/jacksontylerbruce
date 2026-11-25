#!/usr/bin/env node
/**
 * Rebuilds the demos the portfolio opens in its presentation layer.
 *
 * Each demo's source lives in demos/<slug>/ (copied from the original project, then adapted
 * for the portfolio). Its static build lands in public/demos/<slug>/ and is committed, so the
 * Vercel build of the portfolio never has to build them.
 *
 *   npm run demos            every demo
 *   npm run demos -- intuit  one demo
 */
import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"

const root = new URL("..", import.meta.url).pathname
const run = (cwd, cmd, args) => execFileSync(cmd, args, { cwd, stdio: "inherit" })

function install(dir) {
  if (!existsSync(join(dir, "node_modules"))) run(dir, "npm", ["ci", "--no-audit", "--no-fund"])
}

function publish(from, slug) {
  const to = join(root, "public", "demos", slug)
  rmSync(to, { recursive: true, force: true })
  mkdirSync(to, { recursive: true })
  cpSync(from, to, { recursive: true })
}

const DEMOS = {
  /** Vite app; ?autoplay replays scripted turns and drives the UI on a loop. */
  intuit(dir) {
    install(dir)
    run(dir, "npx", ["vite", "build", "--base=/demos/intuit/", "--outDir", join(root, "public/demos/intuit"), "--emptyOutDir"])
  },
  /** Next static export with basePath /demos/remedy-work; the original password gate is removed. */
  "remedy-work"(dir) {
    install(dir)
    run(dir, "npx", ["next", "build"])
    publish(join(dir, "out"), "remedy-work")
  },
  /** Next static export with basePath /demos/loblaw-handoff; the portfolio opens /showcase. */
  "loblaw-handoff"(dir) {
    install(dir)
    run(dir, "npx", ["next", "build"])
    publish(join(dir, "out"), "loblaw-handoff")
  },
  /** A single self-contained page; ?story opens the moments, the live Desk and the trust line. */
  botpress(dir) {
    publish(dir, "botpress")
  },
}

const wanted = process.argv.slice(2)
for (const [slug, build] of Object.entries(DEMOS)) {
  if (wanted.length && !wanted.includes(slug)) continue
  console.log(`\n▸ ${slug}`)
  build(join(root, "demos", slug))
}
