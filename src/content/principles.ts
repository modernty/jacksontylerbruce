import data from "@/content/principles.json"

/** One principle from the point of view (design/source/pov.md). */
export type Principle = { id: string; title: string; body: string }

export const PRINCIPLES = data.principles as Principle[]

const byId = new Map(PRINCIPLES.map((principle) => [principle.id, principle]))
/** Each project's principles; a project can back several, the first being its main one. */
const bySlug = data.projects as Record<string, string | string[]>

/** The main principle a project proves, if it names one. */
export function principleFor(slug: string): Principle | undefined {
  const named = bySlug[slug]
  const id = Array.isArray(named) ? named[0] : named
  return id ? byId.get(id) : undefined
}
