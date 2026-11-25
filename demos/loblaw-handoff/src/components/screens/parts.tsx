import type { CSSProperties, ReactNode } from "react";

/**
 * The pieces every rebuilt screen is made of.
 *
 * Shared so the side panel and the Chat history page cannot drift apart: they draw the
 * same rows in different containers, and the glass treatment appears on four different
 * controls across both.
 */

export const ICON = "/demos/loblaw-handoff/icons/side-panel";

/* ── The one wrapper that makes a node addressable ───────────────────────── */

export type NodeProps = {
  id: string;
  name: string;
  type?: "FRAME" | "TEXT" | "INSTANCE" | "VECTOR";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

export function N({ id, name, type = "FRAME", className, style, children }: NodeProps) {
  return (
    <div data-node-id={id} data-name={name} data-type={type} className={className} style={style}>
      {children}
    </div>
  );
}

export function T({ id, name, className, style, children }: Omit<NodeProps, "type">) {
  return (
    <p data-node-id={id} data-name={name} data-type="TEXT" className={className} style={style}>
      {children}
    </p>
  );
}

/* ── Shared visual treatments ────────────────────────────────────────────── */

/** The glass treatment: white-40 fill, 2px white border, and the two stacked shadows
 *  the file calls `glass/button`. Backdrop blur is the GLASS effect at radius 8. */
export const GLASS: CSSProperties = {
  background: "var(--fig-bg-white-subtle)",
  border: "2px solid var(--fig-new-neutrals-white)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  boxShadow: "0 0 13px 0 rgba(0,0,0,0.05), 0 0 4px 0 rgba(0,0,0,0.08)",
};

/**
 * A single-colour icon, painted in the inherited `color`.
 *
 * Drawn as a mask rather than an `<img>`, because every icon in `public/icons` is
 * authored with `fill="currentColor"` and an `<img>` is a separate document — it never
 * sees the page's colour, so each one rendered black whatever the nav had set. Masking
 * the shape and filling it with `currentColor` is what those SVGs were written for, and
 * it keeps them as files rather than a second copy inlined in the markup.
 *
 * Only for icons that are one colour. Anything multi-colour — the composer, the status
 * bar, the brand mark — stays an `<img>` at its own call site.
 */
export function Glyph({ src, size }: { src: string; size: number }) {
  const mask = `url("${src}") center / contain no-repeat`;
  return (
    <span
      aria-hidden
      className="block shrink-0"
      style={{ width: size, height: size, backgroundColor: "currentColor", mask, WebkitMask: mask }}
    />
  );
}

/* ── Rows ────────────────────────────────────────────────────────────────── */

export type MetaPart = {
  id: string;
  /** Empty on hidden parts: Figma returns no copy for a hidden node, and inventing it
   *  would launder a guess as extracted fact. */
  text: string;
  hidden?: boolean;
};

/**
 * A row on the Chat history page: title, a timestamp, and an overflow control.
 *
 * The timestamp comes in two shapes and the file uses both on the same screen. Most
 * rows carry a bare text node; a few carry a `Metadata` frame holding the timestamp, a
 * bullet and a memory count — with the bullet and the count switched off. Reproduced
 * rather than normalised, because which shape a row has is the only trace left of where
 * the memory count used to be.
 */
export type Recent = {
  /** Some rows carry an extra unnamed wrapper in the file and some do not. Reproduced,
   *  because a developer reading the layer tree will otherwise look for one. */
  wrapper?: string;
  item: string;
  tagText: string;
  text: string;
  titleId: string;
  title: string;
  /** The `Metadata` frame, on the rows that have one. */
  metaId?: string;
  meta?: MetaPart[];
  /** The bare timestamp, on the rows that do not. */
  stampId?: string;
  stamp?: string;
  button: string;
};

/**
 * A row in the side panel. The panel's rows lost their overflow control and their
 * `Tag + Text` wrapper, so they are a different shape from the page's — not a variant of
 * one component but two, which is what the file draws.
 */
export type PanelRecent = {
  item: string;
  text: string;
  titleId: string;
  title: string;
  metaId: string;
  meta: MetaPart[];
};

function Metadata({ id, parts }: { id: string; parts: MetaPart[] }) {
  return (
    <N id={id} name="Metadata" className="flex w-full shrink-0 items-center" style={{ gap: 8 }}>
      {parts.map((part) =>
        part.hidden ? null : (
          <T
            key={part.id}
            id={part.id}
            name="Message timestamp"
            className="shrink-0 whitespace-nowrap"
            style={{ font: "var(--fig-text-sm-regular)", color: "var(--fig-text-secondary)" }}
          >
            {part.text}
          </T>
        )
      )}
    </N>
  );
}

function Title({ id, children }: { id: string; children: ReactNode }) {
  return (
    <T
      id={id}
      name="Message title"
      className="w-full shrink-0 overflow-hidden text-ellipsis whitespace-nowrap"
      style={{ font: "var(--fig-text-md-regular)", color: "var(--fig-text-primary)" }}
    >
      {children}
    </T>
  );
}

export function RecentRow({ row }: { row: Recent }) {
  return (
    <N
      id={row.item}
      name="List item"
      className="flex w-full shrink-0 items-center"
      style={{ gap: 16, padding: 8, borderRadius: 16, minHeight: 40 }}
    >
      <N id={row.tagText} name="Tag + Text" className="flex min-w-0 flex-1 flex-col items-start">
        <N id={row.text} name="Text" className="flex w-full shrink-0 flex-col items-start" style={{ gap: 2 }}>
          <Title id={row.titleId}>{row.title}</Title>
          {row.metaId && row.meta ? (
            <Metadata id={row.metaId} parts={row.meta} />
          ) : (
            <T
              id={row.stampId!}
              name="Message timestamp"
              className="shrink-0 whitespace-nowrap"
              style={{ font: "var(--fig-text-sm-regular)", color: "var(--fig-text-secondary)" }}
            >
              {row.stamp}
            </T>
          )}
        </N>
      </N>

      <N
        id={row.button}
        name="Button"
        type="INSTANCE"
        className="flex shrink-0 items-center justify-center overflow-hidden"
        style={{ width: 44, height: 44, padding: 10, borderRadius: 9999 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ICON}/overflow-more.svg`} alt="" width={16} height={16} className="block" />
      </N>
    </N>
  );
}

export function PanelRow({ row }: { row: PanelRecent }) {
  return (
    <N
      id={row.item}
      name="List item"
      className="flex w-full shrink-0 items-center"
      style={{ padding: 8, borderRadius: 16, minHeight: 40 }}
    >
      <N id={row.text} name="Text" className="flex min-w-0 flex-1 flex-col items-start" style={{ gap: 2 }}>
        <Title id={row.titleId}>{row.title}</Title>
        <Metadata id={row.metaId} parts={row.meta} />
      </N>
    </N>
  );
}
