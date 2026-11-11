import { handleChatAsk } from "@/src/router/chat"

// An open answer can search the web, which takes longer than a site answer.
export const maxDuration = 60

/**
 * A site answer comes back as plain JSON. An answer the model has to think about streams as
 * newline-delimited JSON: {"status": "thinking" | "searching"} lines while it works, then
 * {"reply": …, "code": …} once, so the conversation can show what is happening.
 */
export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 })
  }
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local"

  const encoder = new TextEncoder()
  const queued: string[] = []
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null
  let started: (() => void) | null = null
  const firstStatus = new Promise<"status">((resolve) => (started = () => resolve("status")))
  const send = (line: unknown) => {
    const text = `${JSON.stringify(line)}\n`
    if (controller) controller.enqueue(encoder.encode(text))
    else queued.push(text)
  }
  const work = handleChatAsk(raw, { ip }, { onStatus: (status) => { send({ status }); started?.() } })

  // Answered before the model was needed: plain JSON, as before.
  const first = await Promise.race([work.then(() => "done" as const), firstStatus])
  if (first === "done") {
    const result = await work
    return Response.json(result.body, { status: result.status })
  }

  const stream = new ReadableStream<Uint8Array>({
    start(next) {
      controller = next
      for (const text of queued.splice(0)) next.enqueue(encoder.encode(text))
      work
        .then((result) => send({ reply: result.body, code: result.status }))
        .catch(() => send({ reply: { error: "Something went wrong. Try asking again." }, code: 500 }))
        .finally(() => next.close())
    },
  })
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } })
}
