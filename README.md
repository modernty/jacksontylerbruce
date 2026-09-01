# Portfolio — Jackson, Tyler Bruce

Static site. No build step, no dependencies, no framework.
Open `index.html` in a browser and it works — including straight from Finder.

```
Portfolio/
├── index.html                    the landing page (HTML + CSS + JS inline)
├── 404.html                      project-page template + router (see "Project pages")
├── data/projects.json            project list (reference copy; see note below)
├── data/projects.csv             reformatted, ready to publish as the Sheet
├── design/landing-reference.jpg  the Figma export this was built from
└── assets/
    ├── thumbs/                   project thumbnails (assets/thumbs/<slug>.jpg)
    ├── images/                   full-size imagery (assets/images/<slug>/…)
    └── fonts/                    self-hosted fonts (currently unused)
```

## Editing the two things you'll actually change

Both live in one `CONFIG` block near the bottom of `index.html`:

```js
const CONFIG = {
  email:       "",        // set it -> "Contact" becomes a working mailto link
  workUrl:     "#work",   // where the mobile "View work" link goes
  sheetCsvUrl: "",        // set it -> the project list comes live from your Google Sheet
};
```

"Contact" is styled as a link (roman, underlined) either way; setting `email`
is what gives it a destination. **It currently has none** — set this before launch.

## Projects

The list is rendered from the `PROJECTS` array in `index.html`. Each entry:

| Field   | Required | Effect |
|---------|----------|--------|
| `name`  | yes      | The text shown |
| `slug`  | no       | Makes the name link to its own project page at `/slug` (same tab). Hovering shows the thumbnail **pinned** top-right, not trailing the cursor |
| `url`   | no       | Makes the name a link (opens in a new tab, subtly underlined) |
| `thumb` | no       | Shows a thumbnail — pinned if the row has a `slug`, cursor-following otherwise |

A project with none of `slug` / `url` / `thumb` renders as plain text — which is why
the page currently looks exactly like the mockup. It gains behavior as you fill
fields in. `slug` wins over `url` when both are set.

## Project pages

Each project can have its own page — description stacked above a flick-through
gallery, same left gutter as the home page. Content is written in the same sheet
(see the columns below); no per-project HTML file.

### Routing — `404.html`

There is no `project.html`. GitHub Pages serves `404.html` for any path it can't
resolve, leaving the URL in the address bar, so **`404.html` is the router**:

- `jacksontylerbruce.com/lazarus-ai-pubsec-brand` → Pages serves `404.html` →
  its script reads the path, takes `lazarus-ai-pubsec-brand` as the slug, and
  renders that project. Reload works. The page carries an HTTP 404 status — fine
  here, a little worse for search/social unfurls.
- Locally there is no 404 fallback. The home-page links detect this
  (`localhost` / `127.0.0.1` / `file://`) and point at `404.html?p=<slug>`
  instead, so clicking through works with a plain `python3 -m http.server 8000`.
  On the live site those links use the clean `/<slug>` path, and `404.html`
  rewrites any `?p=` visitor to it.
- Hit with no resolvable slug, `404.html` shows a short "not found" linking home —
  so it still works as a real 404 page.

`404.html` has its own baked `SAMPLE` (currently just Lazarus) so it renders
offline / over `file://` / before any sheet exists, exactly like `index.html`'s
`PROJECTS` array. Set `CONFIG.sheetCsvUrl` in **both** `index.html` and
`404.html` to the same published-CSV URL to make the content live.

### Sheet columns for pages

`data/projects.csv` is the reformatted, ready-to-publish version. Extra columns
on top of `name` / `slug` / `url` / `thumb`:

| Column      | Effect |
|-------------|--------|
| `copy`      | The description. A blank line starts a new paragraph. |
| `images`    | Gallery images — a `\|`-separated list of URLs or repo paths (`\|`, not commas, to dodge CSV quoting). Fewer than 3 → the rest render as placeholder surfaces. |
| `link name` | Label for an external call-to-action on the page (e.g. "Download now"). |
| `link`      | The URL that label points to (new tab). |

Eleven rows have a `slug`, `copy`, and gallery `images` filled in and are live:
Model Playground, Lazarus AI Brand Identity, Talent Management, Whitelist,
Chatter Social, Jet Protocol, Novart, Urvin Finance, CoreLogic, Nestlé, and
USM: Hue+Man. **Loblaw Canada**, **Intuit**, and **USM: Milan Design Week 2025**
have no `slug` (no content in the export yet) and stay plain text on the home
page — paste a slug in once each is written to take it live.

The same content is baked into `404.html`'s `SAMPLE` object and `index.html`'s
`PROJECTS` array, so every page works offline / over `file://` with no sheet.
`data/projects.csv` only matters once you publish it and set `CONFIG.sheetCsvUrl`.

### Images

Download them into `assets/images/<slug>/` rather than hotlinking a CDN, then
point `images` at the repo paths. Downscale first — e.g.
`sips -Z 1800 -s format jpeg -s formatOptions 86 big.png --out assets/images/<slug>/shot.jpg`.
The hover thumbnail goes in `assets/thumbs/<slug>.jpg` at ~1000px.

### Connecting the Google Sheet

1. Build a sheet with a header row containing `name`, `url`, `thumb`
   (any order, any capitalization; `project`/`title`/`client`, `link`/`href`,
   and `thumbnail`/`image` also work).
2. **File → Share → Publish to web → Comma-separated values (.csv)**.
3. Paste that URL into `CONFIG.sheetCsvUrl`.

The page loads the built-in list instantly, then quietly replaces it when the sheet
responds. If the sheet is unreachable, unpublished, or empty, the built-in list stays
and a note goes to the console — the page never renders blank.

> One caveat: a URL containing a comma must be quoted in the sheet. Google Sheets
> does this automatically on export, so this only bites if you hand-write the CSV.

### Or keep it offline

Don't want a network dependency? Just edit the `PROJECTS` array directly and ignore
the sheet. `data/projects.json` is a reference copy of the same list — the page does
**not** read it, because browsers block `fetch()` of local files over `file://`, which
would break opening the page straight from Finder.

## Thumbnails

Drop images in `assets/thumbs/` and reference them as `assets/thumbs/name.jpg`.
Anything web-reachable works too (including Google Drive links, if publicly shared).

Behavior: appears on hover, follows the cursor, flips to stay on screen near edges,
preloads before showing so it never flashes in half-drawn. Skipped entirely on touch
devices; keyboard users get it anchored beside the focused link instead.

## Type

The design uses **New York**, which ships with macOS and iOS — so Apple visitors get
the real typeface and the page downloads no font at all.

Everyone else gets **Source Serif 4** from Google Fonts, loaded *only* when New York
isn't present. It was chosen by measurement, not by eye: its line width is within
**0.4%** of New York's and its x-height within **0.3%**, which is close enough that
the design's line breaks survive the substitution intact.

Two things worth knowing if you touch the font stack:

- `ui-serif` does **not** map to New York in Chrome (it resolves to Times). It must
  stay *after* `Source Serif 4` in the stack, or non-Apple visitors get Times.
- `document.fonts.check()` returns `true` for fonts that don't exist, so it can't be
  used to detect New York. The detection measures rendered text width instead.

New York is not embedded as a webfont anywhere here, which also sidesteps the
licensing question around redistributing Apple's fonts.

## The two compositions

Desktop is one view. Mobile is two full-height views stacked, with "View work"
jumping from the first to the second.

| | Desktop (> 640px) | Mobile (<= 640px) |
|---|---|---|
| Structure | One centred composition | Two `100dvh` sections |
| Vertical | Block centred, nudged up | Home: top-anchored. Work: bottom-anchored |
| Project list | Inline, below the bio | Its own view, reached by "View work" |
| List type | 16px / 24px | **20px / 30px** |
| Gutter | 26.42% indent | 20px both sides |
| Padding | 8vh | Home 96/72, Work 96/48 |

The body text stays 16px/24px throughout; only the project list grows on mobile.

"View work" is an in-page anchor to `#work` (smooth-scrolled, and honouring
`prefers-reduced-motion`). Point `CONFIG.workUrl` elsewhere if that ever becomes
a separate page.

Both mobile views were verified against the mockups: the work list reproduces all
seven line breaks exactly, which is also what confirms the 20px gutter.

## Thumbnail interaction

| Input | Behaviour |
|---|---|
| Mouse | Hover reveals; the image follows the cursor and flips near edges |
| Touch | **First tap reveals, second tap follows the link.** Tapping elsewhere dismisses |
| Keyboard | Focus reveals, anchored beside the focused project |

The touch path matters: without it a tap would navigate away before the thumbnail
was ever seen. Projects without a `thumb` are unaffected — they link on the first tap.

## Layout

Every value is derived from the Figma frame (1728 × 1117; `design/landing-reference.jpg`
is that frame at @2x), and lives in the `:root` block:

| Token | Value | Source |
|---|---|---|
| `--fs` | 16px | Figma |
| `--lh` | 1.5 | 24px line advance |
| `--margin-left` | 26.42% | 456.5 / 1728 |
| `--measure` | `min(30.9%, 33.2rem)` | 531px, then capped |
| `--gap-block` | 1em | 16px |
| `--gap-section` | 8em | 128px |

The measure is capped at 33.2rem so the line length stays readable on very wide
displays instead of growing to ~800px. The left indent stays proportional, so the
composition still scales.

Verified: the rendered page reproduces the mockup's line advances exactly —
`48, 48, 48, 80, 48, 304, 48, 47, 49` — with the first baseline on the same pixel.

## Testing before you push

Three layers, cheapest first. Use as many as the change warrants.

### 1. Look at it locally

```sh
cd Portfolio && python3 -m http.server 8000
```

Then open <http://localhost:8000>. Use this rather than double-clicking the file:
over `file://` the browser blocks `fetch()`, so the Google Sheet never loads.

Resize the window past 640px to cross the breakpoint, or use your browser's
device toolbar to check the phone views.

### 2. Run the layout check

```sh
python3 scripts/verify.py
```

Renders the site headlessly at desktop, tablet, and phone widths, then compares
the typographic line grid against baselines measured from the Figma mockups.
Exits non-zero on failure, so it works in a hook or CI.

It catches what this project is actually prone to — problems that look fine at a
glance:

- **Layout drift.** A copy or CSS edit reflowing the text so it no longer matches
  the design. Lowercasing "Public Sector" was one keystroke away from doing this.
- **Font stack order.** `ui-serif` resolves to Times in Chrome, so if it ever
  precedes `Source Serif 4`, every non-Apple visitor silently gets Times.
- **Root-relative paths.** `src="/assets/..."` works locally and breaks the
  moment the site is served from a subpath.
- **A missing `CNAME`.** Deleting it silently drops the custom domain on deploy.

If you changed the design **on purpose**, re-record the baselines:

```sh
python3 scripts/verify.py --update
```

Requires Chrome and `pip3 install --user pillow numpy`.

### 3. Work on a branch

```sh
git switch -c change-the-thing
# ... edit, then run the two checks above ...
git push -u origin change-the-thing
```

Open a pull request and merge when you're happy. `main` is what deploys, so
anything on a branch is invisible to the public site.

GitHub Pages has no per-branch preview URLs. If you ever want them, Netlify and
Cloudflare Pages both give a live URL per pull request for free — that's the one
real advantage they have over Pages for this site.

### Optional: block bad pushes automatically

```sh
printf '#!/bin/sh\nexec python3 "$(git rev-parse --show-toplevel)/scripts/verify.py"\n' \
  > .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

Now `git push` refuses to run if the checks fail. Bypass a specific push with
`git push --no-verify`. Hooks are local and not committed, so set this up on any
machine you want it on.

## Deploying

It's one static folder. Drag it onto Netlify Drop, or point Vercel/GitHub Pages/
Cloudflare Pages at it. No build command, no output directory.

For local preview with the sheet fetch working (`file://` blocks it):

```sh
cd Portfolio && python3 -m http.server 8000   # then open http://localhost:8000
```
