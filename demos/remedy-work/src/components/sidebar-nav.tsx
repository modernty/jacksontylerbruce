"use client";

import { useEffect, useState } from "react";

import { SECTION_VIEWS, sectionId } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * The sticky index, following the reference: uppercase letterspaced group labels over
 * plain item links, with the active item marked by an accent bar and a heavier weight.
 *
 * The reference has two levels (group, item); this content has three, so sections carry a
 * small accent label above their groups. That keeps all 33 items reachable without the
 * grouping from the spreadsheet being flattened away — except in the sections that render
 * flat on the page, where the index matches and lists their items in one run.
 */

/** Every item slug in render order — the observer reports against these. */
const SLUGS = SECTION_VIEWS.flatMap((section) =>
  section.groups.flatMap((group) => group.items.map((item) => item.slug)),
);

export function SidebarNav() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const cards = SLUGS.map((slug) => document.getElementById(slug)).filter(
      (element): element is HTMLElement => element !== null,
    );
    if (cards.length === 0) return;

    // Track every card's intersection state and pick the topmost visible one, rather than
    // reacting to whichever entry fired last. With a three-column grid several cards
    // cross the threshold on the same frame, and "last to fire" picks an arbitrary
    // column.
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const topmost = SLUGS.find((slug) => visible.has(slug));
        if (topmost) setActive(topmost);
      },
      // A band across the upper middle of the viewport, so the highlight changes as a row
      // reaches reading position instead of the moment it appears at the bottom.
      { rootMargin: "-15% 0px -55% 0px", threshold: 0 },
    );

    for (const card of cards) observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Sections"
      className="flex flex-col gap-16 text-[15px]/[22px]"
    >
      {SECTION_VIEWS.map((section) => (
        <div key={section.name} className="flex flex-col gap-6">
          <a
            href={`#${sectionId(section.name)}`}
            className="text-[11px]/[14px] font-semibold tracking-[0.14em] text-[var(--accent)] uppercase"
          >
            {section.name}
          </a>

          {section.groups.map((group) => (
            <div key={group.name} className="flex flex-col gap-2">
              {section.grouped && (
                <p className="text-[10.5px]/[14px] font-semibold tracking-[0.12em] text-[var(--ink-faint)] uppercase">
                  {group.name}
                </p>
              )}

              <ul className="flex flex-col">
                {group.items.map((item) => {
                  const isActive = active === item.slug;
                  return (
                    <li key={item.slug}>
                      <a
                        href={`#${item.slug}`}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "block border-l-2 py-[5px] pl-3 transition-colors duration-200",
                          isActive
                            ? "border-[var(--accent)] font-semibold text-[var(--ink)]"
                            : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]",
                        )}
                      >
                        {item.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}
