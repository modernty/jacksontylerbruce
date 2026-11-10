import assert from "node:assert/strict"
import { test } from "node:test"
import { indexable, publicPaths, siteUrl } from "./seo"

test("only production is indexable, with the canonical host", () => {
  assert.equal(indexable({ VERCEL_ENV: "production" }), true)
  assert.equal(indexable({ VERCEL_ENV: "preview" }), false)
  assert.equal(indexable({}), false)
  assert.equal(siteUrl({ VERCEL_ENV: "production" }), "https://jacksontylerbruce.com")
  assert.equal(siteUrl({ VERCEL_ENV: "preview", VERCEL_URL: "gv1w-abc.vercel.app" }), "https://gv1w-abc.vercel.app")
})

test("the sitemap paths skip hidden work, /me and the API", () => {
  const paths = publicPaths()
  assert.ok(paths.includes("/work/model-playground"))
  for (const path of paths) {
    assert.doesNotMatch(path, /remedy|traveller|fintech|defi|chatter-app|^\/me|^\/api/i)
  }
})
