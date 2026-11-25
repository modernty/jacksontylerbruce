"use client";

import { useEffect } from "react";

/**
 * Honours the hash on a fresh page load.
 *
 * Every card and section carries an anchor, and the site leans on that — the sidebar
 * links to them, and a study page's back link returns to the exact card it came from. On
 * a soft navigation those work. On a fresh document load they did not: the browser makes
 * its jump while the page is still parsing, and the App Router's scroll handling then
 * puts the reader back at the top, so `/#citations` opened on the hero.
 *
 * One effect after mount, by which point the element exists and nothing else is competing
 * for the scroll position.
 */
export function HashScroll() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const target = document.getElementById(decodeURIComponent(hash));
    if (!target) return;

    /* `instant` rather than the stylesheet's smooth: the reader asked for a specific card,
       and animating seven thousand pixels only makes them watch the page go past. */
    target.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);

  return null;
}
