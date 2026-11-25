# Remedy, the work

The handoff site for Remedy — every feature, source file and Labs concept, with a link to
the design behind it. Next.js 16, Tailwind 4, statically prerendered.

Styling follows the reference handoff site (the Baylee/BSWH screenshot): warm ivory wash,
a sticky grouped index, and card grids of tinted preview panels over title, status and
description.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static prerender
```

## The spreadsheet is the source of truth

`remedy-work-site-content.xlsx` holds every card. Nothing on the site is hardcoded copy.

```bash
npm run content  # xlsx -> src/lib/content.generated.ts
```

Edit the sheet, run that, and the site follows. **Never hand-edit
`src/lib/content.generated.ts`** — it is overwritten on every run.

The generator uses only the Python standard library (an `.xlsx` is a zip of XML), so there
is nothing to install beyond the `python3` that ships with macOS. It reads the `Site
Content` and `Sections` sheets, maps columns by their header label rather than position —
so reordering columns is safe — drops any row flagged as an example, and fails loudly on
duplicate titles or a row pointing at a section the `Sections` sheet does not define.

## Opening a design

Hovering a card's preview panel reveals the way into Figma; clicking a button opens it in
a new tab. Most items exist on three platforms, so there is no single destination — those
cards reveal one button per platform under an "Open in Figma" caption, and items with a
single file (Foundations, the icon library) reveal one button instead. Labs studies say
"Open" and go to their page on this site; the repo link lives on that page.

The split is by input capability, not screen width: `@media (hover: hover)` gets the
overlay, `@media (hover: none)` gets a persistent link row under the description, because
a touch device has no hover state to discover. Only one set of links is ever in the tab
order, and `:focus-within` reveals the overlay for keyboard users so focus never lands on
something invisible.

## Preview images

Cards fall back to a tinted panel captioned with the filename they are waiting for, e.g.
`remedy-chat-core.png`. Drop that file into `public/previews/` and the card picks it up on
the next build — no code change. The name is derived from the title unless the sheet's
`Visual` column names something else, which wins.

The exports come from the **Handoff site** page of the Remedy V2.0 All Flows Figma file,
one 960x720 frame per card, exported at 1x. The panel behind them is `--panel-gradient`,
so a thumbnail has to be a **transparent** PNG for that gradient to show — but Figma bakes
the frame's flat fill (#F5F5F5, or #F5F6FA on the title cards) into the export. Run each
new export through

    python3 scripts/key-preview-background.py public/previews/<slug>.png

to key that fill out; only the fill connected to the frame border goes, so the cards and
bubbles inside the composition keep theirs. A frame whose art is type wants `--enclosed`
as well: the counters inside a letterform are the fill colour too, and being enclosed they
survive the flood fill and then show as pale blobs inside the letters. Only pass it when
nothing in the composition legitimately uses the fill colour — true of the two title
cards, false of a screenshot full of near-white UI.

Some frames carry a background of their own and are meant to cover the panel, so they ship
exactly as exported: the gradient title cards (`ui-kit`, `foundations`, `icon-library`),
`accessibility-audit`, and the three given tinted surfaces in Figma —
`personalization-and-menu` (lavender), `navigation-ui` (mint) and `explain-enhanced`
(periwinkle). Those tints are the direction the thumbnails are heading; `--panel-gradient`
is the surface for the frames that have not been given one yet, which is why it runs at
full strength rather than as a wash.

The script is the check — run it and read the percentage it reports. A frame with a flat
#F5F5F5 fill keys 40-95% of itself; anything near zero means the background is the
designer's, and that export belongs in the group above.

## Labs studies

A Labs card has no Figma file behind it, so it opens a page on this site instead: its
hover affordance reads "Open" and goes to `/labs/<slug>`, and where footage exists its
thumbnail is the prototype loop rather than a still.

All thirteen come from the loblaw-labs-lite repo. The study prose is ported into
`src/lib/studies.ts` — one entry per slug, extracted rather than retyped, with a note
there on which of the repo's fields were left out and why. The footage is copied into
`public/labs/` keeping the repo's own filenames, so it is obvious where a clip came from:
a short `-card.mp4` loop for the thumbnail, the full clip for the page, and a
`-poster.jpg` so neither frame is ever empty while loading. Six studies have footage; the
other seven say so on the card and read complete without it.

Studies whose prototype has not been filmed show their category's icon from the labs repo
on the panel, and sort after the ones with footage so the section leads with real screens.

`wide: true` on a study runs its card across two columns with the clip's own 16:9 instead
of the grid's 4:3, and sorts it to the end of its group so it starts a row rather than
stranding a hole. Nothing sets it — the loyalty scan study did, since its footage is a
room rather than a phone, but three cards to a row won. The treatment is built and one
line turns it back on.

The Labs categories (First use, One agent, Trust…) organise the spreadsheet but are not
shown: the section renders as one run of cards. `UNGROUPED_SECTIONS` in `content.ts` is
the switch, and the sidebar reads the same flag, so the index cannot drift from the page.

## The lockup

The hero and the gate pair the two real brand marks — `public/lca-lockup.svg` and
`public/loblaw-digital-mask.svg`. Each is drawn as an alpha mask over a solid fill rather
than as an `<img>`, because both carry a baked-in near-black; masking discards that and
takes the colour from `--ink-display`, so the lockup rethemes with the type.

The wordmark was a 495x290 PNG until it was replaced with vector — at the hero's largest
step it drew at 270x158 CSS px, which wanted 540x316 on a 2x display and was very slightly
soft next to the vector LCA mark.

The lockup itself is `src/components/lockup.tsx`, shared by the hero and the password
gate. Whatever font-size its container sets is the scale: both marks and the cross are
sized in `em`, so every step moves them together. `LOCKUP_SCALE` sets
the marks' size within that, and the ratio between them (LCA at 38.85% of the Loblaw
block's height) comes from the official lockup in the Labs repo, so the two sites agree;
widths derive from each asset's aspect ratio, so a mark can never skew.

The cross between them carries a left margin and no right one, which is what makes it look
centred. The Loblaw mask has 12.93% transparent padding down each side and the LCA mask is
trimmed to its ink, so equal margins would sit the cross visibly closer to LCA; the numbers
in `lockup.tsx` put 0.375em of visible gap on both sides. Recompute them if either mask is
re-exported.

## Where the design lives

Every visual value is a named token in `src/app/globals.css`. To retheme, change tokens
there and nothing else. `--accent` is the single accent (section eyebrows, active nav
marker); it is currently the reference's green.

The token values were **estimated from a screenshot**, not sampled from source. Drop the
reference PNG into `reference/` to have them matched exactly. `--panel-gradient` is the
exception: it is read off the Figma `Gradient` frame and matches it to within a rounding
step per channel.

## Known content issues, carried from the sheet

These are in the data, not the build. Each is visible on the site rather than hidden:

1. **Two status vocabularies.** `Site Notes` defines Shipped / In build / Design complete /
   Concept / Archived, but all 13 Labs rows use Open / Prototype ready / In flight.
   `src/lib/status.ts` maps both onto four tones. Worth reconciling in the sheet. No row
   says Shipped any more, so the green "done" tone is currently unused and seventeen of
   the thirty-three cards read Design complete in the blue "ready" tone; moving Design
   complete onto `done` is a one-line change in `status.ts` if that reads better.
2. **`Visual` is empty on every row**, so all filenames are currently derived.
3. **File Upload has no links** on any platform — renders as "No link yet".
4. **Two link mismatches** between the sheet and the original mock, unresolved: 
   Personalization and Menu (`1981-1813` vs `1981-18139`) and Long Summary's Android link
   (`154-2` vs `154-21458`). The sheet's values are the ones live on the site.
5. **`Tags` is unused.** The sheet describes it as "filtering on the site"; the reference
   layout has no filter UI, so tags are carried in the data but not rendered.
6. **Open questions in the sheet's Notes column** are deliberately not published: which web
   file booking and refills should point at, and whether both file generations belong here.
   The UI kit's Android and web links have since landed, so that note is closed.

## The password gate

The site sits behind one shared password. `src/proxy.ts` — Next 16's rename of
`middleware.ts` — checks a cookie on every request and redirects to `/gate` without one,
so an unauthenticated visitor never receives page HTML, a preview export or a prototype
clip. The gate page is styled as the hero is, and remembers where the visitor was headed,
so a deep link into a study still lands there after signing in.

The password is `SITE_PASSWORD` when the host sets it, otherwise the fallback in
`src/lib/gate.ts` so a fresh clone runs without setup. The cookie holds a SHA-256 of the
password rather than a flag, so it cannot be forged by anyone who reads this file and
tries setting `gate=1`.

**It needs a server.** Middleware runs on `next start`, Vercel, or any Node host. Export
this site as static files and the gate quietly disappears — the pages would be served
straight off disk with nothing to check the cookie. And one shared password with no rate
limiting keeps a link from being casually forwarded; it is not protection for anything
that would genuinely hurt to leak.

## Not built

Prev/next navigation between study pages. With one section of thirteen it is easier to go
back to the grid, and the grid is one click away.
