import { z } from "zod"
import data from "@/content/demos.json"

/**
 * What a project shows in its media, ahead of its images: the work itself (a demo), and a short
 * case study told as chapters (a study), which can end on the real site.
 */
const Demo = z.object({
  /** autoplay plays itself and takes no input; site is the real thing, to click through. */
  kind: z.enum(["autoplay", "site"]),
  /** A same-origin path under /demos/. */
  src: z.string().regex(/^\/demos\/[a-z0-9-]+\//),
  frame: z.enum(["phone", "desktop"]),
  title: z.string().min(1),
  /** A line under the demo; left out where the demo speaks for itself. */
  caption: z.string().min(1).optional(),
})

/** Where the camera looks: "x y zoom", x and y the centre in % of the screen, zoom 1 for the whole screen. */
const Focus = z.string().regex(/^\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?$/)

/** One screen of a story. later moves the camera partway through; delay is when, in ms. */
const StoryFrame = z.object({
  src: z.string().startsWith("/"),
  alt: z.string().min(1),
  focus: Focus.optional(),
  later: Focus.optional(),
  delay: z.number().int().positive().optional(),
})

/** A chapter told as steps that play on a timer, each with one or more screens. */
const Story = z.object({
  /** Where Lily sits on the trust line, 0 (the start) to 6. A step can move her. */
  point: z.number().int().min(0).max(6),
  steps: z.array(z.object({
    title: z.string().min(1),
    why: z.string().min(1),
    point: z.number().int().min(0).max(6).optional(),
    frames: z.array(StoryFrame).min(1),
  })).min(1),
})

/** A chapter told as a diagram that moves through its steps. trust-curve: work moving to agents, then the trust line. */
const Diagram = z.object({
  kind: z.literal("trust-curve"),
  steps: z.array(z.object({ label: z.string().min(1), title: z.string().min(1), why: z.string().min(1) })).length(4),
})

const Chapter = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  kicker: z.string().min(1),
  title: z.string().min(1),
  body: z.array(z.string().min(1)).default([]),
  /** For a story chapter: what is new compared with the product today, and why. */
  change: z.string().min(1).optional(),
  story: Story.optional(),
  diagram: Diagram.optional(),
  image: z.object({ src: z.string().startsWith("/"), alt: z.string().min(1), frame: z.enum(["phone", "desktop", "plain", "wide"]).default("plain") }).optional(),
})

const Study = z.object({
  title: z.string().min(1),
  stance: z.string().min(1),
  chapters: z.array(Chapter).min(1),
  /** The site the study ends on, shown live after its chapters. */
  site: Demo.extend({ kind: z.literal("site") }).optional(),
})

/** logo is the client's small mark, shown where the demo is offered in the chat. */
/**
 * A way into a body of work: tiles to pick from, each opening a page of its own inside the media,
 * with a way back out. id names its tiles in content/portals/.
 */
const Portal = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  kicker: z.string().min(1).optional(),
  title: z.string().min(1),
  intro: z.string().min(1).optional(),
})

/** One plate laid out sideways: a live demo first, then the core screens behind it. */
const Reel = z.object({
  kicker: z.string().min(1),
  title: z.string().min(1),
  intro: z.string().min(1).optional(),
  demo: Demo,
  screens: z.array(z.object({ src: z.string().startsWith("/"), alt: z.string().min(1), title: z.string().min(1), caption: z.string().min(1) })).min(1),
})

const Entry = z.object({
  logo: z.string().startsWith("/").optional(),
  /** The project's media gets the wider stage, for landscape screens that read better larger. */
  wideMedia: z.boolean().optional(),
  portal: Portal.optional(), reel: Reel.optional(), demo: Demo.optional(), study: Study.optional() })

export type DemoSpec = z.infer<typeof Demo>
export type StudySpec = z.infer<typeof Study>
export type StorySpec = z.infer<typeof Story>
export type DiagramSpec = z.infer<typeof Diagram>
export type Openable = z.infer<typeof Entry>
export type PortalSpec = z.infer<typeof Portal>
export type ReelSpec = z.infer<typeof Reel>

const entries = z.record(z.string(), Entry).parse(data.projects)
/** The case studies offered when a visitor asks for them, in the order they are shown. Add a slug to offer more. */
const caseStudies = z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1).parse(data.caseStudies)

export function caseStudySlugs(): string[] {
  return [...caseStudies]
}

/** The demo and study a project offers, if any. */
export function openableFor(slug: string): Openable {
  return entries[slug] ?? {}
}

export function openableSlugs(): string[] {
  return Object.keys(entries)
}
