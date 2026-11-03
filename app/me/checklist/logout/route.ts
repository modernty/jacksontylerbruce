import { logoutPost } from "@/src/checklist/service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function POST(request: Request) {
  return logoutPost(request)
}
