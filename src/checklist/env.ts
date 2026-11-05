export function supabaseUrl(): string {
  return process.env.SUPABASE_URL?.trim() ?? ""
}

/** Anon key only. The service role key is not read by the app. */
export function supabaseAnonKey(): string {
  return (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim()
}

export function authConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey())
}
