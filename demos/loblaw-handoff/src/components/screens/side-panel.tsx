import { ICON, N, T, Glyph, GLASS, PanelRow, type PanelRecent } from "./parts";

/**
 * The side panel over a conversation, rebuilt from Figma rather than exported as a PNG.
 *
 * Three frames in the file draw the same surface holding different amounts of data —
 * nothing, four chats, eight with a way through — so they are one component here, driven
 * by a spec that carries that frame's node ids and its content.
 *
 * Every Figma node is a real element carrying `data-node-id`, so the spec viewer measures
 * the live DOM instead of replaying coordinates from the metadata dump. Layout mirrors
 * Figma's auto-layout — flex, gaps and padding rather than absolute offsets.
 *
 * Units are literal pixels at 1x. The caller scales the whole frame with a transform.
 */

export type SidePanelSpec = {
  frame: string;
  frameName: string;
  backdrop: {
    root: string;
    topNav: string;
    menuButton: string;
    right: string;
    closeButton: string;
    content: string;
    mark: string;
    greeting: string;
    footer: string;
    composer: string;
    /** The dim the panel sits on, drawn inside the conversation layer. */
    scrim: string;
    /** A second dim some frames add inside the conversation layer and others do not. */
    innerScrim?: string;
  };
  /** A dim drawn at the top level rather than inside the conversation layer. */
  scrim?: string;
  panel: {
    root: string;
    header: string;
    lockup: string;
    mark: string;
    wordmark: string;
    content: string;
    nav: string;
    navItems: { id: string; iconId: string; labelId: string; icon: string; label: string }[];
    stack: string;
    stackHeader: string;
    stackTitle: string;
  };
  /** What sits under the Recents heading: rows, or the line shown when there are none. */
  recents:
    | { kind: "list"; id: string; rows: PanelRecent[] }
    | { kind: "empty"; id: string; textId: string; text: string };
  /** Only drawn where the file draws it — see the screen's loose ends. */
  viewAll?: { id: string; textId: string; iconId: string };
  statusBar: string;
  /**
   * Whether the status bar is painted after the panel. Two of the three frames put the
   * panel on top and lose the clock behind it; one does the opposite. Reproduced per
   * frame rather than reconciled, because the disagreement is the finding.
   */
  statusBarOnTop: boolean;
};

/* ── The screen ──────────────────────────────────────────────────────────── */

export function SidePanelScreen({ spec }: { spec: SidePanelSpec }) {
  const statusBar = (
    <N
      id={spec.statusBar}
      name="Background=true"
      type="INSTANCE"
      className="absolute left-0 top-0"
      style={{ width: 393, height: 54 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ICON}/status-bar.svg`} alt="" width={393} height={54} className="block" />
    </N>
  );

  return (
    <N
      id={spec.frame}
      name={spec.frameName}
      className="proto relative overflow-hidden bg-white"
      style={{ width: 393, height: 852, borderRadius: 48 }}
    >
      <ChatHistoryBackdrop spec={spec} />

      {spec.scrim && (
        <N
          id={spec.scrim}
          name="Scrim"
          className="absolute left-0 top-0"
          style={{ width: 393, height: 852, background: "var(--fig-bg-scrim)" }}
        />
      )}

      {/* Paint order is the frame's own — see `statusBarOnTop`. */}
      {!spec.statusBarOnTop && statusBar}
      <SidePanel spec={spec} />
      {spec.statusBarOnTop && statusBar}
    </N>
  );
}

/* ── The conversation behind the panel ───────────────────────────────────── */

/**
 * Figma's own radial gradient, kept as the SVG the file emits rather than re-expressed as
 * a CSS radial-gradient — the transform matrix carries a rotation and a non-uniform scale
 * that CSS cannot state without rounding it into something else.
 */
const BACKDROP_GRADIENT =
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 393 852' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%25' width='100%25' fill='url(%23g)'/><defs><radialGradient id='g' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(3.6605e-16 -41.528 68.995 1.6479e-7 204.32 871.5)'><stop stop-color='rgb(255,222,229)' offset='0'/><stop stop-color='rgb(245,246,250)' offset='0.6'/></radialGradient></defs></svg>\")";

function ChatHistoryBackdrop({ spec }: { spec: SidePanelSpec }) {
  const b = spec.backdrop;

  return (
    <N
      id={b.root}
      name="Chat history"
      className="absolute left-0 top-0 overflow-hidden"
      style={{
        width: 393,
        height: 852,
        borderRadius: 48,
        backgroundImage: BACKDROP_GRADIENT,
        backgroundSize: "100% 100%",
      }}
    >
      <N
        id={b.topNav}
        name="Top nav"
        className="absolute left-0 right-0 flex items-center justify-between"
        style={{ top: 54, height: 68, paddingLeft: 24, paddingRight: 24 }}
      >
        <N
          id={b.menuButton}
          name="_Button"
          type="INSTANCE"
          className="flex shrink-0 items-center justify-center overflow-hidden"
          style={{ ...GLASS, width: 48, height: 48, borderRadius: 48, padding: 4 }}
        >
          <Glyph src={`${ICON}/nav-menu.svg`} size={24} />
        </N>

        <N id={b.right} name="Right" className="flex shrink-0 items-center">
          <N
            id={b.closeButton}
            name="_Button"
            type="INSTANCE"
            className="flex shrink-0 items-center justify-center overflow-hidden"
            style={{ ...GLASS, width: 48, height: 48, borderRadius: 48, padding: 4 }}
          >
            <Glyph src={`${ICON}/nav-close.svg`} size={24} />
          </N>
        </N>
      </N>

      <N
        id={b.content}
        name="Content"
        className="absolute left-0 right-0 flex flex-col items-start"
        style={{ top: 122, height: 604, gap: 24, paddingTop: 24, paddingBottom: 16, paddingLeft: 16, paddingRight: 16 }}
      >
        <N id={b.mark} name="Symbol + Wordmark Stacked 1_WIP 1" type="INSTANCE" className="shrink-0" style={{ width: 40, height: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ICON}/pc-chat-mark-40.svg`} alt="" width={40} height={40} className="block" />
        </N>
        <T
          id={b.greeting}
          name="Greeting text"
          className="w-full shrink-0"
          style={{ font: "600 28px/38px var(--fig-font-display)", color: "var(--fig-text-primary)" }}
        >
          Hi Jane,
          <br />
          What&rsquo;s on your mind?
        </T>
      </N>

      <N
        id={b.footer}
        name="Footer"
        className="absolute left-0 right-0 flex flex-col items-start justify-end"
        style={{ top: 726, paddingBottom: 32, paddingLeft: 16, paddingRight: 16 }}
      >
        <N id={b.composer} name="_Composer" type="INSTANCE" className="w-full shrink-0" style={{ height: 94 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ICON}/composer.svg`} alt="" width={361} height={94} className="block w-full" />
        </N>
      </N>

      <N
        id={b.scrim}
        name="Frame 2147231635"
        className="absolute left-0 top-0"
        style={{ width: 393, height: 852, background: "var(--fig-bg-scrim)" }}
      />

      {b.innerScrim && (
        <N
          id={b.innerScrim}
          name="Scrim"
          className="absolute left-0 top-0"
          style={{ width: 393, height: 852, background: "var(--fig-bg-scrim)" }}
        />
      )}
    </N>
  );
}

/* ── The panel ───────────────────────────────────────────────────────────── */

function SidePanel({ spec }: { spec: SidePanelSpec }) {
  const p = spec.panel;

  return (
    <N
      id={p.root}
      name="Side Panel, filled recents"
      className="absolute left-0 top-0 flex flex-col items-center overflow-hidden"
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
        id={p.header}
        name="Header"
        className="flex w-full shrink-0 items-center"
        style={{ paddingTop: 24, paddingLeft: 24, paddingRight: 24 }}
      >
        <N id={p.lockup} name="Frame 2147202988" className="flex shrink-0 items-center" style={{ gap: 8 }}>
          <N id={p.mark} name="Symbol + Wordmark Stacked 1_WIP 1" className="shrink-0" style={{ width: 24, height: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ICON}/pc-chat-mark-24.svg`} alt="" width={24} height={24} className="block" />
          </N>
          <T
            id={p.wordmark}
            name="Greeting text"
            className="shrink-0 whitespace-nowrap"
            style={{ font: "600 20px/23.75px var(--fig-font-display)", color: "var(--fig-text-primary)" }}
          >
            PC Chat
          </T>
        </N>
      </N>

      <N
        id={p.content}
        name="Content"
        className="flex w-full min-h-0 flex-1 flex-col items-start"
        style={{ gap: 32, paddingTop: 24, paddingBottom: 24, paddingLeft: 8, paddingRight: 8 }}
      >
        <N id={p.nav} name="Nav" className="flex w-full shrink-0 flex-col items-start">
          {p.navItems.map((item) => (
            <NavItem key={item.id} {...item} />
          ))}
        </N>

        <N
          id={p.stack}
          name="Vertical stack"
          className="flex w-full shrink-0 flex-col items-start"
          style={{ gap: 8, height: 567 }}
        >
          <N
            id={p.stackHeader}
            name="Header"
            className="flex w-full shrink-0 items-center overflow-hidden"
            style={{ paddingLeft: 8, paddingRight: 8 }}
          >
            <T
              id={p.stackTitle}
              name="Item title"
              className="shrink-0 whitespace-nowrap"
              style={{ font: "var(--fig-text-md-semibold)", color: "var(--fig-text-primary)" }}
            >
              Recents
            </T>
          </N>

          {spec.recents.kind === "list" ? (
            // Rows sit flush now — the file closed the 4px gap it used to carry.
            <N id={spec.recents.id} name="List" className="flex w-full shrink-0 flex-col items-start">
              {spec.recents.rows.map((row) => (
                <PanelRow key={row.item} row={row} />
              ))}
            </N>
          ) : (
            <N
              id={spec.recents.id}
              name="Frame 2147231660"
              className="flex shrink-0 items-center justify-center"
              style={{ paddingLeft: 8, paddingRight: 8 }}
            >
              <T
                id={spec.recents.textId}
                name="Recent chats will appear here."
                className="shrink-0 whitespace-nowrap"
                style={{
                  font: "var(--fig-text-sm-regular)",
                  // text/secondary resolves to #3d456b on this node and #565c79 on the
                  // row timestamps. Both are kept named rather than reconciled — it is a
                  // logged open question, not something to quietly pick a winner for.
                  color: "var(--fig-text-secondary-alt)",
                }}
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
  id, iconId, labelId, icon, label,
}: { id: string; iconId: string; labelId: string; icon: string; label: string }) {
  return (
    <N
      id={id}
      name="Nav item"
      className="flex w-full shrink-0 items-center"
      style={{ gap: 8, padding: 8, borderRadius: 8 }}
    >
      <N
        id={iconId}
        name="_Icon"
        type="INSTANCE"
        className="flex shrink-0 flex-col items-center justify-center"
        style={{ width: 24, height: 24, color: "var(--fig-icon-default)" }}
      >
        <Glyph src={`${ICON}/${icon}.svg`} size={24} />
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
