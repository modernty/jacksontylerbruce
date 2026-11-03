import { NextResponse, type NextRequest } from "next/server"
import { privateHeaders } from "@/src/checklist/http"
import { COOKIE_NAME, readCookie, verifySession } from "@/src/checklist/session"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname !== "/me/checklist" && !pathname.startsWith("/me/checklist/")) return NextResponse.next()

  const token = readCookie(request.headers.get("cookie"), COOKIE_NAME)
  const authed = token ? await verifySession(token, process.env.CHECKLIST_SESSION_SECRET ?? "") : false
  const loginPage = pathname === "/me/checklist/login"
  const loginPost = pathname === "/me/checklist/api/session" && request.method === "POST"
  if (!authed && !loginPage && !loginPost) {
    if (pathname.startsWith("/me/checklist/api")) {
      return new NextResponse(null, { status: 404, headers: privateHeaders })
    }
    const url = request.nextUrl.clone()
    url.pathname = "/me/checklist/login"
    url.search = ""
    const response = NextResponse.redirect(url)
    applyPrivateHeaders(response)
    return response
  }

  const response = NextResponse.next()
  applyPrivateHeaders(response)
  return response
}

function applyPrivateHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(privateHeaders)) response.headers.set(key, value)
}

export const config = {
  matcher: ["/me/checklist", "/me/checklist/:path*"],
}
