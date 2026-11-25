/**
 * One-shot splitter: carves the per-frame subtrees out of the single get_metadata
 * dump for the Memory node (7188:1982) into data/raw/<slug>.xml.
 *
 * Kept in the repo because the slug → Figma node mapping is the record of which
 * frame each spec describes.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = process.argv[2];

// Ordered as the frames sit on the Figma canvas, left to right within each section.
const FRAMES = [
  // Section: Memory (7282:39700)
  ["7188:4793", "memory--chat-history-entry"],
  ["7385:23816", "memory--side-panel-recents"],
  ["7188:1983", "memory--home"],
  ["7290:41806", "memory--home-told-me"],
  ["7294:42318", "memory--home-detail-sheet"],
  ["7294:43120", "memory--home-delete"],
  ["7352:60223", "memory--edit-a"],
  ["7352:60331", "memory--edit-b"],
  // Section: PENDING CONFIRMATION — Conflict resolution, in chat (7268:30848)
  ["7268:30927", "memory--conflict-in-chat"],
  ["7280:37376", "memory--conflict-review-request"],
  ["7269:37251", "memory--conflict-updated"],
  ["7282:39354", "memory--conflict-dismissed"],
  // Section: Conflict resolution, at doc upload (7268:31116) — top row
  ["7282:38009", "memory--upload-entry"],
  ["7282:38053", "memory--upload-file-attached"],
  ["7282:38396", "memory--upload-acknowledged"],
  ["7282:38670", "memory--upload-summary"],
  ["7282:38815", "memory--upload-review-request"],
  ["7282:38936", "memory--upload-resolved"],
  // Section: Conflict resolution, at doc upload — second row
  ["7282:38221", "memory--upload-entry-alt"],
  ["7282:38265", "memory--upload-consent-alert"],
  ["7282:38467", "memory--upload-file-attached-alt"],
  ["7282:38591", "memory--upload-file-attached-alt-2"],
];

const xml = readFileSync(SRC, "utf8");
const lines = xml.split("\n");

for (const [nodeId, slug] of FRAMES) {
  const start = lines.findIndex((l) => l.includes(`<frame id="${nodeId}"`));
  if (start === -1) throw new Error(`Frame ${nodeId} (${slug}) not found in ${SRC}`);

  // The frame opens at some indent; it closes at the first </frame> back at that indent.
  const indent = lines[start].length - lines[start].trimStart().length;
  const closer = " ".repeat(indent) + "</frame>";

  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] === closer) {
      end = i;
      break;
    }
  }
  if (end === -1) throw new Error(`No close tag for ${nodeId} (${slug})`);

  // Re-indent to zero so every raw file has its frame as the root.
  const block = lines
    .slice(start, end + 1)
    .map((l) => (l.startsWith(" ".repeat(indent)) ? l.slice(indent) : l))
    .join("\n");

  writeFileSync(`data/raw/${slug}.xml`, block + "\n");
  console.log(`${slug.padEnd(36)} ${nodeId.padEnd(12)} ${end - start + 1} lines`);
}
