# Product Handoff

The handoff site for the Loblaw assistant — one page per feature covering what it does,
the screens behind it, the design tokens those screens resolve to, and what a developer
still needs decided before building it.

Next.js 16, Tailwind 4, statically prerendered. Styling follows the
[LCA × Loblaw Digital Labs site](https://github.com/TylerLCA/Loblaw): the New Neutrals
ramp, SF Pro Text, and the drifting gradient wash.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # builds screen data, then prerenders
```

## Two Figma files

Specs span more than one source, and the site says which is which:

| File | Key | Used for |
|---|---|---|
| `[iOS] Remedy — September Launch` | `yIzE3IWqhgtCP2Fo44aAvp` | Memory Management. Current. |
| `[iOS] Remedy V1.0 Handoff` | `9rGdmVvVfuH8vJh6WioKTs` | Chat History. Superseded — the September Launch moves history into a side panel. |

The two files do not share a token system. V1 names colours by ramp position
(`New Neutrals/Black`); September Launch names them by role (`text/primary`) and composes
type tokens out of `font/family`, `font/size` and `font/lh`. Screens carry a `tokenSet` so
the difference stays visible rather than being flattened.

## How a feature is structured

All under `/data`, all read at build time. Nothing on the site is hardcoded copy.

| File | Holds | Authored by |
|---|---|---|
| `data/manifest.json` | Project meta, source files, feature list | Hand |
| `data/features/<slug>.json` | Product spec — overview, user stories, states, behaviour, accessibility | Hand |
| `data/tokens/<set>.json` | A shared token set several screens reference | Hand |
| `data/screens/<slug>.json` | Design spec — constraints, loose ends, code, screen-specific tokens | Hand |
| `data/styles/<slug>.json` | Per-node fill, radius, padding, gap and effects | Hand, from design context |
| `data/raw/<slug>.xml` | Figma's layer metadata for one frame | Pasted from the Figma MCP |
| `data/generated/<slug>.json` | All of the above, merged | `npm run build:screens` |

**Never hand-edit `data/generated/`** — it is overwritten on every build.

## Adding a screen

Extraction is agent-driven rather than scripted, because the Figma MCP cannot be called
from Node.

1. **Find the frame.** `get_metadata` with a file key and a node id returns the layer
   tree. Calling it with no `nodeId` lists only the Cover page — pages are not
   enumerable, so you need a node-specific URL or a known page id.
2. **Save the tree.** Put the `<frame>…</frame>` subtree in `data/raw/<slug>.xml`, with
   the frame itself as the root element.
3. **Export the image.** `get_screenshot` on the same node, then download the PNG to
   `public/screens/<slug>.png`. The URL expires — download it immediately.
4. **Pull the tokens.** `get_variable_defs` for the System tab; `get_design_context` for
   the Code tab.
5. **Write the spec.** Create `data/screens/<slug>.json`, referencing a `tokenSet` and
   adding only what is specific to that screen.
6. **Build.** `npm run build:screens`.

Then add the state to the feature's `states` array so it appears on the feature page.

### Why the XML is saved rather than fetched

Figma reports a child's `x`/`y` relative to its parent. `scripts/build-screens.mjs` walks
the saved tree accumulating that offset so every node ends up with bounds that are
absolute within the frame — which is what lets the Designs tab draw a hit box over the
exported PNG at any zoom. Keeping the raw XML in the repo makes that walk reproducible
and the extraction reviewable in a diff.

Two details the walk handles:

- **The root frame is pinned to (0, 0).** Its own `x`/`y` is a position on the Figma
  canvas and means nothing once the frame is exported alone.
- **`imageFrame` carries export bleed.** Some frames have a drop shadow falling outside
  the frame box, so Figma's PNG is bigger than the frame — the side panel is 302×852 but
  exports at 342×892. `imageFrame` records where the frame origin sits inside the image so
  the overlay stays aligned. It defaults to the frame's own size with no offset.

## The three tabs

- **Designs** — the exported frame with an inspector beside it. Only structural sections
  are selectable: the search bar rather than the icon inside it. The inspector shows the
  layer's path, geometry, fill, radius, padding, gap and effects, with a token chip
  wherever a value is bound.
- **System** — every token the frame resolves to, grouped, with usage notes; plus values
  that matched no token, and library variables that resolve to nothing.
- **Code** — CSS variables and React from the extraction, and SwiftUI translated by hand.
  The SwiftUI is labelled as such; Figma does not emit it.

Loose ends are still recorded in `data/screens/*.json` and still render on the stage
inspector when one names the selected node — the standalone tab is just switched off.

## What counts as a section

A node is selectable on the stage when it is a container that holds something, is not an
exported asset, is not hidden, and sits within `sectionDepth` (4 by default, per screen).
Two more filters keep the list to things a reader can act on:

- **Pass-through wrappers are skipped** — a frame whose only child is another container is
  the same box twice. Nine of the twelve rows on Chat history are wrapped like this.
- **Generic and plumbing names are skipped** — `Frame 2147231642`, and names like `Text`,
  `Metadata`, `Tag + Text`, `Container`.

On Chat history that turns 134 layers into 17 sections: the list, its twelve rows, the
header, the nav, the search overlay and the search bar.

## Container constraints

A screen may declare `constraints`: a container that cannot grow, and the content budget
that follows from it. These are highlighted on the stage in amber, separately from the
blue asset annotations, and the working is shown in full beneath.

Memory home carries the first one. The summary card is drawn at a fixed 359 × 350, and
everything inside it except the prose is fixed, so subtracting the chrome leaves 200px —
ten lines of Text sm/Regular at 14/20. At roughly 46 characters per line that is a 460
character ceiling, and the drawn copy uses 443 of it.

The 46 characters/line figure is not a guess: paragraph one is 280 characters set across
exactly 6 lines, paragraph two 163 across 4. Showing the subtraction matters more than the
answer — when the type or the padding changes, the budget can be re-derived rather than
re-guessed.

## Per-node styles

Figma's MCP has no structured style endpoint: `get_metadata` returns geometry only, and
fill, radius, padding, gap and effects exist solely inside `get_design_context` output,
which is read per screen. So `data/styles/<slug>.json` maps node id to style, authored
from that output.

A screen without a styles file still works — the inspector shows geometry and says the
rest is not extracted yet. Today only `memory--home` is populated.

## Conventions

- Feature status is one of `shipped`, `design-complete`, `in-review`, `in-progress`,
  `discovery`, `superseded`. A superseded feature keeps its spec and its screens; the badge is struck
  through so nothing about it reads as current.
- The behaviour table marks every rule as **From the file**, **Partly drawn** or
  **Undrawn**. Undrawn rows are where the spec ends and a decision is needed — there is no
  separate open-questions list.
- The masthead counts features and screens. It does not report a completion percentage: a
  feature with no drawn states has no denominator, so a ratio would read 100% while a
  whole feature had no frames.
