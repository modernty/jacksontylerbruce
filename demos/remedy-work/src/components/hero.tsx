import { Lockup } from "@/components/lockup";
import { SECTION_VIEWS, sectionId } from "@/lib/content";

/**
 * The opening screen: a small accent eyebrow, the display lockup of the two names, and a
 * scroll cue — all left aligned to the same edge the index below sits on, over a diffuse
 * warm halo.
 *
 * Three lines and deliberately short of the fold. A handoff is a thing to read, so the
 * hero states whose work it is and gets out of the way; the first section's heading and
 * the top of its cards are visible without scrolling.
 */

/** The year on the eyebrow. Confirm against the engagement — the sheet carries dated
 *  sections in 2026 but no start date, so this is the one value here not derived. */
const PERIOD = "2026";

/** Where the scroll cue lands: the first section, whatever the sheet orders first. */
const FIRST_SECTION = sectionId(SECTION_VIEWS[0].name);

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Height comes from the content and its padding, not from a `vh` box. A tall
          viewport used to stretch the box and centre three short lines inside it, which
          bought a screenful of nothing above the first section. Clamped padding keeps the
          opening generous on a laptop and stops it ballooning on a large display. */}
      <div className="mx-auto flex max-w-[1560px] flex-col px-8 pt-[clamp(88px,14vh,200px)] pb-[clamp(56px,9vh,140px)] lg:px-12">
        <p className="flex items-center gap-2.5 text-[12.5px]/[16px] font-bold tracking-[0.14em] text-[var(--accent)] uppercase">
          <Sparkle />
          Design handoff · {PERIOD}
        </p>

        {/* The font-size is the lockup's only scale control: both marks and the cross are
            sized in `em`, so the whole thing scales through every clamp step together. */}
        <h1 className="mt-7 flex flex-wrap items-center text-[clamp(34.5px,6.3vw,93px)]/[1] text-[var(--ink-display)]">
          <Lockup />
        </h1>

        <a
          href={`#${FIRST_SECTION}`}
          className="group mt-11 inline-flex w-fit items-center gap-2 text-[11.5px]/[14px] font-semibold tracking-[0.16em] text-[var(--ink-faint)] uppercase transition-colors duration-200 hover:text-[var(--ink-secondary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
        >
          Scroll
          <span
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-y-0.5"
          >
            ↓
          </span>
        </a>
      </div>
    </section>
  );
}

/** A four-point sparkle, matching the reference's eyebrow mark. Accent-coloured rather
 *  than multicolour — this site has one accent and no separate brand mark. */
function Sparkle() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-[15px] shrink-0"
      fill="currentColor"
    >
      <path d="M12 1.6c.62 5.36 4.44 9.18 9.8 9.8v1.2c-5.36.62-9.18 4.44-9.8 9.8h-1.2c-.62-5.36-4.44-9.18-9.8-9.8v-1.2c5.36-.62 9.18-4.44 9.8-9.8h1.2Z" />
    </svg>
  );
}
