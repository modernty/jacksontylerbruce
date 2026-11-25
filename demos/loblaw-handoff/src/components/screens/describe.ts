import type { TokenRow } from "@/lib/content";

/**
 * What a selected node actually is, read off the browser rather than off a spec file.
 *
 * A rebuilt screen is laid out by the same engine a developer will ship on, so the
 * facts worth showing are the resolved ones: the font that won, the gap that applied,
 * whether a child filled or hugged. Each role reports only what belongs to it — a text
 * node has no padding worth stating, and a layout frame has no line height.
 */

export type StyleFact = { label: string; value: string; token?: string };
export type FactGroup = { title: string; facts: StyleFact[] };

export type NodeDetail = {
  /** Shown as the node's kind, in place of Figma's own layer type. */
  role: string;
  /** One line saying what this node is doing, for the reader who is not measuring. */
  note?: string;
  groups: FactGroup[];
};

/* ── Token lookup ────────────────────────────────────────────────────────── */

export type TokenIndex = {
  color: Map<string, string>;
  spacing: Map<string, string>;
  radius: Map<string, string>;
  stroke: Map<string, string>;
  text: { token: string; size: number; lineHeight: number; weight: number }[];
};

/** Build value → token name, so a resolved CSS value can name the token it came from. */
export function indexTokens(tokens: {
  colors: TokenRow[];
  spacing: TokenRow[];
  radius: TokenRow[];
  stroke: TokenRow[];
  text: TokenRow[];
}): TokenIndex {
  const byValue = (rows: TokenRow[], normalise: (v: string) => string) => {
    const map = new Map<string, string>();
    for (const row of rows) {
      const key = normalise(row.value);
      // First writer wins: the token set is ordered, and later aliases of the same
      // value are the ones worth not reporting.
      if (key && !map.has(key)) map.set(key, row.token);
    }
    return map;
  };

  return {
    color: byValue(tokens.colors, (v) => v.trim().toLowerCase()),
    spacing: byValue(tokens.spacing, (v) => `${parseFloat(v)}`),
    radius: byValue(tokens.radius, (v) => `${parseFloat(v)}`),
    stroke: byValue(tokens.stroke, (v) => `${parseFloat(v)}`),
    text: tokens.text.flatMap((row) => {
      // "SF Pro Text 15/22, weight 600"
      const m = /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?).*?weight\s*(\d+)/i.exec(row.value);
      return m
        ? [{ token: row.token, size: +m[1], lineHeight: +m[2], weight: +m[3] }]
        : [];
    }),
  };
}

/* ── Value helpers ───────────────────────────────────────────────────────── */

function hex(rgb: string): string {
  const m = /rgba?\(([^)]+)\)/.exec(rgb);
  if (!m) return rgb;
  const [r, g, b, a] = m[1].split(",").map((n) => parseFloat(n));
  const to = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  const base = `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
  return a !== undefined && a < 1 ? `${base} · ${Math.round(a * 100)}%` : base;
}

const px = (v: string) => `${Math.round(parseFloat(v) * 100) / 100}px`;
const num = (v: string) => parseFloat(v) || 0;

/** Figma writes padding as one value when all four agree, and T/R/B/L when they do not. */
function padding(s: CSSStyleDeclaration): string | null {
  const [t, r, b, l] = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(num);
  if (!t && !r && !b && !l) return null;
  if (t === r && r === b && b === l) return `${t}px`;
  if (t === b && l === r) return `${t}px ${r}px`;
  return `${t}px ${r}px ${b}px ${l}px`;
}

/**
 * Fixed, fill or hug — the three sizing modes Figma names, recovered from what the
 * browser resolved. A node is filling when it grows or stretches, fixed when the
 * component states a length, and hugging otherwise.
 */
function sizing(el: HTMLElement, s: CSSStyleDeclaration, axis: "width" | "height"): string {
  const inline = axis === "width" ? el.style.width : el.style.height;
  const parentRow = el.parentElement
    ? getComputedStyle(el.parentElement).flexDirection.startsWith("row")
    : true;
  const isMainAxis = axis === "width" ? parentRow : !parentRow;

  if (inline && inline.endsWith("px")) return "Fixed";
  if (isMainAxis && num(s.flexGrow) > 0) return "Fill";
  if (!isMainAxis && s.alignSelf === "stretch") return "Fill";
  if (inline === "100%" || el.classList.contains(axis === "width" ? "w-full" : "h-full")) return "Fill";
  return "Hug";
}

function shadowOf(s: CSSStyleDeclaration): string | null {
  const v = s.boxShadow;
  return !v || v === "none" ? null : v.replace(/rgba?\([^)]+\)/g, (m) => hex(m));
}

/* ── The describer ───────────────────────────────────────────────────────── */

export function describeNode(el: HTMLElement, tokens: TokenIndex): NodeDetail {
  const s = getComputedStyle(el);
  const kind = el.dataset.type ?? "FRAME";
  const img = el.querySelector("img");
  const childNodes = el.querySelectorAll(":scope [data-node-id]");
  const directChildren = Array.from(el.children).filter(
    (c): c is HTMLElement => c instanceof HTMLElement && c.dataset.nodeId !== undefined
  );

  if (kind === "TEXT") return describeText(el, s, tokens);
  if (img && childNodes.length === 0) return describeAsset(el, s, img, tokens);

  const flexChildren = directChildren.filter(
    (c) => getComputedStyle(c).display === "flex"
  );
  const isGroup = flexChildren.length >= 2;

  return describeLayout(el, s, tokens, {
    directChildren: directChildren.length,
    descendants: childNodes.length,
    flexChildren: flexChildren.length,
    isGroup,
  });
}

function describeText(
  el: HTMLElement,
  s: CSSStyleDeclaration,
  tokens: TokenIndex
): NodeDetail {
  const size = num(s.fontSize);
  const lh = num(s.lineHeight);
  const weight = num(s.fontWeight);
  const token = tokens.text.find(
    (t) => t.size === size && Math.abs(t.lineHeight - lh) < 0.6 && t.weight === weight
  );

  const text = (el.textContent ?? "").trim();
  const truncates = s.textOverflow === "ellipsis" && s.whiteSpace === "nowrap";
  const clipped = truncates && el.scrollWidth > el.clientWidth + 1;

  const type: StyleFact[] = [
    { label: "Family", value: resolvedFamily(s) },
    { label: "Size", value: px(s.fontSize) },
    { label: "Line height", value: lh ? px(s.lineHeight) : "normal" },
    { label: "Weight", value: `${weight}` },
  ];
  if (num(s.letterSpacing)) type.push({ label: "Letter spacing", value: px(s.letterSpacing) });
  if (token) type.unshift({ label: "Type token", value: `${size}/${lh} · ${weight}`, token: token.token });

  const colour = hex(s.color);
  const paint: StyleFact[] = [
    { label: "Colour", value: colour, token: tokens.color.get(colour.split(" ")[0].toLowerCase()) },
  ];
  if (s.textAlign !== "start" && s.textAlign !== "left") {
    paint.push({ label: "Align", value: s.textAlign });
  }

  const content: StyleFact[] = [
    { label: "Characters", value: `${text.length}` },
    { label: "Lines", value: lh ? `${Math.max(1, Math.round(el.clientHeight / lh))}` : "—" },
    {
      label: "Overflow",
      value: truncates ? (clipped ? "Truncated with an ellipsis" : "Ellipsis, not reached") : "Wraps",
    },
  ];

  return {
    role: "Text",
    note: clipped
      ? "This string does not fit the width it is given and is cut."
      : undefined,
    groups: [
      { title: "Type", facts: type },
      { title: "Paint", facts: paint },
      { title: "Content", facts: content },
    ],
  };
}

function describeAsset(
  el: HTMLElement,
  s: CSSStyleDeclaration,
  img: HTMLImageElement,
  tokens: TokenIndex
): NodeDetail {
  const src = img.getAttribute("src") ?? "";
  const facts: StyleFact[] = [
    { label: "Source", value: src.split("/").pop() ?? src },
    { label: "Drawn at", value: `${Math.round(img.clientWidth)}×${Math.round(img.clientHeight)}` },
  ];
  if (img.naturalWidth) {
    facts.push({ label: "Intrinsic", value: `${img.naturalWidth}×${img.naturalHeight}` });
  }
  facts.push({ label: "Format", value: src.endsWith(".svg") ? "SVG, exported from Figma" : "Bitmap" });

  // An icon in a tap target is a box with padding, and that padding is the target. Say it
  // here too, so the readout does not send the reader back to the stage to measure it.
  const pad = padding(s);
  if (pad) {
    const one = /^(\d+)px$/.exec(pad);
    facts.push({ label: "Inset", value: pad, token: one ? tokens.spacing.get(one[1]) : undefined });
  }

  return {
    role: "Asset",
    note: "Exported from the file rather than redrawn, so the glyph is the designer's.",
    groups: [{ title: "Asset", facts }, ...surfaceGroup(s, tokens)],
  };
}

function describeLayout(
  el: HTMLElement,
  s: CSSStyleDeclaration,
  tokens: TokenIndex,
  counts: { directChildren: number; descendants: number; flexChildren: number; isGroup: boolean }
): NodeDetail {
  const isFlex = s.display === "flex";
  const column = s.flexDirection.startsWith("column");

  const layout: StyleFact[] = [];

  if (isFlex) {
    layout.push({ label: "Direction", value: column ? "Vertical" : "Horizontal" });

    const gap = num(s.rowGap) || num(s.columnGap);
    layout.push({
      label: "Gap",
      value: gap ? `${gap}px` : "0",
      token: gap ? tokens.spacing.get(`${gap}`) : undefined,
    });

    const pad = padding(s);
    if (pad) {
      const one = /^(\d+)px$/.exec(pad);
      layout.push({
        label: "Padding",
        value: pad,
        token: one ? tokens.spacing.get(one[1]) : undefined,
      });
    }

    layout.push({ label: "Align", value: s.alignItems });
    if (s.justifyContent !== "normal" && s.justifyContent !== "flex-start") {
      layout.push({ label: "Distribute", value: s.justifyContent });
    }
  } else {
    layout.push({ label: "Layout", value: "None — children are positioned" });
  }

  layout.push({ label: "Width", value: sizing(el, s, "width") });
  layout.push({ label: "Height", value: sizing(el, s, "height") });
  if (num(s.minHeight)) layout.push({ label: "Min height", value: px(s.minHeight) });

  const contents: StyleFact[] = [
    { label: "Direct children", value: `${counts.directChildren}` },
    { label: "Nodes inside", value: `${counts.descendants}` },
  ];
  if (counts.isGroup) {
    contents.push({ label: "Layout frames held", value: `${counts.flexChildren}` });
    contents.push({
      label: "Stacked",
      value: column ? "Top to bottom" : "Left to right",
    });
  }
  if (s.overflow !== "visible") {
    contents.push({ label: "Overflow", value: s.overflow === "hidden" ? "Clipped" : s.overflow });
  }

  const role = counts.isGroup ? "Layout group" : isFlex ? "Auto layout" : "Frame";

  return {
    role,
    note: counts.isGroup
      ? `Holds ${counts.flexChildren} layout frames; its own size follows from theirs.`
      : undefined,
    groups: [
      { title: role === "Frame" ? "Frame" : "Auto layout", facts: layout },
      { title: "Contents", facts: contents },
      ...surfaceGroup(s, tokens),
    ],
  };
}

/** Fill, radius, border and shadow — reported only when the node actually paints. */
function surfaceGroup(s: CSSStyleDeclaration, tokens: TokenIndex): FactGroup[] {
  const facts: StyleFact[] = [];

  const bg = s.backgroundColor;
  const transparent = bg === "rgba(0, 0, 0, 0)" || bg === "transparent";
  if (!transparent) {
    const value = hex(bg);
    facts.push({ label: "Fill", value, token: tokens.color.get(value.split(" ")[0].toLowerCase()) });
  }
  if (s.backgroundImage !== "none") {
    facts.push({
      label: "Fill",
      value: s.backgroundImage.startsWith("url(\"data:image/svg")
        ? "Gradient (SVG, from the file)"
        : "Image",
    });
  }

  const radius = num(s.borderTopLeftRadius);
  if (radius) {
    facts.push({
      label: "Radius",
      value: radius >= 9999 ? "Full" : `${radius}px`,
      token: tokens.radius.get(`${radius}`),
    });
  }

  const borderWidth = num(s.borderTopWidth);
  if (borderWidth) {
    const colour = hex(s.borderTopColor);
    facts.push({
      label: "Border",
      value: `${borderWidth}px ${colour}`,
      token: tokens.stroke.get(`${borderWidth}`),
    });
  }

  const shadow = shadowOf(s);
  if (shadow) facts.push({ label: "Shadow", value: shadow });

  if (s.backdropFilter && s.backdropFilter !== "none") {
    facts.push({ label: "Backdrop", value: s.backdropFilter });
  }

  return facts.length ? [{ title: "Surface", facts }] : [];
}

/* ── Stage guides ────────────────────────────────────────────────────────── */

/**
 * What gets drawn inside a selected node, decided by what the node is.
 *
 * The rule table, one row per kind:
 *
 * | Kind          | Drawn inside the selection                                        |
 * |---------------|-------------------------------------------------------------------|
 * | Auto layout   | Padding bands, hatched; gap bands, solid. Both carry their value.  |
 * | Layout group  | The same, plus every child frame outlined so the stack reads.      |
 * | Text          | The half-leading above and below the glyphs — a text node's own    |
 * |               | internal padding — the baseline, and the cut when it truncates.    |
 * | Asset         | The inset between the box and the artwork drawn in it.             |
 * | Frame         | Nothing inside; the selection outline and its size already say it. |
 *
 * Everything is in Figma pixels. Computed style is unaffected by the stage's transform,
 * and measured rects are divided back through it.
 */
export type StageGuides =
  | {
      kind: "layout";
      direction: "row" | "column";
      padding: { top: number; right: number; bottom: number; left: number };
      gaps: { left: number; top: number; width: number; height: number; value: number }[];
      /** Child boxes, outlined only for a frame whose job is holding other frames. */
      children: { left: number; top: number; width: number; height: number }[];
    }
  | {
      kind: "text";
      fontSize: number;
      lineHeight: number;
      /** Space between the line box and the glyphs, which is where leading goes. */
      leadingTop: number;
      leadingBottom: number;
      /** Distance from the top of the box to the baseline. */
      baseline: number;
      /** Set when the string is cut: where the cut falls, and by how much it overruns. */
      clipAt?: number;
      overflowBy?: number;
    }
  | {
      kind: "asset";
      inset: { top: number; right: number; bottom: number; left: number };
      drawn: { width: number; height: number };
    }
  | null;

export function stageGuides(el: HTMLElement, scale: number): StageGuides {
  const s = getComputedStyle(el);
  const box = el.getBoundingClientRect();
  const w = box.width / scale;
  const h = box.height / scale;

  if (el.dataset.type === "TEXT") return textGuides(el, s, w, h);

  if (s.display === "flex") return flexGuides(el, s, box, w, h, scale);

  const img = el.querySelector("img");
  if (img) return assetGuides(img, box, scale);

  return null;
}

/* ── Text ────────────────────────────────────────────────────────────────── */

/**
 * A text node's internal spacing is its leading: the line box is `line-height` tall, the
 * glyphs occupy the font's own em box, and the difference is split above and below. That
 * split is the thing a developer gets wrong when they set padding to make text sit right,
 * so it is worth drawing rather than describing.
 *
 * Measured from the font actually in use via canvas metrics, not assumed from a ratio.
 */
function textGuides(
  el: HTMLElement,
  s: CSSStyleDeclaration,
  w: number,
  h: number
): StageGuides {
  const fontSize = num(s.fontSize);
  const lineHeight = num(s.lineHeight) || fontSize * 1.2;

  const metrics = fontMetrics(`${s.fontStyle} ${s.fontWeight} ${s.fontSize}/${s.lineHeight} ${s.fontFamily}`);
  const emTop = metrics?.ascent ?? fontSize * 0.8;
  const emBottom = metrics?.descent ?? fontSize * 0.2;

  const leading = r2((lineHeight - (emTop + emBottom)) / 2);
  const leadingTop = Math.max(0, leading);
  const leadingBottom = Math.max(0, leading);

  const clipped =
    s.textOverflow === "ellipsis" && s.whiteSpace === "nowrap" && el.scrollWidth > el.clientWidth + 1;

  return {
    kind: "text",
    fontSize,
    lineHeight,
    leadingTop,
    leadingBottom,
    baseline: r2(leadingTop + emTop),
    clipAt: clipped ? r2(w) : undefined,
    overflowBy: clipped ? r2(el.scrollWidth - el.clientWidth) : undefined,
  };
}

/**
 * Which family in the stack the browser actually used. Naming the first entry would be a
 * guess — on a machine without SF Pro Text the screen is drawn in something else, and a
 * spec that reports the requested font as though it shipped is worse than no report.
 */
function resolvedFamily(s: CSSStyleDeclaration): string {
  const stack = s.fontFamily.split(",").map((f) => f.trim().replace(/["']/g, ""));
  const available = stack.find((family) => {
    if (/^(system-ui|-apple-system|BlinkMacSystemFont|sans-serif|serif|monospace)$/i.test(family)) {
      return false;
    }
    try {
      return document.fonts.check(`${s.fontSize} "${family}"`);
    } catch {
      return false;
    }
  });
  return available ? available : `${stack[0]} (system)`;
}

/** Canvas is the only way to ask the browser what the resolved font's em box is. */
let ctx: CanvasRenderingContext2D | null | undefined;
function fontMetrics(font: string): { ascent: number; descent: number } | null {
  if (ctx === undefined) ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  try {
    ctx.font = font;
    const m = ctx.measureText("Hxy");
    if (!m.fontBoundingBoxAscent && !m.fontBoundingBoxDescent) return null;
    return { ascent: m.fontBoundingBoxAscent, descent: m.fontBoundingBoxDescent };
  } catch {
    return null;
  }
}

/* ── Flex ────────────────────────────────────────────────────────────────── */

function flexGuides(
  el: HTMLElement,
  s: CSSStyleDeclaration,
  box: DOMRect,
  w: number,
  h: number,
  scale: number
): StageGuides {
  const column = s.flexDirection.startsWith("column");
  const padding = {
    top: num(s.paddingTop),
    right: num(s.paddingRight),
    bottom: num(s.paddingBottom),
    left: num(s.paddingLeft),
  };

  const kids = Array.from(el.children)
    .filter((c): c is HTMLElement => c instanceof HTMLElement && c.dataset.nodeId !== undefined)
    .map((c) => c.getBoundingClientRect())
    .sort((a, b) => (column ? a.top - b.top : a.left - b.left));

  const gaps: Extract<StageGuides, { kind: "layout" }>["gaps"] = [];
  for (let i = 1; i < kids.length; i++) {
    const a = kids[i - 1];
    const b = kids[i];
    const value = column ? (b.top - a.bottom) / scale : (b.left - a.right) / scale;
    if (value <= 0.4) continue;

    gaps.push(
      column
        ? {
            left: padding.left,
            top: r2((a.bottom - box.top) / scale),
            width: r2(w - padding.left - padding.right),
            height: r2(value),
            value: r2(value),
          }
        : {
            left: r2((a.right - box.left) / scale),
            top: padding.top,
            width: r2(value),
            height: r2(h - padding.top - padding.bottom),
            value: r2(value),
          }
    );
  }

  // Outlines only earn their place when the frame's job is arranging other frames.
  const arrangesFrames =
    kids.length >= 2 &&
    Array.from(el.children).filter(
      (c) => c instanceof HTMLElement && getComputedStyle(c).display === "flex"
    ).length >= 2;

  const children = arrangesFrames
    ? kids.map((k) => ({
        left: r2((k.left - box.left) / scale),
        top: r2((k.top - box.top) / scale),
        width: r2(k.width / scale),
        height: r2(k.height / scale),
      }))
    : [];

  const empty =
    !padding.top && !padding.right && !padding.bottom && !padding.left &&
    gaps.length === 0 && children.length === 0;

  return empty ? null : { kind: "layout", direction: column ? "column" : "row", padding, gaps, children };
}

/* ── Asset ───────────────────────────────────────────────────────────────── */

/** The air between a box and the artwork inside it — an icon button's real padding. */
function assetGuides(img: HTMLImageElement, box: DOMRect, scale: number): StageGuides {
  const art = img.getBoundingClientRect();
  const inset = {
    top: r2((art.top - box.top) / scale),
    right: r2((box.right - art.right) / scale),
    bottom: r2((box.bottom - art.bottom) / scale),
    left: r2((art.left - box.left) / scale),
  };
  const any = inset.top > 0.4 || inset.right > 0.4 || inset.bottom > 0.4 || inset.left > 0.4;
  return any
    ? { kind: "asset", inset, drawn: { width: r2(art.width / scale), height: r2(art.height / scale) } }
    : null;
}

function r2(n: number) {
  return Math.round(n * 100) / 100;
}
