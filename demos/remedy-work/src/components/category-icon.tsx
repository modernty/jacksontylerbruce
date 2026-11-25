/**
 * The placeholder a Labs study shows until its prototype has been filmed.
 *
 * Ported from the loblaw-labs-lite repo, which stands a white tile holding the category's
 * icon in the middle of the frame — branded and deliberate, where an empty panel just
 * reads as a missing asset. The icons and their colours are the repo's own, so a study
 * without footage still looks like it belongs to the same set as one with.
 *
 * The repo also tints the whole panel in the category's colour. That is not carried over:
 * this site settled on one panel gradient for every card, and five washes would undo it.
 * The colour lives in the icon instead.
 */

/** Keyed by the category name the study data already carries. */
const CATEGORIES: Record<string, { colour: string; art: React.ReactNode }> = {
  "Earning first use": {
    colour: "#CE4A0F",
    art: (
      <>
        <path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h8A1.5 1.5 0 0 1 15 5.5V21" />
        <path d="M2 21h20" />
        <path d="M11.6 12.2h.01" />
        <path d="M19 21v-7.5l2.5 1.7" />
      </>
    ),
  },
  "Personalization and memory": {
    colour: "#0B8577",
    art: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6" />
        <path d="M16.4 5.7a3.2 3.2 0 0 1 0 6.2" />
        <path d="M18.1 14.9c2.2.7 3.8 2.5 3.8 5.1" />
      </>
    ),
  },
  "Unified agent": {
    colour: "#6B33C4",
    art: (
      <>
        <circle cx="8.6" cy="12" r="5.4" />
        <circle cx="15.4" cy="12" r="5.4" />
      </>
    ),
  },
  "Creating trust": {
    colour: "#2544C9",
    art: (
      <>
        <path d="M12 3 4.8 6v5.4c0 4.3 3 8.3 7.2 9.6 4.2-1.3 7.2-5.3 7.2-9.6V6L12 3Z" />
        <path d="m8.9 12.2 2.1 2.1 4.3-4.3" />
      </>
    ),
  },
  "Earning loyalty": {
    colour: "#B57C00",
    art: (
      <>
        <path d="M20.6 12a8.6 8.6 0 1 1-2.6-6.1" />
        <path d="M18.6 3.2v3.6H15" />
      </>
    ),
  },
};

/**
 * An unknown category renders nothing rather than a stand-in glyph — the panel falls back
 * to the caption underneath, which is honest about what is missing.
 */
export function CategoryIcon({ category }: { category: string }) {
  const art = CATEGORIES[category];
  if (!art) return null;

  return (
    <span
      aria-hidden
      className="absolute top-1/2 left-1/2 flex size-[88px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[24px] bg-white shadow-[0_1px_2px_rgba(25,22,33,0.06),0_10px_28px_rgba(25,22,33,0.10)]"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[38px]"
        fill="none"
        stroke={art.colour}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {art.art}
      </svg>
    </span>
  );
}
