import type { ComponentType } from "react";
import { SidePanelTryIt } from "./side-panel-try-it";
import { ChatSettingsTryIt } from "./chat-settings-try-it";

/**
 * Small running demos a feature can carry instead of a full prototype.
 *
 * A feature's `tryIt` key in `data/features/*.json` names one of these. The Memory
 * prototype is its own thing — a whole screen with an inspector behind it; these are the
 * single-behaviour case, where a surface does one thing the static frames cannot show.
 */
export const TRY_IT: Record<string, ComponentType> = {
  "side-panel": SidePanelTryIt,
  "chat-settings": ChatSettingsTryIt,
};
