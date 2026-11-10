"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { quietPage } from "./chrome"
import { BoringToggle } from "./view-mode"

/** The name and location, on every page with the plain chat bar. The rest keeps the index label. */
export function TopBar({ location, email, linkedin }: { location: string; email: string; linkedin: string }) {
  const path = usePathname()
  const project = path.startsWith("/work/")
  if (quietPage(path)) {
    return (
      <div className="top top-work">
        <Link href="/timeline#axis">Jackson, <em>Tyler</em> Bruce</Link>
        <span className="right">
          {project ? <BoringToggle /> : null}
          <span className={project ? "contact on-project" : "contact"}>
            <a href={`mailto:${email}`} className="place">Email</a>
            <a href={linkedin} className="place" target="_blank" rel="noreferrer">LinkedIn</a>
          </span>
          <Link href="/about" className="place">{location}</Link>
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
