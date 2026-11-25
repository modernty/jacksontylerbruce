import Link from "next/link";
import Image from "next/image";
import {
  getManifest,
  getFeatures,
  getScreensForFeature,
  getCoverage,
  figmaUrl,
  publicImageSize,
} from "@/lib/content";
import { DraftLink } from "@/components/draft-link";
import { StatusBadge, FigmaLink } from "@/components/chrome";
import { BrandLockup } from "@/components/lockup";

export default function IndexPage() {
  const { _meta } = getManifest();
  const features = getFeatures();
  const coverage = getCoverage();

  return (
    <main>
      {/*
       * The hero is a measured frame rather than a headline over a gradient. This is a
       * specification site, so the most characteristic thing in its world is a screen
       * with a dimension on it — and the one shown is real, taken from the spec itself.
       */}
      <section className="ground">
        <div className="mx-auto grid max-w-[1480px] items-center gap-16 px-8 pb-16 pt-20 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-[46ch]">
            <BrandLockup className="mb-1 text-[44px]" />

            <h1 className="display mt-9 text-[clamp(38px,5.5vw,var(--step-display))] leading-[1.06] text-ink">
              {_meta.title}
            </h1>

            <p className="mt-5 text-[17px] leading-[1.6] text-ink-2">{_meta.blurb}</p>

            <dl className="mt-9 flex flex-wrap gap-x-12 gap-y-4">
              <Stat label="Features" value={coverage.features} />
              <Stat label="Platform" value={_meta.platform} />
            </dl>

            <div className="mt-9 flex flex-col items-start gap-2.5">
              {_meta.files.map((file) => (
                <FigmaLink key={file.key} href={figmaUrl(file.key)} label={file.name} />
              ))}
            </div>
          </div>

          <HeroFigure />
        </div>
      </section>

      {/*
       * Features are cards. A rule between rows read as prose rather than as something
       * to click — the border and the lift are what say "this is a target".
       */}
      <section className="mx-auto max-w-[1480px] px-8 py-12">
        <ul className="flex flex-col gap-3">
          {features.map((feature) => {
            const screens = getScreensForFeature(feature);

            return (
              <li key={feature.slug}>
                <Link
                  href={`/features/${feature.inProgress?.holdSlug ?? feature.slug}`}
                  className="group grid items-start gap-8 rounded-[14px] border border-rule bg-paper p-8 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-rule-strong hover:shadow-[0_6px_28px_var(--shadow-soft)] lg:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="max-w-[62ch]">
                    <h2 className="text-[29px] font-semibold tracking-[-0.02em] text-ink transition-colors group-hover:text-measure">
                      {feature.name}
                    </h2>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <StatusBadge status={feature.status} />
                      <span className="text-[14px] text-ink-3">{_meta.platform}</span>
                    </div>

                    <p className="mt-5 text-[16px] leading-[1.6] text-ink-2">{feature.summary}</p>

                  </div>

                  {/* A feature can supply one image for its card; otherwise the card
                      shows a row of the screens behind it. */}
                  {feature.thumbnail ? (
                    <Image
                      src={feature.thumbnail}
                      alt=""
                      width={publicImageSize(feature.thumbnail)?.width ?? 1268}
                      height={publicImageSize(feature.thumbnail)?.height ?? 960}
                      sizes="300px"
                      className="w-[300px] shrink-0 rounded-[10px]"
                    />
                  ) : (
                    <div className="flex shrink-0 items-center gap-2.5">
                      {screens.slice(0, 4).map((screen) => (
                        <Image
                          key={screen.slug}
                          src={screen.image}
                          alt=""
                          width={screen.imagePixels.width}
                          height={screen.imagePixels.height}
                          sizes="88px"
                          className="w-[88px] rounded-[7px] border border-rule bg-surface"
                        />
                      ))}
                    </div>
                  )}
                </Link>

                {feature.inProgress && (
                  <DraftLink slug={feature.slug} label="working draft" />
                )}
              </li>
            );
          })}
        </ul>
      </section>

    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-[13px] text-ink-3">{label}</dt>
      <dd className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-ink">{value}</dd>
    </div>
  );
}

/**
 * The hero: the two features this site covers, side by side. A supplied 2x export
 * rather than anything composed here, so it stays whatever the designers hand over.
 */
function HeroFigure() {
  return (
    <Image
      src="/demos/loblaw-handoff/hero.png"
      alt="Memory and Chat history"
      width={1596}
      height={1704}
      sizes="440px"
      priority
      className="hidden w-[440px] shrink-0 lg:block"
    />
  );
}
