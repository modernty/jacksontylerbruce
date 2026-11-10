import assert from "node:assert/strict"
import { test } from "node:test"
import { publishCatalog } from "@/src/content/publish"
import { legacyRedirects, OLD_SLUGS } from "./redirects"

test("every old slug lands on a public route or home", () => {
  const slugs = new Set(publishCatalog().projects.map((project) => project.slug))
  for (const destination of Object.values(OLD_SLUGS)) {
    if (destination === "/") continue
    assert.ok(slugs.has(destination.replace("/work/", "")), destination)
  }
})

test("redirects are permanent and never point at hidden work", () => {
  for (const row of legacyRedirects()) {
    assert.equal(row.permanent, true)
    assert.doesNotMatch(row.destination, /remedy|traveller|twelvelabs|fintech|defi|chatter-app/)
  }
})
