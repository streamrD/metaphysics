# Metaphysical Essays — README

A collection of 13 metaphysical essays by Todd Stabley, presented as a React single-page
application in the **"Seal"** design: a numbered contents page marked by one vermilion
seal, Hanken Grotesk + Spectral type, a reader-owned paper/ink ground, and a
distraction-free reading page. Deployed on Railway.

**Live site:** `metaphysics.up.railway.app`
**Repo:** `https://github.com/streamrD/metaphysics`

> For a fast handoff (key design decisions, gotchas, workflows), read **AGENTS.md** first.
> This file is the full architectural reference.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 + CSS custom-property theme tokens + inline styles |
| Animation | Framer Motion |
| Icons | Lucide React |
| Production server | Express |
| Deployment | Railway (auto-deploys `main`) |

---

## Repository structure

```
metaphysics/
├── src/
│   ├── App.tsx          ← All application logic (single file, intentionally)
│   ├── essays.json      ← Essay metadata (single source of truth)
│   └── index.css        ← Theme tokens (day/night), Tailwind config, essay-text styles
├── public/
│   ├── favicon.svg      ← The vermilion seal
│   ├── essay-content/   ← Google Docs snapshots (gitignored; built by fetch-essays)
│   ├── og-image.png     ← Homepage share card (1200×630, Seal style)
│   └── slides/          ← One folder per essay holding ONLY its 1200×630 share card
│                          (essay{n}_share.png, served by server.js). The app renders
│                          no images; deck PNGs live in instagram/ and git history.
├── instagram/           ← Instagram deck archive (NOT web-served); final slide keeps the CTA
├── scripts/
│   ├── fetch-essays.mjs ← Snapshots published Google Docs into public/essay-content/
│   ├── gen-share-cards.mjs ← Renders the 1200×630 share cards in headless Chrome
│   ├── gen_deck13.py    ← Essay 13 deck renderer (online + Instagram variants)
│   └── recolor_deck.py  ← Lossless deck background recolour
├── server.js            ← Express server (dist/ + /rss.xml + per-essay OG meta on /essays/:folder)
├── index.html           ← HTML shell: fonts, favicon, OG tags, pre-paint theme script
├── source-material/     ← Drafts and source assets (not used by the app)
├── vite.config.ts / package.json / railway.toml
├── README.md            ← This file
└── AGENTS.md            ← Handoff / quick-start context for a fresh agent or chat
```

---

## The Seal design

The current design (shipped October 2026) replaced the July 2026 "Nocturne" design
(gallery wall of deck-colored cover cards on umber; preserved on the `nocturne` branch,
`beee928`). The author chose it from two rounds of design comps — round one tried three
modern takes on Nocturne; round two dropped the colored squares and started from Hanken
Grotesk. Its intentional decisions — do not "fix" these without checking with the author:

1. **No slides in the app.** The carousel and "View Slides" UI were removed deliberately
   (Nocturne era). The slide decks were Instagram promotion for the essays; embedding them
   risked readers feeling they'd "read" an essay by clicking through slides.
2. **No colored squares.** The index is a typographic contents page, not a gallery of
   cover art. The deck `ground` colors no longer appear in the UI.
3. **One mark — the vermilion seal.** A round seal carries each essay's number: a ring in
   the contents, solid for the latest essay and at the top of the essay being read. The
   same vermilion is the dot in the "Metaphysical Essays" lockup, the favicon
   (`public/favicon.svg`), link underlines, and list bullets — and nothing else.
4. **The ground follows the reader.** A Day/Night toggle flips the whole site between
   paper (`#F7F5F0`, day) and ink (`#151413`, night). **First visit opens in day**
   regardless of OS preference; the reader's choice persists in `localStorage('seal-theme')` (a fresh key at launch, so
   Night picks saved by the Nocturne site under `'theme'` don't carry over).
   An inline script in `index.html` sets `data-theme` on `<html>` **before first paint**.
5. **Newest essay is featured** above the contents (large solid seal + title, date,
   reading time, quote) and excluded from the list below; it moves into the list
   automatically when a newer essay ships.
6. **Contents runs 01 → N** in two columns (one on phones).
7. **The callout quote stands alone.** Each essay opens with its `quote` in Spectral
   italic — no label, no box, no quotation marks.

### Theme token system (`src/index.css`)

Tokens are CSS custom properties on `:root` (day values) overridden by
`:root[data-theme='night']`. Tailwind v4 `@theme` colors alias these vars
(e.g. `--color-ground: var(--ground)`), so utilities like `bg-ground`, `text-muted`,
and `border-hairline` re-theme live when `data-theme` flips.

| Token | Day (default) | Night |
|---|---|---|
| `--ground` | `#F7F5F0` paper | `#151413` ink |
| `--ink` (titles, UI) | `#1B1A18` | `#ECE8E1` |
| `--body` (essay text) | `#2C2A26` | `#D8D3CA` |
| `--soft` (intro, quotes) | `#44413C` | `#BEB9B0` |
| `--muted` (dates, labels) | `#6E6A62` | `#8F8A81` |
| `--hairline` | `rgba(27,26,24,.12)` | `rgba(236,232,225,.13)` |
| `--seal` (the mark) | `#C23B22` | `#E0553A` |
| `--seal-text` (seal-colored small text) | `#B3361F` | `#E8684E` |

Text tokens meet WCAG AA (4.5:1) against their ground. The solid seal's number is set in
`--ground` color on `--seal`.

### Typography

| Use | Font | Notes |
|---|---|---|
| Structure: masthead, titles, labels, nav | Hanken Grotesk 400–700 | sentence case, tight tracking on large sizes (−0.045em) |
| Reading: essay text, intro, quotes | Spectral 400/500 + italic | essay text 20px / lh 1.75 in a 680px column (18.5px on phones) |

Fonts load from one Google Fonts `<link>` in `index.html`. Base font size is the browser
default (16px); sizes are set in px to match the comps.

---

## Application architecture

### Component tree (all in `src/App.tsx`)

```
App
├── Header (in flow, scrolls away): Lockup (seal dot + "Metaphysical Essays") | Contents · RSS · ThemeToggle
├── Title + introduction (masthead, hairline, intro, byline · count · year span)
├── Featured (newest essay: solid seal + Latest · date · reading time, title, quote)
├── Contents — EssayRow × (N−1), ordered 01→N, newest excluded, two columns
├── Footer (© + RSS feed)
└── ReadingView (fixed overlay, z-50) — rendered with a CONSTANT key ("reading")
    ├── Sticky top bar (← Contents | Lockup | ThemeToggle)
    ├── Solid seal + kicker · date · reading time
    ├── Title (Hanken, clamp 40–80px) + subtitle for "A: B" titles
    ├── Callout quote (Spectral italic, unlabeled)
    ├── Essay body (fetched snapshot → formatEssayContent, styled by .essay-content)
    ├── More essays: All essays → · EssayRow "Previous" · EssayRow "Next"
    └── Footer
```

**Why the constant key matters:** `ReadingView` sits inside `AnimatePresence`. If it were
keyed by essay id, prev/next navigation would unmount one overlay and mount another; during
the cross-fade both are semi-transparent and the index flashes through. With `key="reading"`
the mounted view updates in place (its `useEffect` on `essay.id` resets scroll and refetches),
and enter/exit animations run only on open/close.

### Titles, seals, and reading time

- **`titleParts(essay)`** splits titles for display. "First Principles N: X" shows the
  kicker "First Principles" above the title "X" (the seal already carries the number);
  "A: B" shows "A" as the title and "B" as a subtitle (essay 09). The full title is still
  used for `document.title`, the featured title, RSS, and OG tags.
- **`SealRing` / `SealSolid`** render the number exactly as `num` (`"01"`…`"13"`).
- **Reading time** is `ceil(words / 230)` minutes from the snapshot text. The index fetches
  only the latest essay's text for it; `fetchEssayText` caches per folder, so opening that
  essay reuses the request.
- **Hover**: contents titles underline and the row's seal turns −8°; wrapped in
  `@media (hover: hover)` so touch devices skip it.

### Data model (`src/essays.json`)

```typescript
interface Essay {
  id: string;        // '0'–'12'
  num: string;       // '01'–'13' — drives ordering and the featured spot (highest wins)
  title: string;
  date?: string;     // display date, e.g. 'July 2026'
  isoDate: string;   // 'YYYY-MM-DD' (RSS pubDate)
  quote?: string;    // the callout line; also OG/feed description
  folder: string;    // public/slides subfolder + URL slug, e.g. '13-diminished'
  docUrl: string;    // Google Docs /pub URL (essay text source)
  rssCard: string;   // share card path, e.g. '/slides/13-diminished/essay13_share.png' —
                     // server.js serves it as OG/Twitter/RSS image; gen-share-cards writes it
  // Legacy fields — unused; kept in existing entries only:
  ground?: string;       // Nocturne deck/card color
  cardTitle?: string[];  // Nocturne cover-card lockup override
  slideCount?: number;   // legacy
  filePrefix?: string;   // legacy
  indexGray?: string;    // legacy (old PNG thumbnail path; files removed from tree)
  indexRollover?: string;// legacy (old PNG thumbnail path; files removed from tree)
}
```

The array is stored oldest→newest. The app derives everything from `num`: the contents
sort ascending, and `LATEST_NUM` (max `num`) selects the featured essay. The byline's
essay count and year span ("13 essays, 2025–2026") come from the array and `isoDate`.

### Essay text pipeline

Essay text lives in published Google Docs but is **snapshotted at build time**:
`scripts/fetch-essays.mjs` downloads each doc's HTML into `public/essay-content/<folder>.html`
(gitignored; `prebuild` refreshes all, `predev` fetches only missing). The client fetches the
static snapshot — no CORS, no runtime Google dependency. After editing a doc:
`npm run fetch-essays` locally, or just redeploy (Railway re-snapshots every build).

`extractTextFromDocHtml(html)` queries `p, h1–h5, li` from `#contents`, serializing each
block inline (`serializeInline`) so hyperlinks survive as `[link:url]text[/link]` tokens.

> **What survives the parser — matters when editing Docs.** Only block structure
> (paragraphs, `h1–h5` headings, bullet lists), wording/punctuation, links, and the
> **literal** `[em]`/`[right]` tags below are rendered. The Doc's **native** Bold / Italic /
> color / text-alignment are flattened and never reach the site — to emphasize a passage,
> type the literal `[em]…[/em]` tag rather than styling the text. Preview any Doc edit with
> `node scripts/diff-published.mjs <essay>` (see [Republishing edited essays](#republishing-edited-essays)).

### Republishing edited essays

The essays are an evolving text: edits happen in the published Google Docs, not in this repo.
Because snapshots are gitignored and every Railway build re-fetches all docs, getting a Doc
edit live is a **redeploy**, not a code change:

1. Edit the Doc; make sure Google Docs has **republished** (File → Publish to web; ~5-min lag).
2. `node scripts/diff-published.mjs <essay|blank>` — word-diffs the published doc against
   what's live, so you can confirm the edit propagated and see exactly what will change.
3. `npm run fetch-essays` to refresh the local snapshot.
4. Empty commit + push to trigger the rebuild: `git commit --allow-empty -m "Republish: …" && git push origin main`.
5. Verify at `https://metaphysics.up.railway.app/essay-content/<folder>.html` (~1–2 min).

In Claude Code this whole flow is the **`/redeploy [essay]`** command. One rebuild re-fetches
*every* essay's published doc, so several edited docs ship together.

### Links in essays

Hyperlinks in any essay's Doc render automatically — no code changes needed:
- Google's `google.com/url?q=…` redirect wrapper is unwrapped (`unwrapDocUrl`).
- Links render in ink with a vermilion underline. Links to
  `https://metaphysics.up.railway.app/...` open in the same tab; everything else gets a ↗
  arrow and `target="_blank" rel="noreferrer"`.
- Internal cross-links do a full page reload (server serves the SPA, which opens the essay
  by pathname) — correct destination, just not a client-side transition.
- The internal-link match is an exact prefix on `https://metaphysics.up.railway.app`; use
  the canonical https URL for self-links. Avoid a literal `]` inside a URL.

### Formatting tags in Google Docs source

| Tag | Rendered as |
|---|---|
| `[em]...[/em]` | Italic paragraphs |
| `[right]...[/right]` | Right-aligned paragraphs (supports nested `[em]`) |
| `[li]` (auto-tagged) | Grouped into `<ul>` with bullets |
| `[h1]`–`[h5]` (auto-tagged from Doc headings) | Section headings |
| `TERM. ` opening a paragraph (ALL CAPS + period) | Run-in head in Hanken semibold, title case ("VOLATILITY." → **Volatility.**); later ALL-CAPS mentions of the same term in that essay get a lighter matching style. Other capitals (KGB) are untouched. Used by essays 02 and 05. |
| Plain text | Standard `<p>` blocks |

To add a tag: update the split regex and add a handler in `formatEssayContent()`.

---

## Slides, RSS, and social imagery

The app renders **no slide images**. What remains and why:

- **Share cards** — `public/slides/{folder}/essay{n}_share.png` (one per essay, at the
  essay's `rssCard` path) and `public/og-image.png` (homepage). 1200×630, Seal style: paper
  ground, "● Metaphysical Essays" lockup, the essay number in a solid vermilion seal, title
  in Hanken Grotesk (kicker/subtitle split as on the site), quote in Spectral italic.
  `server.js` serves the essay card as the per-essay OG/Twitter image and in the RSS feed
  (Media RSS). Render with `node scripts/gen-share-cards.mjs [nums…|home]` — it builds
  each card as HTML from `essays.json`, renders it in headless Chrome (local Google Chrome;
  override with `CHROME=`) so the web fonts match the site, shrinks the quote if anything
  would overflow, and writes the PNG. The cards are committed files, **not** built at
  deploy: re-run the script after changing an essay's title or quote. They replaced the
  Nocturne `essay{n}_rss_card.png` cards (new filenames so social platforms and feed
  readers re-fetch instead of serving cached Nocturne art).
- **`instagram/{folder}/`** — the Instagram deck archive (final slide keeps the CTA); grab
  decks here when posting. See `instagram/README.md`. The old "online variant" decks and
  PNG index thumbnails were removed from the working tree in the post-redesign cleanup —
  recover any of them from git history (pre-cleanup: `762ef44` and earlier).
- Python deck tooling runs from the gitignored `.venv/` (Pillow + numpy): `gen_deck13.py`
  (essay 13 deck renderer — adapt for future decks), `recolor_deck.py` (utility for deck
  PNGs). The Nocturne-era `gen_rss_cards.py` lives on the `nocturne` branch.

**RSS:** `server.js` serves `/rss.xml` from `essays.json` (newest first by `isoDate`), with
`quote` as description and the rssCard via `media:content`. `index.html` carries the
autodiscovery `<link>`; the footer links the feed.

**OG meta:** `server.js` intercepts `/essays/:folder` and injects per-essay OpenGraph/Twitter
tags (title, quote, rssCard) into `dist/index.html`, so shared essay links unfurl with their
own cards. The homepage keeps site-wide tags from `index.html` (`og-image.png`).
The Nocturne card URLs (`essay<NN>_rss_card.png`, `og-image.jpg`) 301 to the Seal cards,
because platforms cache image URLs from earlier shares; any other missing file with an
extension returns 404 instead of the SPA's HTML (which crawlers render as a blank image).

---

## Deployment

```toml
# railway.toml
[build]  buildCommand = "npm run build"
[deploy] startCommand = "npm start"
```

Railway auto-deploys **every push to `main`** (~1–2 min build, which re-snapshots the Docs).

Branch strategy:
- `main` — Seal design, production
- `nocturne` — the July 2026 Nocturne design, frozen at `beee928` (last commit before Seal)
- `v1` — original static HTML site (preserved, not deployed)
- The pre-Nocturne parchment app lives in `main` history at `74a02c5` and earlier

---

## Development

```bash
npm install
npm run dev           # localhost:3000 (fetches missing essay snapshots first)
npm run fetch-essays  # force-refresh all essay snapshots from Google Docs
npm run build         # → dist/ (re-snapshots all essays first)
npm run lint          # tsc --noEmit
npm start             # production server (requires a prior build)
```

**Quirks**
- Changes to `index.html` / `index.css` require a dev-server restart.
- `#root` must have `width: 100%`; `scrollbar-gutter: stable` prevents layout shift.
- The theme is set pre-paint by the inline script in `index.html` — don't move theme
  initialization into React or the first frame will flash the wrong ground.
- Colors go through the theme tokens (Tailwind `bg-ground`, `text-muted`, `var(--seal)`…);
  don't hard-code hexes in components.
- Hover effects sit inside `@media (hover: hover)`, so touch devices skip them.
- The index header is in normal flow, not `fixed` — deliberate: a fixed toggle once
  floated over content while scrolling on phones. The reading view carries its own
  toggle in a sticky top bar.
- Share cards are committed PNGs rendered by `scripts/gen-share-cards.mjs`; re-run it
  when an essay's title or quote changes.

---

## Adding a new essay (no deck required)

1. Write and **publish** the essay in Google Docs (File → Share → Publish to web); note the
   `/pub` URL.
2. Add the entry to `src/essays.json`: `id`, `num` (next number — this automatically makes
   it the featured essay), `title`, `date`, `isoDate`, `quote` (this is the reading-page
   callout and the contents line — make it strong), `folder` (`{n}-{slug}`),
   `rssCard` (`/slides/{n}-{slug}/essay{n}_share.png`), `docUrl`.
3. Render its **share card**: `node scripts/gen-share-cards.mjs {n}` (writes the PNG at the
   `rssCard` path). Also re-run `node scripts/gen-share-cards.mjs home` — the homepage card
   shows the essay count and year span.
4. `npm run dev` to verify (fetches the snapshot): the new essay should appear as the
   featured essay with its solid seal, and the previous one should join the contents.
   Then commit and push — Railway deploys.
5. *(Optional)* If an Instagram deck exists, archive it in `instagram/{n}-{slug}/` and put
   the online variant (no CTA on the final slide) in `public/slides/{n}-{slug}/`.

The previous featured essay drops into the contents automatically; no other changes needed.
