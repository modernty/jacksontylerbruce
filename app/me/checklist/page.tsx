import { requireChecklistPage } from "@/src/checklist/page-guard"
import { SeedRefused, StorageNotConfigured } from "@/src/checklist/errors"
import { checklistReady, loadChecklist } from "@/src/checklist/load"
import { SeedMissing, StorageMissing } from "@/src/checklist/ui/storage"
import { TodayBoard } from "@/src/checklist/ui/today-board"

export const dynamic = "force-dynamic"

export default async function TodayPage() {
  if (await requireChecklistPage() === "unconfigured") return <StorageMissing />
  if (!checklistReady()) return <StorageMissing />
  try {
    const view = await loadChecklist()
    return (
      <TodayBoard
        today={view.today}
        items={view.active}
        log={view.log}
        streaks={view.streaks}
        slipping={view.slipping}
      />
    )
  } catch (error) {
    if (error instanceof StorageNotConfigured) return <StorageMissing />
    if (error instanceof SeedRefused) return <SeedMissing />
    throw error
  }
}
