/**
 * The shape of the site's content, plus the derived views the page renders from.
 *
 * Every value originates in `remedy-work-site-content.xlsx` and reaches the app through
 * `content.generated.ts` (see `npm run content`). Nothing here hardcodes copy.
 */

import { ITEMS, SECTIONS } from "./content.generated";
import { studyFor } from "./studies";

export type Section = {
  /** The sheet's `Section` value — the join key for items. */
  name: string;
  /** The section title shown on the site, e.g. "What we built". */
  heading: string;
  /** Optional standfirst under the heading. Null where the sheet leaves it blank. */
  intro: string | null;
};

export type WorkItem = {
  slug: string;
  section: string;
  group: string;
  title: string;
  oneLiner: string;
  description: string;
  platform: string;
  status: string;
  /** Figma, Repo, Prototype, Deck, Video — decides how links are labelled. */
  source: string;
  links: {
    /** Used when one file serves every platform, e.g. Foundations. */
    all: string | null;
    ios: string | null;
    android: string | null;
    web: string | null;
  };
  tags: string[];
  /** The image filename the card should use, once the exports land. */
  visual: string | null;
};

export { ITEMS, SECTIONS };

/**
 * Where a card sorts within its group, by what it has to show.
 *
 * A study whose prototype has not been filmed shows its category icon, and a run of those
 * interrupting the real screens makes the section look thinner than it is — so they gather
 * at the end. A wide tile goes last of all, since it can only begin where a row begins and
 * anything after it strands a hole. Everything else keeps its place.
 */
function displayRank(item: WorkItem) {
  const study = studyFor(item.slug);
  if (study?.wide) return 2;
  if (study && !study.video) return 1;
  return 0;
}

/**
 * Sections whose groups organise the sheet but are not shown on the site.
 *
 * The Labs categories (First use, One agent, Trust…) are the research team's filing, and
 * the studies read as one set of open questions rather than five headed shelves. Source
 * Files has a single group whose name is the section's, which would print the same words
 * twice. The grouping stays in the spreadsheet, where it is useful; the sections render
 * flat.
 */
const UNGROUPED_SECTIONS = new Set(["Labs", "Source Files"]);

/** A section with its items already bucketed into groups, in sheet order. */
export type SectionView = Section & {
  groups: { name: string; items: WorkItem[] }[];
  /** Whether to show the group labels. False collapses the section to one run of cards. */
  grouped: boolean;
  count: number;
};

/**
 * Sections in sheet order, each carrying its groups in first-appearance order. Building
 * this once at module scope keeps the page and the sidebar reading the same structure —
 * they can't disagree about what exists or what order it comes in.
 */
export const SECTION_VIEWS: SectionView[] = SECTIONS.map((section) => {
  const items = ITEMS.filter((item) => item.section === section.name);

  const groups: { name: string; items: WorkItem[] }[] = [];
  for (const item of items) {
    const existing = groups.find((group) => group.name === item.group);
    if (existing) existing.items.push(item);
    else groups.push({ name: item.group, items: [item] });
  }

  const grouped = !UNGROUPED_SECTIONS.has(section.name);

  /* Rank within whatever run the cards actually render in: per group where the labels
     show, across the whole section where they do not — otherwise a flat section would
     gather its icon cards at the end of each hidden group rather than at its own end.
     `sort` is stable, so within a rank the sheet's order stands. This runs here rather
     than in the grid so the sidebar lists items in the order they appear. */
  const byRank = (a: WorkItem, b: WorkItem) => displayRank(a) - displayRank(b);
  for (const group of groups) group.items.sort(byRank);

  /* One run of cards, so the grid keeps filling rows across what used to be a group
     boundary rather than breaking to a new row at each label. */
  const rendered = grouped
    ? groups
    : [{ name: section.name, items: [...items].sort(byRank) }];

  return { ...section, groups: rendered, grouped, count: items.length };
});

/** `"Features"` -> `"features"`, for anchor ids. */
export function sectionId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** What opening this item's link actually opens — Figma for product work, the repo for
 *  Labs studies. Used as the hover affordance's label. */
export function openLabel(item: WorkItem) {
  return item.source === "Repo" ? "Open repo" : "Open in Figma";
}

/**
 * The platform to print under a card title, or null when there is nothing to say.
 *
 * "Not platform specific" is the sheet's way of leaving the column blank — every Labs row
 * carries it — and printing it puts a line of nothing beside thirteen cards. Treated as
 * unspecified and dropped.
 */
export function platformLabel(item: WorkItem): string | null {
  const platform = item.platform.trim();
  if (!platform || platform.toLowerCase() === "not platform specific") return null;
  return platform;
}

/** Every platform link on an item, in a fixed order, ready to render as a link row. */
export function platformLinks(item: WorkItem) {
  const { all, ios, android, web } = item.links;

  // A single link covers every platform, so it gets one neutral label rather than three
  // identical ones. Labs rows land here too — their one link is the repo.
  if (all) return [{ label: openLabel(item), href: all }];

  return [
    { label: "iOS", href: ios },
    { label: "Android", href: android },
    { label: "Web", href: web },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));
}
