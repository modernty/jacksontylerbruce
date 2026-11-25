import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getScreen, type LayerNode, type LooseEnd, type Constraint } from "./content";

/**
 * Reads a feature's prototype definition and gathers the spec records its elements
 * point at, so the running prototype can show the same inspector the static stage does.
 *
 * Server-only: touches the filesystem.
 */

const DATA = join(process.cwd(), "data");

export type Provenance = "figma-node" | "screenshot" | "inferred";

export type CopyEntry = { text: string; node?: string; source: Provenance };

export type PrototypeMemory = {
  id: string;
  text: string;
  updatedLabel: string;
  groupIds: string[];
  category: { label: string; icon: string };
  provenanceLabel: string;
  sourceChat: { title: string };
  /** Figma anchors per group, since a memory can be drawn in more than one. */
  nodes: {
    row: Record<string, string>;
  };
  source: Provenance;
};

export type PrototypeGroup = {
  id: string;
  title: string;
  node: string;
  titleNode: string;
  listNode: string;
  source: Provenance;
};

export type KeyMoment = {
  id: string;
  label: string;
  note: string;
  /** null when no frame was ever drawn for this state — which is itself the finding. */
  screen: string | null;
  anchor: string | null;
};

export type PrototypeData = {
  slug: string;
  title: string;
  blurb: string;
  copy: Record<string, CopyEntry | CopyEntry[]>;
  groups: PrototypeGroup[];
  memories: PrototypeMemory[];
  anchors: Record<string, string>;
  moments: (KeyMoment & { image?: string; screenName?: string })[];
  code: Record<string, { file: string; snippet: string }>;
  /** Everything the inspector needs, flattened across the screens involved. */
  nodes: LayerNode[];
  looseEnds: { end: LooseEnd; screenSlug: string }[];
  constraints: { constraint: Constraint; screenSlug: string }[];
  nodeScreen: Record<string, string>;
  figmaFileKey: string;
};

type RawPrototype = Omit<
  PrototypeData,
  "nodes" | "looseEnds" | "constraints" | "nodeScreen" | "figmaFileKey"
> & { sources: string[] };

/**
 * Collects a node and its ancestors. The inspector renders a breadcrumb by walking
 * `parentId` upward, so shipping an anchor without its chain would break the path.
 */
function withAncestors(id: string, byId: Map<string, LayerNode>, into: Map<string, LayerNode>) {
  let cur = byId.get(id);
  while (cur && !into.has(cur.id)) {
    into.set(cur.id, cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
}

export function getPrototype(slug: string): PrototypeData | null {
  const path = join(DATA, "prototypes", `${slug}.json`);
  if (!existsSync(path)) return null;

  const raw = JSON.parse(readFileSync(path, "utf8")) as RawPrototype;

  // Every anchor the prototype names, in one list.
  const referenced = new Set<string>();
  for (const id of Object.values(raw.anchors)) referenced.add(id);
  for (const group of raw.groups) {
    referenced.add(group.node);
    referenced.add(group.titleNode);
    referenced.add(group.listNode);
  }
  for (const memory of raw.memories) {
    for (const map of [memory.nodes.row]) {
      for (const id of Object.values(map)) referenced.add(id);
    }
  }
  for (const entry of Object.values(raw.copy).flat()) {
    if (entry.node) referenced.add(entry.node);
  }
  for (const id of Object.keys(raw.code)) referenced.add(id);
  for (const moment of raw.moments) if (moment.anchor) referenced.add(moment.anchor);

  const collected = new Map<string, LayerNode>();
  const nodeScreen: Record<string, string> = {};
  const looseEnds: PrototypeData["looseEnds"] = [];
  const constraints: PrototypeData["constraints"] = [];
  const momentMeta = new Map<string, { image: string; screenName: string }>();
  let figmaFileKey = "";

  for (const slugRef of raw.sources) {
    const screen = getScreen(slugRef);
    figmaFileKey ||= screen.figmaFileKey;
    momentMeta.set(slugRef, { image: screen.image, screenName: screen.name });

    const byId = new Map(screen.flatNodes.map((n) => [n.id, n]));
    for (const id of referenced) {
      if (!byId.has(id) || collected.has(id)) continue;
      withAncestors(id, byId, collected);
      nodeScreen[id] = slugRef;
    }

    for (const end of screen.looseEnds) {
      if (end.nodes.some((n) => referenced.has(n))) looseEnds.push({ end, screenSlug: slugRef });
    }
    for (const constraint of screen.constraints ?? []) {
      if (referenced.has(constraint.nodeId)) constraints.push({ constraint, screenSlug: slugRef });
    }
  }

  /**
   * A stale anchor fails the build rather than silently blanking the inspector weeks
   * later. The pages are statically prerendered, so this runs at `next build`.
   */
  const missing = [...referenced].filter((id) => !collected.has(id));
  if (missing.length) {
    throw new Error(
      `data/prototypes/${slug}.json references ${missing.length} node id(s) that do not ` +
        `exist in ${raw.sources.join(", ")}:\n  ${missing.join("\n  ")}`
    );
  }

  return {
    ...raw,
    moments: raw.moments.map((m) => ({ ...m, ...(m.screen ? momentMeta.get(m.screen) : {}) })),
    nodes: [...collected.values()],
    looseEnds,
    constraints,
    nodeScreen,
    figmaFileKey,
  };
}
