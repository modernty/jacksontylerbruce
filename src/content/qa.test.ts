import assert from "node:assert/strict"
import { test } from "node:test"
import data from "@/content/qa.json"
import { QA, QA_PILLS, rotatePills } from "./qa"
import { matchQa, resolveTokens } from "@/src/router/qa"
import { voiceIssues } from "@/src/router/check"

test("every Q&A entry has a unique key and only views the site can show", () => {
  assert.equal(QA.length, data.entries.length)
  assert.equal(new Set(QA.map((entry) => entry.key)).size, QA.length)
})

test("every entry answers its own question and alternates", () => {
  for (const entry of QA) {
    for (const question of [entry.question, ...entry.alternates]) assert.equal(matchQa(question)?.key, entry.key, question)
  }
})

test("answers follow the voice: no subject, no closing question", () => {
  for (const entry of QA) assert.deepEqual(voiceIssues(resolveTokens(entry.answer)), [], entry.key)
})

test("pills rotate three at a time", () => {
  assert.ok(QA_PILLS.length >= 3)
  assert.equal(rotatePills(0).length, 3)
  assert.deepEqual(rotatePills(1, ["a", "b", "c", "d"]), ["b", "c", "d"])
  assert.deepEqual(rotatePills(3, ["a", "b", "c", "d"]), ["d", "a", "b"])
})

test("local time reads in Miami", () => {
  assert.equal(resolveTokens("{local_time}", new Date("2026-11-11T17:05:00Z")), "12:05 PM")
})
