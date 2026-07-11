# Metaphysical Essays — README

A collection of 13 metaphysical essays by Todd Stabley, presented as a React single-page
application in the **"Nocturne"** design: a night-gallery index of typographic cover cards,
a reader-owned umber/cream ground, and a distraction-free reading page. Deployed on Railway.

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
│   └── index.css        ← Theme tokens (night/day), Tailwind config, Google Fonts
├── public/
│   ├── essay-content/   ← Google Docs snapshots (gitignored; built by fetch-essays)
│   └── slides/          ← One folder per essay holding ONLY its 1200×630 RSS/OG card
│                          (essay{n}_rss_card.png, served by server.js). The app renders
│                          no images; deck PNGs live in instagram/ and git history.
├── instagram/           ← Instagram deck archive (NOT web-served); final slide keeps the CTA
├── scripts/
│   ├── fetch-essays.mjs ← Snapshots published Google Docs into public/essay-content/
│   ├── gen_rss_cards.py ← 1200×630 RSS/OG cards (colors from essays.json `ground`)
│   ├── gen_deck13.py    ← Essay 13 deck renderer (online + Instagram variants)
│   └── recolor_deck.py  ← Lossless deck background recolour
├── server.js            ← Express server (dist/ + /rss.xml + per-essay OG meta on /essays/:folder)
├── index.html           ← HTML shell: fonts, OG tags, pre-paint theme script
├── source-material/     ← Drafts and source assets (not used by the app)
├── vite.config.ts / package.json / railway.toml
├── README.md            ← This file
└── AGENTS.md            ← Handoff / quick-start context for a fresh agent or chat
```

---

## The Nocturne design

The current design (shipped July 2026) replaced the original parchment site. Its
intentional decisions — do not "fix" these without checking with the author:

1. **No slides in the app.** The carousel and "View Slides" UI were removed deliberately.
   The slide decks were Instagram promotion for the essays; embedding them risked readers
   feeling they'd "read" an essay by clicking through slides. Deck PNGs remain on disk only
   for RSS/OG cards and as an archive.
2. **The ground follows the reader.** A ☼/☾ toggle flips the whole site between umber
   (`#2A241E`, night) and cream (`#F5F0E3`, day). **First visit always opens in night** —
   the house register — regardless of OS preference; the reader's toggle choice persists
   in `localStorage('theme')`. An inline script in `index.html` sets `data-theme` on
   `<html>` **before first paint** to avoid flash.
3. **Index = gallery wall.** Cover cards are live HTML/CSS (no PNG thumbnails), each on its
   deck's own ground color. Cards keep fixed deck colors (gold `#C9A227`, ivory `#EDE7D6`)
   in **both** themes — they are objects from the collection's world, not UI panels.
4. **Newest essay is featured** above the grid (square + title/date/quote) and excluded
   from the grid below; it cycles down automatically when a newer essay ships.
5. **Grid runs 01 → N** (a numbered contents page, not a feed).
6. **The callout quote stands alone.** Each essay opens with its `quote` under a small
   diamond rule — no label, no box, no quotation marks. `text-wrap: balance` prevents
   orphan words.
7. **One gold per theme:** night `#C9A227`, day `#9C7A28` — via the `--gold` token only.

### Theme token system (`src/index.css`)

Tokens are CSS custom properties on `:root` (night values) overridden by
`:root[data-theme='day']`. Tailwind v4 `@theme` colors alias these vars
(e.g. `--color-zen-bg: var(--ground)`), so utilities like `bg-zen-bg` and opacity
modifiers like `text-zen-text/85` re-theme live when `data-theme` flips.

| Token | Night (default) | Day |
|---|---|---|
| `--ground` | `#2A241E` umber | `#F5F0E3` cream |
| `--ink` | `#EDE7D6` candle ivory | `#2A241E` |
| `--ink-soft` | `rgba(237,231,214,.85)` | `#3A311F` |
| `--muted` | `#8F8B7C` smoke | `#8B7B5E` sepia |
| `--gold` / `--gold-strong` | `#C9A227` / `#E0B93E` | `#9C7A28` / `#7A5F1E` |
| `--hairline` | `rgba(237,231,214,.14)` | `rgba(46,39,28,.16)` |

Several component styles use `color-mix(in srgb, var(--gold) N%, transparent)` —
modern-browser CSS is assumed throughout.

### Typography

| Use | Font | Notes |
|---|---|---|
| Display (cover, reading titles, card art) | Cormorant Garamond 300/400 | the only display serif |
| Body (essays, quotes, dates) | EB Garamond 400 | 1.15rem / lh 1.85, ~66ch measure (650px) |
| Labels / caps | Lato 300 | letterspaced uppercase |

Playfair Display and the unused Inter declaration were removed in the redesign.
Base font size is 18px (`html`).

---

## Application architecture

### Component tree (all in `src/App.tsx`)

```
App
├── ThemeToggle (anchored top-right of the cover, scrolls away; ReadingView carries its own)
├── Cover section (natural height, flat ground: title, diamond, byline, tagline,
│   CONTENTS anchor link with a descending gold line — the wall follows directly)
├── FeaturedCard (newest essay: cover square + title/date/quote/Read →)
├── Grid of CoverCard × (N−1), ordered 01→N, newest excluded
├── Footer (© + RSS link)
└── ReadingView (fixed overlay, z-50) — rendered with a CONSTANT key ("reading")
    ├── Sticky top bar (← Contents | Essay N · Date | ThemeToggle)
    ├── Centered title (Cormorant, clamp 2.4–3.4rem)
    ├── Callout quote (diamond rule + italic, unlabeled, text-wrap: balance)
    ├── Essay body (fetched snapshot → formatEssayContent)
    └── Vespers nav (← prev essay · ◆ ◆ ◆ · next essay →)
```

**Why the constant key matters:** `ReadingView` sits inside `AnimatePresence`. If it were
keyed by essay id, prev/next navigation would unmount one overlay and mount another; during
the cross-fade both are semi-transparent and the index flashes through. With `key="reading"`
the mounted view updates in place (its `useEffect` on `essay.id` resets scroll and refetches),
and enter/exit animations run only on open/close.

### Cover-card lockup & type treatment

The colored squares are typographic covers, and their font treatment is deliberate.
The standard to hold every card to:

**The lockup** — an upright lead line closing on an italic line, echoing the deck art
("A Diminished / *World*", "First Principles / *1: Unity*"). `splitTitle()` derives it:
- `First Principles N: X` → upright "First Principles", italic "N: X"
- titles with a colon → upright up to the colon, italic remainder
- otherwise → last word italic

**No one-word lines.** A line carrying a single word — whether an orphaned italic close
("…of the / *Id*") or a lone upright lead ("The / *Apprentice*") — is a bad break. When
the heuristic produces one, override it with the essay's `cardTitle: [upright, italic]`
field in `essays.json` rather than bending the heuristic:
- long titles break as two substantial lines — essay 06 `["The Upside-Down World", "of the Id"]`,
  essay 10 `["The Curriculum", "and the Veil"]`
- **short titles (two–three words) set as a single italic line** — empty upright part:
  essays 07/08/11 `["", "The Two Paths"]` etc., matching "Passengers"

**One type scale for every square, featured included — and it scales with the square,
but only downward from the dialed desktop values.** Card typography is
**container-relative with readable floors and dialed ceilings**: `.gallery-card-art` is a
size container and every card type/ornament dimension is `clamp(px-floor, Ncqw, px-cap)`,
where the **cap is the hand-tuned desktop value** — at the ~324px desktop square the
cover renders exactly as dialed (sizes, placement, wrapping), and scaling engages only
when the square shrinks below ~290px. Title buckets: cap 24.8px / `8.6cqw` / floor 15px
(≤24 chars); cap 20.8px / `7cqw` / floor 13px (25–42); cap 16.8px / `5.8cqw` / floor 11px
(>42). Eyebrow and byline: cap 8px / `2.8cqw` / floor 7px, Lato letterspaced caps. **Below a 230px container the card
simplifies to a miniature cover** — essay number, title, diamond rule — hiding the
"A Collection of…" line and the byline via an `@container` rule (the caption under the
card carries that information anyway). The base px values double as fallbacks for
browsers without container-query units. The featured square (~416px at desktop, ~1.3×
the grid square) carries a `gallery-card-art--featured` modifier with proportionally
smaller cqw coefficients and the **same px caps**, so at desktop widths its type matches
the wall's sizes — per creative direction, the featured type must equal the grid type,
not enlarge with the square.
Titles in a series should land in the same bucket (all three "First Principles" cards sit
in the middle bucket; the 24-char threshold was chosen so essay 1 matches its siblings).

#### The iOS thumbnail bug — why the card CSS is shaped this way

The live HTML cards failed three times — twice on iOS Safari's 2-column phone grid
(squares ≈ 150px), once on the desktop wall. All parts of the shipped fix are
load-bearing:

1. **Fixed type in a scaling square → overflow.** The original cards set type in rem.
   Desktop looked right; at 150px the eyebrow wrapped five lines deep and titles clipped
   mid-word against the square's `overflow: hidden`. *Lesson: the square scales with the
   grid, so anything inside it sized in rem/px-only will eventually overflow.*
2. **Pure proportional type → unreadable.** The first fix scaled everything with bare
   `cqw` units. Compositionally perfect at every width — and ~4px tall on a phone.
   *Lesson: proportion alone is not a mobile strategy for text.*
3. **Uncapped cqw → desktop regression.** The cqw cut fixed phones but silently broke
   the dialed desktop wall, via two cqw traps: **a container can't query itself**, so
   cqw in the card's *own* padding resolved against the viewport (~100px padding at
   1440px!), and children's cqw resolves against the **content box**, not the square,
   so every size landed below its intended value and the tuned wrapping broke.
   *Lesson: cqw is subtler than vw — check what box it actually resolves against.*
4. **The shipped fix — all parts together:** container-relative type for image-like
   scaling (coefficients calibrated to the content box) **+** fixed px padding **+**
   px floors so no text drops below legibility **+** px caps at the dialed desktop
   values so large squares keep the hand-tuned composition **+** the ≤230px miniature
   simplification so the floored type still *fits* the small square. Remove the floors
   and failure (2) returns; remove the simplification and the floors re-create failure
   (1); remove the container units and it's the original bug again; remove the caps
   and failure (3) returns.

**Regression check when touching card CSS:** view the wall at a ~390px viewport (card
≈ 150px, the iPhone 2-column grid): no clipped or overflowing text, titles ≥ 11px, small
cards showing number + title + rule only. Then confirm the desktop wall sits exactly on
the dialed values — computed title 24.8/20.8/16.8px by bucket, eyebrow/byline 8px,
padding 20.8×22.4px — and the featured square matches the grid's type sizes.

**Fixed colors in both themes** — gold `#C9A227` eyebrow/ornament, ivory `#EDE7D6`
title, on the essay's own `ground`. Cards never re-theme.

When adding an essay, eyeball its card on the wall at desktop and mobile widths; if the
break or size looks wrong, reach for `cardTitle` first.

### Data model (`src/essays.json`)

```typescript
interface Essay {
  id: string;        // '0'–'12'
  num: string;       // '01'–'13' — drives ordering and the featured spot (highest wins)
  title: string;
  date?: string;     // display date, e.g. 'July 2026'
  isoDate: string;   // 'YYYY-MM-DD' (RSS pubDate)
  quote?: string;    // the callout line; also OG/feed description
  ground: string;    // deck ground hex — card background on the gallery wall
  cardTitle?: string[]; // optional [upright, italic] cover-card lockup override,
                        // for titles the splitTitle() heuristic breaks badly (see essay 06)
  folder: string;    // public/slides subfolder + URL slug, e.g. '13-diminished'
  docUrl: string;    // Google Docs /pub URL (essay text source)
  // Legacy deck fields — unused by the app; kept in existing entries only:
  rssCard?: string;      // 1200×630 OG/RSS card — USED by server.js
  slideCount?: number;   // legacy
  filePrefix?: string;   // legacy
  indexGray?: string;    // legacy (old PNG thumbnail path; files removed from tree)
  indexRollover?: string;// legacy (old PNG thumbnail path; files removed from tree)
}
```

The array is stored oldest→newest. The app derives everything from `num`: the grid sorts
ascending, and `LATEST_NUM` (max `num`) selects the featured essay.

### Essay text pipeline

Essay text lives in published Google Docs but is **snapshotted at build time**:
`scripts/fetch-essays.mjs` downloads each doc's HTML into `public/essay-content/<folder>.html`
(gitignored; `prebuild` refreshes all, `predev` fetches only missing). The client fetches the
static snapshot — no CORS, no runtime Google dependency. After editing a doc:
`npm run fetch-essays` locally, or just redeploy (Railway re-snapshots every build).

`extractTextFromDocHtml(html)` queries `p, h1–h5, li` from `#contents`, serializing each
block inline (`serializeInline`) so hyperlinks survive as `[link:url]text[/link]` tokens.

### Links in essays

Hyperlinks in any essay's Doc render automatically — no code changes needed:
- Google's `google.com/url?q=…` redirect wrapper is unwrapped (`unwrapDocUrl`).
- Links to `https://metaphysics.up.railway.app/...` render gold, same tab; everything else
  gets a ↗ arrow and `target="_blank" rel="noreferrer"`.
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
| Plain text | Standard `<p>` blocks |

To add a tag: update the split regex and add a handler in `formatEssayContent()`.

---

## Slides, RSS, and social imagery

The app renders **no slide images**. What remains and why:

- **`public/slides/{folder}/essay{n}_rss_card.png`** — 1200×630 landscape cards, served by
  `server.js` as the per-essay OG/Twitter image and in the RSS feed (Media RSS). Still
  required for every essay. Generate with `.venv/bin/python scripts/gen_rss_cards.py {n}`
  (background color comes from the essay's `ground` field).
- **`instagram/{folder}/`** — the Instagram deck archive (final slide keeps the CTA); grab
  decks here when posting. See `instagram/README.md`. The old "online variant" decks and
  PNG index thumbnails were removed from the working tree in the post-redesign cleanup —
  recover any of them from git history (pre-cleanup: `762ef44` and earlier).
- Python tooling runs from the gitignored `.venv/` (Pillow + numpy): `gen_rss_cards.py`
  (current), `gen_deck13.py` (essay 13 deck renderer — adapt for future decks),
  `recolor_deck.py` (utility for deck PNGs).

**RSS:** `server.js` serves `/rss.xml` from `essays.json` (newest first by `isoDate`), with
`quote` as description and the rssCard via `media:content`. `index.html` carries the
autodiscovery `<link>`; the footer links the feed.

**OG meta:** `server.js` intercepts `/essays/:folder` and injects per-essay OpenGraph/Twitter
tags (title, quote, rssCard) into `dist/index.html`, so shared essay links unfurl with their
own cards. The homepage keeps site-wide tags from `index.html` (`og-image.jpg`).

---

## Deployment

```toml
# railway.toml
[build]  buildCommand = "npm run build"
[deploy] startCommand = "npm start"
```

Railway auto-deploys **every push to `main`** (~1–2 min build, which re-snapshots the Docs).

Branch strategy:
- `main` — Nocturne React app, production
- `nocturne` — the redesign branch (now merged; same commit as main)
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
- The cover section and cards use inline styles referencing `var(--…)` tokens on purpose;
  don't convert to hard-coded hexes.
- On touch devices (`hover: none`) the gallery cards skip the hover lift.
- The ☼/☾ toggle is `absolute` on the cover, not `fixed` — deliberate: a fixed toggle
  floated over the gallery and featured card while scrolling on phones. The reading view
  carries its own toggle in its top bar.
- Card typography must stay container-relative with floors — see "The iOS thumbnail bug"
  under the cover-card section before touching card CSS.

---

## Adding a new essay (no deck required)

1. Write and **publish** the essay in Google Docs (File → Share → Publish to web); note the
   `/pub` URL.
2. Choose a **ground color** for its card (a dark, muted hex in the family of the existing
   wall — see `ground` values in `essays.json`).
3. Add the entry to `src/essays.json`: `id`, `num` (next number — this automatically makes
   it the featured essay), `title`, `date`, `isoDate`, `quote` (this is the reading-page
   callout — make it strong), `ground`, `folder` (`{n}-{slug}`), `rssCard`, `docUrl`.
4. Create the **RSS/OG card**: `.venv/bin/python scripts/gen_rss_cards.py {n}` — it reads
   the title, quote, and `ground` color from the JSON entry and writes
   `public/slides/{n}-{slug}/essay{n}_rss_card.png`.
5. `npm run dev` to verify (fetches the snapshot). Check the new card on the wall against
   the type-treatment spec above — no one-word lines; add a `cardTitle` override if the
   heuristic breaks the title badly. Then commit and push — Railway deploys.
6. *(Optional)* If an Instagram deck exists, archive it in `instagram/{n}-{slug}/` and put
   the online variant (no CTA on the final slide) in `public/slides/{n}-{slug}/`.

The previous featured essay drops into the grid automatically; no other changes needed.
