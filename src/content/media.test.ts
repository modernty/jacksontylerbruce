import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
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

// The cover already leads each gallery, so the gallery never repeats it: not by path, and not as a
// copy of the same file under another name.
test("no gallery repeats its project's cover", () => {
  const digest = (src: string) => createHash("sha256").update(readFileSync(`public${src}`)).digest("hex")
  for (const project of loadCatalog().projects) {
    const { cover, images } = project.media
    if (!cover) continue
    const own = digest(cover.src)
    for (const image of images) {
      assert.notEqual(image.src, cover.src, `${project.slug}: ${image.src} is the cover`)
      assert.notEqual(digest(image.src), own, `${project.slug}: ${image.src} is a copy of the cover`)
    }
  }
})
