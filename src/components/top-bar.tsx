"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BoringToggle } from "./view-mode"

/** Project pages carry the name and location. The rest of the site keeps the index label. */
export function TopBar({ location }: { location: string }) {
  const path = usePathname()
  if (path.startsWith("/work/")) {
    return (
      <div className="top top-work">
        <Link href="/timeline#axis">Jackson, <em>Tyler</em> Bruce</Link>
        <span className="right">
          <BoringToggle />
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
