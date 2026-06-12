# AGENTS.md — Quick-Start Context

This file gives a new AI agent enough context to begin work on this project. Read README.md for full architectural detail.

---

## What this is

A React/TypeScript/Vite single-page app that presents a collection of 11 metaphysical essays by Todd Stabley. Deployed on Railway at `metaphysics.up.railway.app`.

---

## Repo structure

```
metaphysics/
├── src/
│   ├── App.tsx          ← ENTIRE application logic (single file)
│   ├── essays.json      ← Essay metadata (single source of truth; imported by App.tsx, server.js, and scripts/fetch-essays.mjs)
│   └── index.css        ← Global styles + Tailwind config + Google Fonts import
├── public/
│   ├── essay-content/   ← Generated Google Docs snapshots (gitignored; created by scripts/fetch-essays.mjs)
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
│       ├── 10-curriculum/    …11 slides
│       └── 11-apprentice/    cover thumbnails only (no slide deck yet)
├── scripts/
│   ├── fetch-essays.mjs ← Snapshots published Google Docs into public/essay-content/
│   └── gen_cover.py     ← Generates cover thumbnails
├── source-material/     ← Drafts and source assets, not used by the app (intro deck variants, .docx source, alternate essay-10 deck)
├── server.js            ← Express production server (serves dist/ + injects per-essay OG meta on /essays/:folder)
├── vite.config.ts       ← Vite config
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
All essays are defined in `src/essays.json` (imported by `App.tsx` as the `ESSAYS` array, by `server.js` for OG meta, and by `scripts/fetch-essays.mjs` for snapshots). Each essay has:
- `folder` — matches the `public/slides/` subdirectory name
- `filePrefix` — e.g. `essay1_slide_` (files zero-padded: `essay1_slide_01.png`)
- `slideCount` — total number of slides
- `indexGray` — default index thumbnail (cool gray `#EFEFED`)
- `indexRollover` — hover index thumbnail (named `essay[xx]_cover_rollover.png`)
- `docUrl` — Google Docs published URL for essay text

### Essay text pipeline
Essay text lives in published Google Docs (the `docUrl` field) but is **snapshotted at build time**, not fetched at runtime. `scripts/fetch-essays.mjs` downloads each doc's HTML into `public/essay-content/<folder>.html`; the client fetches that static file and parses it with `extractTextFromDocHtml`. The script runs automatically via `prebuild` (every build/deploy) and `predev` (only fetches missing files). **After editing an essay in Google Docs, run `npm run fetch-essays` locally to refresh, or just redeploy — Railway re-snapshots on every build.**

### Social sharing (OG tags)
`server.js` intercepts `/essays/:folder` and injects per-essay OpenGraph/Twitter meta (title, quote as description, cover rollover as image) into `dist/index.html`. The homepage keeps the site-wide tags from `index.html`.

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
npm run dev           # Start dev server at localhost:3000 (fetches missing essay snapshots first)
npm run fetch-essays  # Force-refresh all essay snapshots from Google Docs
npm run build         # Build to dist/ (re-snapshots all essays first)
npm start             # Run production Express server (requires dist/ from a prior build)
npm run lint          # TypeScript check (tsc --noEmit)
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
