"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "@/src/checklist/auth-actions"

const LINKS = [
  ["/me/checklist", "Today", true],
  ["/me/checklist/week", "Week", false],
  ["/me/checklist/history", "History", false],
  ["/me/checklist/items", "Items", false],
] as const

export function ChecklistNav() {
  const pathname = usePathname()
  return (
    <nav className="ck-nav" aria-label="Checklist">
      {LINKS.map(([href, label, exact]) => {
        const current = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link key={href} href={href} aria-current={current ? "page" : undefined}>
            {label}
          </Link>
        )
      })}
      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </nav>
  )
}
