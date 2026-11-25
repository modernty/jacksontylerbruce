import { ICON as PANEL_ICON, N, T, Glyph, GLASS, RecentRow, type Recent } from "./parts";

/**
 * The full Chat history page, rebuilt from Figma rather than exported as a PNG.
 *
 * Two frames in the file draw it holding different amounts of data — four chats and
 * twelve — so they are one component driven by a spec carrying that frame's node ids and
 * its rows.
 *
 * The chrome changed with the September nav. Search moved off a pill pinned over the
 * foot of the list and into a 124-tall nav beside Select, and the overflow control that
 * used to sit at the top right is gone. The bottom bar and its fade went with it, which
 * is why nothing here is positioned against the bottom edge any more.
 *
 * Rows are the same component the side panel uses, in a wider container, so the row
 * markup is imported rather than restated.
 */

const ICON = "/demos/loblaw-handoff/icons/chat-history";

export type ChatHistoryPageSpec = {
  frame: string;
  frameName: string;
  /** The wrapper holding the header and the list. Its name and height differ per frame;
   *  the height has to be stated because both children are positioned, so it would
   *  otherwise measure zero against Figma. */
  content: { root: string; name: string; height: number };
  header: { root: string; name: string; top: string; titleWrap: string; title: string; countWrap: string; count: string; countText: string };
  /** `wrap` is the extra frame some lists sit in; `top` is the list's offset in the content. */
  list: { id: string; wrap?: string; top: number; rows: Recent[] };
  topNav: {
    root: string; back: string;
    /** Where the pill group starts. 94 in the History section, 98 elsewhere — the 4px
     *  is a real difference between frames, not a rounding artefact. */
    groupLeft: number; gap: number;
    group: string; search: string; searchIcon: string; searchLabel: string; select: string; selectLabel: string;
  };
  statusBar: string;
};

function Pill({
  id,
  labelId,
  label,
  icon,
  iconId,
}: {
  id: string;
  labelId: string;
  label: string;
  icon?: string;
  iconId?: string;
}) {
  return (
    <N
      id={id}
      name="Button"
      type="INSTANCE"
      className="flex shrink-0 items-center justify-center"
      style={{ ...GLASS, height: 46, gap: 8, paddingLeft: 36, paddingRight: 36, borderRadius: 999 }}
    >
      {icon && iconId && (
        <N id={iconId} name="Leading icon" type="INSTANCE" className="shrink-0" style={{ width: 16, height: 16 }}>
          <Glyph src={icon} size={16} />
        </N>
      )}
      <T
        id={labelId}
        name="label"
        className="shrink-0 whitespace-nowrap"
        style={{ font: "var(--fig-text-md-semibold)", color: "var(--fig-text-primary)" }}
      >
        {label}
      </T>
    </N>
  );
}

export function ChatHistoryPageScreen({ spec }: { spec: ChatHistoryPageSpec }) {
  // The list is positioned by whichever node actually carries the offset in the file —
  // its own wrapper where there is one, otherwise the List itself. No synthetic node is
  // introduced, because the Designs tab measures these ids against Figma's geometry.
  const list = (
    <N
      id={spec.list.id}
      name="List"
      className={spec.list.wrap ? "flex flex-col items-start" : "absolute left-0 flex flex-col items-start"}
      style={{ width: 361, gap: 4, ...(spec.list.wrap ? null : { top: spec.list.top }) }}
    >
      {spec.list.rows.map((row) =>
        row.wrapper ? (
          <N key={row.item} id={row.wrapper} name="Frame" className="flex w-full shrink-0 flex-col items-start">
            <RecentRow row={row} />
          </N>
        ) : (
          <RecentRow key={row.item} row={row} />
        )
      )}
    </N>
  );

  return (
    <N
      id={spec.frame}
      name={spec.frameName}
      className="proto relative overflow-hidden"
      style={{ width: 393, height: 852, borderRadius: 48, background: "var(--fig-bg-canvas)" }}
    >
      <N
        id={spec.content.root}
        name={spec.content.name}
        className="absolute"
        style={{ left: 16, top: 146, width: 361, height: spec.content.height }}
      >
        <N
          id={spec.header.root}
          name={spec.header.name}
          className="absolute left-0 top-0 flex flex-col items-start"
          style={{ width: 361 }}
        >
          <N
            id={spec.header.top}
            name="Top"
            className="flex w-full shrink-0 flex-col items-start justify-center"
            style={{ paddingLeft: 8, paddingRight: 8 }}
          >
            <N id={spec.header.titleWrap} name="Header" className="flex w-full shrink-0 flex-col items-start justify-center">
              <T
                id={spec.header.title}
                name="Message title"
                className="shrink-0 overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ font: "var(--fig-display-xs-semibold)", color: "var(--fig-text-primary)" }}
              >
                Chat history
              </T>
            </N>
          </N>

          <N
            id={spec.header.countWrap}
            name="Frame"
            className="flex shrink-0 items-center justify-center"
            style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 10, paddingBottom: 10 }}
          >
            <T
              id={spec.header.count}
              name={spec.header.countText}
              className="shrink-0 whitespace-nowrap"
              style={{ font: "var(--fig-text-sm-medium)", color: "var(--fig-text-secondary-alt)" }}
            >
              {spec.header.countText}
            </T>
          </N>
        </N>

        {spec.list.wrap ? (
          <N id={spec.list.wrap} name="Frame" className="absolute left-0" style={{ top: spec.list.top, width: 361 }}>
            {list}
          </N>
        ) : (
          list
        )}
      </N>

      {/* 124 tall, not 68: the nav grew to hold the pills, and the back button sits at
          its foot rather than its middle. */}
      <N id={spec.topNav.root} name="Top nav" className="absolute left-0 top-0" style={{ width: 393, height: 124 }}>
        <N
          id={spec.topNav.back}
          name="Button"
          type="INSTANCE"
          className="absolute flex items-center justify-center overflow-hidden"
          style={{ ...GLASS, left: 24, top: 68, width: 44, height: 44, borderRadius: 999 }}
        >
          <Glyph src={`${ICON}/nav-back.svg`} size={16} />
        </N>

        {/* No width is set on the pills: 36px either side of the label is what the
            component does, and 148 / 119 fall out of it. */}
        <N
          id={spec.topNav.group}
          name="Frame 2147231679"
          className="absolute flex items-start"
          style={{ left: spec.topNav.groupLeft, top: 66, gap: spec.topNav.gap }}
        >
          <Pill
            id={spec.topNav.search}
            labelId={spec.topNav.searchLabel}
            label="Search"
            icon={`${ICON}/search.svg`}
            iconId={spec.topNav.searchIcon}
          />
          <Pill id={spec.topNav.select} labelId={spec.topNav.selectLabel} label="Select" />
        </N>
      </N>

      <N
        id={spec.statusBar}
        name="Background=true"
        type="INSTANCE"
        className="absolute left-0 top-0"
        style={{ width: 393, height: 54 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${PANEL_ICON}/status-bar.svg`} alt="" width={393} height={54} className="block" />
      </N>
    </N>
  );
}
