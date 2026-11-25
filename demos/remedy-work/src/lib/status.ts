/**
 * Status tones.
 *
 * The sheet's Site Notes define one status vocabulary (Shipped, In build, Design
 * complete, Concept, Archived) but the Labs rows use another (Open, Prototype ready, In
 * flight). Both are live in the data, so both are mapped here rather than one being
 * treated as wrong — see the note in README about reconciling them in the sheet.
 */

export type Tone = "done" | "ready" | "progress" | "open";

const TONES: Record<string, Tone> = {
  // The product vocabulary.
  Shipped: "done",
  "Design complete": "ready",
  "In build": "progress",
  Concept: "open",
  Archived: "open",
  // The Labs vocabulary.
  "Prototype ready": "ready",
  "In flight": "progress",
  Open: "open",
};

/** Unknown statuses render in the neutral tone rather than throwing — a new dropdown
 *  value should never blank out a card. */
export function toneFor(status: string): Tone {
  return TONES[status] ?? "open";
}

export const TONE_CLASS: Record<Tone, string> = {
  done: "bg-[var(--tone-done-bg)] text-[var(--tone-done-ink)]",
  ready: "bg-[var(--tone-ready-bg)] text-[var(--tone-ready-ink)]",
  progress: "bg-[var(--tone-progress-bg)] text-[var(--tone-progress-ink)]",
  open: "bg-[var(--tone-open-bg)] text-[var(--tone-open-ink)]",
};
