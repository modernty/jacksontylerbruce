import type { Metadata } from "next"
import { currentUser } from "@/src/checklist/auth"
import { authConfigured } from "@/src/checklist/env"
import { ChecklistNav } from "@/src/checklist/ui/nav"
import "./checklist.css"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Checklist",
  robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true },
}

export default async function ChecklistLayout({ children }: { children: React.ReactNode }) {
  const user = authConfigured() ? await currentUser() : null
  return (
    <div className="ck">
      {user ? <ChecklistNav /> : null}
      <main>{children}</main>
    </div>
  )
}
