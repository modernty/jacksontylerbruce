import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StatusPill } from "@/components/status-pill";
import { ITEMS, platformLinks } from "@/lib/content";
import { STUDIES, studyFor } from "@/lib/studies";

/**
 * A Labs study's own page: the question, the prototype loop, and the thinking behind it.
 *
 * The rest of the site is one scroll, because a handoff is easier to read and search that
 * way. A study is the exception — it has no Figma file to open, and its material is
 * several hundred words of research prose, which would swamp a card. So the card opens
 * here instead.
 *
 * Content comes from two places that each own what they are good at: the spreadsheet owns
 * the card copy (title, status, description) and `studies.ts` owns the study, ported from
 * the Labs repo. This page joins them on the slug and renders nothing it was not given.
 */

/* Only the studies that exist get a page; anything else under /labs is a 404 rather than
   a rendered shell. */
export function generateStaticParams() {
  return STUDIES.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = studyFor(slug);
  if (!study) return {};

  return {
    title: `${study.category}: question ${study.number} — Remedy, the work`,
    description: study.question,
  };
}

/** A labelled block of study prose. The label is the study's own vocabulary. */
function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="text-[11px]/[14px] font-semibold tracking-[0.12em] text-[var(--ink-muted)] uppercase">
        {label}
      </h2>
      <div className="mt-4 flex flex-col gap-4 text-[17px]/[28px] text-[var(--ink-secondary)]">
        {children}
      </div>
    </section>
  );
}

export default async function StudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = studyFor(slug);
  const item = ITEMS.find((candidate) => candidate.slug === slug);
  if (!study || !item) notFound();

  const links = platformLinks(item);

  return (
    <article className="mx-auto max-w-[1100px] px-8 pt-10 pb-24 lg:px-12 lg:pt-14">
      {/* Back to the card itself, not just the section, so a long scroll is not repeated
          on the way in and out. A plain anchor for the same reason the card uses one — see
          `work-card.tsx`. */}
      <a
        href={`/#${item.slug}`}
        className="inline-flex items-center gap-2 text-[13px]/[18px] text-[var(--ink-muted)] transition-colors duration-200 hover:text-[var(--ink)]"
      >
        <span aria-hidden>←</span> Future state explorations
      </a>

      <header className="mt-10 max-w-[54ch]">
        <p className="text-[11px]/[14px] font-semibold tracking-[0.12em] text-[var(--ink-muted)] uppercase">
          Question {study.number} · {item.title} · {study.category}
        </p>
        <h1 className="mt-5 text-[34px]/[42px] font-semibold tracking-[-0.02em] text-[var(--ink-display)] lg:text-[42px]/[52px]">
          {study.question}
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusPill status={item.status} />
          {/* Half the studies name a method and a sample; the ones still being shaped do
              not, and an empty "·" would read as a missing value rather than an open one. */}
          {study.method && (
            <span className="text-[12px]/[16px] text-[var(--ink-faint)]">
              {[study.method, study.participants].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
      </header>

      {/* Controls, because this one is watched rather than glanced at — the card upstairs
          is the glance. Autoplaying and muted so it is already moving on arrival. */}
      {study.video && (
        <div className="mt-12 overflow-clip rounded-[var(--radius-card)] border border-[var(--border-default)]">
          <video
            src={study.video.full}
            poster={study.video.poster}
            controls
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="block aspect-video w-full"
          />
        </div>
      )}

      {/* Fixed tracks with the slack in the middle: the study reads at a measure that
          does not drift with the window, and the card note stays wide enough to be a
          column rather than a ribbon. */}
      <div className="mt-16 grid grid-cols-1 gap-x-20 gap-y-12 lg:grid-cols-[minmax(0,62ch)_260px] lg:justify-between">
        <div className="min-w-0">
          <Block label="The hypothesis">
            <p>{study.hypothesis}</p>

            {/* Nested under the claim they support rather than standing as their own
                section — quieter than body text, and never a card. */}
            {study.receipts && (
              <div className="mt-2 flex flex-col gap-5 border-l-2 border-[var(--border-default)] pl-6">
                {study.receipts.map((receipt) => (
                  <blockquote key={receipt.quote}>
                    <p className="text-[16px]/[26px] text-[var(--ink)] italic">
                      &ldquo;{receipt.quote}&rdquo;
                    </p>
                    <cite className="mt-2 block text-[12px]/[16px] text-[var(--ink-faint)] not-italic">
                      {receipt.attribution}
                    </cite>
                  </blockquote>
                ))}
              </div>
            )}
          </Block>

          <Block label="What we&rsquo;re testing">
            <p>{study.testing}</p>
          </Block>

          <Block label="Why we&rsquo;re asking">
            <p>{study.why}</p>
          </Block>

          {study.prototype && (
            <Block label="The prototype">
              <ol className="flex flex-col gap-3">
                {study.prototype.map((step, index) => (
                  <li key={step} className="flex gap-4">
                    <span className="mt-1 shrink-0 text-[12px]/[20px] font-semibold text-[var(--ink-faint)] tabular-nums">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Block>
          )}

          <Block label="How we&rsquo;d run it">
            {study.run.map((step) => (
              <p key={step.lead}>
                <strong className="font-semibold text-[var(--ink)]">
                  {step.lead}
                </strong>{" "}
                {step.detail}
              </p>
            ))}
          </Block>
        </div>

        <aside className="lg:pt-1">
          <h2 className="text-[11px]/[14px] font-semibold tracking-[0.12em] text-[var(--ink-muted)] uppercase">
            On the card
          </h2>
          <p className="mt-4 text-[15px]/[24px] text-[var(--ink-secondary)]">
            {item.description}
          </p>

          {links.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface)]/70 px-3 py-1.5 text-[13px]/[18px] text-[var(--ink-secondary)] transition-colors duration-200 hover:border-[var(--border-strong)] hover:text-[var(--ink)]"
                >
                  {link.label}
                  <span aria-hidden className="text-[var(--ink-faint)]">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
