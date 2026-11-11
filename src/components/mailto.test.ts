import assert from "node:assert/strict"
import { test } from "node:test"
import { mailtoLink } from "./mailto"

test("the email pill packages the note for Tyler's address, ready to send", () => {
  const link = new URL(mailtoLink("jacksontylerbruce@gmail.com", "Hi Tyler & team?\nThanks"))
  assert.equal(link.protocol, "mailto:")
  assert.equal(link.pathname, "jacksontylerbruce@gmail.com")
  assert.equal(link.searchParams.get("subject"), "A note from jacksontylerbruce.com")
  assert.equal(link.searchParams.get("body"), "Hi Tyler & team?\nThanks")
})
