import { denied } from "@/src/checklist/http"
import { loginPost } from "@/src/checklist/service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function GET() {
  return denied()
}

export function POST(request: Request) {
  return loginPost(request)
}
