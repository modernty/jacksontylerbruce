import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import { loadCatalog } from "./catalog"
import { employerPublicName } from "./employer"
import { BLOCKLIST, PUBLISHED, containsBlocked, textIssues, wordCount } from "./guard"
import { publishCatalog } from "./publish"

function files(dir: string): string[] {
  const found: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) found.push(...files(path))
    else if (/\.(ts|tsx)$/.test(name)) found.push(path)
  }
  return found
}

test("profile is Miami and the current role is one employer", () => {
  const catalog = loadCatalog()
  assert.equal(catalog.profile.location, "Miami, FL")
  assert.equal(catalog.places[0]?.name, "Miami, FL")
  const employer = catalog.roles.find((role) => role.employer)
  assert.ok(employer)
  assert.equal(employer?.title, "Senior Designer")
  assert.equal(employer?.since, "Jan 2026")
  assert.equal(employer?.end, null)
  assert.deepEqual(employer?.clientIds, ["client:loblaw-pc-health", "client:intuit"])
  const overmatch = catalog.roles.find((role) => role.id === "role:overmatch")
  assert.equal(overmatch?.title, "Design Lead")
  assert.equal(overmatch?.since, "May 2026")
  assert.equal(overmatch?.end, null)
  const banner = catalog.clients.find((item) => item.id === "client:loblaw-pc-health")
  const intuit = catalog.clients.find((item) => item.id === "client:intuit")
  assert.equal(banner?.usesEmployerName, true)
  assert.equal(banner?.roleId, "role:employer")
  assert.deepEqual(banner?.projectIds, ["project:loblaw", "project:remedy"])
  assert.equal(intuit?.name, "Intuit")
  assert.equal(intuit?.roleId, "role:employer")
  assert.deepEqual(intuit?.projectIds, ["project:intuit"])
  const loblaw = catalog.projects.find((project) => project.id === "project:loblaw")
  assert.equal(loblaw?.name, "Loblaw")
  assert.equal(loblaw?.clientId, "client:loblaw-pc-health")
  assert.equal(loblaw?.start, 2026.04)
  assert.equal(loblaw?.end, null)
  assert.equal(loblaw?.flagged, false)
  assert.equal(catalog.projects.find((project) => project.name === "Remedy")?.flagged, true)
  assert.equal(catalog.projects.find((project) => project.name === "Intuit")?.clientId, "client:intuit")
  assert.equal(catalog.projects.some((project) => project.name === "PC Health app"), false)
})

test("flagged work is absent from public output", () => {
  const catalog = loadCatalog()
  const flagged = catalog.projects.filter((project) => project.flagged).map((project) => project.name).sort()
  assert.deepEqual(flagged, ["Chatter app", "DeFi redesign", "FinTech Terminal", "Remedy", "Traveller"])
  const published = publishCatalog()
  const blob = JSON.stringify(published)
  for (const name of flagged) assert.equal(blob.includes(name), false, name)
  assert.equal(published.profile.location, "Miami, FL")
  assert.equal(textIssues(blob).length, 0)
  for (const project of published.projects) assert.ok(wordCount(project.summary) <= 40)
  for (const role of published.roles) assert.notEqual(role.title, "Product Designer")
})

test("the employer name is only the switch", () => {
  const source = readFileSync("src/content/employer.ts", "utf8")
  const match = source.match(/process\.env\.EMPLOYER_PUBLIC_NAME \?\? '([^']*)'/)
  assert.ok(match)
  const name = match?.[1] ?? ""
  assert.equal(employerPublicName(), name)
  const offenders: string[] = []
  for (const file of [...files("src"), ...files("app"), "design/source/gen.py", "design/source/themes.md"]) {
    if (file.endsWith("src/content/employer.ts")) continue
    if (readFileSync(file, "utf8").includes(name)) offenders.push(file)
  }
  assert.deepEqual(offenders, [])
  const tree = [...files("src"), ...files("app")]
    .filter((file) => !file.endsWith(".test.ts"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n")
  assert.equal(/product[\s-]*designers?/i.test(tree), false)
  assert.equal(/medell/i.test(tree), false)
  assert.equal(/graduat/i.test(JSON.stringify(loadCatalog())), false)
})

test("blocklist matches the python digests", () => {
  const raw = execFileSync("python3", ["-c", "import json; from pipeline.blocklist import BLOCKLIST, PUBLISHED, contains_blocked; print(json.dumps({'b':sorted(BLOCKLIST),'p':sorted(PUBLISHED),'safe':contains_blocked('Tyler is based in Miami, FL.')}))"], { encoding: "utf8" })
  const parsed = JSON.parse(raw) as { b: string[]; p: string[]; safe: boolean }
  assert.deepEqual([...BLOCKLIST].sort(), parsed.b)
  assert.deepEqual([...PUBLISHED].sort(), parsed.p)
  assert.equal(parsed.safe, false)
  assert.equal(containsBlocked("Tyler is based in Miami, FL."), false)
  assert.equal(containsBlocked("Design Lead at Overmatch AI"), false)
})
