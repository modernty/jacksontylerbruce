import { SidePanelPageScreen, type SidePanelPageSpec } from "./side-panel-page";
import type { Recent } from "./parts";

/**
 * The three frames in the file's Side panel section, as node maps over one component.
 *
 * They are the same surface holding different amounts of data — nothing, four chats,
 * six and a way through — so the shell is stated once per frame and only the list
 * differs. Node ids are data rather than markup, which is what keeps the three states
 * cheap to hold in step.
 *
 * Repointed to the Settings iteration. The panel gained a fifth nav row, and with it the
 * rows grew from 40 to 46 and their icons shrank from 24 to 20 — so the nav stands 184
 * tall rather than 120, and the list below it lost that height: 496, not 567.
 */

/**
 * The conversations the file draws, in the order it draws them.
 *
 * The same conversations the Chat history page lists, in the same order and with the same
 * ages, because the panel is a shortlist of that list — not a separate set of examples.
 * The panel now shows six and then a way through; the page carries twelve.
 */
const COPY = [
  { title: "GLP-1 medications and heart health concerns", when: "Yesterday" },
  { title: "Recipes for a summer dinner party", when: "Yesterday" },
  { title: "Managing nausea after medication dose increase", when: "3 days ago" },
  { title: "Plan my groceries for the week", when: "2 weeks ago" },
  { title: "Reading a nutrition label for added sugar", when: "2 weeks ago" },
  { title: "Low-sodium swaps for weeknight dinners", when: "3 weeks ago" },
] as const;

/**
 * A row from its ids. Figma numbers the nodes inside a row consecutively, so the row is
 * stated by its first id and the rest follow — except the second row of each run of four,
 * which carries two extra metadata parts the file switches off. Those are the memory
 * counts; they were removed from the copy but left in the layer tree.
 */
function row(
  ids: { wrapper?: string; item: string; tagText: string; text: string; titleId: string; metaId: string; parts: string[]; button: string },
  copy: (typeof COPY)[number]
): Recent {
  return {
    wrapper: ids.wrapper,
    item: ids.item,
    tagText: ids.tagText,
    text: ids.text,
    titleId: ids.titleId,
    title: copy.title,
    metaId: ids.metaId,
    meta: ids.parts.map((id, i) => (i === 0 ? { id, text: copy.when } : { id, text: "", hidden: true })),
    button: ids.button,
  };
}

/**
 * The nav: five rows now, with Settings last. Files is still drawn and still switched
 * off, which is why it sits second rather than at the end.
 */
function nav(base: number) {
  const id = (n: number) => `8156:${n}`;
  return [
    { id: id(base), iconId: id(base + 1), labelId: id(base + 2), icon: "nav-new-chat-20", label: "New chat" },
    { id: id(base + 3), iconId: id(base + 4), labelId: id(base + 5), icon: "nav-new-chat-20", label: "Files", hidden: true },
    { id: id(base + 6), iconId: id(base + 7), labelId: id(base + 8), icon: "nav-chat-history-20", label: "Chat history" },
    { id: id(base + 9), iconId: id(base + 10), labelId: id(base + 11), icon: "nav-memory-20", label: "Memory" },
    { id: id(base + 12), iconId: id(base + 13), labelId: id(base + 14), icon: "nav-settings-20", label: "Settings" },
  ];
}

/* ── Empty — one line where the list would be ────────────────────────────── */

const EMPTY: SidePanelPageSpec = {
  frame: "8156:234785",
  frameName: "Side Panel, filled recents",
  header: "8156:234786",
  lockup: "8156:234787",
  mark: "8156:234788",
  wordmark: "8156:234793",
  content: "8156:234794",
  nav: "8156:234795",
  navItems: nav(234796),
  stack: "8156:234811",
  stackHeader: "8156:234812",
  stackTitle: "8156:234813",
  stackTitleText: "Recents",
  stackHeight: 496,
  recents: {
    kind: "empty",
    id: "8156:234814",
    textId: "8156:234815",
    text: "Your recent chats will appear here.",
  },
  footer: { id: "8156:234816", button: "8156:234817" },
};

/* ── Four — the shortlist part-filled ────────────────────────────────────── */

const FOUR: SidePanelPageSpec = {
  frame: "8156:234826",
  frameName: "Side Panel, filled recents",
  header: "8156:234827",
  lockup: "8156:234828",
  mark: "8156:234829",
  wordmark: "8156:234834",
  content: "8156:234835",
  nav: "8156:234836",
  navItems: nav(234837),
  stack: "8156:234852",
  stackHeader: "8156:234853",
  stackTitle: "8156:234854",
  stackTitleText: "Recents",
  stackHeight: 496,
  recents: {
    kind: "list",
    id: "8156:234855",
    rows: [
      row({ item: "8156:234856", tagText: "8156:234857", text: "8156:234858", titleId: "8156:234859", metaId: "8156:234860", parts: ["8156:234861"], button: "8156:234862" }, COPY[0]),
      row({ wrapper: "8156:234863", item: "8156:234864", tagText: "8156:234865", text: "8156:234866", titleId: "8156:234867", metaId: "8156:234868", parts: ["8156:234869", "8156:234870", "8156:234871"], button: "8156:234872" }, COPY[1]),
      row({ wrapper: "8156:234873", item: "8156:234874", tagText: "8156:234875", text: "8156:234876", titleId: "8156:234877", metaId: "8156:234878", parts: ["8156:234879"], button: "8156:234880" }, COPY[2]),
      row({ wrapper: "8156:234881", item: "8156:234882", tagText: "8156:234883", text: "8156:234884", titleId: "8156:234885", metaId: "8156:234886", parts: ["8156:234887"], button: "8156:234888" }, COPY[3]),
    ],
  },
  footer: { id: "8156:234889", button: "8156:234890" },
};

/* ── Full — the shortlist at capacity, with a way through ───────────────── */

const FULL: SidePanelPageSpec = {
  frame: "8156:234911",
  frameName: "Side Panel, filled recents",
  header: "8156:234912",
  lockup: "8156:234913",
  mark: "8156:234914",
  wordmark: "8156:234919",
  content: "8156:234920",
  nav: "8156:234921",
  navItems: nav(234922),
  stack: "8156:234937",
  stackHeader: "8156:234938",
  stackTitle: "8156:234939",
  stackTitleText: "Recents",
  stackHeight: 496,
  recents: {
    kind: "list",
    id: "8156:234940",
    // Six, not seven: the taller nav took a row off the shortlist. These are the first
    // six rows of the Chat history page, in its order, and View all carries the rest.
    rows: [
      row({ item: "8156:234941", tagText: "8156:234942", text: "8156:234943", titleId: "8156:234944", metaId: "8156:234945", parts: ["8156:234946"], button: "8156:234947" }, COPY[0]),
      row({ wrapper: "8156:234948", item: "8156:234949", tagText: "8156:234950", text: "8156:234951", titleId: "8156:234952", metaId: "8156:234953", parts: ["8156:234954", "8156:234955", "8156:234956"], button: "8156:234957" }, COPY[1]),
      row({ wrapper: "8156:234958", item: "8156:234959", tagText: "8156:234960", text: "8156:234961", titleId: "8156:234962", metaId: "8156:234963", parts: ["8156:234964"], button: "8156:234965" }, COPY[2]),
      row({ wrapper: "8156:234966", item: "8156:234967", tagText: "8156:234968", text: "8156:234969", titleId: "8156:234970", metaId: "8156:234971", parts: ["8156:234972"], button: "8156:234973" }, COPY[3]),
      row({ item: "8156:234974", tagText: "8156:234975", text: "8156:234976", titleId: "8156:234977", metaId: "8156:234978", parts: ["8156:234979"], button: "8156:234980" }, COPY[4]),
      row({ wrapper: "8156:234981", item: "8156:234982", tagText: "8156:234983", text: "8156:234984", titleId: "8156:234985", metaId: "8156:234986", parts: ["8156:234987", "8156:234988", "8156:234989"], button: "8156:234990" }, COPY[5]),
    ],
  },
  viewAll: { id: "8156:234991", textId: "8156:234992", iconId: "8156:234993" },
  footer: { id: "8156:234994", button: "8156:234995" },
};

export function SidePanelPageEmpty() {
  return <SidePanelPageScreen spec={EMPTY} />;
}

export function SidePanelPageFour() {
  return <SidePanelPageScreen spec={FOUR} />;
}

export function SidePanelPageFull() {
  return <SidePanelPageScreen spec={FULL} />;
}
