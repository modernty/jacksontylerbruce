import { byRecent } from "./disciplines"
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

test("profile is Miami, and the current role is one employer", () => {
  const catalog = loadCatalog()
  assert.equal(catalog.profile.location, "Miami")
  assert.equal(catalog.places[0]?.name, "Miami, FL")
  const employer = catalog.roles.find((role) => role.employer)
  assert.ok(employer)
  assert.equal(employer?.title, "Senior Product Designer")
  assert.equal(employer?.since, "Jan 2026")
  assert.equal(employer?.end, null)
  assert.deepEqual(employer?.clientIds, ["client:loblaw-pc-health", "client:intuit", "client:rv", "client:botpress"])
  const overmatch = catalog.roles.find((role) => role.id === "role:overmatch")
  assert.equal(overmatch?.title, "Design Lead")
  assert.equal(overmatch?.since, "May 2026")
  assert.equal(overmatch?.end, null)
  const banner = catalog.clients.find((item) => item.id === "client:loblaw-pc-health")
  const intuit = catalog.clients.find((item) => item.id === "client:intuit")
  assert.equal(banner?.usesEmployerName, false)
  assert.equal(banner?.name, "Loblaws / PC Health")
  assert.equal(banner?.roleId, "role:employer")
  assert.deepEqual(banner?.projectIds, ["project:loblaw", "project:pc-chat", "project:pc-chat-memory"])
  assert.equal(intuit?.name, "Intuit")
  assert.equal(intuit?.roleId, "role:employer")
  assert.deepEqual(intuit?.projectIds, ["project:intuit"])
  const loblaw = catalog.projects.find((project) => project.id === "project:loblaw")
  assert.equal(loblaw?.name, "Loblaws / PC Health")
  assert.equal(loblaw?.roleId, "role:employer")
  assert.equal(loblaw?.clientId, "client:loblaw-pc-health")
  assert.equal(loblaw?.start, 2026.04)
  assert.equal(loblaw?.end, null)
  assert.equal(loblaw?.flagged, false)
  assert.equal(catalog.projects.some((project) => project.slug === "remedy"), false)
  assert.equal(catalog.projects.find((project) => project.name === "Intuit")?.clientId, "client:intuit")
  assert.equal(catalog.projects.some((project) => project.name === "PC Health app"), false)
})

test("the public project list is the approved one, in order", () => {
  const slugs = byRecent(publishCatalog().projects).map((project) => project.slug)
  assert.deepEqual(slugs, [
    "overmatch-ai", "botpress", "intuit", "loblaws", "lzr-2", "usm-milan", "model-playground", "talent-management", "whitelist",
    "lazarus-brand", "chatter", "novart", "fixed-rate-fixed-term", "the-terminal", "corelogic", "nestle", "usm-hue-man",
  ])
  const hidden = loadCatalog().projects.filter((project) => project.flagged).map((project) => project.slug).sort()
  assert.deepEqual(hidden, ["pc-chat", "pc-chat-memory", "rv", "traveller"])
})

test("flagged work is absent from public output", () => {
  const catalog = loadCatalog()
  const flagged = catalog.projects.filter((project) => project.flagged).map((project) => project.name).sort()
  assert.deepEqual(flagged, ["PC Chat", "PC Chat: Memory", "RV", "Traveller"])
  const published = publishCatalog()
  const blob = JSON.stringify(published)
  // Confidential work never appears by name. Work folded into another project (PC Chat into
  // Loblaws / PC Health) is named in that project's own words, but its old page is never linked.
  const folded = new Set(["PC Chat", "PC Chat: Memory"])
  // Whole names only: "RV" is also inside other words.
  for (const name of flagged.filter((item) => !folded.has(item))) assert.equal(new RegExp(`(^|[^A-Za-z])${name}([^A-Za-z]|$)`).test(blob), false, name)
  for (const slug of ["pc-chat", "pc-chat-memory"]) assert.equal(blob.includes(`/work/${slug}`), false, slug)
  assert.equal(published.profile.location, "Miami")
  assert.equal(textIssues(blob).length, 0)
  for (const project of published.projects) assert.ok(wordCount(project.summary) <= 40)
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
  assert.equal(/graduat/i.test(JSON.stringify(loadCatalog())), false)
})

test("blocklist matches the python digests", () => {
  const raw = execFileSync("python3", ["-c", "import json; from pipeline.blocklist import BLOCKLIST, PUBLISHED, contains_blocked; print(json.dumps({'b':sorted(BLOCKLIST),'p':sorted(PUBLISHED),'safe':contains_blocked('Tyler is based in Miami, FL.')}))"], { encoding: "utf8" })
  const parsed = JSON.parse(raw) as { b: string[]; p: string[]; safe: boolean }
  assert.deepEqual([...BLOCKLIST].sort(), parsed.b)
  assert.deepEqual([...PUBLISHED].sort(), parsed.p)
  assert.equal(parsed.safe, false)
  assert.equal(containsBlocked("Tyler is based in Medellín."), false)
  assert.equal(containsBlocked("Design Lead at Overmatch AI"), false)
  assert.equal(containsBlocked("Remedy"), false)
  assert.equal(containsBlocked("Traveller"), true)
})

test("the voice guide's hype words are flagged", () => {
  assert.deepEqual(textIssues("A revolutionary, game-changing launch."), ["hype"])
  assert.deepEqual(textIssues("Good design starts by living inside the problem."), [])
})

test("titles: Lazarus is a progression, and two Lazarus projects carry Product Design Lead", async () => {
  const { roleTitle, projectTitle } = await import("./titles")
  const catalog = publishCatalog()
  const lazarus = catalog.roles.find((role) => role.id === "role:lazarus")
  assert.ok(lazarus)
  assert.equal(roleTitle(lazarus), "Product Design Lead, then Design Director")
  for (const slug of ["model-playground", "talent-management"]) {
    const project = catalog.projects.find((item) => item.slug === slug)
    assert.ok(project, slug)
    assert.equal(projectTitle(project, lazarus), "Product Design Lead", slug)
  }
  const employer = catalog.roles.find((role) => role.employer)
  assert.equal(employer && roleTitle(employer), "Senior Product Designer")
})
