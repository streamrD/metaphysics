# AGENTS.md — Quick-Start Context

This file gives a new AI agent enough context to begin work on this project. Read README.md for full architectural detail.

---

## What this is

A React/TypeScript/Vite single-page app that presents a collection of 10 metaphysical essays by Todd Stabley. It is deployed on Railway at `metaphysics.up.railway.app`.

---

## Repo structure

```
metaphysics/
├── src/
│   ├── App.tsx          ← ENTIRE application logic (606 lines, single file)
│   └── index.css        ← Global styles + Tailwind config + Google Fonts import
├── public/
│   └── slides/          ← Slide images served statically
│       ├── 1-unity/          (12 slides: essay1_slide_01.png … essay1_slide_12.png)
│       ├── 2-free/           (11 slides)
│       ├── 3-create/         (12 slides)
│       ├── 4-service/        (14 slides)
│       ├── 5-supervillain/   (9 slides)
│       ├── 6-id/             (9 slides)
│       ├── 7-paths/          (13 slides)
│       ├── 8-rocks/          (11 slides)
│       ├── 9-narcissism/     (11 slides)
│       └── 10-curriculum/    (11 slides)
├── server.js            ← Express production server (serves dist/ + /api/fetch-essay proxy)
├── vite.config.ts       ← Vite config with dev-only essay proxy plugin
├── index.html           ← HTML entry point (html/body/#root all width:100%)
├── package.json
└── railway.toml         ← Railway deploy config
```

**All application code lives in `src/App.tsx`.** This is intentional — the project is small enough that a single file is maintainable and makes handoff easier.

---

## Key concepts for any new task

### Essay data
All 10 essays are hardcoded in the `ESSAYS` array near the top of `App.tsx`. Each essay has:
- `folder` — matches the `public/slides/` subdirectory name
- `filePrefix` — e.g. `essay1_slide_` (files are zero-padded: `essay1_slide_01.png`)
- `slideCount` — total number of slides
- `indexGray` / `indexCream` — paths to the two index thumbnail variants
- `docUrl` — Google Docs published URL for essay text

### Essay text fetching
Text is fetched server-side via `/api/fetch-essay?url=<encoded-url>` to avoid CORS. The server fetches the Google Doc HTML, returns it raw, and `extractTextFromDocHtml()` parses it client-side using `DOMParser`. In dev, `vite.config.ts` provides this endpoint; in production, `server.js` does.

### Custom text formatting tags
The Google Docs contain custom markup that the formatter handles:
- `[em]...[/em]` — renders as italic paragraphs
- `[right]...[/right]` — renders as right-aligned paragraphs (supports nested `[em]`)
- `[li]` — list items are tagged by the extractor and rendered as `<ul>` groups

### Index thumbnail system
Each essay has two cover images:
- `essay{n}_slide_01_gray.png` — shown by default (cool gray `#EFEFED`)
- `essay{n}_slide_01_cream.png` — shown on hover with scale pop (warm cream `#F5F0E6`)

### Navigation flow
1. Index grid → click card → ReadingView (direct, no intermediate step)
2. ReadingView → "View Slides" button → expands InlineCarousel inline
3. Click anywhere on slide image → collapses carousel
4. Click whitespace left/right of carousel → navigates slides (fixed-position zones)
5. Keyboard ← → also navigates slides

---

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Build to dist/
npm start        # Run production Express server
npm run lint     # TypeScript check (tsc --noEmit)
```

---

## Deployment

- **Platform:** Railway
- **Build:** `npm run build`
- **Start:** `node server.js`
- **Live URL:** `metaphysics.up.railway.app`
- **Branch:** `main` is production; `v1` branch preserves the original static HTML site

---

## Typography

- **Page titles/headings:** Playfair Display (Google Fonts)
- **Essay body text:** EB Garamond (Google Fonts), 1.15rem, line-height 1.85
- **UI labels:** Inter (system)
- **Slide images:** Georgia / Gelasio at 112px (cover slides for essays 1–4 use Gelasio, a metric-compatible Georgia substitute)

---

## Things to know before making changes

- After editing `index.html` or `index.css`, **restart** `npm run dev` — HMR may not pick these up
- The `#root` div requires `width: 100%` (set in `index.html`) for centering to work correctly
- The `scrollbar-gutter: stable` on body prevents layout shift from scrollbar appearing/disappearing
- Fixed-position carousel navigation zones (`InlineCarousel`) use `getBoundingClientRect()` and update on scroll/resize — they are `<div onClick>` not `<button>` to avoid focus outlines
- `SLIDE_VARIANTS` is defined outside `InlineCarousel` to avoid recreation on every render

---

## Publishing workflow

### Pushing changes to GitHub

All work happens in the local repo at `~/Desktop/Personal/Writing/metaphysics-git/`. After making changes:

```bash
cd ~/Desktop/Personal/Writing/metaphysics-git
git add .
git commit -m "Description of changes"
git push origin main
```

**Note:** Changes made by an AI agent in a container cannot be pushed directly to GitHub (no credentials). The agent writes/outputs files, you download them, replace them locally, then push yourself.

### Deploying to Railway

Railway is connected to the `metaphysics` GitHub repo and **auto-deploys on every push to `main`**. There is no separate deploy step — pushing to GitHub triggers a Railway build automatically.

Railway runs:
1. `npm run build` — compiles Vite app to `dist/`
2. `node server.js` — starts Express server

You can monitor deploys at `railway.app` in your project dashboard.

### Branch strategy

- `main` — production branch, auto-deploys to Railway
- `v1` — preserved original static HTML site (not deployed, for reference only)

**Never push breaking changes directly to `main` without testing locally first.**

### Testing locally before pushing

```bash
npm run dev     # Test at localhost:3000
# Verify changes look correct
git add .
git commit -m "..."
git push origin main
# Railway auto-deploys within ~1-2 minutes
```

### If Railway is serving stale content

Railway occasionally serves cached builds. In the Railway dashboard: select your service → Deployments → click the latest deployment → Redeploy.

### After adding new image files

Image files (slide PNGs) must be in `public/slides/` to be served by Vite/Express. After adding new images locally, commit and push — they will be included in the Railway build automatically since they are tracked in git.
