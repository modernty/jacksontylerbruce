import { notFound } from "next/navigation";
import {
  getAllScreenSlugs,
  getScreen,
  getScreenGroup,
  getFeature,
  figmaUrl,
  type Screen,
} from "@/lib/content";
import { TopBar, Breadcrumb, Count, FigmaLink } from "@/components/chrome";
import { SpecViewer } from "@/components/spec-viewer";

export function generateStaticParams() {
  return getAllScreenSlugs().map((slug) => ({ slug }));
}

export default async function ScreenPage({ params }: PageProps<"/screens/[slug]">) {
  const { slug } = await params;

  let screen: Screen;
  try {
    screen = getScreen(slug);
  } catch {
    notFound();
  }

  const feature = getFeature(screen.feature);
  const states = getScreenGroup(slug);

  return (
    <>
      <TopBar>
        <Breadcrumb
          trail={[
            { label: feature.name, href: `/features/${feature.slug}` },
            { label: screen.name },
          ]}
        />
      </TopBar>

      <main className="mx-auto max-w-[1440px] px-6 py-8">
        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[72ch]">
            <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink">
              {screen.name}
            </h1>
            <p className="mt-2 text-[15px] leading-[1.6] text-ink-2">{screen.summary}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Count
                value={`${screen.dimensions.width}×${screen.dimensions.height}`}
                unit="frame"
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
            <FigmaLink href={figmaUrl(screen.figmaFileKey, screen.figmaNodeId)} />
            <span className="font-mono text-[11px] text-ink-4">
              {states.length > 1
                ? `${states.length} states · extracted ${screen.extractedOn}`
                : `${screen.figmaNodeId} · extracted ${screen.extractedOn}`}
            </span>
          </div>
        </header>

        <SpecViewer screen={screen} states={states} />
      </main>
    </>
  );
}
