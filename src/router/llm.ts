import "server-only"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { publishCatalog, publicFocusIds } from "@/src/content/publish"
import { annotationAllowed, factBlob } from "./check"
import { keywordRoute } from "./keyword"
import { followUpsFor, sheetCopy } from "./pills"
import { FILTERS, INTENTS, type Intent, type ViewSpec } from "./types"

const focusIds = publicFocusIds()

const ShowView = z.object({
  intent: z.enum(INTENTS),
  focusIds: z.array(z.enum(focusIds)).max(6),
  filter: z.enum(FILTERS),
  annotation: z.string().max(500),
  followUps: z.array(z.string()).length(3),
})

function toolSchema() {
  return {
    name: "show_view",
    description: "Choose the one portfolio view that answers the question. Use ids from the index only.",
    input_schema: {
      type: "object" as const,
      additionalProperties: false,
      properties: {
        intent: { type: "string", enum: [...INTENTS] },
        focusIds: { type: "array", items: { type: "string", enum: [...focusIds] }, maxItems: 6 },
        filter: { type: "string", enum: [...FILTERS] },
        annotation: { type: "string", description: "Under 40 words. Only facts supported by the index." },
        followUps: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
      },
      required: ["intent", "focusIds", "filter", "annotation", "followUps"],
    },
  }
}

function indexText(): string {
  const catalog = publishCatalog()
  const lines = [
    `${catalog.profile.id} | ${catalog.profile.name} | ${catalog.profile.location} | ${catalog.profile.title}`,
    ...catalog.roles.map((role) => `${role.id} | ${role.name} | ${role.title} | ${role.yearLabel}`),
    ...catalog.clients.map((client) => `${client.id} | ${client.name} | role ${client.roleId}`),
    ...catalog.projects.map((project) => `${project.id} | ${project.name} | ${project.summary}`),
    ...catalog.themes.map((theme) => `${theme.id} | ${theme.name}`),
    ...catalog.places.map((place) => `${place.id} | ${place.name} | ${place.kind}`),
  ]
  return lines.join("\n")
}

function sheet(intent: Intent = "off_topic"): ViewSpec {
  const topic = intent === "career" || intent === "projects" || intent === "project" || intent === "focus" || intent === "role" || intent === "compare"
    ? "off_topic"
    : intent
  const copy = sheetCopy(topic)
  return {
    intent: topic,
    focusIds: [],
    filter: "sheet",
    href: `/sheet?topic=${topic}`,
    annotation: copy.body,
    followUps: followUpsFor(topic),
    confidence: 0.2,
    source: "model",
  }
}

export async function modelRoute(question: string): Promise<ViewSpec> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return { ...keywordRoute(question), source: "keyword" }
  try {
    const client = new Anthropic({ apiKey: key })
    const message = await client.messages.create(
      {
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
        max_tokens: 300,
        system: [
          "You route a design portfolio. Call show_view exactly once.",
          "Week 1 has the timeline, the project row, a focus, a case study, and a sheet. There is no map.",
          "Location answers use the sheet. The person is in Miami, FL.",
          "Use only ids from the index. Do not invent projects, employers, or dates.",
          "annotation is under 40 words and uses only the index.",
          "off_topic when the question is not about the work. decline for hidden, private, or disallowed asks.",
          "Index:",
          indexText(),
        ].join("\n"),
        tools: [toolSchema()],
        tool_choice: { type: "tool", name: "show_view" },
        messages: [{ role: "user", content: question.slice(0, 400) }],
      },
      { signal: AbortSignal.timeout(8000) },
    )
    const tool = message.content.find((block) => block.type === "tool_use" && block.name === "show_view")
    if (!tool || tool.type !== "tool_use") return sheet()
    const parsed = ShowView.safeParse(tool.input)
    if (!parsed.success) return sheet()
    return hydrate(parsed.data)
  } catch {
    return { ...keywordRoute(question), source: "keyword" }
  }
}

function hydrate(input: z.infer<typeof ShowView>): ViewSpec {
  const catalog = publishCatalog()
  const ids = new Set(publicFocusIds(catalog))
  if (input.focusIds.some((id) => !ids.has(id))) return sheet()
  const base = authoredFor(input.intent, input.focusIds)
  const facts = factBlob([
    catalog.profile.name,
    catalog.profile.location,
    catalog.profile.title,
    catalog.employer,
    ...catalog.roles.flatMap((role) => [role.name, role.title, role.yearLabel, role.since ?? ""]),
    ...catalog.clients.map((client) => client.name),
    ...catalog.projects.flatMap((project) => [project.name, project.summary, ...project.sections.map((section) => section.body)]),
    ...catalog.themes.flatMap((theme) => [theme.name, theme.label]),
    ...catalog.places.map((place) => place.name),
  ])
  const annotation = annotationAllowed(input.annotation, facts) ? input.annotation.trim() : base.annotation
  return {
    intent: input.intent,
    focusIds: input.focusIds,
    filter: base.filter,
    href: base.href,
    annotation,
    followUps: followUpsFor(input.intent),
    confidence: 0.8,
    source: "model",
  }
}

function authoredFor(intent: Intent, focusIds: string[]): Pick<ViewSpec, "filter" | "href" | "annotation"> {
  const catalog = publishCatalog()
  const project = catalog.projects.find((item) => item.id === focusIds[0])
  const theme = catalog.themes.find((item) => item.id === focusIds[0])
  const role = catalog.roles.find((item) => item.id === focusIds[0])
  if (intent === "project" && project) {
    return {
      filter: "work",
      href: `/work/${project.slug}#${project.sections[0]?.id ?? "summary"}`,
      annotation: project.summary,
    }
  }
  if (intent === "focus" && theme) {
    return {
      filter: "focus",
      href: `/focus/${theme.slug}`,
      annotation: `These are the public projects tagged ${theme.name}.`,
    }
  }
  if (intent === "role" && role) {
    return {
      filter: "timeline",
      href: `/timeline?role=${role.id}`,
      annotation: `${role.name} is on the timeline as ${role.title}, ${role.yearLabel}.`,
    }
  }
  if (intent === "projects") {
    return { filter: "projects", href: "/timeline/projects", annotation: "The project row is every public engagement, on the same years as the timeline." }
  }
  if (intent === "career" || intent === "compare") {
    return { filter: "timeline", href: "/timeline", annotation: "Roles run from Joba Studio in 2019 to the open roles in 2026, on one time axis." }
  }
  const topic = intent === "location" || intent === "about" || intent === "process" || intent === "availability" || intent === "decline" ? intent : "off_topic"
  const copy = sheetCopy(topic)
  return { filter: "sheet", href: `/sheet?topic=${topic}`, annotation: copy.body }
}
