import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { COOKIE_NAME, verifySession } from "@/src/checklist/session"

export const dynamic = "force-dynamic"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (token && await verifySession(token, process.env.CHECKLIST_SESSION_SECRET ?? "")) redirect("/me/checklist")
  const { error } = await searchParams
  const ready = Boolean(process.env.CHECKLIST_PASSPHRASE && process.env.CHECKLIST_SESSION_SECRET)
  const message = error === "rate"
    ? "Too many attempts. Wait and try again."
    : error === "config" || !ready
      ? "Sign-in is not configured."
      : error === "1"
        ? "That passphrase did not match."
        : null
  return (
    <section>
      <h1>Checklist</h1>
      <p className="ck-kicker">Private</p>
      {message ? <p className="ck-error">{message}</p> : null}
      {ready ? (
        <form className="ck-login" method="post" action="/me/checklist/api/session">
          <label>
            Passphrase
            <input type="password" name="passphrase" autoComplete="current-password" required maxLength={256} />
          </label>
          <button className="ck-submit" type="submit">Enter</button>
        </form>
      ) : null}
    </section>
  )
}
