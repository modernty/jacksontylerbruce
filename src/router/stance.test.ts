import { test } from "node:test"
import assert from "node:assert/strict"
import { stanceReply } from "./stance"

const PUBLIC = new Set(["loblaws", "intuit", "botpress", "overmatch-ai"])

test("an opinion on a topic answers with that principle and the work that proves it", () => {
  const reply = stanceReply("What do you think about AI memory?", PUBLIC)
  assert.ok(reply?.answer.startsWith("Earn the right to remember."))
  assert.deepEqual(reply?.projects, ["loblaws"])
  assert.equal(reply?.broad, undefined)
})

test("a broad opinion on AI answers with every principle", () => {
  const reply = stanceReply("What's your take on AI?", PUBLIC)
  assert.equal(reply?.broad, true)
  assert.ok(reply?.answer.includes("The handoff is part of the design."))
})

test("the follow-ups it offers are answered without an opinion word", () => {
  assert.ok(stanceReply("Is chat the future of interfaces?", PUBLIC)?.answer.startsWith("Conversation is a surface"))
})

test("questions that ask for facts are not opinions", () => {
  assert.equal(stanceReply("Where are you right now?", PUBLIC), null)
  assert.equal(stanceReply("What do you think of Intuit?", PUBLIC), null)
})

test("projects that are not public are left off", () => {
  assert.deepEqual(stanceReply("How do you think about agent autonomy?", new Set())?.projects, [])
})
