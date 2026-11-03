export const COOKIE_NAME = "checklist_session"
export const SESSION_SECONDS = 30 * 24 * 60 * 60

type Payload = { v: 1; exp: number }

export async function passphrasesMatch(input: string, secret: string): Promise<boolean> {
  const [left, right] = await Promise.all([sha256(input), sha256(secret)])
  return fixedEqual(left, right)
}

export async function issueSession(secret: string, now = Date.now()): Promise<string> {
  if (!secret) throw new Error("session secret missing")
  const payload: Payload = { v: 1, exp: Math.floor(now / 1000) + SESSION_SECONDS }
  const body = base64url(new TextEncoder().encode(JSON.stringify(payload)))
  const signature = base64url(await hmac(secret, body))
  return `${body}.${signature}`
}

export async function verifySession(token: string, secret: string, now = Date.now()): Promise<boolean> {
  if (!secret) return false
  const parts = token.split(".")
  if (parts.length !== 2) return false
  const [body, signature] = parts
  if (!body || !signature) return false
  const expected = base64url(await hmac(secret, body))
  if (!fixedEqual(bytes(signature), bytes(expected))) return false
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64url(body))) as Partial<Payload>
    if (payload.v !== 1 || typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return false
    return payload.exp * 1000 > now
  } catch {
    return false
  }
}

export function sessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}`
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(";")) {
    const separator = part.indexOf("=")
    if (separator === -1) continue
    const key = part.slice(0, separator).trim()
    if (key === name) return part.slice(separator + 1).trim()
  }
  return null
}

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return new Uint8Array(digest)
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))
  return new Uint8Array(signature)
}

function fixedEqual(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length)
  let diff = left.length === right.length ? 0 : 1
  for (let index = 0; index < length; index += 1) diff |= (left[index] ?? 0) ^ (right[index] ?? 0)
  return diff === 0
}

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function base64url(input: Uint8Array): string {
  let binary = ""
  for (const byte of input) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function fromBase64url(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4))
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + pad)
  const output = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) output[index] = binary.charCodeAt(index)
  return output
}
