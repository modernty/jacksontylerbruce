import { NextResponse } from "next/server"
import { createAuthClient } from "@/src/checklist/auth"
import { privateHeaders } from "@/src/checklist/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const login = new URL("/me/checklist/login", url.origin)
  if (!code) return NextResponse.redirect(login, { headers: privateHeaders })
  const supabase = await createAuthClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(login, { headers: privateHeaders })
  return NextResponse.redirect(new URL("/me/checklist", url.origin), { headers: privateHeaders })
}
