# Metaphysical Essays — README

A collection of 13 metaphysical essays by Todd Stabley. Built as a React single-page application with a Zen-minimalist aesthetic, deployed on Railway.

**Live site:** `metaphysics.up.railway.app`  
**Repo:** `https://github.com/streamrD/metaphysics`

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 + inline styles |
| Animation | Framer Motion |
| Icons | Lucide React |
| Production server | Express |
| Deployment | Railway |

---

## Repository structure

```
metaphysics/
├── src/
│   ├── App.tsx          ← All application logic (single file)
│   ├── essays.json      ← Essay metadata (single source of truth)
│   └── index.css        ← Global CSS, Tailwind config, Google Fonts
├── public/
│   ├── essay-content/   ← Google Docs snapshots (gitignored; built by fetch-essays)
│   └── slides/          ← Online carousel decks, one folder per essay (1-unity … 13-diminished)
│       └── {n}-{slug}/      essay{n}_slide_01…NN.png            (carousel slides)
│                            essay{n}_slide_01_gray.png          (index thumbnail, default)
│                            essay{n}_cover_rollover.png         (index thumbnail, hover)
│                            essay{n}_rss_card.png               (1200×630 RSS/OG card)
├── instagram/           ← Instagram deck archive (NOT web-served); final slide keeps the CTA
├── scripts/
│   ├── fetch-essays.mjs ← Snapshots published Google Docs into public/essay-content/
│   ├── gen_cover.py     ← Index gray + rollover thumbnails
│   ├── gen_deck13.py    ← Essay 13 deck renderer (online + Instagram variants)
│   ├── gen_rss_cards.py ← 1200×630 RSS/OG cards
│   ├── recolor_deck.py  ← Lossless deck background recolour
│   └── strip_counter.py ← Removes the slide counter from index thumbnails
├── server.js            ← Express server (dist/ + /rss.xml + per-essay OG meta on /essays/:folder)
├── vite.config.ts       ← Vite config
├── source-material/     ← Drafts and source assets (not used by the app)
├── index.html           ← HTML shell
├── package.json
├── railway.toml         ← Railway deployment config
├── README.md
└── AGENTS.md            ← Quick-start / handoff context
```

---

## Application architecture

### Single-file design

All UI logic lives in `src/App.tsx`. Components, data, and utilities are co-located intentionally.

### Component tree

```
App
├── Header (title, diamond divider, author name, tagline)
├── Grid of EssayCard × 13 (newest first — sorted by num descending)
│   └── (gray thumbnail → rollover + scale on hover → click → ReadingView)
├── Footer
└── ReadingView (fixed overlay, z-50)
    ├── Sticky top bar (← Index | Essay N · Date)
    ├── Title + Pull quote
    ├── View Slides toggle button
    │   └── InlineCarousel (animated expand/collapse)
    │       ├── Fixed left zone (click = prev, scroll = page scroll)
    │       ├── Fixed right zone (click = next, scroll = page scroll)
    │       ├── Slide image frame (click = collapse, swipe = navigate)
    │       └── Dot strip
    ├── ◈ Divider
    └── Essay body (paragraphs, lists, italic, right-aligned blocks)
```

### Data model

```typescript
interface Essay {
  id: string;            // '0'–'12'
  num: string;           // '01'–'13'
  title: string;
  date: string;          // human display date, e.g. 'July 2026'
  isoDate: string;       // machine date 'YYYY-MM-DD' (RSS pubDate)
  quote: string;         // tagline; OG/feed description + RSS card subtitle
  folder: string;        // public/slides subfolder, e.g. '13-diminished'
  filePrefix: string;    // e.g. 'essay13_slide_'
  slideCount: number;
  indexGray: string;     // default index thumbnail (#EFEFED)
  indexRollover: string; // hover index thumbnail (essay{xx}_cover_rollover.png)
  rssCard: string;       // 1200×630 RSS/OG landscape card
  docUrl: string;        // Google Docs /pub URL
}
```

Data lives in `src/essays.json` (imported by `App.tsx` as `ESSAYS`, by `server.js` for OG meta, and by `scripts/fetch-essays.mjs`). The array is stored oldest→newest; the index grid renders newest-first by sorting a copy on `num` descending.

---

## Essay text pipeline

### Fetching

Essay text lives in published Google Docs but is snapshotted at build time rather than fetched at runtime: `scripts/fetch-essays.mjs` downloads each doc's HTML into `public/essay-content/<folder>.html` (gitignored, regenerated on every build via the `prebuild` script; `predev` fetches only missing files). The client fetches the static snapshot — no CORS issue, no runtime dependency on Google.

To refresh content after editing a doc: `npm run fetch-essays` locally, or simply redeploy (Railway re-snapshots during the build).

### Parsing

`extractTextFromDocHtml(html)` uses `DOMParser` to query `p, h1–h5, li` from `#contents`. List items get a `[li]` prefix. Each block is serialized inline (`serializeInline`) rather than flattened with `.textContent`, so hyperlinks survive (see below). Returns a newline-joined string.

### Links

Hyperlinks in any essay's Google Doc render automatically as styled links — **no code changes needed to add links to a new essay.** Just create the link in the Doc and refresh the snapshot (`npm run fetch-essays`, or redeploy — Railway re-snapshots every build). Until you re-fetch, the old snapshot (without the new links) is what shows.

Behavior, all automatic:

- **Google's redirect wrapper is unwrapped.** Docs rewrites every link to `google.com/url?q=<real-url>&…`; `unwrapDocUrl()` recovers the real destination, so you just link normally in the Doc.
- **Internal vs external is auto-detected.** Links to `https://metaphysics.up.railway.app/...` render gold with no arrow and open in the same tab; everything else gets a `↗` arrow and opens in a new tab (`rel="noreferrer"`).
- **Whitespace-only anchors** and Google's own page chrome (`/abuse`, `support.google.com`) are dropped.

Gotchas:

- **Internal cross-links do a full page reload** (real `<a href>` navigation → server serves the SPA → client opens the essay by pathname), not instant client-side routing. It lands on the right essay; it just isn't a snappy in-app transition.
- **The internal-link match is an exact prefix** on `https://metaphysics.up.railway.app`. An `http://`, a `www.`, or a Railway preview domain will be treated as external (new tab + arrow). Use the canonical https URL for self-cross-links, e.g. `https://metaphysics.up.railway.app/essays/<folder>`.
- **Avoid a literal `]` in a URL.** The internal `[link:url]text[/link]` token (emitted by `serializeInline`, rendered by `renderInline` inside `formatEssayContent`) stops at the first `]`, so such a URL would break that one link. Extremely rare; easy to harden if it ever comes up.

### Formatting tags in Google Docs source

| Tag | Rendered as |
|---|---|
| `[em]...[/em]` | Italic paragraphs |
| `[right]...[/right]` | Right-aligned paragraphs (supports nested `[em]`) |
| `[li]` (auto-tagged) | Grouped into `<ul>` with bullets |
| Plain text | Standard `<p>` blocks |

To add a new tag: update the split regex and add a handler in `formatEssayContent()`.

---

## Cover page

The landing page is a full-viewport cover section that mirrors the v1 static site exactly, using the same CSS values, fonts, and animation timings sourced directly from `v1/index.html`.

Structure (top to bottom):
1. Thin vertical gold gradient line (80px)
2. "A COLLECTION OF" — Lato 300, gold, letter-spaced, fade-up at 0.2s
3. "Metaphysical / *Essays*" — Cormorant Garamond 300, clamp(3rem–5.5rem), at 0.4s
4. ✦ diamond divider with gold hairlines, at 0.55s
5. "TODD STABLEY" — Lato 300, muted, at 0.6s
6. Italic tagline — EB Garamond italic, at 0.8s
7. "INDEX OF ESSAYS" anchor link — scrolls to `#index`, at 1.2s
8. Descending gold gradient line + bottom vertical rule

Below the cover, a "Contents / The Essays" section header (Cormorant Garamond italic) introduces the thumbnail grid.

The cover uses inline `style` props rather than Tailwind to precisely match v1 CSS values. Do not convert these to Tailwind classes.

---

## Slide thumbnail system

Each folder has:
- `essay{n}_slide_01.png` … `essay{n}_slide_{count}.png` — carousel slides
- `essay{n}_slide_01_gray.png` — index default thumbnail (`#EFEFED`)
- `essay{n}_cover_rollover.png` — index hover thumbnail (on the deck's own bg colour)
- `essay{n}_rss_card.png` — 1200×630 RSS/OG landscape card

Card behavior: default gray → hover fades to the rollover + scales to 106% → click opens ReadingView.

---

## Online vs Instagram decks

Every essay's deck exists in two variants that share all slides **except the last**:

- **Online** — `public/slides/{folder}/`, served in the site carousel. The final slide has **no Instagram CTA** (the reader is already online). Essays 1–9 close on quote + diamond divider + author, 11–12 on framed closing text, 13 on an asterism tailpiece.
- **Instagram** — `instagram/{folder}/` (repo root, **not web-served**). The archive to grab from when posting; its final slide keeps the call to action (`METAPHYSICS.UP.RAILWAY.APP` on older decks, `READ THE ESSAY ONLINE → LINK IN BIO` on 13).

Essay 13's two variants are both rendered by `scripts/gen_deck13.py` in one run. For decks 1–12 (external-pipeline PNGs, no generator) the online final slide was made by painting the CTA/URL footer out of the archived original. See `instagram/README.md`.

---

## Carousel navigation

Four input methods: mouse drag/swipe (>40px), keyboard ← →, dot strip, fixed side zones. Side zones are `<div onClick>` (not `<button>`) to avoid focus outlines. `onWheel` on side zones forwards scroll to the reading view's `scrollRef`.

---

## Styling

### Tailwind theme

```
--font-serif: Playfair Display
--color-zen-bg: #faf9f6  (matches v1 warm parchment)
--color-zen-text: #2d2a2e
--color-zen-accent: #8e8d8a
```

### Typography

| Use | Font | Size |
|---|---|---|
| Cover title | Cormorant Garamond 300 | clamp(3rem → 5.5rem) |
| Cover labels | Lato 300 | .72rem–.85rem |
| Index section header | Cormorant Garamond italic | 2rem |
| Card titles | EB Garamond 400 | 1.2rem |
| Card labels | Lato 300 | .65rem (gold) / .75rem (muted) |
| Essay body | EB Garamond 400 | 1.15rem / lh 1.85 |
| Reading view titles | Playfair Display 400 | clamp(2rem → 3rem) |
| Slide cover images | Gelasio (Georgia-compatible) | 112px (72px essay 3, 56px essay 4) |

---

## Deployment

```toml
# railway.toml
[build]
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
```

`server.js` serves `dist/` static files + SPA fallback, serves the `/rss.xml` feed, and injects per-essay OpenGraph/Twitter meta tags on `/essays/:folder` routes (title, pull quote, and the 1200×630 `rssCard` image from `src/essays.json`) so shared essay links unfurl with their own cards.

Branch strategy: `main` = v2 React app (production), `v1` = original static HTML site (preserved).

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

**Quirks:** Changes to `index.html`/`index.css` require full dev server restart. `#root` must have `width: 100%` for centering. `scrollbar-gutter: stable` on body prevents layout shift.

---

## Adding a new essay

1. Build the slide deck into `public/slides/{n}-{slug}/` (for essay 13's style, adapt `scripts/gen_deck13.py`; older decks came from an external pipeline).
2. Generate index thumbnails: `.venv/bin/python scripts/gen_cover.py` → `essay{n}_slide_01_gray.png` + `essay{n}_cover_rollover.png`.
3. Generate the RSS/OG card: `.venv/bin/python scripts/gen_rss_cards.py {n}` → `essay{n}_rss_card.png`.
4. Add an entry to `src/essays.json` (title, `date`, `isoDate`, `quote`, `folder`, `filePrefix`, `slideCount`, the thumbnail/card paths, and the Google Docs `/pub` `docUrl`).
5. Archive the Instagram variant into `instagram/{n}-{slug}/` and remove the CTA from the online final slide (see **Online vs Instagram decks**).
6. `npm run dev` to verify, then commit/push — Railway re-snapshots the doc and deploys.

---

## Generating cover slide thumbnails

**Current tool: `scripts/gen_cover.py`** (Pillow + macOS system Georgia). It renders the two 1080×1080 index thumbnails per essay:
- `essay{n}_slide_01_gray.png` — default state, cool-gray background `#EFEFED`
- `essay{n}_cover_rollover.png` — hover state, on the deck's own dark bg colour

To add an essay, add a `gen_<name>()` config and call it from `__main__` (see `gen_passengers` / `gen_diminished`). Then build the 1200×630 RSS/OG card with `scripts/gen_rss_cards.py {n}`.

> **Historical reference (below).** The remainder of this section documents the original standalone approach and its exact colour/font/layout values. It is kept for reference only — the shipping `gen_cover.py` differs: it uses system **Georgia** (not Gelasio), names the hover thumbnail `essay{n}_cover_rollover.png` (not `_cream.png`), and its palette/positions live in the script itself.

### Why Gelasio, not Georgia

Georgia is a proprietary Microsoft font unavailable in server/container environments. **Gelasio** is a free, metric-compatible substitute that renders identically. It is available via `@fontsource/gelasio` on npm.

### Environment setup

```bash
pip install Pillow fonttools

# Download Gelasio via npm fontsource
npm pack @fontsource/gelasio
tar xzf fontsource-gelasio-*.tgz

# Convert woff → ttf (Pillow requires TTF, not woff)
python3 -c "
from fontTools.ttLib import TTFont
TTFont('package/files/gelasio-latin-400-normal.woff').save('/tmp/Gelasio-Regular.ttf')
TTFont('package/files/gelasio-latin-400-italic.woff').save('/tmp/Gelasio-Italic.ttf')
"

# Install into system font cache so cairosvg/Pillow can find them by name
cp /tmp/Gelasio-*.ttf /usr/share/fonts/truetype/
fc-cache -f
```

### Exact color values

| Name | Hex | Usage |
|---|---|---|
| Gray background | `#EFEFED` | Default index thumbnail bg |
| Cream background | `#F5F0E6` | Hover index thumbnail bg |
| Gold accent | `#B8960C` as RGB `(184, 150, 12)` | Header text, diamond, divider lines |
| Dark text | `#2a2520` as RGB `(42, 37, 32)` | Title text |
| Muted label | `#8a7a5a` as RGB `(138, 122, 90)` | "TODD STABLEY", slide counter |

### Font sizes at 1080×1080px

| Element | Font | Size |
|---|---|---|
| Header label ("A COLLECTION OF...") | Gelasio Regular | 22px |
| Title upright lines ("First", "Principles") | Gelasio Regular | 112px |
| Title italic line ("1: Unity") | Gelasio Italic | 112px |
| Essay 3 italic line (longer subtitle) | Gelasio Italic | 72px |
| Essay 4 italic line (longer subtitle) | Gelasio Italic | 56px |
| Author name ("TODD STABLEY") | Gelasio Regular | 22px |

### Layout positions (1080×1080px canvas)

| Element | Position |
|---|---|
| Header line 1 ("A COLLECTION OF...") | x=75, y=68 |
| Header line 2 ("ESSAY 01 · UNITY") | x=75, y=100 |
| Title line 1 ("First") | x=70, y=260 |
| Title line 2 ("Principles") | x=70, y=390 |
| Italic subtitle | x=70, y=545 |
| Divider line left | (75,760) → (225,760) |
| Diamond center | x=250, y=760 (polygon points: 250,752 258,760 250,768 242,760) |
| Divider line right | (265,760) → (415,760) |
| Author name | x=75, y=985 |

### Working Python code

```python
from PIL import Image, ImageDraw, ImageFont
import os

GRAY  = (239, 239, 237)   # #EFEFED
CREAM = (245, 240, 230)   # #F5F0E6
GOLD  = (184, 150, 12)    # #B8960C
DARK  = (42, 37, 32)      # #2a2520
MUTED = (138, 122, 90)    # #8a7a5a

REG  = '/usr/share/fonts/truetype/Gelasio-Regular.ttf'
ITAL = '/usr/share/fonts/truetype/Gelasio-Italic.ttf'

def spaced_text(draw, pos, text, font, fill, spacing=4):
    """Draw text with letter spacing (Pillow has no native letter-spacing)."""
    x, y = pos
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        bbox = font.getbbox(ch)
        x += (bbox[2] - bbox[0]) + spacing

def make_cover(essay_num, header, line1, line2, line3, italic_size, bg, outpath):
    """
    essay_num: int, e.g. 1
    header:    str, e.g. 'UNITY'  (used in "ESSAY 01 · UNITY")
    line1:     str, e.g. 'First'
    line2:     str, e.g. 'Principles'
    line3:     str, e.g. '1: Unity'  (rendered italic)
    italic_size: int, 112 for essays 1-2, 72 for essay 3, 56 for essay 4
    bg:        tuple, e.g. GRAY or CREAM
    outpath:   str, output file path
    """
    img = Image.new('RGB', (1080, 1080), bg)
    d = ImageDraw.Draw(img)

    f_sm   = ImageFont.truetype(REG,  22)
    f_lg   = ImageFont.truetype(REG,  112)
    f_ital = ImageFont.truetype(ITAL, italic_size)

    # Header (letter-spaced gold caps)
    spaced_text(d, (75, 68),  'A COLLECTION OF METAPHYSICAL ESSAYS', f_sm, GOLD, spacing=4)
    spaced_text(d, (75, 100), f'ESSAY {essay_num:02d} \u00b7 {header}', f_sm, GOLD, spacing=3)

    # Title — two upright lines + one italic line
    d.text((70, 260), line1, font=f_lg, fill=DARK)
    d.text((70, 390), line2, font=f_lg, fill=DARK)
    d.text((70, 545), line3, font=f_ital, fill=DARK)

    # Divider line + diamond
    d.line([(75, 760), (225, 760)], fill=GOLD, width=2)
    d.polygon([(250, 752), (258, 760), (250, 768), (242, 760)], fill=GOLD)
    d.line([(265, 760), (415, 760)], fill=GOLD, width=2)

    # Author (letter-spaced muted caps)
    spaced_text(d, (75, 985), 'TODD STABLEY', f_sm, MUTED, spacing=4)

    img.save(outpath)

# Example — generate both variants for all 4 First Principles essays
essays = [
    dict(num=1, header='UNITY',                     l1='First', l2='Principles', l3='1: Unity',                     isize=112),
    dict(num=2, header='FREE WILL',                  l1='First', l2='Principles', l3='2: Free Will',                  isize=112),
    dict(num=3, header='THE IMPULSE TO CREATE',      l1='First', l2='Principles', l3='3: The Impulse to Create',      isize=72),
    dict(num=4, header='SERVICE TO OTHERS VS. SELF', l1='First', l2='Principles', l3='4: Service to Others vs. Self', isize=56),
]

folders = {1:'1-unity', 2:'2-free', 3:'3-create', 4:'4-service'}
base = 'public/slides'

for e in essays:
    folder = f"{base}/{folders[e['num']]}"
    make_cover(e['num'], e['header'], e['l1'], e['l2'], e['l3'], e['isize'],
               GRAY,  f"{folder}/essay{e['num']}_slide_01_gray.png")
    make_cover(e['num'], e['header'], e['l1'], e['l2'], e['l3'], e['isize'],
               CREAM, f"{folder}/essay{e['num']}_slide_01_cream.png")
    print(f"Essay {e['num']} done")
```

### Notes for essays 5–10

Essays 5–10 use dark-background slides in the carousel (navy, forest green, warm black) but their index covers should still use the gray/cream system. The same `make_cover()` function works — just adjust `header`, `line1`, `line2`, `line3` to match the essay title. For essays with a single-word or two-word title that doesn't need three lines, use `line1=''` and adjust `line2`/`line3` positions accordingly, or reduce font size to fit.

