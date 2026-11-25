"use client";

import type { StageGuides } from "./describe";

/**
 * The annotations drawn inside a selected node. One branch per layer kind — see the rule
 * table on `StageGuides` — so a text layer is told about its leading and a layout frame
 * about its padding, rather than both getting the same generic box.
 *
 * Positioned in Figma pixels multiplied by the stage scale, inside a wrapper already
 * placed over the node, so nothing here needs to know where on the stage that node is.
 */
export function StageGuideOverlay({ guides, scale }: { guides: StageGuides; scale: number }) {
  if (!guides) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {guides.kind === "layout" && <LayoutGuides guides={guides} scale={scale} />}
      {guides.kind === "text" && <TextGuides guides={guides} scale={scale} />}
      {guides.kind === "asset" && <AssetGuides guides={guides} scale={scale} />}
    </div>
  );
}

/* ── Auto layout ─────────────────────────────────────────────────────────── */

/** Padding hatched, gaps solid: reserved space reads differently from space between. */
function LayoutGuides({
  guides,
  scale,
}: {
  guides: Extract<StageGuides, { kind: "layout" }>;
  scale: number;
}) {
  const { padding, gaps, children } = guides;
  const s = (n: number) => n * scale;

  return (
    <>
      {children.map((child, i) => (
        <div
          key={`c${i}`}
          className="absolute border border-dashed border-[color:var(--measure)]/40"
          style={{ left: s(child.left), top: s(child.top), width: s(child.width), height: s(child.height) }}
        />
      ))}

      {(
        [
          ["t", { top: 0, left: 0, right: 0, height: s(padding.top) }, padding.top],
          ["b", { bottom: 0, left: 0, right: 0, height: s(padding.bottom) }, padding.bottom],
          ["l", { top: s(padding.top), bottom: s(padding.bottom), left: 0, width: s(padding.left) }, padding.left],
          ["r", { top: s(padding.top), bottom: s(padding.bottom), right: 0, width: s(padding.right) }, padding.right],
        ] as const
      ).map(([side, style, value]) =>
        value > 0 ? (
          <div key={side} className="absolute" style={style}>
            <div className="hatch size-full" />
            <Badge>{value}</Badge>
          </div>
        ) : null
      )}

      {gaps.map((gap, i) => (
        <div
          key={`g${i}`}
          className="absolute bg-[color:var(--measure)]/22"
          style={{ left: s(gap.left), top: s(gap.top), width: s(gap.width), height: s(gap.height) }}
        >
          <Badge>{gap.value}</Badge>
        </div>
      ))}
    </>
  );
}

/* ── Text ────────────────────────────────────────────────────────────────── */

/**
 * Leading is a text node's internal padding. It is drawn as bands top and bottom with
 * the baseline between them, and the cut is marked when the string does not fit — the
 * two facts about a text layer that a size readout cannot carry.
 */
function TextGuides({
  guides,
  scale,
}: {
  guides: Extract<StageGuides, { kind: "text" }>;
  scale: number;
}) {
  const s = (n: number) => n * scale;
  const { leadingTop, leadingBottom, baseline, clipAt, overflowBy } = guides;

  // A 15/22 line leaves about 2px of leading a side. Drawing a number on a band three
  // pixels tall makes the band unreadable, so the value is only written where it fits
  // and the band alone carries it otherwise — the inspector states it either way.
  const fits = (band: number) => s(band) >= 13;

  return (
    <>
      {leadingTop > 0.4 && (
        <div className="absolute inset-x-0 top-0" style={{ height: s(leadingTop) }}>
          <div className="hatch size-full" />
          {fits(leadingTop) && <Badge>{leadingTop}</Badge>}
        </div>
      )}
      {leadingBottom > 0.4 && (
        <div className="absolute inset-x-0 bottom-0" style={{ height: s(leadingBottom) }}>
          <div className="hatch size-full" />
          {fits(leadingBottom) && <Badge>{leadingBottom}</Badge>}
        </div>
      )}

      <div
        className="absolute inset-x-0 border-t border-dashed border-[color:var(--measure)]/55"
        style={{ top: s(baseline) }}
      />

      {clipAt !== undefined && (
        <div className="absolute inset-y-0" style={{ left: s(clipAt) }}>
          <div className="h-full w-px bg-[color:var(--flag)]" />
          <span className="literal absolute bottom-0 right-0 whitespace-nowrap rounded-[3px] bg-[color:var(--flag)] px-[3px] text-[9px] leading-[13px] text-white">
            cut · {overflowBy}px over
          </span>
        </div>
      )}
    </>
  );
}

/* ── Asset ───────────────────────────────────────────────────────────────── */

/** The air around the artwork — what a 44px button with a 16px glyph is really made of. */
function AssetGuides({
  guides,
  scale,
}: {
  guides: Extract<StageGuides, { kind: "asset" }>;
  scale: number;
}) {
  const s = (n: number) => n * scale;
  const { inset, drawn } = guides;

  return (
    <>
      <div className="hatch absolute inset-0" />
      <div
        className="absolute border border-[color:var(--measure)]/70 bg-[color:var(--surface)]"
        style={{ left: s(inset.left), top: s(inset.top), width: s(drawn.width), height: s(drawn.height) }}
      />
      {(
        [
          ["t", { top: 0, left: 0, right: 0, height: s(inset.top) }, inset.top],
          ["b", { bottom: 0, left: 0, right: 0, height: s(inset.bottom) }, inset.bottom],
          ["l", { top: s(inset.top), bottom: s(inset.bottom), left: 0, width: s(inset.left) }, inset.left],
          ["r", { top: s(inset.top), bottom: s(inset.bottom), right: 0, width: s(inset.right) }, inset.right],
        ] as const
      ).map(([side, style, value]) =>
        value > 0.4 ? (
          <div key={side} className="absolute" style={style}>
            <Badge>{value}</Badge>
          </div>
        ) : null
      )}
    </>
  );
}

/** The value, centred on the band it measures — on top of it, so a thin band still reads. */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="literal absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[3px] bg-[color:var(--measure)] px-[3px] text-[9px] leading-[13px] text-white">
      {children}
    </span>
  );
}
