/**
 * The load-in sequence, in order.
 *
 * Kept in its own module because both the machine that advances it and the screen that
 * reads it need the order, and a section is "released" by comparing positions rather
 * than by listing the phases that count as open — so adding a step later is one edit.
 */
export const LOAD_PHASES = ["idle", "header", "card", "stream", "groups", "done"] as const;

export type LoadPhase = (typeof LOAD_PHASES)[number];

/** Whether the sequence has got to `at` or past it. */
export function reachedPhase(phase: LoadPhase, at: LoadPhase) {
  return LOAD_PHASES.indexOf(phase) >= LOAD_PHASES.indexOf(at);
}
