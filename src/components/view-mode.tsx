"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

const KEY = "boring-view"

const ViewModeContext = createContext<{ boring: boolean; setBoring: (boring: boolean) => void }>({
  boring: false,
  setBoring: () => undefined,
})

/** Reading view (stored as "boring") swaps the project conversation for a plain two-column page. It is remembered per visitor. */
export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [boring, setState] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "on") setState(true)
    } catch {
      // Storage can be unavailable; the conversation view is the default.
    }
  }, [])

  // On <html> so CSS can hide the project composer without changing what it renders.
  useEffect(() => {
    if (boring) document.documentElement.dataset.view = "boring"
    else delete document.documentElement.dataset.view
  }, [boring])

  const setBoring = useCallback((next: boolean) => {
    setState(next)
    try {
      localStorage.setItem(KEY, next ? "on" : "off")
    } catch {
      // Not remembered, still applied.
    }
  }, [])

  return <ViewModeContext.Provider value={{ boring, setBoring }}>{children}</ViewModeContext.Provider>
}

export function useViewMode() {
  return useContext(ViewModeContext)
}

export function BoringToggle() {
  const { boring, setBoring } = useViewMode()
  return (
    <button type="button" className="boring" aria-pressed={boring} onClick={() => setBoring(!boring)}>
      {boring ? "Conversation view" : "Reading view"}
    </button>
  )
}
