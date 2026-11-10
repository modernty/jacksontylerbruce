import assert from "node:assert/strict"
import { test } from "node:test"
import { scrubUrl, targetPath } from "./scrub"

test("page views drop the question text and keep view params", () => {
  assert.equal(scrubUrl("https://x.vercel.app/work/atls?q=my+email+is+a%40b.com#summary"), "https://x.vercel.app/work/atls#summary")
  assert.equal(scrubUrl("https://x.vercel.app/sheet?topic=about&q=hi"), "https://x.vercel.app/sheet?topic=about")
  assert.equal(scrubUrl("/timeline?role=role:joba&utm_source=z#axis"), "/timeline?role=role%3Ajoba#axis")
})

test("event targets carry only the path", () => {
  assert.equal(targetPath("/focus/trust?q=secret#focus"), "/focus/trust")
})
