"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BoringToggle } from "./view-mode"

/** Project and about pages carry the name and location. The rest of the site keeps the index label. */
export function TopBar({ location }: { location: string }) {
  const path = usePathname()
  const project = path.startsWith("/work/")
  if (project || path === "/about") {
    return (
      <div className="top top-work">
        <Link href="/timeline#axis">Jackson, <em>Tyler</em> Bruce</Link>
        <span className="right">
          {project ? <BoringToggle /> : null}
          <Link href="/sheet?topic=location#answer" className="place">{location}</Link>
        </span>
      </div>
    )
  }
  return (
    <div className="top">
      <span>Tyler Jackson — Designer</span>
      <span>Index — 2026</span>
    </div>
  )
}
