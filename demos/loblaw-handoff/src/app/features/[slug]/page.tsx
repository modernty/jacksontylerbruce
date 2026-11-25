import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getFeatures,
  getFeature,
  getFeatureByRoute,
  getFeatureRoutes,
  getScreensForFeature,
  getScreen,
  hasScreen,
  figmaUrl,
  publicImageSize,
  type Feature,
} from "@/lib/content";
import { getPrototype } from "@/lib/prototype";
import { MemoryPrototype } from "@/components/prototype/memory-prototype";
import { TRY_IT } from "@/components/prototype/try-it";
import { cn } from "@/lib/utils";
import {
  TopBar,
  Breadcrumb,
  StatusBadge,
  Count,
  FigmaLink,
  SectionHeading,
} from "@/components/chrome";

/**
 * The holding notice. Deliberately plain: a sentence in the site's own voice inside the
 * same instrument panel every other block uses, rather than an illustration — a reader
 * who arrives here wants to know when to come back, not to be entertained.
 */
/**
 * The frames the demo was built from, under the demo.
 *
 * A running demo is the one thing on this site that is not the file — it answers what a
 * frame cannot and claims nothing about geometry. This strip is the way back: small
 * enough not to compete with the demo above it, and linked so a reader checking a detail
 * lands on the frame rather than trusting the rebuild.
 *
 * A slug with no extracted screen is skipped. The alternative is a dead link that looks
 * identical to a live one until it is clicked.
 */
function TryItScreens({ slugs, featureName }: { slugs: string[]; featureName: string }) {
  const screens = slugs.filter(hasScreen).map(getScreen);
  if (screens.length === 0) return null;

  return (
    <div className="mt-6 border-t border-rule pt-5">
      <p className="label mb-4">The frames behind it</p>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {screens.map((screen) => (
          <li key={screen.slug}>
            <Link
              href={`/screens/${screen.slug}`}
              className="group flex items-center gap-4 rounded-[10px] border border-rule bg-paper p-3 transition-colors hover:border-rule-strong"
            >
              <span className="flex h-[84px] w-[40px] shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-rule bg-white/80">
                <Image
                  src={screen.image}
                  alt={`${featureName} — ${screen.name}`}
                  width={screen.imagePixels.width}
                  height={screen.imagePixels.height}
                  sizes="40px"
                  className="block size-full object-cover object-top"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium leading-[1.4] text-ink">
                  {screen.name}
                </span>
                <span className="literal mt-1 block text-ink-4">{screen.figmaNodeId}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InProgress({ notice }: { notice: NonNullable<Feature["inProgress"]> }) {
  return (
    <section className="mt-12">
      <div className="instrument max-w-[68ch] px-7 py-8">
        <div className="mb-4 flex items-center gap-2.5">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-[color:var(--limit)]" />
          <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-ink">
            {notice.title}
          </h2>
        </div>
        <p className="text-[15px] leading-[1.65] text-ink-2">{notice.body}</p>
      </div>
    </section>
  );
}

export function generateStaticParams() {
  return getFeatureRoutes().map((slug) => ({ slug }));
}

export default async function FeaturePage({ params }: PageProps<"/features/[slug]">) {
  const { slug } = await params;

  let feature: Feature;
  // `held` is true only on the feature's hold route, which serves the notice alone.
  let held = false;
  try {
    ({ feature, held } = getFeatureByRoute(slug));
  } catch {
    notFound();
  }

  const screens = getScreensForFeature(feature);
  // null for any feature without a prototype file — same contract as getScreensForFeature.
  const prototype = getPrototype(slug);
  // A feature carries either a full prototype or a single-behaviour demo, not both.
  const TryIt = feature.tryIt ? TRY_IT[feature.tryIt] : null;

  const body = (
    <>
        {prototype && (
          <section className="mt-12">
            <SectionHeading>Try it</SectionHeading>
            <MemoryPrototype data={prototype} />
          </section>
        )}

        {!prototype && TryIt && (
          <section className="mt-12">
            <SectionHeading>Try it</SectionHeading>
            <TryIt />
            <TryItScreens slugs={feature.tryItScreens ?? []} featureName={feature.name} />
          </section>
        )}

        {/* Evidence — only where a feature has no frames and is built from fragments. */}
        {feature.evidence && feature.evidence.length > 0 && (
          <section className="mt-12">
            <SectionHeading count={feature.evidence.length}>
              What the file actually says
            </SectionHeading>
            <div className="grid max-w-[100ch] gap-4">
              {feature.evidence.map((item) => (
                <figure key={item.title} className="border-t border-rule pt-5">
                  <figcaption className="label mb-3">{item.title}</figcaption>
                  <blockquote className="border-l-2 border-rule-strong pl-4 text-[15px] leading-[1.65] text-ink">
                    “{item.body}”
                  </blockquote>
                  <p className="literal mt-4 text-ink-4">{item.source}</p>
                  {item.note && (
                    <p className="mt-2 text-[13px] leading-[1.6] text-ink-3">{item.note}</p>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* States and screens */}
        <section className="mt-12">
          <SectionHeading count={feature.states.length}>
            {feature.statesLabel ?? "States"}
          </SectionHeading>

          {feature.states.length === 0 ? (
            <p className="max-w-[72ch] rounded-2xl border border-dashed border-rule-strong/60 bg-white/50 px-6 py-8 text-[15px] leading-[1.6] text-ink-3">
              Nothing has been drawn for this feature yet. What is known about it is
              recorded against the other features' screens.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {feature.states.map((state) => {
                const screen = screens.find((s) => s.slug === state.screen);
                const art = state.thumbnail
                  ? { src: state.thumbnail, size: publicImageSize(state.thumbnail) }
                  : null;

                if (!screen) {
                  return (
                    <div
                      key={state.name}
                      className="flex flex-col justify-between gap-4 rounded-[10px] border border-dashed border-rule-strong/60 p-6"
                    >
                      <div>
                        <h3 className="text-[16px] font-semibold text-ink">{state.name}</h3>
                        <p className="mt-2 text-[14px] leading-[1.6] text-ink-3">
                          {state.description}
                        </p>
                      </div>
                      <span className="label">Not extracted</span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={state.name}
                    href={`/screens/${screen.slug}`}
                    className="group flex flex-col"
                  >
                    {/* One box, whatever is in it. The mat holds a fixed 4:5 so every
                        card in the row ends at the same line and the headings below it
                        align — a supplied thumbnail and a raw screen export have very
                        different proportions, and sizing to the art let the row ragged.

                        The mat sits at 80% white so the page ground tints through rather
                        than the art floating on a brighter field than the page.

                        A thumbnail brings its own margin and fills the box. An export is
                        contained and centred, and gets no border or radius of its own —
                        it already carries the device's rounded corners, and drawing a
                        second, tighter corner over the first left a white wedge in each
                        top corner. */}
                    <div
                      className={cn(
                        "flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[10px] border border-rule bg-white/80",
                        art ? null : "p-5"
                      )}
                    >
                      <Image
                        src={art?.src ?? screen.image}
                        alt={`${feature.name} — ${state.name}`}
                        width={art?.size?.width ?? screen.imagePixels.width}
                        height={art?.size?.height ?? screen.imagePixels.height}
                        sizes="(max-width: 1024px) 45vw, 420px"
                        className={cn(
                          "block",
                          art ? "size-full object-cover" : "max-h-full w-auto object-contain"
                        )}
                      />
                    </div>

                    <div className="flex flex-1 flex-col pt-4">
                      <h3 className="text-[16px] font-semibold text-ink">{state.name}</h3>
                      <p className="mt-2 flex-1 text-[14px] leading-[1.6] text-ink-3">
                        {state.description}
                      </p>

                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

    </>
  );

  return (
    <>
      <TopBar>
        <Breadcrumb trail={[{ label: feature.name }]} />
      </TopBar>

      <main className="mx-auto max-w-[1440px] px-6 py-12">
        {/* Header */}
        <header className="max-w-[72ch]">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
              {feature.name}
            </h1>
            <StatusBadge status={feature.status} />
          </div>

          <p className="text-[17px] leading-[1.6] text-ink-2">{feature.summary}</p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {feature.figmaFileKey && (
              <FigmaLink
                href={figmaUrl(feature.figmaFileKey, feature.figmaPageId)}
                label={
                  feature.figmaPageName
                    ? `Open “${feature.figmaPageName}” in Figma`
                    : "Open in Figma"
                }
              />
            )}
            {!held && <Count value={screens.length} unit="screens" />}
          </div>
        </header>


        {/* The hold route shows the notice and stops there. The feature's own slug
            always serves the whole page. */}
        {held && feature.inProgress ? <InProgress notice={feature.inProgress} /> : body}
      </main>
    </>
  );
}
