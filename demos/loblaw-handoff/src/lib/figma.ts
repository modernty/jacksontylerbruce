/**
 * Pure Figma helpers, safe on the client.
 *
 * Kept out of `content.ts` deliberately: that module reads the filesystem, so a client
 * component importing a value from it drags `node:fs` into the browser bundle and the
 * build fails. Types are erased and can still come from `content.ts`; values cannot.
 */

/**
 * Figma writes node ids with colons but expects hyphens in a URL. Every colon has to go,
 * not just the first: an instance-internal id looks like `I7294:42725;2847:30506`, and
 * replacing only the leading colon produced a link that silently failed to resolve.
 */
export function figmaUrl(fileKey: string, nodeId?: string | null): string {
  const base = `https://www.figma.com/design/${fileKey}`;
  return nodeId ? `${base}?node-id=${nodeId.replaceAll(":", "-")}` : base;
}
