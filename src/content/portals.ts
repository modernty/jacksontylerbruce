import { z } from "zod"
import remedyWork from "@/content/portals/remedy-work.json"

/** A step of a Labs study's run, stated as a claim, then its detail. */
const Run = z.object({ lead: z.string().min(1), detail: z.string().min(1) })

/** The study behind a Labs tile: a question, how it's tested, and what it settles. */
const Study = z.object({
  number: z.string().min(1),
  category: z.string().min(1),
  question: z.string().min(1),
  testing: z.string().min(1),
  method: z.string().optional(),
  participants: z.string().optional(),
  hypothesis: z.string().min(1),
  why: z.string().min(1),
  prototype: z.array(z.string().min(1)).optional(),
  run: z.array(Run),
  receipts: z.array(z.object({ quote: z.string().min(1), attribution: z.string().min(1) })).optional(),
})

const Tile = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  oneLiner: z.string().min(1),
  description: z.string().min(1),
  platform: z.string().min(1),
  status: z.string().min(1),
  image: z.string().startsWith("/").optional(),
  video: z.object({ card: z.string().startsWith("/"), full: z.string().startsWith("/"), poster: z.string().startsWith("/") }).optional(),
  study: Study.optional(),
})

/** A high-level map of how a section's work is built, shown above its tiles: a few named examples per layer, not everything. */
const Overview = z.object({
  intro: z.string().min(1),
  layers: z.array(z.object({
    name: z.string().min(1),
    count: z.number().int().positive(),
    unit: z.string().min(1),
    note: z.string().min(1),
    examples: z.array(z.string().min(1)).min(1).max(5),
  })).min(2),
  note: z.string().min(1),
})

const Portal = z.object({
  sections: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), heading: z.string().min(1), overview: Overview.optional(), tiles: z.array(Tile).min(1) })).min(1),
})

export type PortalTile = z.infer<typeof Tile>
export type PortalOverview = z.infer<typeof Overview>
export type PortalSections = z.infer<typeof Portal>["sections"]

/** Every portal's tiles, by the id a project's media names it with. */
const portals: Record<string, PortalSections> = {
  "remedy-work": Portal.parse(remedyWork).sections,
}

export function portalSections(id: string): PortalSections {
  const sections = portals[id]
  if (!sections) throw new Error(`No portal called ${id}`)
  return sections
}

export function portalIds(): string[] {
  return Object.keys(portals)
}
