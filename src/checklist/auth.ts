import "server-only"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { authConfigured, supabaseAnonKey, supabaseUrl } from "./env"

export type SessionUser = { id: string; email: string | null }

export async function createAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Middleware refreshes the session when this render cannot write cookies.
        }
      },
    },
  })
}

export async function currentUser(): Promise<SessionUser | null> {
  if (!authConfigured()) return null
  const supabase = await createAuthClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email ?? null }
}

