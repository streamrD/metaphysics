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

**Next up — the tightening pass on the remaining essays.** Todd trimmed intensifiers and
hedges from 05, 12 and 13 himself. For the other ten (01–04, 06–11) there is a checklist
of 35 flagged sentences with a Cut / Consider / Keep call each:
[Tightening Checklist](https://claude.ai/code/artifact/0d90cd1b-56e1-45bb-80ec-a4c65ea3b436)
(a Claude Doc). He edits the Google Docs himself, then asks to republish — run
`node scripts/diff-published.mjs` with no argument to find which essays changed, then
the `/redeploy` flow. Two items need more than a cut: 04 and 11 share an identical
sentence ("…the stakes have been raised precisely so the lesson cannot be missed"), and
03's closing passage has "Listen, —" (stray comma) and possibly "you heard [it]".

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
- **`typeset()`** curls quotes and sets every em dash closed with hair spaces when text
  is displayed (essay text, quotes, intro) — the Docs stay as typed; don't "fix" the
  Docs' straight quotes or spaced dashes by hand. Contents rows show no dates (they
  read as out of order next to the numbers); dates stay on essay pages and the feed.
- **Run-in heads** — a paragraph opening with an ALL-CAPS term and a period
  ("VOLATILITY. …") renders the term in Hanken semibold, title case; later ALL-CAPS
  mentions of the same term get a lighter match (05 Supervillain, 02 Free Will). Doc
  headings drop a trailing colon. Both are display rules; the Docs keep their caps.
- **`titleParts()`** splits a title for display: "First Principles N: X" → kicker
  "First Principles" + title "X"; "A: B" → title "A" + subtitle "B".
- **`EssayRow`** is one contents entry (seal ring, kicker, title, subtitle, quote — no date);
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

## Session log — 2026-10-16 (the Seal redesign)

One long session took the site from Nocturne to Seal. In order, all pushed to `main`:

1. **Design comps** on a Claude Design canvas
   ([Metaphysical Essays — Modern Upfit](https://claude.ai/artifact/41urpb6dzAJucK2eUEsxWH)):
   round 1 (A Hairline, B Journal, C Field) kept the colored cards; Todd asked to drop
   the colored squares and start from Hanken Grotesk; round 2 (D Chapbook, E Recto,
   F Seal) — he picked **F · Seal** ("magnifique"). A third page holds the approved
   share-card comps.
2. **Seal build** (`ff1e297`): typographic contents, vermilion seal, Hanken + Spectral,
   paper/ink grounds, favicon, docs. Nocturne archived on the `nocturne` branch.
3. **Light by default** (`3687656`): theme key renamed to `seal-theme` so Nocturne-era
   Night picks don't carry over.
4. **Share cards** (`e0375f5`): Seal-style 1200×630 cards for all essays + homepage via
   `scripts/gen-share-cards.mjs`; new filenames; old ones 301 (`8781d10`).
5. **Facebook** (`405a25e`): Supervillain was aliased to the homepage since a June scrape;
   fixed with `OG_URL_OVERRIDES` (`?s=seal`). Re-scraped 11, 12, 13 and the homepage in
   the Sharing Debugger — all show their Seal cards. Essays 01–04 and 06–10 had never been
   shared on Facebook (no history), so they'll preview correctly on first share. Passengers'
   Oct 5 scrape had failed with a 418 from Railway; a re-scrape returned 200.
6. **Typesetting** (`f3c5f92`, `19d2673`): run-in heads; curly quotes and uniform em dashes
   at display; site name unified to "Metaphysical Essays"; dates dropped from contents.
7. **Doc republishes**: Passengers and A Diminished World tightening passes; several
   Supervillain passes (including restoring "not just a villain", which must match its
   `quote` in essays.json, and the "The Characteristics of the Supervillain" heading).

State at close: local = GitHub = live (`0721cab`); all 13 essays match their published
Docs. Todd's style: terse replies ("y", "done") are approvals; "publish" means push.

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
  OG images by URL; to force a refresh of every card, give the files new names — and
  301 the old names to the new ones in server.js (as it does for the Nocturne
  `essay<NN>_rss_card.png` / `og-image.jpg` URLs). Missing files with an extension 404
  rather than falling through to the SPA: a crawler handed HTML for an image shows a
  blank preview. To refresh one link on Facebook: Sharing Debugger → Scrape Again.
- **Facebook can alias an essay URL to the homepage for good.** Before per-essay OG tags
  existed, every page declared the homepage as its `og:url`; a link Facebook scraped then
  (Supervillain, 2026-06-09) stays tied to the homepage object — Scrape Again and the
  Batch Invalidator don't clear it (Debugger → Canonical URL → See History shows it).
  The fix is a fresh canonical: `OG_URL_OVERRIDES` in server.js makes that essay declare
  `?s=seal` on its `og:url`. If another essay previews as the homepage, add it there.
- Feed readers cache aggressively — test RSS changes in a fresh reader.
- **When a Doc edit touches an essay's quoted line**, check it still matches `quote` in
  essays.json (the callout, contents line, share card, RSS and OG description all use the
  JSON copy). If the author changed it on purpose, update the JSON and re-render the card.
- **Google Docs republish lag is ~1–5 min.** An empty diff right after "done" usually means
  the edit hasn't published yet — watch it (re-run the diff every 30 s in the background)
  rather than asking the author to come back. Any local `npm run build`/`fetch-essays`
  refreshes the snapshot the diff compares against, after which an empty diff no longer
  tells you anything about live; check `/essay-content/<folder>.html` on the live site.
- The `[em]` handling in `formatEssayContent` carries state across lines on purpose
  (a tag pair can wrap multiple paragraphs).
