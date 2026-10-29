# Portfolio style spec (locked Oct 29 2026, source: /workspace/portfolio/render/home.html + gen.py + tpl.html)
- Colour: ink blue #2E3A87 on warm off-white #FBFBF8. Single ink, no accent colour.
- Type: Aeonik Pro everywhere (licensed, never commit; load from a private host). SemiBold 600 for company names and dates; Regular 400 for project labels, foci, composer text. Instrument Serif removed. IBM Plex Mono only for the small top label and suggestion cards.
- Sizes: company names and dates 12.5px; project labels 11.5px; foci 11px; year axis and NOW 10px; header "What are you looking for?" 20px Regular, -0.01em; composer input and placeholder 16px; card title 15px SemiBold, card body 12px; filter tabs 13px.
- Timeline: role = pill/capsule outline, stroke 1.5px, 12px tall, filled dots at both ends; company + date stacked above left end; 1px tick (30% opacity) down to project label; faint 1px lane baselines at 10%; dashed NOW line; open-ended pills for current roles. Projects/Focus pills 1.2/1.1px.
- Layout: active view centered in viewport (stage); filter tabs Timeline / Projects / Focus above it (text tabs, active = full ink + hairline underline, inactive 45%); all views share one time axis. Composer pinned to bottom (~32px), single-line pill with input + mic + send only (no +, no model picker); grows to stacked text-over-actions when text wraps; suggestions appear 2s after load.
- Hover (desktop): companies and dates fade to 50% (~0.28s), project weight unchanged, foci appear in Regular, project card with Open + prev/next.
- Focus themes: AI, Trust in AI, Systems, Architecture, Spatial, Material, Identity, Finance (see themes.md).
- Motion: load-in, timeline grows left to right (baselines, then pills in date order, then labels and ticks, then NOW), then tabs, header and composer fade up; ease cubic-bezier(.22,1,.36,1); ~2.1s; reduced-motion skips to the end state.
- Lots of whitespace; desktop 1440x900, mobile 390 (vertical timeline).
