import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { routeAccess } from "@/src/checklist/access"
import { supabaseAnonKey, supabaseUrl } from "@/src/checklist/env"
import { privateHeaders } from "@/src/checklist/http"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname !== "/me/checklist" && !pathname.startsWith("/me/checklist/")) return NextResponse.next()

  let response = NextResponse.next({ request })
  const signedIn = await hasSession(request, (next) => {
    response = next
  })
  const access = routeAccess(pathname, signedIn)
  if (access === "deny") {
    const denied = new NextResponse(null, { status: 404, headers: privateHeaders })
    carry(response, denied)
    return denied
  }
  if (access === "redirect") {
    const url = request.nextUrl.clone()
    url.pathname = "/me/checklist/login"
    url.search = ""
    const redirect = NextResponse.redirect(url)
    applyPrivateHeaders(redirect)
    carry(response, redirect)
    return redirect
  }
  applyPrivateHeaders(response)
  return response
}

async function hasSession(request: NextRequest, refresh: (response: NextResponse) => void): Promise<boolean> {
  const url = supabaseUrl()
  const key = supabaseAnonKey()
  if (!url || !key) return false
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        refresh(supabaseResponse)
      },
    },
  })
  const { data } = await supabase.auth.getUser()
  refresh(supabaseResponse)
  return Boolean(data.user)
}

function applyPrivateHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(privateHeaders)) response.headers.set(key, value)
}

function carry(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie)
  })
}

export const config = {
  matcher: ["/me/checklist", "/me/checklist/:path*"],
}
