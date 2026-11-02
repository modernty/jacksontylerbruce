import copyFile from "@/data/copy.json"
import disciplines from "@/content/disciplines.json"
import ideas from "@/content/ideas.json"
import inventory from "@/content/projects.json"
import tools from "@/content/tools.json"
import { textIssues } from "./guard"
import type { Section, SectionItem } from "./schema"

/**
 * Builds each project's sections from the content it has. Nothing is written per project:
 * a section appears only when its source fields exist, so projects differ in which ones they get.
 *
 * Order: the authored summary, any other authored sections, then
 * Context, Approach (long-form copy), Role, Outcome, Links, Ideas and Tools (the inventory).
 * Every sentence passes the public text checks, and one that fails is dropped, not rewritten.
 */

type Inventory = {
  slug: string
  summary?: string | null
  body?: string | null
  ledOrMade?: string | null
  teamSize?: number | string | null
  teamNote?: string | null
  metrics?: string | null
  status?: string | null
  demo?: string | null
  awards?: { name: string; year?: number }[]
  ideaIds?: string[]
  toolIds?: string[]
  disciplineIds?: string[]
}
type Named = { id: string; name: string; note?: string; visible?: boolean; confidential?: boolean }
type Copy = { paragraphs: string[]; link?: { label: string; href: string } }

/** Catalog slug → the slugs the same project uses in the inventory and the long-form copy. */
const SOURCES: Record<string, { inventory?: string; copy?: string }> = {
  "usm-hue-man": { inventory: "usm-hueman", copy: "usm-hue-man" },
  corelogic: { inventory: "corelogic", copy: "corelogic" },
  nestle: { inventory: "nestle", copy: "nestle" },
  "fintech-terminal": { inventory: "urvin", copy: "urvin-finance" },
  "defi-redesign": { inventory: "jet-protocol", copy: "jet-protocol" },
  "jet-brand": { inventory: "jet-protocol", copy: "jet-protocol" },
  novart: { inventory: "novart", copy: "novart" },
  "chatter-app": { inventory: "chatter", copy: "chatter-social" },
  "chatter-brand": { inventory: "chatter", copy: "chatter-social" },
  "lazarus-brand": { inventory: "lazarus-brand", copy: "lazarus-ai-pubsec-brand" },
  "model-playground": { inventory: "model-playground", copy: "model-playground" },
  "usm-milan": { inventory: "usm-milan-2025" },
  atls: { inventory: "talent-management", copy: "talent-management" },
  loblaw: { inventory: "loblaw" },
  intuit: { inventory: "intuit" },
  "overmatch-patterns": { inventory: "overmatch-ai" },
  traveller: { inventory: "traveller" },
}

const records = new Map((inventory as Inventory[]).map((item) => [item.slug, item]))
const copies = copyFile.projects as Record<string, Copy>
const lookup = (list: Named[]) => new Map(list.filter((item) => item.visible !== false && !item.confidential).map((item) => [item.id, item]))
const ideaIndex = lookup(ideas as Named[])
const toolIndex = lookup(tools as Named[])
const disciplineIndex = lookup(disciplines as Named[])

const PLACEHOLDER = /NEEDS TYLER/

/** Keeps only the sentences that pass the public checks. */
function clean(text: string | null | undefined): string {
  if (!text || PLACEHOLDER.test(text)) return ""
  const sentences = text.trim().split(/(?<=[.!?])\s+(?=[A-Z“"‘'])/)
  return sentences.filter((sentence) => textIssues(sentence).length === 0).join(" ").trim()
}

const normal = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()

function section(id: string, title: string, paragraphs: string[], items: SectionItem[] = []): Section | null {
  const body = paragraphs.map(clean).filter(Boolean).join("\n\n")
  const kept = items
    .map((item) => ({ ...item, label: clean(item.label), note: item.note ? clean(item.note) || undefined : undefined }))
    .filter((item) => item.label && (!item.href || textIssues(item.href).length === 0))
  return body || kept.length ? { id, title, body, items: kept } : null
}

function names(ids: string[] | undefined, index: Map<string, Named>): Named[] {
  return (ids ?? []).map((id) => index.get(id)).filter((item): item is Named => Boolean(item))
}

function role(record: Inventory): Section | null {
  const lines: string[] = []
  if (record.ledOrMade && !PLACEHOLDER.test(record.ledOrMade)) {
    const led = record.ledOrMade.trim().replace(/\.$/, "")
    lines.push(led === "Both" ? "Led and made." : `${led}.`)
  }
  if (record.teamNote?.toLowerCase() === "solo" || record.teamSize === 1) lines.push("Solo.")
  else if (record.teamNote) lines.push(record.teamNote.replace(/\.?$/, "."))
  const items = names(record.disciplineIds, disciplineIndex).map((item) => ({ label: item.name }))
  return section("role", "Role", [lines.join(" ")], items)
}

function outcome(record: Inventory): Section | null {
  const lines: string[] = []
  if (record.metrics) lines.push(record.metrics.replace(/^Site:\s*/i, "").replace(/\.?$/, "."))
  if (record.status === "in progress") lines.push("Work in progress.")
  const items: SectionItem[] = (record.awards ?? []).map((award) => ({ label: award.name, note: award.year ? String(award.year) : undefined }))
  return section("outcome", "Outcome", [lines.join(" ")], items)
}

/** Places the work lives outside this site. The page shows them under the title, not as a section. */
function links(record: Inventory | undefined, copy: Copy | undefined): Section | null {
  const link = copy?.link ?? (record?.demo ? { label: "External link", href: record.demo } : undefined)
  return link ? section("links", "Links", [], [{ label: link.label, href: link.href }]) : null
}

/** Public project names, by inventory slug, that carry an idea. */
function sharing(ideaId: string, self: string, publicNames: Map<string, string>): string[] {
  const names = new Set<string>()
  for (const [slug, name] of publicNames) {
    const other = SOURCES[slug]?.inventory
    if (!other || other === self) continue
    if (records.get(other)?.ideaIds?.includes(ideaId)) names.add(name)
  }
  return [...names]
}

function ideaItem(idea: Named, self: string, publicNames: Map<string, string>): SectionItem {
  const note = (idea.note ?? "").replace(/\s*\([^)]*\)\.?$/, ".").replace(/^\.$/, "")
  const others = sharing(idea.id, self, publicNames)
  const also = others.length ? `Also in ${others.join(", ")}.` : ""
  return { label: idea.name, note: [note, also].filter(Boolean).join(" ") || undefined }
}

/**
 * The sections a project page shows. Authored sections always come first and keep their ids.
 * publicNames maps each public project's slug to its name, so cross-references never reach hidden work.
 */
export function generateSections(slug: string, authored: Section[], publicNames: Map<string, string>): Section[] {
  const source = SOURCES[slug] ?? {}
  const record = source.inventory ? records.get(source.inventory) : undefined
  const copy = source.copy ? copies[source.copy] : undefined
  const summary = normal(authored[0]?.body ?? "")
  const paragraphs = (copy?.paragraphs ?? []).filter((paragraph) => normal(paragraph) !== summary)
  const fallback = record?.body && normal(record.body) !== summary ? [record.body] : []

  const generated = [
    section("context", "Context", paragraphs.slice(0, 1)),
    section("approach", "Approach", paragraphs.length > 1 ? paragraphs.slice(1) : fallback),
    record ? role(record) : null,
    record ? outcome(record) : null,
    links(record, copy),
    record ? section("ideas", "Ideas", [], names(record.ideaIds, ideaIndex).map((idea) => ideaItem(idea, source.inventory!, publicNames))) : null,
    record ? section("tools", "Tools", [], names(record.toolIds, toolIndex).map((tool) => ({ label: tool.name }))) : null,
  ].filter((item): item is Section => item !== null)

  const taken = new Set(authored.map((item) => item.id))
  return [...authored, ...generated.filter((item) => !taken.has(item.id))]
}
