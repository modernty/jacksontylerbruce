import type { ComponentType } from "react";
import { SidePanelEmpty, SidePanelDefault, SidePanelFull } from "./side-panel-states";
import { ChatHistoryPageDefault, ChatHistoryPageFull } from "./chat-history-page-states";
import { SidePanelPageEmpty, SidePanelPageFour, SidePanelPageFull } from "./side-panel-page-states";

/**
 * Screens that exist as markup rather than as a PNG.
 *
 * A screen's `live` key in `data/screens/*.json` names one of these. When it resolves,
 * the Designs tab renders the component and measures the DOM; when it does not, the tab
 * falls back to the export and the coordinates in `flatNodes`. Both paths feed the same
 * inspector, so a screen can be converted one at a time.
 */
export const LIVE_SCREENS: Record<string, ComponentType> = {
  "side-panel-empty": SidePanelEmpty,
  "side-panel-default": SidePanelDefault,
  "side-panel-open": SidePanelFull,
  "chat-history-default": ChatHistoryPageDefault,
  "chat-history-full": ChatHistoryPageFull,
  "panel-empty": SidePanelPageEmpty,
  "panel-four": SidePanelPageFour,
  "panel-full": SidePanelPageFull,
};
