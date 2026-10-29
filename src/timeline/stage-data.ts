import "server-only"
import { loadCatalog } from "@/src/content/catalog"
import { timelineCards, toTimelineModel } from "./model"
import { desktopSvg, mobileSvg } from "./svg"

export function publicStage() {
  const catalog = loadCatalog()
  const model = toTimelineModel(catalog, { includeFlagged: false })
  return {
    desktop: desktopSvg(model),
    mobile: mobileSvg(model),
    cards: timelineCards(catalog, { includeFlagged: false }),
  }
}
