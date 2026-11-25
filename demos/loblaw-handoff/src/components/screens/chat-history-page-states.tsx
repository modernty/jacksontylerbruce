import { ChatHistoryPageScreen, type ChatHistoryPageSpec } from "./chat-history-page";
import type { Recent } from "./parts";

/**
 * The two frames that draw the Chat history page, as node maps over one component.
 *
 * Ids are written out rather than derived. They run consecutively inside a row until a
 * row is rebuilt, at which point Figma renumbers it, and a wrong id fails the build
 * because `getScreen` would carry a node the metadata has no match for.
 *
 * Both frames were re-read in October, after Search moved into the nav. Every id here
 * is new; nothing survived from the frames these replaced.
 */

/** Twelve conversations, in the order the full frame lists them. */
const COPY = [
  "GLP-1 medications and heart health concerns",
  "Recipes for a summer dinner party",
  "Managing nausea after medication dose increase",
  "Plan my groceries for the week",
  "Reading a nutrition label for added sugar",
  "Low-sodium swaps for weeknight dinners",
  "What to take for seasonal allergies",
  "Building a lunch box my kid will eat",
  "Vitamin D through the winter",
  "Gluten-free baking substitutions",
  "Caffeine and trouble sleeping",
  "Stocking a pantry on a budget",
] as const;

const id = (n: number) => `8156:${n}`;

/**
 * A row carrying a bare timestamp. Most rows are this shape.
 *
 * Ids run `item, tagText, text, title, stamp, button` from the List item.
 */
function stampRow(item: number, title: string, stamp: string, wrapper?: number): Recent {
  return {
    wrapper: wrapper ? id(wrapper) : undefined,
    item: id(item),
    tagText: id(item + 1),
    text: id(item + 2),
    titleId: id(item + 3),
    title,
    stampId: id(item + 4),
    stamp,
    button: id(item + 5),
  };
}

/**
 * A row carrying a `Metadata` frame instead: the timestamp, a bullet and a memory
 * count. The bullet and the count are switched off in every frame, so the count never
 * renders — see the screen's loose ends.
 *
 * Ids run `item, tagText, text, title, meta, when, bullet, count, button`.
 */
function metaRow(item: number, title: string, when: string, wrapper?: number): Recent {
  return {
    wrapper: wrapper ? id(wrapper) : undefined,
    item: id(item),
    tagText: id(item + 1),
    text: id(item + 2),
    titleId: id(item + 3),
    title,
    metaId: id(item + 4),
    meta: [
      { id: id(item + 5), text: when },
      { id: id(item + 6), text: "•", hidden: true },
      { id: id(item + 7), text: "3 memories created", hidden: true },
    ],
    button: id(item + 8),
  };
}

/* ── Default — four chats (8156:74666) ───────────────────────────────────── */

const DEFAULT: ChatHistoryPageSpec = {
  frame: "8156:74666",
  frameName: "Chat history",
  content: { root: "8156:74673", name: "Frame 2147231675", height: 340 },
  header: {
    root: "8156:74674", name: "Frame 2147231674",
    top: "8156:74675", titleWrap: "8156:74676", title: "8156:74677",
    countWrap: "8156:74678", count: "8156:74679", countText: "4 chats",
  },
  list: {
    wrap: "8156:74680",
    id: "8156:74681",
    top: 88,
    rows: [
      stampRow(74682, COPY[0], "Yesterday"),
      metaRow(74689, COPY[1], "Yesterday", 74688),
      stampRow(74699, COPY[2], "3 days ago", 74698),
      stampRow(74706, COPY[3], "2 weeks ago", 74705),
    ],
  },
  topNav: {
    root: "8156:76054", back: "8156:76055", groupLeft: 94, gap: 8, group: "8156:76056",
    search: "8156:76057", searchIcon: "I8156:76057;2046:16015", searchLabel: "I8156:76057;5:70",
    select: "8156:76058", selectLabel: "I8156:76058;5:70",
  },
  statusBar: "8156:74667",
};

/* ── Full — twelve chats (8156:75510) ────────────────────────────────────── */

const FULL: ChatHistoryPageSpec = {
  frame: "8156:75510",
  frameName: "Chat history, full",
  content: { root: "8156:75511", name: "Frame 2147231662", height: 848 },
  header: {
    root: "8156:75512", name: "Frame 2147231656",
    top: "8156:75513", titleWrap: "8156:75514", title: "8156:75515",
    countWrap: "8156:75516", count: "8156:75517", countText: "12 chats",
  },
  list: {
    id: "8156:75518",
    top: 84,
    rows: [
      stampRow(75519, COPY[0], "Yesterday"),
      metaRow(75526, COPY[1], "Yesterday", 75525),
      stampRow(75536, COPY[2], "3 days ago", 75535),
      stampRow(75543, COPY[3], "2 weeks ago", 75542),
      stampRow(75549, COPY[4], "2 weeks ago"),
      metaRow(75556, COPY[5], "3 weeks ago", 75555),
      stampRow(75566, COPY[6], "Last month", 75565),
      stampRow(75573, COPY[7], "Last month", 75572),
      stampRow(75579, COPY[8], "2 months ago"),
      metaRow(75586, COPY[9], "2 months ago", 75585),
      stampRow(75596, COPY[10], "3 months ago", 75595),
      stampRow(75603, COPY[11], "3 months ago", 75602),
    ],
  },
  topNav: {
    root: "8156:76059", back: "8156:76060", groupLeft: 94, gap: 8, group: "8156:76061",
    search: "8156:76062", searchIcon: "I8156:76062;2046:16015", searchLabel: "I8156:76062;5:70",
    select: "8156:76063", selectLabel: "I8156:76063;5:70",
  },
  statusBar: "8156:75609",
};

export function ChatHistoryPageDefault() {
  return <ChatHistoryPageScreen spec={DEFAULT} />;
}

export function ChatHistoryPageFull() {
  return <ChatHistoryPageScreen spec={FULL} />;
}
