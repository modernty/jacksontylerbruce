import { HashScroll } from "@/components/hash-scroll";
import { Hero } from "@/components/hero";
import { SidebarNav } from "@/components/sidebar-nav";
import { WorkCard } from "@/components/work-card";
import { ITEMS, SECTION_VIEWS, sectionId } from "@/lib/content";

/**
 * The whole site: a full-height hero, then a sticky index beside every section's card grid.
 *
 * One page rather than a route per section, because the value of a handoff site is that
 * everything is in one scroll and one Cmd-F. Sections and cards both carry anchors, so
 * any single item is still linkable.
 */
export default function Home() {
  return (
    <>
      <HashScroll />
      <Hero />

      <div className="mx-auto grid max-w-[1560px] grid-cols-1 gap-x-20 gap-y-12 px-8 pt-10 pb-14 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-12 lg:pt-16 lg:pb-20">
        <aside className="lg:sticky lg:top-12 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-2 lg:pb-6">
          <SidebarNav />
        </aside>

        <main className="min-w-0">
          <div className="flex flex-col gap-40">
            {SECTION_VIEWS.map((section) => (
              <section
                key={section.name}
                id={sectionId(section.name)}
                className="scroll-mt-12"
              >
                {/* The standfirst is optional — the sheet's `Intro copy` column is blank
                    on every section at the moment, and a heading on its own is enough. */}
                <header className="mb-12 max-w-[62ch]">
                  <h2 className="text-[30px]/[38px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
                    {section.heading}
                  </h2>
                  {section.intro && (
                    <p className="mt-4 text-[16px]/[26px] text-[var(--ink-secondary)]">
                      {section.intro}
                    </p>
                  )}
                </header>

                <div className="flex flex-col gap-16">
                  {section.groups.map((group) => (
                    <div key={group.name}>
                      {/* Some sections group only in the spreadsheet — see
                          `UNGROUPED_SECTIONS`. Theirs is a single run of cards. */}
                      {section.grouped && (
                        <div className="mb-8 flex items-center gap-5">
                          <p className="text-[11px]/[14px] font-semibold tracking-[0.12em] text-[var(--ink-muted)] uppercase">
                            {group.name}
                          </p>
                          <span
                            aria-hidden
                            className="h-px flex-1 bg-[var(--border-default)]"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
                        {group.items.map((item) => (
                          <WorkCard key={item.slug} item={item} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-28 border-t border-[var(--border-default)] pt-8 text-[13px]/[20px] text-[var(--ink-faint)]">
            {ITEMS.length} items, generated from remedy-work-site-content.xlsx.
            Cards without a preview name the export they are waiting for.
          </footer>
        </main>
      </div>
    </>
  );
}
