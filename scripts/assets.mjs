// Reads content/media.json and writes:
//   src/content/media.gen.json   size + blur placeholder for every image
//   public/media/<slug>/cover.webp      16:10 art-directed cover
//   public/media/<slug>/cover-ink.webp  the same cover as ink on paper, for plates and share cards
// Same inputs give the same bytes. `--check` fails when the manifest is stale.
import { fileURLToPath } from "node:url"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import sharp from "sharp"

const root = new URL("..", import.meta.url)
const at = (path) => new URL(path.replace(/^\//, ""), root)
const pub = (src) => fileURLToPath(at(`public${src}`))

const tokens = JSON.parse(readFileSync(at("design/tokens.json"), "utf8"))
const media = JSON.parse(readFileSync(at("content/media.json"), "utf8"))

const rgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
const INK = rgb(tokens.color.ink)
const PAPER = rgb(tokens.color.paper)
const COVER = { width: 1600, height: 1000 }

sharp.cache(false)
sharp.concurrency(1)

async function describe(src) {
  const file = pub(src)
  if (!existsSync(file)) throw new Error(`missing media file ${src}`)
  const image = sharp(file, { animated: false })
  const { width, height } = await image.metadata()
  const blur = await sharp(file, { animated: false })
    .resize(16, 16, { fit: "inside" })
    .webp({ quality: 40 })
    .toBuffer()
  return { width, height, blur: `data:image/webp;base64,${blur.toString("base64")}` }
}

/** Maps luminance onto a two-stop ramp: shadows become ink, highlights become paper. */
async function inkPlate(src) {
  const { data, info } = await sharp(pub(src), { animated: false })
    .resize(COVER.width, COVER.height, { fit: "cover", position: "attention" })
    .grayscale()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const out = Buffer.alloc(info.width * info.height * 3)
  for (let index = 0; index < info.width * info.height; index += 1) {
    const t = data[index * info.channels] / 255
    for (let channel = 0; channel < 3; channel += 1) {
      out[index * 3 + channel] = Math.round(INK[channel] + (PAPER[channel] - INK[channel]) * t)
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality: 82 }).toBuffer()
}

async function build() {
  const manifest = {}
  const covers = []
  for (const [slug, entry] of Object.entries(media.projects)) {
    const sources = [entry.cover, ...entry.images.map((image) => image.src)].filter(Boolean)
    for (const src of sources) manifest[src] ??= await describe(src)
    if (entry.cover) covers.push([slug, entry.cover])
  }
  return { manifest, covers }
}

const target = at("src/content/media.gen.json")
const { manifest, covers } = await build()
const text = `${JSON.stringify(manifest, null, 2)}\n`

if (process.argv.includes("--check")) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : ""
  const missing = covers.filter(([slug]) => !existsSync(at(`public/media/${slug}/cover-ink.webp`)))
  if (current !== text || missing.length) {
    console.error("Media manifest or covers are stale. Run npm run assets.")
    process.exit(1)
  }
  console.log(`Media is current: ${Object.keys(manifest).length} images, ${covers.length} covers.`)
} else {
  writeFileSync(target, text)
  for (const [slug, src] of covers) {
    const dir = at(`public/media/${slug}/`)
    mkdirSync(dir, { recursive: true })
    const cover = await sharp(pub(src), { animated: false })
      .resize(COVER.width, COVER.height, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer()
    writeFileSync(new URL("cover.webp", dir), cover)
    writeFileSync(new URL("cover-ink.webp", dir), await inkPlate(src))
  }
  console.log(`Wrote ${Object.keys(manifest).length} image entries and ${covers.length} covers.`)
}
