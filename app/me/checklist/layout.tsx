import type { Metadata } from "next"
import { cookies } from "next/headers"
import { COOKIE_NAME, verifySession } from "@/src/checklist/session"
import { ChecklistNav } from "@/src/checklist/ui/nav"
import "./checklist.css"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Checklist",
  robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true },
}

export default async function ChecklistLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  const authed = token ? await verifySession(token, process.env.CHECKLIST_SESSION_SECRET ?? "") : false
  return (
    <div className="ck">
      {authed ? <ChecklistNav /> : null}
      <main>{children}</main>
    </div>
  )
}
