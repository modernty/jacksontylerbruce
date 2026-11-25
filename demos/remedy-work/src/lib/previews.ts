/**
 * Which preview images actually exist.
 *
 * The sheet names the image each card wants (`Visual`), but the exports do not exist
 * yet. Rather than hardcoding a list that drifts, this reads `public/previews` at build
 * time: drop a file in named as the sheet names it and the card picks it up, with no code
 * change. Until then the card falls back to a tinted panel.
 *
 * Server-only — imported by a server component, never shipped to the browser.
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

const DIRECTORY = join(process.cwd(), "public", "previews");

function available(): Set<string> {
  try {
    return new Set(readdirSync(DIRECTORY));
  } catch {
    // The directory is optional — absent means no exports have landed yet.
    return new Set();
  }
}

/**
 * Deliberately NOT hoisted to module scope. Caching the listing once meant a running dev
 * server kept an empty set for its whole lifetime, so a newly dropped export stayed
 * invisible until someone restarted it — and hot reload never re-ran it, because this
 * file had not changed. Reading per call costs a `readdirSync` on a small directory and
 * makes "drop the file in and it appears" actually true.
 */
export function previewSrc(visual: string | null): string | null {
  if (!visual) return null;
  return available().has(visual) ? `/demos/remedy-work/previews/${visual}` : null;
}
