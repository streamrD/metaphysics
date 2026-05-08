# Metaphysical Essays — README

A collection of 10 metaphysical essays by Todd Stabley. Built as a React single-page application with a Zen-minimalist aesthetic, deployed on Railway.

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
│   ├── App.tsx          ← All application logic (~606 lines)
│   └── index.css        ← Global CSS, Tailwind config, Google Fonts
├── public/
│   └── slides/
│       ├── 1-unity/
│       │   ├── essay1_slide_01.png … essay1_slide_12.png
│       │   ├── essay1_slide_01_gray.png   ← index thumbnail (default)
│       │   └── essay1_slide_01_cream.png  ← index thumbnail (hover)
│       ├── 2-free/       … (same pattern, 11 slides)
│       ├── 3-create/     … (12 slides)
│       ├── 4-service/    … (14 slides)
│       ├── 5-supervillain/ … (9 slides)
│       ├── 6-id/         … (9 slides)
│       ├── 7-paths/      … (13 slides)
│       ├── 8-rocks/      … (11 slides)
│       ├── 9-narcissism/ … (11 slides)
│       └── 10-curriculum/ … (11 slides)
├── server.js            ← Express production server
├── vite.config.ts       ← Vite + dev proxy plugin
├── index.html           ← HTML shell
├── package.json
└── railway.toml         ← Railway deployment config
```

---

## Application architecture

### Single-file design

All UI logic lives in `src/App.tsx`. Components, data, and utilities are co-located intentionally.

### Component tree

```
App
├── Header (title, diamond divider, author name, tagline)
├── Grid of EssayCard × 10
│   └── (gray thumbnail → cream + scale on hover → click → ReadingView)
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
  id: string;           // '0'–'9'
  num: string;          // '01'–'10'
  title: string;
  date: string;
  quote: string;
  folder: string;       // public/slides subfolder, e.g. '1-unity'
  filePrefix: string;   // e.g. 'essay1_slide_'
  slideCount: number;
  indexGray: string;    // path to default index thumbnail
  indexCream: string;   // path to hover index thumbnail
  docUrl: string;       // Google Docs /pub URL
}
```

---

## Essay text pipeline

### Fetching

Google Docs published URLs cannot be fetched from the browser (CORS). Solution: server-side proxy at `/api/fetch-essay?url=<encoded>`.

- **Dev:** middleware registered in `vite.config.ts`
- **Production:** handled in `server.js`

### Parsing

`extractTextFromDocHtml(html)` uses `DOMParser` to query `p, h1–h5, li` from `#contents`. List items get a `[li]` prefix. Returns newline-joined string.

### Formatting tags in Google Docs source

| Tag | Rendered as |
|---|---|
| `[em]...[/em]` | Italic paragraphs |
| `[right]...[/right]` | Right-aligned paragraphs (supports nested `[em]`) |
| `[li]` (auto-tagged) | Grouped into `<ul>` with bullets |
| Plain text | Standard `<p>` blocks |

To add a new tag: update the split regex and add a handler in `formatEssayContent()`.

---

## Slide thumbnail system

Each folder has:
- `essay{n}_slide_01.png` … `essay{n}_slide_{count}.png` — carousel slides
- `essay{n}_slide_01_gray.png` — index default (`#EFEFED`)
- `essay{n}_slide_01_cream.png` — index hover (`#F5F0E6`)

Card behavior: default gray → hover fades to cream + scales to 106% → click opens ReadingView.

---

## Carousel navigation

Four input methods: mouse drag/swipe (>40px), keyboard ← →, dot strip, fixed side zones. Side zones are `<div onClick>` (not `<button>`) to avoid focus outlines. `onWheel` on side zones forwards scroll to the reading view's `scrollRef`.

---

## Styling

### Tailwind theme

```
--font-serif: Playfair Display
--color-zen-bg: #fdfcfb
--color-zen-text: #2d2a2e
--color-zen-accent: #8e8d8a
```

### Typography

| Use | Font | Size |
|---|---|---|
| Titles | Playfair Display 400 | clamp(2rem → 4.5rem) |
| Essay body | EB Garamond 400 | 1.15rem / lh 1.85 |
| Pull quotes | Playfair Display italic | 1.25rem |
| Slide covers | Gelasio (Georgia-compatible) | 112px (reduced for essays 3–4) |

---

## Deployment

```toml
# railway.toml
[build]
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
```

`server.js` serves the proxy route + `dist/` static files + SPA fallback.

Branch strategy: `main` = v2 React app (production), `v1` = original static HTML site (preserved).

---

## Development

```bash
npm install
npm run dev      # localhost:3000
npm run build    # → dist/
npm run lint     # tsc --noEmit
npm start        # production server
```

**Quirks:** Changes to `index.html`/`index.css` require full dev server restart. `#root` must have `width: 100%` for centering. `scrollbar-gutter: stable` on body prevents layout shift.

---

## Adding a new essay

1. Add slides to `public/slides/{n}-{slug}/` as `essay{n}_slide_01.png` etc.
2. Create `_gray.png` and `_cream.png` index thumbnails
3. Add entry to `ESSAYS` array in `App.tsx`
4. Add Google Docs `/pub` URL to `docUrl`

---

## Generating cover slide thumbnails

Each essay needs two 1080×1080px cover images for the index page:
- `essay{n}_slide_01_gray.png` — default state, background `#EFEFED`
- `essay{n}_slide_01_cream.png` — hover state, background `#F5F0E6`

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

