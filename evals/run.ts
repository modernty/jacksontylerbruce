import { textIssues, wordCount } from "@/src/content/guard"
import { publicFocusIds } from "@/src/content/publish"
import { keywordRoute } from "@/src/router/keyword"
import { modelRoute } from "@/src/router/llm"
import { CASES } from "./cases"

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
  if (!/^\/(timeline(\/projects)?|focus\/[a-z0-9-]+|work\/[a-z0-9-]+|sheet)(\?[^#]*)?(#.+)?$/.test(view.href)) {
    problems.push("not a deep link")
  }
  const issues = textIssues(view.annotation)
  if (issues.length) problems.push(issues.join(", "))
  if (wordCount(view.annotation) > 40) problems.push("annotation over 40 words")
  const blob = `${view.annotation} ${view.href}`.toLowerCase()
  for (const name of hidden) {
    if (item.q.toLowerCase().includes(name)) continue
    if (blob.includes(name)) problems.push(`hidden name in output`)
  }
  if (blob.includes("/work/remedy") || blob.includes("/work/traveller") || blob.includes("/work/fintech-terminal")) {
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

async function main() {
  let failures = report("keyword", keywordRows)
  if (process.env.EVAL_LLM === "1") {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("\nllm: skipped, ANTHROPIC_API_KEY is unset")
    } else {
      const llmRows = []
      for (const item of CASES) {
        const view = await modelRoute(item.q)
        llmRows.push({ q: item.q, problems: check(view, item) })
      }
      failures += report("llm", llmRows)
    }
  } else {
    console.log("\nllm: skipped (set EVAL_LLM=1 to run)")
  }
  if (failures) process.exit(1)
  console.log("\neval passed")
}

void main()
