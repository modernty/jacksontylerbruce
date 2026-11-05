import { redirect } from "next/navigation"
import { requestMagicLink } from "@/src/checklist/auth-actions"
import { currentUser } from "@/src/checklist/auth"
import { authConfigured } from "@/src/checklist/env"

export const dynamic = "force-dynamic"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  if (!authConfigured()) {
    return (
      <section>
        <h1>Checklist</h1>
        <p className="ck-kicker">Private</p>
        <p className="ck-error">Sign-in is not configured.</p>
      </section>
    )
  }
  if (await currentUser()) redirect("/me/checklist")
  const { sent } = await searchParams
  return (
    <section>
      <h1>Checklist</h1>
      <p className="ck-kicker">Private</p>
      {sent ? <p>Check your email.</p> : null}
      <form className="ck-login" action={requestMagicLink}>
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required maxLength={320} />
        </label>
        <button className="ck-submit" type="submit">Email me a link</button>
      </form>
    </section>
  )
}
