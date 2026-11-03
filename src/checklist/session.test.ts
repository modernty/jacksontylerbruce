import assert from "node:assert/strict"
import { test } from "node:test"
import { LOGIN_LIMIT, LOGIN_WINDOW_MS, resetRateLimits, takeToken } from "./rate-limit"
import { COOKIE_NAME, SESSION_SECONDS, clearSessionCookie, issueSession, passphrasesMatch, readCookie, sessionCookie, verifySession } from "./session"

const SECRET = "test-session-secret-test-session-secret"

test("passphrase comparison matches equal strings and rejects unequal ones", async () => {
  assert.equal(await passphrasesMatch("correct horse", "correct horse"), true)
  assert.equal(await passphrasesMatch("nope", "correct horse"), false)
  assert.equal(await passphrasesMatch("", "correct horse"), false)
  assert.equal(await passphrasesMatch("short", "a much longer passphrase value"), false)
})

test("session cookie is signed, expires in 30 days, and is HttpOnly Secure SameSite=Strict", async () => {
  const now = Date.parse("2026-11-02T15:00:00Z")
  const token = await issueSession(SECRET, now)
  assert.equal(await verifySession(token, SECRET, now + 1000), true)
  assert.equal(await verifySession(token, SECRET, now + SESSION_SECONDS * 1000), false)
  assert.equal(await verifySession(token, "other-secret-other-secret", now + 1000), false)
  assert.equal(await verifySession(`${token}x`, SECRET, now + 1000), false)
  assert.equal(await verifySession("not-a-token", SECRET, now), false)
  assert.equal(await verifySession(token, "", now), false)
  const header = sessionCookie(token)
  assert.match(header, new RegExp(`^${COOKIE_NAME}=`))
  assert.match(header, /HttpOnly/)
  assert.match(header, /Secure/)
  assert.match(header, /SameSite=Strict/)
  assert.match(header, new RegExp(`Max-Age=${SESSION_SECONDS}`))
  assert.equal(readCookie(header, COOKIE_NAME), token)
  assert.match(clearSessionCookie(), /Max-Age=0/)
})

test("login rate limit allows a short burst and then refuses", () => {
  resetRateLimits()
  const now = 1_700_000_000_000
  for (let attempt = 0; attempt < LOGIN_LIMIT; attempt += 1) {
    assert.equal(takeToken("login:198.51.100.10", LOGIN_LIMIT, LOGIN_WINDOW_MS, now).ok, true)
  }
  const blocked = takeToken("login:198.51.100.10", LOGIN_LIMIT, LOGIN_WINDOW_MS, now)
  assert.equal(blocked.ok, false)
  assert.ok(blocked.retryAfter > 0)
  assert.equal(takeToken("login:198.51.100.11", LOGIN_LIMIT, LOGIN_WINDOW_MS, now).ok, true)
  assert.equal(takeToken("login:198.51.100.10", LOGIN_LIMIT, LOGIN_WINDOW_MS, now + LOGIN_WINDOW_MS).ok, true)
})
