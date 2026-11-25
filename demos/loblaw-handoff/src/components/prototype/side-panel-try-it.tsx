"use client";

import { useEffect, useRef, useState } from "react";
import { SidePanelPageFull } from "@/components/screens/side-panel-page-states";
import { GLASS, Glyph, ICON } from "@/components/screens/parts";

/**
 * The side panel, opening and closing.
 *
 * The three frames in the file each draw the panel at rest. What none of them draws is
 * the thing the panel actually does — arrive over what you were reading, and leave. This
 * runs that, so the motion and the dismissals can be agreed before they are built.
 *
 * The panel itself is the same component the Designs tab renders, at the same 330 width,
 * so this cannot drift from the spec: fix the panel and this fixes with it.
 *
 * Motion reuses the sheet tokens rather than inventing its own — translate only, with
 * visibility held through the exit, which is how every other overlay on this site
 * animates out without a library. Reduced motion is handled by `.proto`.
 */
export function SidePanelTryIt() {
  const [open, setOpen] = useState(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Escape closes, which is the dismissal a pointer-only demo would otherwise miss.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus follows the panel in and comes back out with it.
  useEffect(() => {
    if (open) panel.current?.focus();
    else openButton.current?.focus({ preventScroll: true });
    // Intentionally not firing on mount: nothing has moved yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="mt-6">
      <div
        className="proto relative overflow-hidden"
        style={{
          width: 393,
          height: 852,
          borderRadius: 48,
          backgroundImage: BACKDROP_GRADIENT,
          backgroundSize: "100% 100%",
        }}
      >
        {/* The conversation the panel arrives over. Inert while the panel is open, so a
            keyboard user cannot tab into what the scrim has covered. */}
        <div className="absolute inset-0" inert={open}>
          <div className="absolute left-0 right-0 flex items-center justify-between" style={{ top: 54, height: 68, paddingLeft: 24, paddingRight: 24 }}>
            <button
              ref={openButton}
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="side-panel-try-it"
              className="flex shrink-0 cursor-pointer items-center justify-center overflow-hidden"
              style={{ ...GLASS, width: 48, height: 48, borderRadius: 48, padding: 4 }}
            >
              <Glyph src={`${ICON}/nav-menu.svg`} size={24} />
              <span className="sr-only">Open the side panel</span>
            </button>

            <span className="flex shrink-0 items-center justify-center overflow-hidden" style={{ ...GLASS, width: 48, height: 48, borderRadius: 48, padding: 4 }}>
              <Glyph src={`${ICON}/nav-close.svg`} size={24} />
            </span>
          </div>

          <div
            className="absolute left-0 right-0 flex flex-col items-start"
            style={{ top: 122, height: 604, gap: 24, paddingTop: 24, paddingBottom: 16, paddingLeft: 16, paddingRight: 16 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ICON}/pc-chat-mark-40.svg`} alt="" width={40} height={40} className="block shrink-0" />
            <p className="w-full shrink-0" style={{ font: "600 28px/38px var(--fig-font-display)", color: "var(--fig-text-primary)" }}>
              Hi Jane,
              <br />
              What&rsquo;s on your mind?
            </p>
          </div>

          <div className="absolute left-0 right-0 flex flex-col items-start justify-end" style={{ top: 726, paddingBottom: 32, paddingLeft: 16, paddingRight: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ICON}/composer.svg`} alt="" width={361} height={94} className="block w-full shrink-0" />
          </div>
        </div>

        {/* The dim doubles as the dismissal, which is how the drawn frames imply it closes
            — there is no close control inside the panel. */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          className="proto-scrim cursor-pointer"
          data-open={open}
        >
          <span className="sr-only">Close the side panel</span>
        </button>

        <div
          id="side-panel-try-it"
          ref={panel}
          tabIndex={-1}
          role="group"
          aria-label="Side panel"
          className="proto-panel outline-none"
          data-open={open}
        >
          <SidePanelPageFull />
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ICON}/status-bar.svg`} alt="" width={393} height={54} className="pointer-events-none absolute left-0 top-0 block" />
      </div>

      <p className="mt-4 max-w-[62ch] text-[13px] leading-[1.6] text-ink-3">
        Tap the menu to open it, the dim or <kbd className="literal">Esc</kbd> to close. The panel
        is the same component the Designs tab renders. Closing is inferred: none of the three frames
        draws a control inside the panel for it, and the file&rsquo;s own close button sits in the
        conversation behind — see the open questions below.
      </p>
    </div>
  );
}

/**
 * Figma's own radial gradient, kept as the SVG the file emits rather than re-expressed as
 * a CSS radial-gradient — the transform matrix carries a rotation and a non-uniform scale
 * that CSS cannot state without rounding it into something else.
 */
const BACKDROP_GRADIENT =
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 393 852' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%25' width='100%25' fill='url(%23g)'/><defs><radialGradient id='g' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(3.6605e-16 -41.528 68.995 1.6479e-7 204.32 871.5)'><stop stop-color='rgb(255,222,229)' offset='0'/><stop stop-color='rgb(245,246,250)' offset='0.6'/></radialGradient></defs></svg>\")";
