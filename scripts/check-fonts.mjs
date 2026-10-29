import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { execFileSync } from "node:child_process"

const root = new URL("..", import.meta.url).pathname
const allow = new Set(["fonts/courier-prime-regular.woff2"])
const extensions = new Set([".otf", ".woff", ".woff2", ".ttf", ".eot"])

function walk(dir, found) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".next") continue
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) walk(path, found)
    else {
      const ext = name.slice(name.lastIndexOf("."))
      if (extensions.has(ext)) found.push(relative(root, path))
    }
  }
}

const onDisk = []
walk(root, onDisk)
const tracked = execFileSync("git", ["ls-files", "*.otf", "*.woff", "*.woff2", "*.ttf", "*.eot"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)

const offenders = [...new Set([...onDisk, ...tracked])].filter((file) => !allow.has(file))
const gitignore = readFileSync(join(root, ".gitignore"), "utf8")
const required = ["*.otf", "*.woff", "*.woff2", "!fonts/courier-prime-regular.woff2"]
const missingRules = required.filter((rule) => !gitignore.includes(rule))

if (missingRules.length || offenders.length) {
  console.error("Font check failed.")
  if (missingRules.length) console.error("gitignore missing:", missingRules.join(", "))
  if (offenders.length) console.error("unexpected font files:", offenders.join(", "))
  process.exit(1)
}

if (!tracked.includes("fonts/courier-prime-regular.woff2")) {
  console.error("The open-licensed Courier Prime file is not tracked.")
  process.exit(1)
}

console.log("Font check passed. Tracked fonts:", tracked.join(", "))
