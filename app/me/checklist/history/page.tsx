import { redirect } from "next/navigation"
import { SeedRefused, StorageNotConfigured } from "@/src/checklist/errors"
import { loadSignedInChecklist } from "@/src/checklist/load"
import { HistoryGrid } from "@/src/checklist/ui/history-grid"
import { SeedMissing, StorageMissing } from "@/src/checklist/ui/storage"

export const dynamic = "force-dynamic"

export default async function HistoryPage() {
  const result = await loadSignedInChecklist()
  if (result.status === "unconfigured") return <StorageMissing />
  if (result.status === "signed-out") redirect("/me/checklist/login")
  try {
    return <HistoryGrid items={result.view.active} days={result.view.days} streaks={result.view.streaks} />
  } catch (error) {
    if (error instanceof StorageNotConfigured) return <StorageMissing />
    if (error instanceof SeedRefused) return <SeedMissing />
    throw error
  }
}
