# AGENTS.md — Handoff & Quick-Start Context

Read this first. It gives a fresh chat window or AI agent enough context to work on this
project without re-deriving decisions. Full architectural detail lives in **README.md**.

---

## What this is

A React 18 / TypeScript / Vite SPA presenting 13 metaphysical essays by Todd Stabley,
in the **"Nocturne"** design (shipped July 2026). Express serves the build plus an RSS
feed and per-essay OG meta. Deployed on Railway at `metaphysics.up.railway.app`;
Railway auto-deploys every push to `main`.

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
2. **Reader-owned ground.** ☼/☾ toggle flips the site between umber `#2A241E` (night,
   default) and cream `#F5F0E3` (day). Persisted in `localStorage('theme')`; first visit
   follows `prefers-color-scheme`; an inline script in `index.html` sets
   `document.documentElement.dataset.theme` **before first paint** — keep it there.
3. **Index is a gallery wall**: live HTML/CSS cover cards (no PNG thumbnails), each on its
   deck's own `ground` color from `essays.json`. Cards keep fixed deck colors (gold
   `#C9A227`, ivory `#EDE7D6`) in BOTH themes — they're artwork, not UI panels.
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
- Feed readers cache aggressively — test RSS changes in a fresh reader.
- The `[em]` handling in `formatEssayContent` carries state across lines on purpose
  (a tag pair can wrap multiple paragraphs).
