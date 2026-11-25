#!/usr/bin/env node
/**
 * Turns the raw Figma metadata saved in `data/raw/<slug>.xml` into the layer data
 * the Designs tab renders: a flat list of nodes carrying bounds that are absolute
 * within the screen frame, so each one can be drawn as a hit box over the PNG.
 *
 * Figma reports a child's x/y relative to its parent, so the walk accumulates the
 * offset on the way down. The root frame is pinned to (0, 0) — its own x/y is a
 * position on the Figma page and means nothing once the frame is exported alone.
 *
 * Run: npm run build:screens
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
  openSync,
  readSync,
  closeSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = join(root, "data", "raw");
const specDir = join(root, "data", "screens");
const tokenDir = join(root, "data", "tokens");
const styleDir = join(root, "data", "styles");
const outDir = join(root, "data", "generated");

const TOKEN_GROUPS = ["colors", "text", "spacing", "radius", "stroke", "effects"];

/**
 * A screen may name a shared `tokenSet` instead of restating the whole ramp. Any
 * group it also declares inline is appended, so a screen can add the handful of
 * tokens only it uses without repeating the two dozen every frame shares.
 */
function resolveTokens(spec) {
  const base = spec.tokenSet
    ? JSON.parse(readFileSync(join(tokenDir, `${spec.tokenSet}.json`), "utf8"))
    : {};

  const merged = {};
  for (const group of TOKEN_GROUPS) {
    merged[group] = [...(base[group] ?? []), ...(spec.tokensUsed?.[group] ?? [])];
  }

  // Tokens defined in the library that resolve to nothing are reported as unmapped
  // rather than listed as if they carried a value.
  const emptyTokens = (base.empty ?? []).map((t) => ({
    value: "(empty)",
    count: 1,
    where: t.token,
    note: t.note,
  }));

  return { tokensUsed: merged, emptyTokens };
}

/** One `<tag ... />` or `<tag ...>` opening, plus the closings, in document order. */
const TAG = /<(\/)?([a-z-]+)([^>]*?)(\/)?>/g;
const ATTR = /([a-zA-Z_-]+)="([^"]*)"/g;

/**
 * Layer names arrive XML-escaped — a name like `You're 8 weeks pregnant` comes
 * through as `You&#39;re …`. Decoded here rather than in the viewer so the data is
 * already what a reader expects.
 */
function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // Ampersand last, so a doubly-escaped entity does not decode twice.
    .replace(/&amp;/g, "&");
}

function parseAttrs(source) {
  const out = {};
  for (const [, key, value] of source.matchAll(ATTR)) out[key] = decodeEntities(value);
  return out;
}

/**
 * Walks the XML with an explicit stack rather than building a tree — the Designs
 * tab wants a flat list anyway, and depth/parentId carry the hierarchy.
 */
function parseNodes(xml) {
  const nodes = [];
  const stack = [];

  for (const match of xml.matchAll(TAG)) {
    const [, closing, tag, attrSource, selfClosing] = match;

    if (closing) {
      stack.pop();
      continue;
    }

    const attrs = parseAttrs(attrSource);
    const parent = stack[stack.length - 1];
    // The root frame sits at its page coordinates; everything below is parent-relative.
    const originX = parent ? parent.absX : 0;
    const originY = parent ? parent.absY : 0;
    const x = parent ? Number(attrs.x ?? 0) : 0;
    const y = parent ? Number(attrs.y ?? 0) : 0;

    const node = {
      id: attrs.id,
      name: attrs.name ?? "(unnamed)",
      type: tag.toUpperCase(),
      parentId: parent ? parent.id : null,
      depth: stack.length,
      absX: originX + x,
      absY: originY + y,
      bounds: {
        x: originX + x,
        y: originY + y,
        width: Number(attrs.width ?? 0),
        height: Number(attrs.height ?? 0),
      },
      hidden: attrs.hidden === "true",
    };

    nodes.push(node);
    if (!selfClosing) stack.push(node);
  }

  // absX/absY were scaffolding for the walk; bounds carries the result.
  return nodes.map(({ absX: _x, absY: _y, ...node }) => node);
}

/**
 * Nodes that resolve to an exported asset rather than drawn layers. The stage
 * annotates these, because they are what a developer has to obtain from Figma
 * rather than build — and the one thing this pipeline cannot hand them.
 */
const ICON_NAME = /\b(icon|symbol|glyph|arrow|caret|chevron|logo|mark|wordmark|magnifying|dots|gear|cap|wifi)\b/i;
const IMAGE_NAME = /\b(image|photo|img|avatar|thumbnail|picture|illustration)\b/i;
const ICON_TYPE = new Set(["VECTOR", "BOOLEAN-OPERATION", "STAR", "POLYGON"]);
const CONTAINER_TYPES = new Set(["FRAME", "INSTANCE", "SECTION", "COMPONENT", "GROUP"]);

/** Auto-generated Figma names — "Frame 2147231642" names nothing. */
const GENERIC_NAME = /^(frame|group|rectangle|component|ellipse|vector)[\s\d]*$/i;

/**
 * Names that are always layout plumbing rather than a part of the design. A reader
 * clicking through a screen wants the row, not the box inside the box inside the row.
 */
const WRAPPER_NAMES = new Set([
  "text",
  "tag",
  "tag + text",
  "metadata",
  "copy container",
  "content container",
  "container",
  "right",
  "left",
  "top",
  "wrapper",
]);

function classifyAsset(node) {
  const isImage = IMAGE_NAME.test(node.name);
  const isIcon = !isImage && (ICON_NAME.test(node.name) || ICON_TYPE.has(node.type));
  if (!isIcon && !isImage) return undefined;

  // "Back button" -> "back"; "Symbol + Wordmark Stacked 1_WIP 1" -> "symbol".
  const inferred =
    node.name
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w && !["icon", "image", "button", "container", "the", "a"].includes(w))[0] ??
    node.name.toLowerCase();

  return {
    kind: isImage ? "image" : "icon",
    inferred,
    // Nothing in this pipeline exports asset binaries, so this is always false today.
    // The inspector says so rather than implying an asset is available.
    exported: false,
  };
}

/**
 * Reads a PNG's real pixel size straight out of its IHDR chunk — width and height are
 * two big-endian 32-bit ints at byte 16 and 20.
 *
 * The overlay is positioned in percentages of the frame, so it does not care how many
 * pixels the export has. The <Image> does: Next picks which size to serve from the
 * width it is given, so declaring the frame's 393 would throw away a 2x or 3x export.
 * Reading the file means dropping in a higher-resolution PNG is the whole change.
 */
function readPngSize(path) {
  const header = Buffer.alloc(24);
  const fd = openSync(path, "r");
  try {
    readSync(fd, header, 0, 24, 0);
  } finally {
    closeSync(fd);
  }

  if (header.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

function build() {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const slugs = readdirSync(rawDir)
    .filter((f) => f.endsWith(".xml"))
    .map((f) => f.replace(/\.xml$/, ""));

  const summary = [];

  for (const slug of slugs) {
    const specPath = join(specDir, `${slug}.json`);
    if (!existsSync(specPath)) {
      throw new Error(
        `data/raw/${slug}.xml has no matching spec at data/screens/${slug}.json — ` +
          `every extracted frame needs an authored spec beside it.`
      );
    }

    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    const rawNodes = parseNodes(readFileSync(join(rawDir, `${slug}.xml`), "utf8"));

    if (!rawNodes.length) throw new Error(`No nodes parsed out of data/raw/${slug}.xml`);

    // Styles are authored per screen where the design context has been read; a screen
    // without a styles file still renders, with the inspector showing geometry only.
    const stylePath = join(styleDir, `${slug}.json`);
    const styles = existsSync(stylePath) ? JSON.parse(readFileSync(stylePath, "utf8")) : {};

    /**
     * Only the structural containers are selectable on the stage — the search bar
     * rather than the icon inside it. A node qualifies as a section when it is a
     * container that actually holds something, is not an exported asset, and sits
     * within `sectionDepth` of the frame. Below that the tree turns into wrappers
     * ("Tag + Text", "Metadata") that are layout plumbing, not parts of the design.
     */
    const children = rawNodes.reduce((acc, n) => {
      if (n.parentId) (acc[n.parentId] ??= []).push(n);
      return acc;
    }, /** @type {Record<string, typeof rawNodes>} */ ({}));

    const sectionDepth = spec.sectionDepth ?? 4;

    const flatNodes = rawNodes.map((node) => {
      const asset = classifyAsset(node);
      const style = styles[node.id];
      const kids = children[node.id] ?? [];

      // A wrapper holding exactly one other container adds nothing a reader can act
      // on — "Frame 2147231642" wrapping a "List item" is the same box twice.
      const isPassThrough = kids.length === 1 && CONTAINER_TYPES.has(kids[0].type);

      const isSection =
        CONTAINER_TYPES.has(node.type) &&
        kids.length > 0 &&
        !asset &&
        !node.hidden &&
        !isPassThrough &&
        !GENERIC_NAME.test(node.name) &&
        !WRAPPER_NAMES.has(node.name.trim().toLowerCase()) &&
        node.depth > 0 &&
        node.depth <= sectionDepth;

      return {
        ...node,
        isSection,
        ...(asset ? { asset } : {}),
        ...(style ? { style } : {}),
      };
    });

    const rootNode = flatNodes[0];
    const hiddenCount = flatNodes.filter((n) => n.hidden).length;
    const { tokensUsed, emptyTokens } = resolveTokens(spec);

    const dimensions = {
      width: rootNode.bounds.width,
      height: rootNode.bounds.height,
    };

    /**
     * Figma renders some frames with bleed around them — a drop shadow that falls
     * outside the frame box. The exported PNG is then larger than the frame, and the
     * hit boxes would sit offset against it. `imageFrame` records where the frame
     * origin actually is inside the PNG so the overlay can compensate.
     */
    const imageFrame = spec.imageFrame ?? {
      width: dimensions.width,
      height: dimensions.height,
      offsetX: 0,
      offsetY: 0,
    };

    // The export's real pixel size, so a 2x or 3x PNG is served at its full resolution.
    const pngPath = join(root, "public", spec.image.replace(/^\//, ""));
    const imagePixels = existsSync(pngPath) ? readPngSize(pngPath) : null;
    const scale = imagePixels ? +(imagePixels.width / imageFrame.width).toFixed(2) : 1;

    writeFileSync(
      join(outDir, `${slug}.json`),
      JSON.stringify(
        {
          ...spec,
          dimensions,
          imageFrame,
          imagePixels: imagePixels ?? { width: imageFrame.width, height: imageFrame.height },
          imageScale: scale,
          tokensUsed,
          unmapped: [...(spec.unmapped ?? []), ...emptyTokens],
          stats: {
            ...spec.stats,
            totalNodes: flatNodes.length,
            hiddenNodes: hiddenCount,
            assetNodes: flatNodes.filter((n) => n.asset).length,
            sectionNodes: flatNodes.filter((n) => n.isSection).length,
            styledNodes: flatNodes.filter((n) => n.style).length,
            looseEnds: (spec.looseEnds ?? []).length,
          },
          flatNodes,
        },
        null,
        2
      ) + "\n"
    );

    const styled = flatNodes.filter((n) => n.style).length;
    summary.push(
      `${slug}: ${flatNodes.length} nodes, ${flatNodes.filter((n) => n.isSection).length} sections, ` +
        `${scale}x export, ${styled ? `${styled} styled` : "no styles yet"}`
    );
  }

  console.log(`Wrote ${slugs.length} screen(s) to data/generated/`);
  for (const line of summary) console.log(`  ${line}`);
}

build();
