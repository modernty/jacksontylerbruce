import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { test } from "node:test"
import { loadCatalog } from "./catalog"
import { publishCatalog } from "./publish"

test("media manifest and covers are current", () => {
  execFileSync("node", ["scripts/assets.mjs", "--check"], { encoding: "utf8" })
})

test("every media file a project cites exists under public", () => {
  for (const project of loadCatalog().projects) {
    const { cover, coverInk, images } = project.media
    for (const src of [cover?.src, coverInk, ...images.map((image) => image.src)].filter(Boolean) as string[]) {
      assert.ok(existsSync(`public${src}`), `${project.slug}: ${src}`)
    }
  }
})

test("public case studies with work imagery keep their cover", () => {
  const withImages = publishCatalog().projects.filter((project) => project.media.images.length > 0)
  assert.ok(withImages.length >= 9)
  for (const project of withImages) assert.ok(project.media.cover, `${project.slug} has images but no cover`)
})
