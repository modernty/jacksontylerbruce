import "server-only"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { factText, followUpsFor, sectionHref, sheetAnswer, focusAnnotation, roleAnnotation, careerAnnotation, projectsAnnotation, compareAnnotation } from "@/src/content/answers"
import { notionLines } from "@/src/content/notion"
import { publishCatalog, publicFocusIds } from "@/src/content/publish"
import { annotationAllowed } from "./check"
import { keywordRoute } from "./keyword"
import { QA } from "@/src/content/qa"
import { ASK_TIMEOUT_MS, DEFAULT_MODEL, MAX_TOKENS, costUsd, recordSpend, thinkingOff } from "./limits"
import { EDUCATION } from "./personal"
import { resolveTokens } from "./qa"
import { FILTERS, INTENTS, type Intent, type ViewSpec } from "./types"

/** context, when given, says what the conversation last showed, so the model can resolve "that one". */
export type ModelCaller = (question: string, context?: string) => Promise<ViewSpec>

type Usage = { input_tokens?: number; output_tokens?: number }
type ModelClient = {
  create(body: { max_tokens: number; messages: { role: "user"; content: string }[] }, opts: { signal?: AbortSignal }): Promise<{ content: { type: string; name?: string; input?: unknown }[]; usage?: Usage }>
}

const focusIds = publicFocusIds()

const qaKeys = QA.map((entry) => entry.key) as [string, ...string[]]

export const ShowView = z.object({
  qaKey: z.enum(qaKeys).optional(),
  intent: z.enum(INTENTS),
  focusIds: z.array(z.enum(focusIds)).max(6),
  filter: z.enum(FILTERS),
  annotation: z.string().max(500),
  followUps: z.array(z.string()).length(3),
})

export function toolSchema() {
  return {
    name: "show_view",
    description: "Choose the one portfolio view that answers the question. Use ids from the index only.",
    input_schema: {
      type: "object" as const,
      additionalProperties: false,
      properties: {
        qaKey: { type: "string", enum: [...qaKeys], description: "Set only when the visitor is asking one of the Q&A questions in other words, with typos or loosely. The site then gives that entry's authored answer." },
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

/** The Q&A the site answers word for word, for matching a loosely worded question to its entry. */
export function qaIndex(): string {
  return QA.map((entry) => `${entry.key} | ${[entry.question, ...entry.alternates].join(" / ")}`).join("\n")
}

export function indexText(): string {
  const catalog = publishCatalog()
  const lines = [
    `${catalog.profile.id} | ${catalog.profile.name} | ${catalog.profile.location} | ${catalog.profile.title}`,
    ...catalog.roles.map((role) => `${role.id} | ${role.name} | ${role.title} | ${role.yearLabel}`),
    ...catalog.clients.map((client) => `${client.id} | ${client.name} | role ${client.roleId}`),
    ...catalog.projects.map((project) => [`${project.id} | ${project.name} | ${project.circa ?? ""} | ${project.summary}`, ...notionLines(project.slug).map((line) => `  ${line}`)].join("\n")),
    ...catalog.themes.map((theme) => `${theme.id} | ${theme.name}`),
    ...catalog.places.map((place) => `${place.id} | ${place.name} | ${place.kind}`),
    `fact | ${EDUCATION}`,
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

export async function modelRoute(question: string, client?: ModelClient, context?: string): Promise<ViewSpec> {
  const content = context ? `${context}\n\nVisitor: ${question.slice(0, 400)}` : question.slice(0, 400)
  const key = process.env.ANTHROPIC_API_KEY
  if (!key && !client) return { ...keywordRoute(question), source: "keyword" }
  const guarded = keywordRoute(question)
  if (guarded.intent === "decline") return guarded
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL
  try {
    const signal = AbortSignal.timeout(ASK_TIMEOUT_MS)
    const message = client
      ? await client.create({ max_tokens: MAX_TOKENS, messages: [{ role: "user", content }] }, { signal })
      : await new Anthropic({ apiKey: key }).messages.create(
        {
          model,
          max_tokens: MAX_TOKENS,
          thinking: thinkingOff(model),
          system: [
            "You route a design portfolio. Call show_view exactly once.",
            "Views are the timeline, the project row, a focus, a case study, and a sheet. There is no map.",
            "Location answers use the sheet. Use only ids from the index.",
            "location covers where Tyler is based and where he has traveled; include the place ids.",
            "annotation is under 40 words and uses only the index. No subject: never \"I\", \"he\", \"we\" or \"Tyler\". Lead with the verb or the idea (\"Look wider.\", \"Depth.\"). When the subject is a project, the project is the subject. Answer directly and never end on a question. Calm and grounded, no hype or buzzwords. Say \"designer\", never \"architect\".",
            "off_topic when the question is not about the work. decline for hidden, private, or disallowed asks.",
            "project: the first focusId is that project's id. role: the role id. compare: when two or more projects are named, list every named project id.",
            "availability for hiring, full-time, freelance, or contact asks.",
            "focus when the question asks for a theme's work (for example \"show me finance work\") and names no project.",
            "The visitor may be mid-conversation: a Conversation line says what was last listed or open. Resolve \"that one\", \"the second one\" or \"it\" against it. A question on a new subject is a new question; route it on its own.",
            "Q&A lists questions the site answers word for word. When the visitor asks one of them in other words, with typos, or loosely (\"whos his fav designers\"), set qaKey to that entry's key and intent to about. Only when it is clearly the same question.",
            "Index:",
            indexText(),
            "Q&A:",
            qaIndex(),
          ].join("\n"),
          tools: [toolSchema()],
          // This model rejects a forced tool choice; the instruction above asks for exactly one call.
          tool_choice: { type: "auto" },
          messages: [{ role: "user", content }],
        },
        { signal },
      )
    await recordSpend(costUsd(message.usage?.input_tokens ?? 0, message.usage?.output_tokens ?? 0, model)).catch(() => undefined)
    const tool = message.content.find((block) => block.type === "tool_use" && block.name === "show_view")
    if (!tool || tool.type !== "tool_use") return sheet()
    const parsed = ShowView.safeParse(tool.input)
    if (!parsed.success) return sheet()
    return hydrate(parsed.data, question)
  } catch (error) {
    if (client) throw error
    return { ...keywordRoute(question), source: "keyword" }
  }
}

export function hydrate(input: z.infer<typeof ShowView>, question: string): ViewSpec {
  const catalog = publishCatalog()
  // A loosely worded Q&A question: the authored answer, by key.
  const entry = input.qaKey ? QA.find((item) => item.key === input.qaKey) : undefined
  if (entry) {
    return { intent: "about", focusIds: [], filter: "sheet", href: "/sheet?topic=about#answer", annotation: resolveTokens(entry.answer), followUps: [], confidence: 0.8, source: "model", qaKey: entry.key }
  }
  const ids = new Set(publicFocusIds(catalog))
  if (input.focusIds.some((id) => !ids.has(id))) return sheet()
  const base = authoredFor(input.intent, input.focusIds, question)
  if (!base) return { ...keywordRoute(question), source: "keyword" }
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

/** Authored copy for the chosen view, or null when the model named an intent without its entity. */
function authoredFor(intent: Intent, focusIds: string[], question: string): Pick<ViewSpec, "filter" | "href" | "annotation"> | null {
  const catalog = publishCatalog()
  const project = catalog.projects.find((item) => item.id === focusIds[0])
  const theme = catalog.themes.find((item) => item.id === focusIds[0])
  const role = catalog.roles.find((item) => item.id === focusIds[0])
  if (intent === "project" && project) {
    return { filter: "work", href: sectionHref(project, question), annotation: project.summary }
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
  if (intent === "project" || intent === "focus" || intent === "role") return null
  if (intent === "compare" && focusIds.length < 2) return null
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
