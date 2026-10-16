# AGENTS.md — Handoff & Quick-Start Context

Read this first. It gives a fresh chat window or AI agent enough context to work on this
project without re-deriving decisions. Full architectural detail lives in **README.md**.

---

## What this is

A React 18 / TypeScript / Vite SPA presenting 13 metaphysical essays by Todd Stabley,
in the **"Seal"** design (shipped October 2026; it replaced the July 2026 "Nocturne"
design). Express serves the build plus an RSS feed and per-essay OG meta. Deployed on
Railway at `metaphysics.up.railway.app`; Railway auto-deploys every push to `main`.

**Current phase (October 2026): content-editing pass.** The author is combing through
the essays and revising the text in the published Google Docs. A frequent task is
**republishing edited Docs** — see "Republishing edited essays" below (or just run
`/redeploy [essay]`).

**All application code is in `src/App.tsx` (single file, intentionally).**
Essay metadata is in `src/essays.json`. Theme tokens are in `src/index.css`.

---

## Design decisions that are INTENTIONAL — don't "fix" these

The Seal design was chosen by the author (creative director) from two rounds of
design comps in October 2026. Changing these requires his sign-off:

1. **No slides/carousel in the app.** The slide decks were Instagram promos; embedding them
   made it feel like clicking slides = reading the essay. `public/slides/` holds ONLY the
   1200×630 RSS/OG cards; full decks live in `instagram/` and git history. Don't resurrect
   the carousel.
2. **No colored squares.** The author explicitly moved away from the Nocturne gallery wall
   of deck-colored cover cards. The index is a **typographic contents page**: each entry is
   a seal ring with its number, title, quote, and date, in two columns. Don't reintroduce
   per-essay color blocks or the deck `ground` colors in the UI.
3. **One mark: the vermilion seal.** `--seal` (day `#C23B22`, night `#E0553A`) is the only
   accent color. It appears as the round seal (ring in the contents; solid for the latest
   essay and the essay being read), the dot in the "Metaphysical Essays" lockup, the
   favicon, the share cards, link underlines, and list bullets. `--seal-text` is the same hue darkened for
   small text contrast. Don't add a second accent color.
4. **Typography: Hanken Grotesk + Spectral.** Hanken Grotesk (400–700) for everything
   structural — titles, labels, navigation, the masthead. Spectral (400, 500, italic) for
   reading — the essay text, the intro, and the italic quotes. Every capital kept: no
   all-caps letterspaced labels.
5. **Reader-owned ground.** The Day/Night toggle flips the site between paper `#F7F5F0`
   (day) and ink `#151413` (night). **First visit opens in day** (paper is the house
   register now; not `prefers-color-scheme`); the toggle choice persists in
   `localStorage('seal-theme')` — a new key, so Night picks saved under the Nocturne-era
   `'theme'` key don't carry over; an inline script in `index.html` sets
   `document.documentElement.dataset.theme` **before first paint** — keep it there.
6. **Newest essay is featured at the top** (`Featured`, chosen by highest `num`) with the
   large solid seal, and **excluded from the contents below**; it moves into the list
   automatically when a newer essay ships.
7. **Contents is ordered 01→N** (a numbered contents page, not a feed).
8. **The callout quote at the top of each essay is unlabeled** — Spectral italic, no label,
   no box, no quotation marks.

The previous design is preserved on the `nocturne` branch (`beee928`).

---

## How the pieces fit

- **Theme system** — CSS custom properties on `:root` (day) overridden by
  `:root[data-theme='night']` in `index.css`. Tailwind v4 `@theme` colors alias the vars
  (`--color-ground: var(--ground)`, `ink`, `body`, `soft`, `muted`, `hairline`, `seal`,
  `seal-text`), so `bg-ground`, `text-muted`, `border-hairline` etc. re-theme live.
- **ThemeToggle** appears twice (index header + reading view top bar); a `themechange`
  window event keeps both labels in sync.
- **ReadingView has a constant React key (`"reading"`)** inside `AnimatePresence`. Keying
  it per-essay makes prev/next navigation cross-fade two overlays and flash the index
  behind them (that was a real bug). Navigation updates the mounted view in place.
- **Essay text** is snapshotted from published Google Docs at build time
  (`scripts/fetch-essays.mjs` → `public/essay-content/<folder>.html`, gitignored).
  `fetchEssayText` caches per folder — the index reads the latest essay's text for its
  reading time and the reading view reuses it.
- **`titleParts()`** splits a title for display: "First Principles N: X" → kicker
  "First Principles" + title "X"; "A: B" → title "A" + subtitle "B".
- **`EssayRow`** is one contents entry (seal ring, kicker, title, subtitle, quote, date);
  the prev/next links at the foot of each essay reuse it with a "Previous"/"Next" label.
- **Entries are real links** (`/essays/<folder>`), intercepted for plain clicks so the SPA
  opens the essay in place; modified clicks (new tab) fall through to the server.
- **server.js** reads `essays.json` for `/rss.xml` and injects per-essay OG tags
  (title, `quote`, `rssCard`) on `/essays/:folder`.
- **Share cards** — `rssCard` in `essays.json` points at each essay's 1200×630 PNG
  (`/slides/<folder>/essay<NN>_share.png`), served by server.js as the OG/Twitter image
  and RSS media; `public/og-image.png` is the homepage card. All are rendered from HTML in
  headless Chrome by `node scripts/gen-share-cards.mjs [nums…|home]` and committed — re-run
  it when a title or quote changes (or a new essay changes the homepage count).
- **Legacy fields** in `essays.json`: `ground`, `cardTitle`, `slideCount`, `filePrefix`,
  `indexGray`, `indexRollover` are unused (Nocturne-era).

---

## Commands

```bash
npm run dev           # localhost:3000 (fetches missing essay snapshots first)
npm run fetch-essays  # force-refresh all essay snapshots from Google Docs
npm run build         # → dist/ (re-snapshots all essays first)
npm run lint          # tsc --noEmit
npm start             # production Express server (needs a prior build)
```

Share cards: `node scripts/gen-share-cards.mjs [nums…|home]` (needs local Google Chrome).
Python deck utilities run from the gitignored `.venv/`.

---

## Publishing workflow

```bash
git add . && git commit -m "…" && git push origin main
```

- **Every push to `main` deploys to production** (~1–2 min). Confirm with the user before
  pushing unless they've already asked for the change to be published.
- Test locally with `npm run dev` first.
- Branches: `main` = production (Seal) · `nocturne` = the July 2026 Nocturne design
  (`beee928`) · `v1` = original static site (preserved) · pre-Nocturne app = `main`
  history ≤ `74a02c5`.

## Republishing edited essays

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
2. Append to `src/essays.json` (`num` = next number → it becomes the featured essay
   automatically; `quote` becomes the reading-page callout and the contents line).
3. Set `rssCard` to `/slides/<folder>/essay<NN>_share.png`, then render it and refresh
   the homepage card: `node scripts/gen-share-cards.mjs {n} home`.
4. `npm run dev` to verify, commit, push.

---

## Gotchas

- Restart the dev server after editing `index.html` or `index.css`.
- Don't move theme init out of the `index.html` inline script (pre-paint = no flash).
- `#root` needs `width: 100%`; `scrollbar-gutter: stable` on body prevents layout shift.
- `color-mix()` and `text-wrap: balance/pretty` are used — modern-browser CSS is assumed.
- Hover effects (title underline, seal turn, link fade) sit inside `@media (hover: hover)`
  so taps on phones don't leave rows stuck mid-hover.
- The index header is in normal flow (scrolls away), NOT `fixed` — a fixed toggle once
  floated over content while scrolling on phones. The reading view has its own sticky bar.
- Share cards are committed PNGs, not built at deploy — after editing a title or quote in
  `essays.json`, re-run `node scripts/gen-share-cards.mjs <num>`. Social platforms cache
  OG images by URL; to force a refresh of every card, give the files new names.
- Feed readers cache aggressively — test RSS changes in a fresh reader.
- The `[em]` handling in `formatEssayContent` carries state across lines on purpose
  (a tag pair can wrap multiple paragraphs).
