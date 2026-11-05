/** Signed-out visitors can open the login page and the magic-link callback. Everything else stays closed. */
export function routeAccess(pathname: string, signedIn: boolean): "open" | "redirect" | "deny" {
  if (pathname === "/me/checklist/login" || pathname === "/me/checklist/auth/callback") return "open"
  if (signedIn) return "open"
  if (pathname.startsWith("/me/checklist/api")) return "deny"
  return "redirect"
}

/** Use the request origin only when it matches the host that received the request. */
export function callbackOrigin(origin: string | null, host: string | null): string | null {
  if (!origin || !host) return null
  try {
    const url = new URL(origin)
    if (url.host !== host) return null
    return url.origin
  } catch {
    return null
  }
}
