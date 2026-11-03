import { SeedRefused, StorageNotConfigured } from "@/src/checklist/errors"
import { checklistReady, loadChecklist } from "@/src/checklist/load"
import { SeedMissing, StorageMissing } from "@/src/checklist/ui/storage"
import { WeekBoard } from "@/src/checklist/ui/week-board"

export const dynamic = "force-dynamic"

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  if (!checklistReady()) return <StorageMissing />
  const { week } = await searchParams
  try {
    const view = await loadChecklist(new Date(), week)
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
