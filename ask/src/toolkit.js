import { defineToolkit } from "@assistant-ui/react";
import { renderShowProject, renderText, renderUnimplemented } from "./views.jsx";
import { renderShowTimeline } from "./timeline-view.jsx";

const anchor = { type: "string", description: "Optional section anchor. Ids only." };

const idArgs = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", description: "Public record id." },
    anchor,
  },
  required: ["id"],
};

/**
 * Tool-call UI. makeAssistantToolUI is the deprecated registration;
 * a toolkit `render` is the equivalent and what assistant-ui installs.
 * Arguments are ids. Renderers do not read model-authored copy.
 */
export const toolkit = defineToolkit({
  show_project: {
    type: "frontend",
    description: "Show one public project card. Pass an id, and an optional anchor.",
    parameters: idArgs,
    display: "standalone",
    execute: async ({ id, anchor: section }) => ({ id, anchor: section ?? null }),
    render: renderShowProject,
  },
  show_timeline: {
    type: "frontend",
    description: "Show the public career timeline. Optional focus id and anchor.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        focus: { type: "string", description: "Optional public id to emphasize." },
        anchor,
      },
    },
    display: "standalone",
    execute: async ({ focus, anchor: section }) => ({ focus: focus ?? null, anchor: section ?? null }),
    render: renderShowTimeline,
  },
  explain_pattern: {
    type: "frontend",
    description: "Reserved. Not implemented in this slice.",
    parameters: idArgs,
    display: "standalone",
    execute: async ({ id, anchor: section }) => ({ id, anchor: section ?? null }),
    render: renderUnimplemented("explain_pattern"),
  },
  show_related: {
    type: "frontend",
    description: "Reserved. Not implemented in this slice.",
    parameters: idArgs,
    display: "standalone",
    execute: async ({ id, anchor: section }) => ({ id, anchor: section ?? null }),
    render: renderUnimplemented("show_related"),
  },
  text: {
    type: "frontend",
    description: "Plain text fallback.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        text: { type: "string" },
        anchor,
      },
      required: ["text"],
    },
    display: "standalone",
    execute: async ({ text, anchor: section }) => ({ text, anchor: section ?? null }),
    render: renderText,
  },
});
