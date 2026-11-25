import "server-only"
import { loadCatalog } from "@/src/content/catalog"
import { timelineCards, toTimelineModel } from "./model"
import { desktopSvg, mobileSvg } from "./svg"

/** The timeline drawings; `edge` stretches the desktop one across its panel (the chat page). */
export function publicStage({ edge = false } = {}) {
  const catalog = loadCatalog()
  const model = toTimelineModel(catalog, { includeFlagged: false })
  return {
    desktop: edge ? desktopSvg(model, 1000, 340, { edge }) : desktopSvg(model),
    mobile: mobileSvg(model),
    cards: timelineCards(catalog, { includeFlagged: false }),
  }
}
