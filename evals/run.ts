import { anchorExists } from "@/src/content/answers"
import { textIssues, wordCount } from "@/src/content/guard"
import { publicFocusIds } from "@/src/content/publish"
import { keywordRoute } from "@/src/router/keyword"
import { modelRoute } from "@/src/router/llm"
import { handleChatAsk } from "@/src/router/chat"
import { MemoryStore } from "@/src/router/store"
import { CASES, CONVERSATIONS } from "./cases"

const ids = new Set(publicFocusIds())
const hidden = ["remedy", "traveller", "fintech", "defi", "chatter app"]

function check(view: { intent: string; focusIds: string[]; href: string; annotation: string }, item: (typeof CASES)[number]) {
  const problems: string[] = []
  if (view.intent !== item.intent) problems.push(`intent ${view.intent} != ${item.intent}`)
  if (!view.href.startsWith(item.href.split("?")[0])) problems.push(`href ${view.href}`)
  if (item.intent === "compare") {
    for (const id of item.ids) if (!view.href.includes(id)) problems.push(`href missing ${id}`)
  } else if (view.href.split("#")[0] !== item.href && !view.href.startsWith(item.href)) {
    problems.push(`href ${view.href} != ${item.href}`)
  }
  for (const id of view.focusIds) {
    if (!ids.has(id)) problems.push(`unknown id ${id}`)
  }
  for (const id of item.ids) {
    if (!view.focusIds.includes(id)) problems.push(`missing id ${id}`)
  }
  if (!/^\/(timeline(\/projects)?|focus\/[a-z0-9-]+|work\/[a-z0-9-]+|sheet)(\?[^#]*)?#.+$/.test(view.href)) {
    problems.push("not a deep link")
  }
  if (!anchorExists(view.href)) problems.push(`missing anchor ${view.href}`)
  const issues = textIssues(view.annotation)
  if (issues.length) problems.push(issues.join(", "))
  if (wordCount(view.annotation) > 40) problems.push("annotation over 40 words")
  const blob = `${view.annotation} ${view.href}`.toLowerCase()
  for (const name of hidden) {
    if (item.q.toLowerCase().includes(name)) continue
    if (blob.includes(name)) problems.push(`hidden name in output`)
  }
  if (blob.includes("/work/remedy") || blob.includes("/work/traveller")) {
    problems.push("hidden deep link")
  }
  return problems
}

function report(label: string, rows: { q: string; problems: string[] }[]) {
  const failed = rows.filter((row) => row.problems.length)
  console.log(`\n${label}: ${rows.length - failed.length}/${rows.length}`)
  for (const row of failed) console.log(`  FAIL  ${row.q}\n        ${row.problems.join("; ")}`)
  return failed.length
}

const keywordRows = CASES.map((item) => {
  const view = keywordRoute(item.q)
  return { q: item.q, problems: check(view, item) }
})

/** Runs each conversation turn through the chat route; with a key in env, the model routes what the rules leave. */
async function conversationRows(env: NodeJS.ProcessEnv) {
  const rows = []
  for (const item of CONVERSATIONS) {
    const reply = await handleChatAsk({ q: item.q, sessionId: "eval", ...item.state }, { ip: "eval" }, { store: new MemoryStore(), env })
    const body = reply.body as { projects?: string[]; roles?: string[]; panel?: string; expects?: string; go?: unknown; error?: string }
    const problems: string[] = []
    if (reply.status !== 200) problems.push(`status ${reply.status}: ${body.error ?? ""}`)
    if (item.want.panel !== body.panel) problems.push(`panel ${body.panel ?? "none"}, want ${item.want.panel ?? "none"}`)
    if (item.want.projects && JSON.stringify(item.want.projects) !== JSON.stringify(body.projects)) problems.push(`projects ${JSON.stringify(body.projects ?? [])}, want ${JSON.stringify(item.want.projects)}`)
    if (item.want.roles && JSON.stringify(item.want.roles) !== JSON.stringify(body.roles)) problems.push(`roles ${JSON.stringify(body.roles ?? [])}, want ${JSON.stringify(item.want.roles)}`)
    if ((item.want.expects ?? null) !== (body.expects ?? null)) problems.push(`expects ${body.expects ?? "none"}, want ${item.want.expects ?? "none"}`)
    if (item.want.go && !body.go) problems.push("no go")
    rows.push({ q: `${item.q}  [${Object.keys(item.state).join(", ")}]`, problems })
  }
  return rows
}

async function main() {
  const keywordFailures = report("keyword", keywordRows) + report("conversation", await conversationRows({ NODE_ENV: "test" }))
  let llmRate = 1
  let llmRan = false
  if (process.env.EVAL_LLM === "1") {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("\nllm: skipped, ANTHROPIC_API_KEY is unset")
    } else {
      const llmRows = []
      for (const item of CASES) {
        const view = await modelRoute(item.q)
        const problems = check(view, item)
        // modelRoute falls back to keyword routing on any error; that is not a model pass.
        if (view.source === "keyword" && item.intent !== "decline") problems.push("model failed, keyword fallback answered")
        llmRows.push({ q: item.q, problems })
      }
      const conversation = await conversationRows(process.env)
      llmRows.push(...conversation)
      const llmFailures = report("llm", llmRows)
      llmRan = true
      llmRate = (llmRows.length - llmFailures) / llmRows.length
      console.log(`llm accuracy ${(llmRate * 100).toFixed(1)}%`)
    }
  } else {
    console.log("\nllm: skipped (set EVAL_LLM=1 to run)")
  }
  if (keywordFailures || (llmRan && llmRate < 0.95)) process.exit(1)
  console.log("\neval passed")
}

void main()
