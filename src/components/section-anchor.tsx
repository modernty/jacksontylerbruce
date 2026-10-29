"use client"

import { useEffect } from "react"

export function SectionAnchor() {
  useEffect(() => {
    const mark = () => {
      document.querySelectorAll(".anchored").forEach((node) => node.classList.remove("anchored"))
      const id = decodeURIComponent(location.hash.replace(/^#/, ""))
      if (!id) return
      const target = document.getElementById(id)
      if (!target) return
      target.classList.add("anchored")
      target.scrollIntoView({ block: "start" })
    }
    mark()
    window.addEventListener("hashchange", mark)
    return () => window.removeEventListener("hashchange", mark)
  }, [])
  return null
}
