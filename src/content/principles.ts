import data from "@/content/principles.json"

/** One principle from the point of view (design/source/pov.md). */
export type Principle = { id: string; title: string; body: string }

export const PRINCIPLES = data.principles as Principle[]

const byId = new Map(PRINCIPLES.map((principle) => [principle.id, principle]))
const bySlug = data.projects as Record<string, string>

/** The principle a project proves, if it names one. */
export function principleFor(slug: string): Principle | undefined {
  const id = bySlug[slug]
  return id ? byId.get(id) : undefined
}
