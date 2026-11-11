# Portfolio — Jackson, Tyler Bruce

The portfolio of Tyler Jackson: a timeline of the work, project pages, a travel globe, and a chat
that answers questions and moves between them. Next.js 15, React 19, TypeScript.

## Run it

```bash
npm ci
npm run dev
```

The home page redirects to `/timeline`.

| Page | What it is |
|---|---|
| `/timeline` | The timeline, with a hover card per project. A vertical layout at 768px and below |
| `/timeline/projects` | The same graph, by project |
| `/work/<slug>` | A project page: conversation by default, two columns in Boring view |
| `/about` | The globe. The chat docks on the left once a conversation starts |
| `/sheet?topic=` | Short answers from the home composer, including contact |

## Content

| Edit | To change |
|---|---|
| `src/content/catalog.ts` | Profile, contact links, roles, clients and projects |
| `content/projects.json`, `data/copy.json` | The generated project sections and long-form copy |
| `content/media.json` | Project images and alt text. Run `npm run assets` after changing it |
| `content/places.json` | The places on the globe |
| `design/tokens.json` | Design tokens. Run `npm run tokens` after changing them |

Projects with `flagged: true` stay out of everything public. Public text goes through the guard in
`src/content/guard.ts`, and a failure stops the catalog from loading.

## Chat

- `/api/ask` routes the composer on the timeline to a view (`src/router/handle.ts`).
- `/api/ask/project` and `/api/ask/about` answer in the page's own conversation.
- `src/router/navigate.ts` decides when a question belongs on another page.

Without `ANTHROPIC_API_KEY`, every answer comes from the keyword routes and the site's own content.

## Environment

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables model answers. Server-side only |
| `ANTHROPIC_MODEL` | Overrides the default routing model |
| `ANTHROPIC_GENERAL_MODEL` | Overrides the model used for open conversation |
| `DAILY_USD_CAP` | Required for model calls. A missing, zero, or invalid value fails closed to the keyword routes |
| `UPSTASH_REDIS_REST_URL` | Shared store for rate limits and the spend cap. Required with its token on Vercel |
| `UPSTASH_REDIS_REST_TOKEN` | Token for the Upstash REST store |
| `KV_REST_API_URL` | Alternative shared store (Vercel KV). Used if the Upstash URL is unset |
| `KV_REST_API_TOKEN` | Token for the Vercel KV REST store |
| `NEXT_PUBLIC_FONT_BASE_URL` | Private host for `aeonikpro-regular.otf`, `-medium.otf` and `-semibold.otf`. Without it, the fallback font is used |
| `EMPLOYER_PUBLIC_NAME` | The public name of the current employer |

On Vercel (`VERCEL_ENV` is set), model calls also fail closed unless `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or `KV_REST_API_URL` and `KV_REST_API_TOKEN`, are set. Local dev and tests can use the in-memory store.

Aeonik Pro is licensed and must never be committed. `npm run fonts` checks this.

## Checks

```bash
npm run fonts
npm run lint
npm run typecheck
npm test
npm run eval
npm run build
```

## Legacy static site

`main` still serves the old static site through GitHub Pages and `CNAME`. Its `index.html`,
`404.html` and `system/` files stay in the repo until the domain moves to this app.
