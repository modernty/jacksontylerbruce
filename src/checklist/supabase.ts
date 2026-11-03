import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { StorageNotConfigured } from "./errors"

let client: SupabaseClient | null = null

export function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim() ?? ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ""
  if (!url || !key) return null
  return { url, key }
}

/** Service-role client. Never import this module from a client component. */
export function checklistSupabase(): SupabaseClient {
  if (client) return client
  const env = supabaseEnv()
  if (!env) throw new StorageNotConfigured()
  client = createClient(env.url, env.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return client
}
