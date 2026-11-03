import { weekGet, weekPut } from "@/src/checklist/service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function GET(request: Request) {
  return weekGet(request)
}

export function PUT(request: Request) {
  return weekPut(request)
}
