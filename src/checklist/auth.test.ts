import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { callbackOrigin, routeAccess } from "./access"

test("signed-out requests miss the checklist and open only login and callback", () => {
  assert.equal(routeAccess("/me/checklist", false), "redirect")
  assert.equal(routeAccess("/me/checklist/items", false), "redirect")
  assert.equal(routeAccess("/me/checklist/api/items", false), "deny")
  assert.equal(routeAccess("/me/checklist/api/days", false), "deny")
  assert.equal(routeAccess("/me/checklist/login", false), "open")
  assert.equal(routeAccess("/me/checklist/auth/callback", false), "open")
  assert.equal(routeAccess("/me/checklist", true), "open")
  assert.equal(routeAccess("/me/checklist/api/items", true), "open")
})

test("magic link redirect stays on the request host", () => {
  assert.equal(callbackOrigin("https://example.com", "example.com"), "https://example.com")
  assert.equal(callbackOrigin("https://evil.example", "example.com"), null)
  assert.equal(callbackOrigin(null, "example.com"), null)
  assert.equal(callbackOrigin("https://example.com", null), null)
})

test("sign-in is an open magic link with no email allowlist", () => {
  const action = readFileSync("src/checklist/auth-actions.ts", "utf8")
  const middleware = readFileSync("middleware.ts", "utf8")
  assert.match(action, /signInWithOtp/)
  assert.match(action, /\/me\/checklist\/auth\/callback/)
  assert.equal(action.includes("CHECKLIST_ALLOWED_EMAILS"), false)
  assert.equal(action.includes("CHECKLIST_PASSPHRASE"), false)
  assert.equal(middleware.includes("CHECKLIST_SESSION_SECRET"), false)
  assert.equal(middleware.includes("CHECKLIST_ALLOWED_EMAILS"), false)
})
