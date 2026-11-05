"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { callbackOrigin } from "./access"
import { createAuthClient } from "./auth"
import { authConfigured } from "./env"

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const headerList = await headers()
  const origin = callbackOrigin(headerList.get("origin"), headerList.get("x-forwarded-host") ?? headerList.get("host"))
  if (authConfigured() && email && origin) {
    try {
      const supabase = await createAuthClient()
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${origin}/me/checklist/auth/callback` },
      })
    } catch {
      // The page always says to check email, including when nothing was sent.
    }
  }
  redirect("/me/checklist/login?sent=1")
}

export async function signOut() {
  if (authConfigured()) {
    const supabase = await createAuthClient()
    await supabase.auth.signOut()
  }
  redirect("/me/checklist/login")
}
