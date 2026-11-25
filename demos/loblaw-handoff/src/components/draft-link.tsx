import Link from "next/link";

/**
 * The way to the full page of a held feature, for the people still building it.
 *
 * The card above goes to the hold route and shows the notice; this goes to the feature's
 * own slug and shows everything. Deliberately almost invisible — 6px, low contrast, no
 * underline until hover — so a reader does not find it.
 *
 * It is not a lock. The real page is a public URL and anyone who guesses it gets in.
 * Anything that genuinely must not be read needs a real gate, not a small font.
 */
export function DraftLink({ slug, label }: { slug: string; label: string }) {
  return (
    <Link
      href={`/features/${slug}`}
      // Full size to a screen reader, which reads text regardless of how small it is
      // drawn. Quiet, not hidden.
      aria-label={`${label} — open the work in progress`}
      className="mt-1.5 inline-block text-[6px] leading-none text-ink-4/50 transition-colors hover:text-ink-3 hover:underline focus-visible:text-ink-3 focus-visible:underline"
    >
      {label}
    </Link>
  );
}
