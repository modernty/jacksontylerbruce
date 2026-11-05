import { redirect } from "next/navigation"
import { SeedRefused, StorageNotConfigured } from "@/src/checklist/errors"
import { loadSignedInChecklist } from "@/src/checklist/load"
import { SeedMissing, StorageMissing } from "@/src/checklist/ui/storage"
import { WeekBoard } from "@/src/checklist/ui/week-board"

export const dynamic = "force-dynamic"

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams
  const result = await loadSignedInChecklist(week)
  if (result.status === "unconfigured") return <StorageMissing />
  if (result.status === "signed-out") redirect("/me/checklist/login")
  try {
    const view = result.view
    return (
      <WeekBoard
        week={view.week}
        weekStart={view.weekStart}
        weekEnd={view.weekEnd}
        currentWeek={view.currentWeek}
        isSunday={view.isSunday}
      />
    )
  } catch (error) {
    if (error instanceof StorageNotConfigured) return <StorageMissing />
    if (error instanceof SeedRefused) return <SeedMissing />
    throw error
  }
}
