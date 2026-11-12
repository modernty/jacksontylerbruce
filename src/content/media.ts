import authored from "@/content/media.json"
import generated from "./media.gen.json"
import type { Image, Media } from "./schema"

type Authored = { src: string; alt: string; kind?: Image["kind"] }
type Entry = { cover: string | null; coverAlt?: string; images: Authored[] }
type Measured = { width: number; height: number; blur: string }

const entries = authored.projects as Record<string, Entry>
const measured = generated as Record<string, Measured>

function image(src: string, alt: string, extra: Partial<Authored> = {}): Image {
  const size = measured[src]
  if (!size) throw new Error(`media ${src} is not in the manifest. Run npm run assets.`)
  return { src, alt, ...size, kind: extra.kind ?? "work" }
}

/** Media for one project slug. Missing alt text falls back to the project name and position. */
export function mediaFor(slug: string, name: string): Media {
  const entry = entries[slug]
  if (!entry) return { cover: null, coverInk: null, images: [] }
  const count = entry.images.length
  return {
    cover: entry.cover ? image(entry.cover, entry.coverAlt?.trim() || `${name}, cover`) : null,
    coverInk: entry.cover ? `/media/${slug}/cover-ink.webp` : null,
    images: entry.images.map((item, index) =>
      image(item.src, item.alt.trim() || `${name}, image ${index + 1} of ${count}`, item),
    ),
  }
}
