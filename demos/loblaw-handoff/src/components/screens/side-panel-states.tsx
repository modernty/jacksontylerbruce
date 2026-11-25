import { SidePanelScreen, type SidePanelSpec } from "./side-panel";
import type { PanelRecent } from "./parts";

/**
 * The three frames that draw the side panel, as node maps over one component.
 *
 * They differ only in what sits under the Recents heading — nothing, four chats, eight
 * with a way through — so everything else is stated once. Node ids are data here rather
 * than markup, which is what makes the states cheap to keep in step.
 */

/** The conversations the file draws, in the order it draws them. */
const COPY = [
  { title: "GLP-1 medications and heart health concerns", when: "Yesterday" },
  { title: "Recipes for a summer dinner party", when: "Yesterday" },
  { title: "Understanding normal liver functions", when: "3 days ago" },
  { title: "Plan my groceries for the week", when: "5 days ago" },
  // Row 5's string begins with a literal tab in the file, which indents it against every
  // other row. Reproduced rather than tidied — see the screen's loose ends.
  { title: "\tReading a nutrition label for added sugar", when: "2 weeks ago" },
  { title: "Low-sodium swaps for weeknight dinners", when: "3 weeks ago" },
  { title: "What to take for seasonal allergies", when: "Last month" },
  { title: "Building a lunch box my kid will eat", when: "Last month" },
] as const;

/**
 * A row from its `List item` id. The ids inside a row run consecutively, and the two
 * trailing metadata parts are switched off in the file — the memory counts were removed,
 * so only the timestamp shows.
 */
function row(base: number, copy: (typeof COPY)[number], prefix: string): PanelRecent {
  const id = (n: number) => `${prefix}:${n}`;
  return {
    item: id(base),
    text: id(base + 1),
    titleId: id(base + 2),
    metaId: id(base + 3),
    title: copy.title,
    meta: [
      { id: id(base + 4), text: copy.when },
      { id: id(base + 5), text: "", hidden: true },
      { id: id(base + 6), text: "", hidden: true },
    ],
  };
}

/* ── Empty — one line where the list would be ────────────────────────────── */

const EMPTY: SidePanelSpec = {
  frame: "7647:28094",
  frameName: "Side panel, empty",
  backdrop: {
    root: "7647:28150", topNav: "7647:28211", menuButton: "7647:28212", right: "7647:28213",
    closeButton: "7647:28214", content: "7647:28208", mark: "7647:28209", greeting: "7647:28210",
    footer: "7647:28206", composer: "7647:28207", scrim: "7647:28215",
  },
  scrim: "7647:28216",
  panel: {
    root: "7647:28218", header: "7647:28219", lockup: "7647:28220", mark: "7647:28221",
    wordmark: "7647:28226", content: "7647:28227", nav: "7647:28228",
    navItems: [
      { id: "7647:28229", iconId: "7647:28230", labelId: "7647:28231", icon: "nav-new-chat", label: "New chat" },
      { id: "7647:28235", iconId: "7647:28236", labelId: "7647:28237", icon: "nav-memory", label: "Memory" },
    ],
    stack: "7647:28238", stackHeader: "7647:28239", stackTitle: "7647:28240",
  },
  recents: {
    kind: "empty",
    id: "7647:28300",
    textId: "7647:28301",
    text: "Recent chats will appear here.",
  },
  statusBar: "7647:28217",
  statusBarOnTop: false,
};

/* ── Default — four chats, and no way through ────────────────────────────── */

const DEFAULT: SidePanelSpec = {
  frame: "7612:3013",
  frameName: "Side panel opened atop",
  backdrop: {
    root: "7612:3069", topNav: "7612:3130", menuButton: "7612:3131", right: "7612:3132",
    closeButton: "7612:3133", content: "7612:3127", mark: "7612:3128", greeting: "7612:3129",
    footer: "7612:3125", composer: "7612:3126", scrim: "7612:3134",
  },
  scrim: "7623:5698",
  panel: {
    root: "7623:6107", header: "7623:6108", lockup: "7623:6109", mark: "7623:6110",
    wordmark: "7623:6115", content: "7623:6116", nav: "7623:6117",
    navItems: [
      { id: "7623:6118", iconId: "7623:6119", labelId: "7623:6120", icon: "nav-new-chat", label: "New chat" },
      { id: "7623:6124", iconId: "7623:6125", labelId: "7623:6126", icon: "nav-memory", label: "Memory" },
    ],
    stack: "7623:6127", stackHeader: "7623:6128", stackTitle: "7623:6129",
  },
  recents: {
    kind: "list",
    id: "7623:6130",
    rows: [6131, 6138, 6145, 6150].map((base, i) => row(base, COPY[i], "7623")),
  },
  statusBar: "7612:3135",
  statusBarOnTop: false,
};

/* ── Full — eight chats and a way through ────────────────────────────────── */

const FULL: SidePanelSpec = {
  frame: "7612:3214",
  frameName: "Side panel, recents-full",
  backdrop: {
    root: "7612:3270", topNav: "7612:3331", menuButton: "7612:3332", right: "7612:3333",
    closeButton: "7612:3334", content: "7612:3328", mark: "7612:3329", greeting: "7612:3330",
    footer: "7612:3326", composer: "7612:3327", scrim: "7612:3335", innerScrim: "7623:5696",
  },
  panel: {
    root: "7612:3337", header: "7612:3338", lockup: "7612:3339", mark: "7612:3340",
    wordmark: "7612:3345", content: "7612:3346", nav: "7612:3347",
    navItems: [
      { id: "7612:3348", iconId: "7612:3349", labelId: "7612:3350", icon: "nav-new-chat", label: "New chat" },
      { id: "7612:3354", iconId: "7612:3355", labelId: "7612:3356", icon: "nav-memory", label: "Memory" },
    ],
    stack: "7612:3357", stackHeader: "7612:3358", stackTitle: "7612:3359",
  },
  recents: {
    kind: "list",
    id: "7621:5358",
    rows: [5359, 5366, 5373, 5378, 5385, 5392, 5399, 5404].map((base, i) => row(base, COPY[i], "7621")),
  },
  viewAll: { id: "7612:3413", textId: "7612:3414", iconId: "7612:3415" },
  statusBar: "7612:3336",
  statusBarOnTop: true,
};

export function SidePanelEmpty() {
  return <SidePanelScreen spec={EMPTY} />;
}

export function SidePanelDefault() {
  return <SidePanelScreen spec={DEFAULT} />;
}

export function SidePanelFull() {
  return <SidePanelScreen spec={FULL} />;
}
