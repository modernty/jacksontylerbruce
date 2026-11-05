import { requireChecklistPage } from "@/src/checklist/page-guard"
import { SeedRefused, StorageNotConfigured } from "@/src/checklist/errors"
import { checklistReady, loadChecklist } from "@/src/checklist/load"
import { ItemsEditor } from "@/src/checklist/ui/items-editor"
import { SeedMissing, StorageMissing } from "@/src/checklist/ui/storage"

export const dynamic = "force-dynamic"

export default async function ItemsPage() {
  if (await requireChecklistPage() === "unconfigured") return <StorageMissing />
  if (!checklistReady()) return <StorageMissing />
  try {
    const view = await loadChecklist()
    return <ItemsEditor items={view.items} />
  } catch (error) {
    if (error instanceof StorageNotConfigured) return <StorageMissing />
    if (error instanceof SeedRefused) return <SeedMissing />
    throw error
  }
}
