"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { DEFAULT_PILLS } from "@/src/router/pills"
import type { Pill } from "@/src/router/types"

const PillsContext = createContext<{ pills: Pill[]; setPills: (pills: Pill[]) => void }>({
  pills: DEFAULT_PILLS,
  setPills: () => undefined,
})

export function PillsProvider({ children }: { children: ReactNode }) {
  const [pills, setPills] = useState<Pill[]>(DEFAULT_PILLS)
  return <PillsContext.Provider value={{ pills, setPills }}>{children}</PillsContext.Provider>
}

export function usePills(): Pill[] {
  return useContext(PillsContext).pills
}

export function PillSlot({ pills }: { pills: Pill[] }) {
  const { setPills } = useContext(PillsContext)
  useEffect(() => {
    setPills(pills)
    return () => setPills(DEFAULT_PILLS)
  }, [pills, setPills])
  return null
}
