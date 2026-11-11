import { handleAsk } from "@/src/router/handle"

export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 })
  }
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local"
  const result = await handleAsk(raw, { ip })
  return Response.json(result.body, { status: result.status })
}
