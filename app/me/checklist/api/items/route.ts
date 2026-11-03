import { itemsGet, itemsPut } from "@/src/checklist/service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function GET(request: Request) {
  return itemsGet(request)
}

export function PUT(request: Request) {
  return itemsPut(request)
}
