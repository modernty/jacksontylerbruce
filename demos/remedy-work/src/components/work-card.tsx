import Image from "next/image";

import { CategoryIcon } from "@/components/category-icon";
import { StatusPill } from "@/components/status-pill";
import {
  openLabel,
  platformLabel,
  platformLinks,
  type WorkItem,
} from "@/lib/content";
import { previewSrc } from "@/lib/previews";
import { studyFor, studyPath } from "@/lib/studies";
import { cn } from "@/lib/utils";

/* A corner arrow leaves the site for Figma or GitHub; a straight one stays here. */
function arrowFor(external: boolean) {
  return external ? "↗" : "→";
}

/**
 * Off-site links open in a new tab; a study page is a plain same-tab navigation.
 *
 * Deliberately an `<a>` rather than a `next/link` — `Link` keeps the current scroll
 * position when the incoming page is already visible in the viewport (its documented
 * default), which drops the reader halfway down a study instead of at the question. A
 * document navigation lands at the top and hands scroll restoration back to the browser,
 * which is also what makes returning to the grid land where they left it.
 */
function externalAttrs(external: boolean) {
  return external ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

/**
 * A tinted preview panel above the card's text, following the reference: a 16px panel
 * with a hairline border and a soft gradient, then title, status, description and links
 * sitting below and outside it.
 *
 * One gradient for every card — `--panel-gradient`, lifted from the `Gradient` frame on
 * the Figma handoff page. An earlier version picked between six invented tints by hashing
 * the slug; the real design uses a single wash, so the grid stays quiet behind the
 * thumbnails rather than shifting hue card to card.
 */
export function WorkCard({ item }: { item: WorkItem }) {
  /* The sheet's `Visual` column is empty on every real row, so the filename is derived
     from the slug — the same convention the original mock used. An explicit value in the
     sheet still wins, so naming an export there overrides this. */
  const expected = item.visual ?? `${item.slug}.png`;
  const preview = previewSrc(expected);
  /* A Labs study has a page on this site rather than a file to open elsewhere, and that
     page is the only destination the card needs — the repo link lives on it. Everything
     else keeps its platform links out to Figma. */
  const study = studyFor(item.slug);
  const label = study ? "Open" : openLabel(item);
  const destinations = study
    ? [{ label: "Open", href: studyPath(study.slug), external: false }]
    : platformLinks(item).map((link) => ({ ...link, external: true }));

  // Most items exist on three platforms, so there is no single "the link". One
  // destination gets one button; several get one button each, captioned so the choice
  // reads as picking a platform rather than picking between unrelated things.
  const single = destinations.length === 1;

  return (
    /* A wide study takes two of the three columns, and its panel keeps the clip's own
       16:9 instead of the grid's 4:3 — the footage is a checkout counter rather than a
       phone, so cropping it to a square-ish panel would throw away the half that makes it
       legible. Taller than its neighbours by design: it is the tile the group leads with. */
    <article
      id={item.slug}
      className={cn("flex scroll-mt-12 flex-col", study?.wide && "sm:col-span-2")}
    >
      <div
        className={cn(
          "group relative w-full overflow-clip rounded-[var(--radius-card)] border border-[var(--border-default)] transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_26px_rgba(0,0,0,0.06)]",
          study?.wide ? "aspect-[16/9]" : "aspect-[4/3]",
        )}
        style={{ background: "var(--panel-gradient)" }}
      >
        {study?.video ? (
          /* A study's thumbnail is its prototype loop. Muted and autoplaying, which is
             the only way a browser will start it unprompted, and `poster` means the frame
             is never empty while it loads. Each clip carries its own background, so it
             covers the panel rather than sitting on the panel gradient — on a 4:3 card
             that trims the sides, where these shots are only wash. */
          <video
            src={study.video.card}
            poster={study.video.poster}
            aria-hidden
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : preview ? (
          /* `unoptimized`: the thumbnails are transparent PNGs sized to the panel
             already, and Next's optimizer was flattening their alpha onto an opaque
             background, which hid the card's tint. Serving the file as-is costs a few
             tens of KB and keeps the transparency the composition depends on. */
          <Image
            src={preview}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 900px) 100vw, 33vw"
            className="object-cover object-top"
          />
        ) : study ? (
          /* A study whose prototype has not been filmed stands its category's icon on the
             panel — the labs repo's own placeholder, which reads as a deliberate piece of
             the set rather than a missing asset. No caption: the icon says it. */
          <CategoryIcon category={study.category} />
        ) : (
          /* No export yet. Naming the file the card is waiting for turns an empty panel
             into a work item for whoever is exporting. */
          <span className="absolute bottom-3 left-4 text-[11px]/[16px] text-[var(--ink-faint)]">
            {expected}
          </span>
        )}

        {destinations.length > 0 && (
          <div
            className="reveal absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 backdrop-blur-[2px]"
            style={{ background: "var(--panel-scrim)" }}
          >
            {!single && (
              <p className="text-[10.5px]/[14px] font-semibold tracking-[0.12em] text-[var(--ink-muted)] uppercase">
                {label}
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-2">
              {destinations.map((destination) => (
                <a
                  key={destination.label}
                  href={destination.href}
                  {...externalAttrs(destination.external)}
                  /* "Open" is the right word beside its card and useless in a list of
                     links read on its own, so the accessible name carries the title. */
                  aria-label={`${single ? label : destination.label} — ${item.title}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 py-2 text-[13px]/[16px] font-medium text-white transition-colors duration-200 hover:bg-[var(--ink-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  {single ? label : destination.label}
                  <span aria-hidden className="text-white/70">
                    {arrowFor(destination.external)}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <h3 className="mt-5 text-[22px]/[28px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
        {item.title}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusPill status={item.status} />
        {platformLabel(item) && (
          <span className="text-[12px]/[16px] text-[var(--ink-faint)]">
            {platformLabel(item)}
          </span>
        )}
      </div>

      <p className="mt-4 text-[15px]/[24px] text-[var(--ink-secondary)]">
        {item.description}
      </p>

      {destinations.length > 0 ? (
        /* The touch fallback for the hover overlay above — shown only where hovering is
           impossible, so pointer devices are not told the same thing twice. */
        <div className="touch-links mt-5 flex-wrap gap-2">
          {destinations.map((destination) => (
            <a
              key={destination.label}
              href={destination.href}
              {...externalAttrs(destination.external)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface)]/70 px-3 py-1.5 text-[13px]/[18px] text-[var(--ink-secondary)]"
            >
              {single ? label : destination.label}
              <span aria-hidden className="text-[var(--ink-faint)]">
                {arrowFor(destination.external)}
              </span>
            </a>
          ))}
        </div>
      ) : (
        /* Called out rather than left blank — a missing link is the sheet's open question,
           and the site is where it should be visible. */
        <p className="mt-5 text-[13px]/[18px] text-[var(--ink-faint)]">
          No link yet
        </p>
      )}
    </article>
  );
}
