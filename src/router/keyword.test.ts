import assert from "node:assert/strict"
import { test } from "node:test"
import { textIssues, wordCount } from "@/src/content/guard"
import { publicFocusIds } from "@/src/content/publish"
import { CASES } from "../../evals/cases"
import { keywordRoute } from "./keyword"
import { followUpsFor, sheetCopy } from "./pills"

const ids = new Set(publicFocusIds())

test("twenty questions route to a real view", () => {
  assert.equal(CASES.length, 20)
  for (const item of CASES) {
    const view = keywordRoute(item.q)
    assert.equal(view.intent, item.intent, item.q)
    assert.equal(view.href, item.href, item.q)
    assert.deepEqual(view.focusIds, item.ids, item.q)
    for (const id of view.focusIds) assert.ok(ids.has(id), id)
    assert.match(view.href, /^\/(timeline(\/projects)?|focus\/[a-z0-9-]+|work\/[a-z0-9-]+|sheet)(\?[^#]*)?(#.+)?$/)
    assert.equal(textIssues(view.annotation).length, 0, view.annotation)
    assert.ok(wordCount(view.annotation) <= 40, view.annotation)
    assert.equal(view.followUps.length, 3)
    assert.equal(view.href.includes("/work/remedy"), false)
  }
})

test("sheet copy stays short and pills are fixed", () => {
  for (const topic of ["location", "about", "process", "availability", "off_topic", "decline"]) {
    const copy = sheetCopy(topic)
    assert.ok(wordCount(copy.body) <= 40)
    assert.equal(textIssues(copy.body).length, 0)
    assert.equal(followUpsFor(topic as "location").length, 3)
  }
  const pills = followUpsFor("career")
  assert.deepEqual(pills.map((pill) => pill.label), [
    "How do you design trust into AI products?",
    "Show me Overmatch",
    "Walk me through your career",
  ])
})
