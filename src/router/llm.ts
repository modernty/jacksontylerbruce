import "server-only"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { factText, followUpsFor, sectionHref, sheetAnswer, focusAnnotation, roleAnnotation, careerAnnotation, projectsAnnotation, compareAnnotation } from "@/src/content/answers"
import { publishCatalog, publicFocusIds } from "@/src/content/publish"
import { annotationAllowed } from "./check"
import { keywordRoute } from "./keyword"
import { ASK_TIMEOUT_MS, MAX_TOKENS, costUsd, recordSpend } from "./limits"
import { FILTERS, INTENTS, type Intent, type ViewSpec } from "./types"

export type ModelCaller = (question: string) => Promise<ViewSpec>

type Usage = { input_tokens?: number; output_tokens?: number }
type ModelClient = {
  create(body: { max_tokens: number; messages: { role: "user"; content: string }[] }, opts: { signal?: AbortSignal }): Promise<{ content: { type: string; name?: string; input?: unknown }[]; usage?: Usage }>
}

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
  const copy = sheetAnswer(topic)
  return {
    intent: topic,
    focusIds: [],
    filter: "sheet",
    href: `/sheet?topic=${topic}#answer`,
    annotation: copy.body,
    followUps: followUpsFor(topic),
    confidence: 0.2,
    source: "model",
  }
}

export async function modelRoute(question: string, client?: ModelClient): Promise<ViewSpec> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key && !client) return { ...keywordRoute(question), source: "keyword" }
  try {
    const signal = AbortSignal.timeout(ASK_TIMEOUT_MS)
    const message = client
      ? await client.create({ max_tokens: MAX_TOKENS, messages: [{ role: "user", content: question.slice(0, 400) }] }, { signal })
      : await new Anthropic({ apiKey: key }).messages.create(
        {
          model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
          max_tokens: MAX_TOKENS,
          system: [
            "You route a design portfolio. Call show_view exactly once.",
            "Views are the timeline, the project row, a focus, a case study, and a sheet. There is no map.",
            "Location answers use the sheet. Use only ids from the index.",
            "annotation is under 40 words and uses only the index.",
            "off_topic when the question is not about the work. decline for hidden, private, or disallowed asks.",
            "Index:",
            indexText(),
          ].join("\n"),
          tools: [toolSchema()],
          tool_choice: { type: "tool", name: "show_view" },
          messages: [{ role: "user", content: question.slice(0, 400) }],
        },
        { signal },
      )
    recordSpend(costUsd(message.usage?.input_tokens ?? 0, message.usage?.output_tokens ?? 0))
    const tool = message.content.find((block) => block.type === "tool_use" && block.name === "show_view")
    if (!tool || tool.type !== "tool_use") return sheet()
    const parsed = ShowView.safeParse(tool.input)
    if (!parsed.success) return sheet()
    return hydrate(parsed.data)
  } catch (error) {
    if (client) throw error
    return { ...keywordRoute(question), source: "keyword" }
  }
}

function hydrate(input: z.infer<typeof ShowView>): ViewSpec {
  const catalog = publishCatalog()
  const ids = new Set(publicFocusIds(catalog))
  if (input.focusIds.some((id) => !ids.has(id))) return sheet()
  const base = authoredFor(input.intent, input.focusIds)
  const annotation = annotationAllowed(input.annotation, factText(catalog)) ? input.annotation.trim() : base.annotation
  return {
    intent: input.intent,
    focusIds: input.focusIds,
    filter: base.filter,
    href: base.href,
    annotation,
    followUps: followUpsFor(input.intent, input.focusIds, catalog),
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
    return { filter: "work", href: sectionHref(project), annotation: project.summary }
  }
  if (intent === "focus" && theme) {
    return { filter: "focus", href: `/focus/${theme.slug}#focus`, annotation: focusAnnotation(theme, catalog) }
  }
  if (intent === "role" && role) {
    return { filter: "timeline", href: `/timeline?role=${role.id}#axis`, annotation: roleAnnotation(role) }
  }
  if (intent === "projects") {
    return { filter: "projects", href: "/timeline/projects#projects", annotation: projectsAnnotation(catalog) }
  }
  if (intent === "compare") {
    return { filter: "timeline", href: `/timeline?focus=${focusIds.join(",")}#axis`, annotation: compareAnnotation(catalog, focusIds) }
  }
  if (intent === "career") {
    return { filter: "timeline", href: "/timeline#axis", annotation: careerAnnotation(catalog) }
  }
  const topic = intent === "location" || intent === "about" || intent === "process" || intent === "availability" || intent === "decline" ? intent : "off_topic"
  const copy = sheetAnswer(topic, catalog)
  return { filter: "sheet", href: `/sheet?topic=${topic}#answer`, annotation: copy.body }
}
