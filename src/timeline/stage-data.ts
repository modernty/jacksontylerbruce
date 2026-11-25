import "server-only"
import { loadCatalog } from "@/src/content/catalog"
import { timelineCards, toTimelineModel } from "./model"
import { desktopSvg, mobileSvg } from "./svg"

/**
 * The timeline drawings. `edge` runs the desktop one's years nearly edge to edge (the chat page), and
 * hands over the model, so the page can redraw it at the width it is shown at.
 */
export function publicStage({ edge = false } = {}) {
  const catalog = loadCatalog()
  const model = toTimelineModel(catalog, { includeFlagged: false })
  return {
    desktop: edge ? desktopSvg(model, 1000, 340, { edge }) : desktopSvg(model),
    model: edge ? model : undefined,
    mobile: mobileSvg(model),
    cards: timelineCards(catalog, { includeFlagged: false }),
  }
}
