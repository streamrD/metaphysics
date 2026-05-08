# AGENTS.md — Quick-Start Context

This file gives a new AI agent enough context to begin work on this project. Read README.md for full architectural detail.

---

## What this is

A React/TypeScript/Vite single-page app that presents a collection of 10 metaphysical essays by Todd Stabley. Deployed on Railway at `metaphysics.up.railway.app`.

---

## Repo structure

```
metaphysics/
├── src/
│   ├── App.tsx          ← ENTIRE application logic (~675 lines, single file)
│   └── index.css        ← Global styles + Tailwind config + Google Fonts import
├── public/
│   └── slides/          ← Slide images served statically
│       ├── 1-unity/          essay1_slide_01.png…12 + essay1_slide_01_gray.png + essay01_cover_rollover.png
│       ├── 2-free/           essay2_slide_01.png…11 + _gray + rollover
│       ├── 3-create/         …12 slides
│       ├── 4-service/        …14 slides
│       ├── 5-supervillain/   …9 slides
│       ├── 6-id/             …9 slides
│       ├── 7-paths/          …13 slides
│       ├── 8-rocks/          …11 slides
│       ├── 9-narcissism/     …11 slides
│       └── 10-curriculum/    …11 slides
├── server.js            ← Express production server (serves dist/ + /api/fetch-essay proxy)
├── vite.config.ts       ← Vite config with dev-only essay proxy plugin
├── index.html           ← HTML entry point (html/body/#root all width:100%, 18px base font)
├── package.json
├── railway.toml         ← Railway deploy config
├── README.md            ← Full architecture documentation
└── AGENTS.md            ← This file
```

**All application code lives in `src/App.tsx`.**

---

## Key concepts for any new task

### Essay data
All 10 essays are hardcoded in the `ESSAYS` array near the top of `App.tsx`. Each essay has:
- `folder` — matches the `public/slides/` subdirectory name
- `filePrefix` — e.g. `essay1_slide_` (files zero-padded: `essay1_slide_01.png`)
- `slideCount` — total number of slides
- `indexGray` — default index thumbnail (cool gray `#EFEFED`)
- `indexRollover` — hover index thumbnail (named `essay[xx]_cover_rollover.png`)
- `docUrl` — Google Docs published URL for essay text

### Essay text fetching
Text is fetched server-side via `/api/fetch-essay?url=<encoded-url>` to avoid CORS. In dev, `vite.config.ts` provides this endpoint; in production, `server.js` does.

### Custom text formatting tags
The Google Docs source uses custom markup:
- `[em]...[/em]` — italic paragraphs
- `[right]...[/right]` — right-aligned paragraphs (supports nested `[em]`)
- `[li]` — auto-tagged list items, rendered as `<ul>`

### Index thumbnail system
Each essay has two cover images:
- `essay{n}_slide_01_gray.png` — default state
- `essay[xx]_cover_rollover.png` — hover state (scales to 106% on hover)

### Navigation flow
1. Cover page (full viewport) → "Index of Essays" scrolls to grid
2. Click card → ReadingView opens
3. "View Slides" button → expands InlineCarousel inline
4. Click slide image → collapses carousel
5. Click whitespace left/right of carousel → navigates slides (fixed-position zones)
6. Keyboard ← → also navigates slides

### Typography
- **Cover title:** Cormorant Garamond 300 (clamp 3rem–5.5rem)
- **Cover labels:** Lato 300
- **Essay body:** EB Garamond 400, 1.15rem, line-height 1.85
- **Index section header:** Cormorant Garamond italic 2rem
- **Card titles:** EB Garamond 400, 1.2rem
- **Card labels:** Lato 300, .65rem gold / .75rem muted

### Color palette
- Background: `#faf9f6` (warm parchment, matches v1)
- Ink: `#1a1a18`
- Ink light: `#3d3d38`
- Ink faint: `#7a7a72`
- Gold: `#b08d57`
- Rule: `#d8d4ca`

---

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Build to dist/
npm start        # Run production Express server
npm run lint     # TypeScript check (tsc --noEmit)
```

---

## Publishing workflow

All work happens in the local repo at `~/Desktop/Personal/Writing/metaphysics-git/`.

```bash
cd ~/Desktop/Personal/Writing/metaphysics-git
git add .
git commit -m "Description of changes"
git push origin main
```

**Note:** AI agents cannot push to GitHub directly (no credentials). The agent outputs files → you download and replace locally → you push.

Railway **auto-deploys on every push to `main`**. Monitor at railway.app → your project → Deployments tab. Build takes ~1-2 minutes.

### Branch strategy
- `main` — v2 React app, production
- `v1` — original static HTML site (preserved, not deployed)

**Always test locally with `npm run dev` before pushing.**

---

## Things to know before making changes

- After editing `index.html` or `index.css`, **restart** `npm run dev`
- `#root` in `index.html` must have `width: 100%` for centering to work
- `scrollbar-gutter: stable` on body prevents layout shift
- Fixed-position carousel nav zones use `<div onClick>` not `<button>` to avoid focus outlines
- `SLIDE_VARIANTS` is outside `InlineCarousel` to avoid recreation on every render
- The cover section uses inline styles (not Tailwind) to match v1 CSS exactly
- The `[em]` branch in `formatEssayContent` has a `listBuffer` that's unused — harmless, low priority
