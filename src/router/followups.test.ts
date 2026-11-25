import assert from "node:assert/strict"
import { test } from "node:test"
import { MemoryStore } from "./store"
import { handleChatAsk } from "./chat"
import { answerKey, freshFollowUps } from "./followups"

test("questions that get the same answer count as one, whatever their words", () => {
  assert.equal(answerKey("Where are you located?"), answerKey("Where are you right now?"))
  assert.notEqual(answerKey("Where are you located?"), answerKey("Where are you from?"))
})

test("a follow-up is dropped once its answer has been given, and the room goes to a fresh topic", () => {
  // Located, then from: the next answer must not offer either again, in any wording.
  const next = freshFollowUps(["Where are you located?", "Where are you right now?"], "Where are you from?", ["Where are you located?"])
  assert.ok(!next.includes("Where are you located?"), next.join(" | "))
  assert.ok(!next.includes("Where are you right now?"), next.join(" | "))
  assert.ok(next.length >= 2, next.join(" | "))
})

test("no follow-up is offered twice, and never more than three", () => {
  const next = freshFollowUps(["Where are you located?", "Where are you right now?", "Show me some case studies.", "What's your take on AI?", "Tell me about your experience."], "Hi", [])
  assert.equal(next.length, 3)
  assert.equal(new Set(next.map(answerKey)).size, next.length)
})

test("the refill turns with the conversation, so a long one does not see the same few", () => {
  const early = freshFollowUps([], "Where are you from?", [])
  const later = freshFollowUps([], "Where are you from?", ["a", "b", "c"])
  assert.notDeepEqual(early, later)
})

test("in the chat, located then from never offers the location again", async () => {
  const ask = (q: string, history: { q: string; a: string }[]) =>
    handleChatAsk({ q, sessionId: "s", history }, { ip: "1" }, { store: new MemoryStore(), env: { NODE_ENV: "test" } })
  const first = await ask("Where are you located?", [])
  const located = first.body as { answer: string; followUps?: string[] }
  assert.equal(located.answer, "Based in Miami.")
  const second = await ask("Where are you from?", [{ q: "Where are you located?", a: located.answer }])
  const from = second.body as { answer: string; followUps?: string[] }
  assert.equal(from.answer, "From Miami.")
  for (const repeat of ["Where are you located?", "Where are you right now?", "Where are you from?"]) assert.ok(!from.followUps?.includes(repeat), from.followUps?.join(" | "))
  assert.ok((from.followUps?.length ?? 0) >= 2, from.followUps?.join(" | "))
})
