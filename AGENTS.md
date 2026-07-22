# AGENTS.md — Handoff & Quick-Start Context

Read this first. It gives a fresh chat window or AI agent enough context to work on this
project without re-deriving decisions. Full architectural detail lives in **README.md**.

---

## What this is

A React 18 / TypeScript / Vite SPA presenting 13 metaphysical essays by Todd Stabley,
in the **"Nocturne"** design (shipped July 2026). Express serves the build plus an RSS
feed and per-essay OG meta. Deployed on Railway at `metaphysics.up.railway.app`;
Railway auto-deploys every push to `main`.

**Current phase (July 2026): content-editing pass.** The design is settled; the author is
combing through the essays and revising the text in the published Google Docs. The frequent
task now is **republishing edited Docs**, not building features — see "Republishing edited
essays" below (or just run `/redeploy [essay]`).

**All application code is in `src/App.tsx` (single file, intentionally).**
Essay metadata is in `src/essays.json`. Theme tokens are in `src/index.css`.

---

## Design decisions that are INTENTIONAL — don't "fix" these

These came out of a full design review with the author (creative director). Changing them
requires his sign-off:

1. **No slides/carousel in the app.** The slide decks were Instagram promos; embedding them
   made it feel like clicking slides = reading the essay. `public/slides/` holds ONLY the
   1200×630 RSS/OG cards; full decks live in `instagram/` and git history. Don't resurrect
   the carousel.
2. **Reader-owned ground.** ☼/☾ toggle flips the site between umber `#2A241E` (night)
   and cream `#F5F0E3` (day). **First visit always opens in night** (deliberate — not
   `prefers-color-scheme`); the toggle choice persists in `localStorage('theme')`; an
   inline script in `index.html` sets `document.documentElement.dataset.theme`
   **before first paint** — keep it there.
3. **Index is a gallery wall**: live HTML/CSS cover cards (no PNG thumbnails), each on its
   deck's own `ground` color from `essays.json`. Cards keep fixed deck colors (gold
   `#C9A227`, ivory `#EDE7D6`) in BOTH themes — they're artwork, not UI panels.
   Card titles follow a strict lockup: upright lead + italic close, **no one-word lines**
   (fix bad breaks with the `cardTitle: [upright, italic]` override in essays.json; short
   titles set as ONE italic line via an empty upright part), and one shared type scale —
   the featured square uses the same sizes as the grid. Full spec: README →
   "Cover-card lockup & type treatment".
4. **Newest essay is featured at the top** (`FeaturedCard`, chosen by highest `num`) and
   **excluded from the grid below**; it cycles down automatically when a newer essay ships.
5. **Grid is ordered 01→N** (a numbered contents page, not a feed).
6. **The callout quote at the top of each essay is unlabeled** — diamond rule + italic line,
   no "Excerpt" label, no box, no quotation marks. `text-wrap: balance` prevents orphans.
7. **One gold token per theme** (`--gold`: night `#C9A227`, day `#9C7A28`). Don't introduce
   new gold hexes; use the token.
8. **Typography is consolidated**: Cormorant Garamond (display), EB Garamond (body),
   Lato (caps labels). Playfair was removed — don't reintroduce a second display serif.

---

## How the pieces fit

- **Theme system** — CSS custom properties on `:root` (night) overridden by
  `:root[data-theme='day']` in `index.css`. Tailwind v4 `@theme` colors alias the vars
  (`--color-zen-bg: var(--ground)` …), so `bg-zen-bg`, `text-zen-text/85` etc. re-theme
  live. Components also use `var(--gold)` / `color-mix(...)` in inline styles.
- **ReadingView has a constant React key (`"reading"`)** inside `AnimatePresence`. Keying
  it per-essay makes prev/next navigation cross-fade two overlays and flash the index
  behind them (that was a real bug). Navigation updates the mounted view in place.
- **Essay text** is snapshotted from published Google Docs at build time
  (`scripts/fetch-essays.mjs` → `public/essay-content/<folder>.html`, gitignored).
  After editing a Doc: `npm run fetch-essays`, or just redeploy.
- **Vespers nav** — prev/next essay links at the foot of every essay, by `num`.
- **`splitTitle()`** renders card titles as upright lead + italic close (last word, or the
  part after a colon, or the "N: X" of First Principles essays).
- **server.js** reads `essays.json` for `/rss.xml` and injects per-essay OG tags
  (title, `quote`, `rssCard`) on `/essays/:folder`.
- **Legacy fields** in `essays.json` (`slideCount`, `filePrefix`, `indexGray`,
  `indexRollover`) are unused by the app and optional in the TS interface; `rssCard` IS
  still used by server.js. New essays don't need the legacy fields.

---

## Commands

```bash
npm run dev           # localhost:3000 (fetches missing essay snapshots first)
npm run fetch-essays  # force-refresh all essay snapshots from Google Docs
npm run build         # → dist/ (re-snapshots all essays first)
npm run lint          # tsc --noEmit
npm start             # production Express server (needs a prior build)
```

Python asset tooling (RSS cards, deck utilities) runs from the gitignored `.venv/`:
`.venv/bin/python scripts/gen_rss_cards.py {n}`.

---

## Publishing workflow

```bash
git add . && git commit -m "…" && git push origin main
```

- **Every push to `main` deploys to production** (~1–2 min). Confirm with the user before
  pushing unless they've already asked for the change to be published.
- Test locally with `npm run dev` first.
- Branches: `main` = production (Nocturne) · `nocturne` = merged redesign branch ·
  `v1` = original static site (preserved) · pre-Nocturne app = `main` history ≤ `74a02c5`.

## Republishing edited essays (the common task right now)

Essay text lives in the published Google Docs, gets snapshotted into
`public/essay-content/<folder>.html` (gitignored) at build time, and **every Railway build
re-fetches all docs**. So a Doc edit reaches the site via a *rebuild*, with no file to commit:

1. `node scripts/diff-published.mjs [essay]` — word-diffs the live published doc(s) against
   the current snapshot. Empty diff usually means Google Docs hasn't republished yet (~5-min
   lag), not that the edit is missing — don't push, retry shortly.
2. `npm run fetch-essays` — refresh the local snapshot.
3. `git commit --allow-empty -m "Republish: …" && git push origin main` — the empty commit
   triggers the rebuild that pulls the fresh doc(s).
4. Poll `https://metaphysics.up.railway.app/essay-content/<folder>.html` (~1–2 min) to confirm.

**`/redeploy [essay]`** runs this whole flow. Caveat: the parser flattens native Doc
bold/italic/color/alignment — only structure, wording/punctuation, links, and literal
`[em]`/`[right]` tags render (README → "Essay text pipeline").

---

## Adding a new essay (short version — full steps in README)

1. Publish the Doc → get the `/pub` URL.
2. Pick a dark `ground` hex for its card (match the family of existing `ground` values).
3. Append to `src/essays.json` (`num` = next number → it becomes the featured essay
   automatically; `quote` becomes the reading-page callout).
4. Make its 1200×630 `rssCard` PNG: `.venv/bin/python scripts/gen_rss_cards.py {n}`
   (reads title/quote/`ground` from the JSON entry).
5. `npm run dev` to verify, commit, push.

---

## Gotchas

- Restart the dev server after editing `index.html` or `index.css`.
- Don't move theme init out of the `index.html` inline script (pre-paint = no flash).
- `#root` needs `width: 100%`; `scrollbar-gutter: stable` on body prevents layout shift.
- Cover/cards use inline styles referencing `var(--…)` tokens deliberately.
- `color-mix()` and `text-wrap: balance` are used — modern-browser CSS is assumed.
- Touch devices (`hover: none`) skip the gallery hover lift.
- **Card typography is a solved iOS bug — don't unsettle it.** The cards failed twice on
  iOS Safari's 2-column grid (~150px squares): fixed rem type overflowed and clipped;
  then bare-`cqw` proportional type rendered ~4px and unreadable — and a cqw cut
  without caps regressed the *desktop* wall off its dialed composition, because of two
  cqw traps: a container can't query itself (cqw in the card's own padding silently
  resolved against the viewport) and children's cqw resolves against the CONTENT box,
  not the square. The shipped fix is four interlocking parts in `index.css`, all
  required: container-relative sizes (`.gallery-card-art` is a size container), fixed
  px padding, `clamp(px-floor, Ncqw, px-cap)` type with legibility floors AND caps at
  the dialed desktop values (coefficients calibrated to the content box), and an
  `@container (max-width: 230px)` rule that simplifies small cards to essay number +
  title + diamond rule. Regression check after touching card CSS: ~390px viewport →
  nothing clipped, titles ≥ 11px, miniature cards simplified; desktop wall exactly at
  the dialed sizes (computed title-l 24.8px, eyebrow 8px, padding 20.8/22.4px). Full
  history: README → "The iOS thumbnail bug".
- The ☼/☾ toggle on the index is `absolute` on the cover, NOT `fixed` — a fixed toggle
  floated over content while scrolling on phones. The reading view has its own toggle.
- Feed readers cache aggressively — test RSS changes in a fresh reader.
- The `[em]` handling in `formatEssayContent` carries state across lines on purpose
  (a tag pair can wrap multiple paragraphs).
