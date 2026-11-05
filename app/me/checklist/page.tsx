import { redirect } from "next/navigation"
import { SeedRefused, StorageNotConfigured } from "@/src/checklist/errors"
import { loadSignedInChecklist } from "@/src/checklist/load"
import { SeedMissing, StorageMissing } from "@/src/checklist/ui/storage"
import { TodayBoard } from "@/src/checklist/ui/today-board"

export const dynamic = "force-dynamic"

export default async function TodayPage() {
  const result = await loadSignedInChecklist()
  if (result.status === "unconfigured") return <StorageMissing />
  if (result.status === "signed-out") redirect("/me/checklist/login")
  try {
    const view = result.view
    return (
      <TodayBoard
        today={view.today}
        items={view.active}
        showTemplate={view.items.length === 0}
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
