import { redirect } from "next/navigation"
import { SeedRefused, StorageNotConfigured } from "@/src/checklist/errors"
import { loadSignedInChecklist } from "@/src/checklist/load"
import { ItemsEditor } from "@/src/checklist/ui/items-editor"
import { SeedMissing, StorageMissing } from "@/src/checklist/ui/storage"

export const dynamic = "force-dynamic"

export default async function ItemsPage() {
  const result = await loadSignedInChecklist()
  if (result.status === "unconfigured") return <StorageMissing />
  if (result.status === "signed-out") redirect("/me/checklist/login")
  try {
    return <ItemsEditor items={result.view.items} />
  } catch (error) {
    if (error instanceof StorageNotConfigured) return <StorageMissing />
    if (error instanceof SeedRefused) return <SeedMissing />
    throw error
  }
}
