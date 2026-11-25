import { ICON, N, T, Glyph, RecentRow, type Recent } from "./parts";

/**
 * The side panel on its own, at the width it is actually drawn.
 *
 * `side-panel.tsx` documents the panel as it appears over a conversation — a 393 frame
 * with a backdrop and a scrim. This is the panel as a surface in its own right: the
 * 330-wide frames the file now draws beside each other, with nothing behind them.
 *
 * Kept as a second component rather than a flag on the first, because they are not the
 * same subject. One is a screen that happens to contain the panel; this is the panel.
 *
 * Two things changed in the panel between the two sets of frames, and both are visible
 * here rather than described:
 *   — Rows carry their overflow control again, and the `Tag + Text` wrapper with it, so
 *     they are the same row the Chat history page draws. They share `RecentRow`.
 *   — The list spaces its rows 4px apart again. The earlier frames had closed that gap.
 *
 * Every Figma node is a real element carrying `data-node-id`, so the spec viewer measures
 * the live DOM instead of replaying coordinates. Units are literal pixels at 1x; the
 * caller scales the frame with a transform.
 */

export type SidePanelPageSpec = {
  frame: string;
  frameName: string;
  header: string;
  lockup: string;
  mark: string;
  wordmark: string;
  content: string;
  nav: string;
  /** `hidden` reproduces a nav item the file switches off rather than deletes. */
  navItems: { id: string; iconId: string; labelId: string; icon: string; label: string; hidden?: boolean }[];
  stack: string;
  stackHeader: string;
  stackTitle: string;
  stackTitleText: string;
  /** Differs per state: the frame with a View all gives the stack 15px less. */
  stackHeight: number;
  /** What sits under the heading: rows, or the line shown when there are none. */
  recents:
    | { kind: "list"; id: string; rows: Recent[] }
    | { kind: "empty"; id: string; textId: string; text: string };
  /** The way through to the Chat history page. Only the full state draws one. */
  viewAll?: { id: string; textId: string; iconId: string };
  /** Drawn but switched off in all three frames. Carried so the layer is addressable. */
  footer?: { id: string; button: string };
};

export function SidePanelPageScreen({ spec }: { spec: SidePanelPageSpec }) {
  return (
    <N
      id={spec.frame}
      name={spec.frameName}
      className="proto relative flex flex-col items-center overflow-hidden"
      style={{
        width: 330,
        height: 852,
        paddingTop: 52,
        borderRadius: 40,
        background: "var(--fig-bg-canvas)",
        boxShadow: "0 4px 20px 0 rgba(113,117,142,0.25)",
      }}
    >
      <N
        id={spec.header}
        name="Header"
        className="flex w-full shrink-0 items-center"
        style={{ paddingTop: 24, paddingLeft: 24, paddingRight: 24 }}
      >
        <N id={spec.lockup} name="Frame 2147202988" className="flex shrink-0 items-center" style={{ gap: 8 }}>
          <N id={spec.mark} name="Symbol + Wordmark Stacked 1_WIP 1" className="shrink-0" style={{ width: 24, height: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ICON}/pc-chat-mark-24.svg`} alt="" width={24} height={24} className="block" />
          </N>
          <T
            id={spec.wordmark}
            name="Greeting text"
            className="shrink-0 whitespace-nowrap"
            style={{ font: "600 20px/23.75px var(--fig-font-display)", color: "var(--fig-text-primary)" }}
          >
            PC Chat
          </T>
        </N>
      </N>

      <N
        id={spec.content}
        name="Content"
        className="flex w-full min-h-0 flex-1 flex-col items-start"
        style={{ gap: 24, paddingTop: 24, paddingBottom: 24, paddingLeft: 8, paddingRight: 8 }}
      >
        <N id={spec.nav} name="Nav" className="flex w-full shrink-0 flex-col items-start">
          {spec.navItems.map((item) => (
            <NavItem key={item.id} {...item} />
          ))}
        </N>

        <N
          id={spec.stack}
          name="Vertical stack"
          className="flex w-full shrink-0 flex-col items-start"
          style={{ gap: 8, height: spec.stackHeight }}
        >
          <N
            id={spec.stackHeader}
            name="Header"
            className="flex w-full shrink-0 items-center overflow-hidden"
            style={{ paddingLeft: 8, paddingRight: 8 }}
          >
            <T
              id={spec.stackTitle}
              name="Item title"
              className="shrink-0 whitespace-nowrap"
              style={{ font: "var(--fig-text-md-semibold)", color: "var(--fig-text-primary)" }}
            >
              {spec.stackTitleText}
            </T>
          </N>

          {spec.recents.kind === "list" ? (
            <N id={spec.recents.id} name="List" className="flex w-full shrink-0 flex-col items-start" style={{ gap: 4 }}>
              {spec.recents.rows.map((row) =>
                // Half the rows carry an extra wrapper frame and half do not. Drawn as
                // the file draws it, so the layer tree on the site matches the one in Figma.
                row.wrapper ? (
                  <N key={row.item} id={row.wrapper} name="Frame" className="flex w-full shrink-0 flex-col items-start">
                    <RecentRow row={row} />
                  </N>
                ) : (
                  <RecentRow key={row.item} row={row} />
                )
              )}
            </N>
          ) : (
            <N
              id={spec.recents.id}
              name="Frame 2147231660"
              className="flex shrink-0 items-center"
              style={{ paddingLeft: 8, paddingRight: 8 }}
            >
              <T
                id={spec.recents.textId}
                name={spec.recents.text}
                className="shrink-0 whitespace-nowrap"
                style={{ font: "var(--fig-text-sm-regular)", color: "var(--fig-text-secondary-alt)" }}
              >
                {spec.recents.text}
              </T>
            </N>
          )}

          {spec.viewAll && (
            <N
              id={spec.viewAll.id}
              name="Text button"
              className="flex shrink-0 items-center"
              style={{ gap: 6, paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4 }}
            >
              <T
                id={spec.viewAll.textId}
                name="View all"
                className="shrink-0 whitespace-nowrap"
                style={{ font: "var(--fig-text-md-regular)", color: "var(--fig-text-primary)" }}
              >
                View all
              </T>
              <N id={spec.viewAll.iconId} name="Icon/iOS" type="INSTANCE" className="shrink-0" style={{ width: 16, height: 16 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ICON}/chevron-right.svg`} alt="" width={16} height={16} className="block" />
              </N>
            </N>
          )}
        </N>
      </N>
    </N>
  );
}

function NavItem({
  id,
  iconId,
  labelId,
  icon,
  label,
  hidden,
}: {
  id: string;
  iconId: string;
  labelId: string;
  icon: string;
  label: string;
  hidden?: boolean;
}) {
  if (hidden) return null;

  return (
    <N
      id={id}
      name="Nav item"
      className="flex w-full shrink-0 items-center"
      // 46 high on 12/8 padding. The hidden Files row is still the older 40 on 8/8,
      // which never shows — so the live rows are stated once, at the current size.
      style={{ gap: 8, paddingTop: 12, paddingBottom: 12, paddingLeft: 8, paddingRight: 8, borderRadius: 8 }}
    >
      <N
        id={iconId}
        name="Trailing icon"
        type="INSTANCE"
        className="flex shrink-0 flex-col items-center justify-center"
        style={{ width: 20, height: 20, color: "var(--fig-icon-default)" }}
      >
        <Glyph src={`${ICON}/${icon}.svg`} size={20} />
      </N>
      <T
        id={labelId}
        name="Message title"
        className="shrink-0 overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ font: "var(--fig-text-md-semibold)", color: "var(--fig-text-primary)" }}
      >
        {label}
      </T>
    </N>
  );
}
