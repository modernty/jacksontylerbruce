import "server-only"
import { redirect } from "next/navigation"
import { currentUser } from "./auth"
import { authConfigured } from "./env"

/** Data pages call this so a missing session redirects even if middleware is skipped. */
export async function requireChecklistPage(): Promise<"ok" | "unconfigured"> {
  if (!authConfigured()) return "unconfigured"
  const user = await currentUser()
  if (!user) redirect("/me/checklist/login")
  return "ok"
}
