import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import { inkAt, tokens } from "./tokens"

const GENERATED = new Set(["app/tokens.css", "src/design/tokens.ts"])
const RAW = /#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b|rgba?\(/

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

test("generated token files match design/tokens.json", () => {
  execFileSync("node", ["scripts/tokens.mjs", "--check"], { encoding: "utf8" })
})

test("no raw colours in app or src outside the generated tokens", () => {
  const offenders = [...files("app"), ...files("src")]
    .filter((path) => /\.(css|tsx?)$/.test(path) && !path.endsWith(".test.ts") && !GENERATED.has(path))
    .filter((path) => RAW.test(readFileSync(path, "utf8")))
  assert.deepEqual(offenders, [])
})

test("ink and paper stay locked to the spec", () => {
  assert.equal(tokens.color.ink, "#2E3A87")
  assert.equal(tokens.color.paper, "#FBFBF8")
  assert.equal(inkAt("hair"), "rgba(46,58,135,0.2)")
})
