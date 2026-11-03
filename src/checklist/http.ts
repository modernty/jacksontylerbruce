export const ROBOTS = "noindex, nofollow, noarchive"

export const privateHeaders = {
  "X-Robots-Tag": ROBOTS,
  "Cache-Control": "private, no-store",
}

export function denied(): Response {
  return new Response(null, { status: 404, headers: privateHeaders })
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: privateHeaders })
}

export function originOk(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const raw = forwarded || request.headers.get("x-real-ip") || "local"
  return raw.replace(/[^\w.:-]/g, "").slice(0, 80) || "local"
}
