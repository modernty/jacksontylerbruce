import { readFileSync, existsSync, openSync, readSync, closeSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The data layer. Everything on this site is read off JSON in `/data` — feature
 * specs are authored by hand, screen specs are authored beside the Figma metadata
 * and completed by `npm run build:screens`. Nothing here is hardcoded copy.
 *
 * Server-only: these functions touch the filesystem, so they may only be called
 * from server components.
 */

const DATA = join(process.cwd(), "data");

// Re-exported so server callers keep one import; the implementation is client-safe.
export { figmaUrl } from "./figma";

export type Status =
  | "shipped"
  | "design-complete"
  | "in-review"
  | "in-progress"
  | "discovery"
  | "superseded";

export type Manifest = {
  _meta: {
    version: string;
    project: string;
    title: string;
    blurb: string;
    lastUpdated: string;
    platform: string;
    /** Specs now span more than one Figma file, so the source is a list, not a key. */
    files: { key: string; name: string; note: string }[];
  };
  features: string[];
};

export type Feature = {
  slug: string;
  name: string;
  status: Status;
  order: number;
  summary: string;
  /** A single image for the feature's card, in place of a row of screen thumbnails. */
  thumbnail?: string;
  /**
   * Holds the page at a notice instead of publishing its sections. The content stays in
   * the data files untouched — this is a curtain, not a delete, so it lifts by removing
   * the key. The design status and the Figma link still show, because "the specs are not
   * ready" is a different claim from "the designs are not ready".
   */
  inProgress?: {
    title: string;
    body: string;
    /**
     * A second route that serves this feature as the notice and nothing else. The index
     * card points there; the feature's own slug keeps serving the full page. Two URLs
     * rather than one URL with a flag, so what a reader sees does not depend on what
     * their browser happens to remember.
     */
    holdSlug: string;
  };
  /**
   * Names a running demo in `TRY_IT` — a single behaviour the static frames cannot show,
   * such as a surface opening and closing. Separate from a prototype, which is a whole
   * screen with its own inspector.
   */
  tryIt?: string;
  /**
   * Screen slugs to surface directly under the demo, so a reader can leave it for the
   * frames it was built from. A slug with no extracted screen is skipped rather than
   * rendered dead, which is the same contract `getScreensForFeature` uses.
   */
  tryItScreens?: string[];
  figmaFileKey: string | null;
  figmaPageId: string | null;
  figmaPageName: string | null;
  overview: string[];
  evidence?: { title: string; body: string; source: string; note?: string }[];
  /**
   * What the entries below are. Usually states of one screen, but a feature can instead
   * list situations — different places it appears — which is a different claim.
   */
  statesLabel?: string;
  states: {
    name: string;
    screen: string;
    description: string;
    /**
     * Overrides the card image only. The stage keeps the extracted export, because the
     * layer overlay's geometry is computed against that exact frame.
     */
    thumbnail?: string;
  }[];
  behaviour: { rule: string; detail: string; source: "extracted" | "partial" | "open" }[];
};

/** A measurement that may or may not be bound to a library token. */
export type TokenValue = { value: string; token?: string };

/**
 * Per-node style, parsed out of Figma's design-context output. Optional throughout:
 * geometry comes from the layer metadata and is always present, but fills, radius,
 * padding and effects only exist in the generated code, which is read per screen.
 * The inspector renders whichever sections are present and says so when they are not.
 */
export type LayerStyle = {
  fills?: { kind: "solid" | "gradient"; value: string; token?: string }[];
  radius?: TokenValue;
  padding?: { top: TokenValue; right: TokenValue; bottom: TokenValue; left: TokenValue };
  gap?: TokenValue;
  autoLayout?: "horizontal" | "vertical";
  effects?: {
    glass?: boolean;
    backdropBlur?: TokenValue;
    dropShadow?: { x: string; y: string; blur: string; spread: string; color: string }[];
  };
};

export type LayerNode = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  depth: number;
  bounds: { x: number; y: number; width: number; height: number };
  hidden: boolean;
  /**
   * Selectable on the stage. Only structural containers qualify — the search bar, not
   * the icon inside it — so inspecting a screen walks its real sections rather than its
   * layout plumbing.
   */
  isSection: boolean;
  /** Set on nodes that resolve to an exported asset rather than drawn layers. */
  asset?: { kind: "icon" | "image"; inferred: string; exported: boolean };
  style?: LayerStyle;
};

export type TokenRow = { token: string; value: string; usage?: string };

export type LooseEnd = {
  kind: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  nodes: string[];
  ask: string;
};

/**
 * A hard limit a developer has to build to — a container that cannot grow, and the
 * content budget that falls out of it. Highlighted on the stage rather than buried in
 * prose, because it is the kind of thing that only surfaces when real content overflows.
 */
export type Constraint = {
  nodeId: string;
  label: string;
  /** Which dimension is fixed. Height is the common case; a single-line label is width. */
  axis?: "height" | "width";
  maxHeight: number;
  summary: string;
  /** How the character budget was derived, shown as a working so it can be checked. */
  derivation: {
    steps: { label: string; value: string }[];
    maxChars: number;
    drawnChars: number;
    recommend: number;
  };
  note: string;
};

export type Screen = {
  slug: string;
  name: string;
  feature: string;
  section: string;
  pending: boolean;
  summary: string;
  /**
   * Set when the screen is rebuilt as real markup rather than served as a PNG. The value
   * keys `LIVE_SCREENS`, and the Designs tab then measures the rendered DOM instead of
   * replaying the coordinates in `flatNodes`.
   */
  live?: string;
  /**
   * Content states of one surface — empty, default, populated. Screens sharing a `id`
   * are shown behind a toggle on one page rather than as separate entries, because they
   * are the same screen holding different amounts of data.
   */
  stateGroup?: { id: string; label: string; order: number };
  constraints?: Constraint[];
  figmaFileKey: string;
  figmaNodeId: string;
  image: string;
  extracted: boolean;
  extractedOn: string;
  dimensions: { width: number; height: number };
  /**
   * Where the frame sits inside its exported PNG. Figma bleeds drop shadows outside
   * the frame box on some nodes, so the image can be larger than the frame and the
   * layer overlay has to be inset to match.
   */
  imageFrame: { width: number; height: number; offsetX: number; offsetY: number };
  /**
   * The export's real pixel size, read off the PNG at build time. The overlay works in
   * percentages so it is indifferent to this, but Next picks which size to serve from
   * the width it is given — so a 2x or 3x export is used at full resolution the moment
   * it is dropped in, with no other change.
   */
  imagePixels: { width: number; height: number };
  imageScale: number;
  stats: {
    tokensMapped: number;
    unmappedValues: number;
    totalNodes: number;
    hiddenNodes: number;
    looseEnds: number;
  };
  tokensUsed: {
    colors: TokenRow[];
    spacing: TokenRow[];
    radius: TokenRow[];
    stroke: TokenRow[];
    text: TokenRow[];
    effects: TokenRow[];
  };
  unmapped: { value: string; count: number; where: string; note: string }[];
  looseEnds: LooseEnd[];
  code: { css: string; jsx: string; swiftui: string };
  flatNodes: LayerNode[];
};

/**
 * A PNG's real pixel size, read from its IHDR chunk.
 *
 * Supplied thumbnails do not share the screens' 393x852 ratio, and an <Image> takes its
 * aspect from the width and height it is given — so passing the screen's dimensions
 * would stretch them. Reading the file means a thumbnail of any shape just works.
 */
export function publicImageSize(publicPath: string): { width: number; height: number } | null {
  const file = join(process.cwd(), "public", publicPath.replace(/^\/demos\/loblaw-handoff/, "").replace(/^\//, ""));
  if (!existsSync(file)) return null;

  const header = Buffer.alloc(24);
  const fd = openSync(file, "r");
  try {
    readSync(fd, header, 0, 24, 0);
  } finally {
    closeSync(fd);
  }

  if (header.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

function read<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function getManifest(): Manifest {
  return read<Manifest>(join(DATA, "manifest.json"));
}

export function getFeature(slug: string): Feature {
  return read<Feature>(join(DATA, "features", `${slug}.json`));
}

export function getFeatures(): Feature[] {
  return getManifest()
    .features.map(getFeature)
    .sort((a, b) => a.order - b.order);
}

export function getScreen(slug: string): Screen {
  return read<Screen>(join(DATA, "generated", `${slug}.json`));
}

/** Whether a slug has a built screen file, so a caller can name one before it exists. */
export function hasScreen(slug: string): boolean {
  return existsSync(join(DATA, "generated", `${slug}.json`));
}

/**
 * A feature lists its states in order; a state without a built screen file is
 * dropped rather than throwing, so a spec can name a screen before it is extracted.
 */
/**
 * A screen and its sibling content states, in the order the file draws them.
 *
 * A screen with no `stateGroup` is its own group of one, so callers do not have to know
 * which screens have states and which do not.
 */
export function getScreenGroup(slug: string): Screen[] {
  const screen = getScreen(slug);
  if (!screen.stateGroup) return [screen];

  return everyGeneratedSlug()
    .map((s) => getScreen(s))
    .filter((s) => s.stateGroup?.id === screen.stateGroup!.id)
    .sort((a, b) => (a.stateGroup?.order ?? 0) - (b.stateGroup?.order ?? 0));
}

/**
 * Every screen that has been generated, whether or not a feature lists it.
 *
 * A feature names one screen per state it documents, and the other content states of that
 * screen hang off it — so they are real pages that nothing links to directly, and reading
 * the directory is the only way to find them.
 */
function everyGeneratedSlug(): string[] {
  return readdirSync(join(DATA, "generated"))
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length))
    .sort();
}

/**
 * Resolve a feature route. A feature with a held route answers to two slugs: its own,
 * which serves the whole page, and its `holdSlug`, which serves only the notice.
 */
export function getFeatureByRoute(slug: string): { feature: Feature; held: boolean } {
  const byHold = getFeatures().find((f) => f.inProgress?.holdSlug === slug);
  if (byHold) return { feature: byHold, held: true };
  return { feature: getFeature(slug), held: false };
}

/** Every route a feature page answers to, held routes included. */
export function getFeatureRoutes(): string[] {
  return getFeatures().flatMap((f) =>
    f.inProgress?.holdSlug ? [f.slug, f.inProgress.holdSlug] : [f.slug]
  );
}

export function getScreensForFeature(feature: Feature): Screen[] {
  return feature.states
    .filter((state) => existsSync(join(DATA, "generated", `${state.screen}.json`)))
    .map((state) => getScreen(state.screen));
}

/**
 * Every screen with a page. Features name one screen per documented state; the sibling
 * content states of those screens need pages too, so the directory is the source here.
 */
export function getAllScreenSlugs(): string[] {
  return everyGeneratedSlug();
}


/**
 * Coverage across the whole project, shown in the masthead. Two plain counts: how
 * many features are documented, and how many screens are specified behind them.
 */
export function getCoverage() {
  const features = getFeatures();

  return {
    features: features.length,
    specified: features.flatMap(getScreensForFeature).length,
  };
}

export const STATUS_LABEL: Record<Status, string> = {
  shipped: "Shipped",
  "design-complete": "Design complete",
  "in-review": "In review",
  "in-progress": "In progress",
  discovery: "Discovery",
  superseded: "Superseded",
};
