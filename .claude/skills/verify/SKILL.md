---
name: verify
description: Build/launch/drive recipe for verifying changes to the metaphysics site (Vite React SPA) at real viewport sizes.
---

# Verifying the metaphysics site

## Launch

```bash
npm run dev   # vite on http://localhost:3000 (predev fetches essay content if missing)
```

Restart the dev server after editing `index.html` or `index.css` (see AGENTS.md).

## Drive

If the Claude-in-Chrome extension is connected, use the browser tools. If not
(headless fallback), local Chrome can be driven over CDP with plain Node — no
Playwright/puppeteer installed in this repo. A working script pattern (launch
`--headless=new --remote-debugging-port`, connect with Node's built-in WebSocket,
`Emulation.setDeviceMetricsOverride`, `Runtime.evaluate`, `Page.captureScreenshot`)
lives in this repo's history: see the session scratchpad script `cdp.mjs` referenced
in the 2026-07-10 card-typography commit. Rebuild it from that pattern if needed.

Kill stray processes afterwards: `pkill -f remote-debugging-port`, `pkill -f "vite --port=3000"`.

## What to check (card CSS especially)

- Desktop 1440px: computed card type must sit exactly on the dialed values —
  title 24.8/20.8/16.8px by bucket, eyebrow/byline 8px, grid padding 20.8×22.4px,
  featured padding 28.8×32px with the same type sizes as the grid.
- Phone 390px: 2-col grid squares ≈ 141px, titles floored ≥ 11px, byline and
  collection line hidden (miniature mode), nothing clipped/overflowing.
- Tablet ~800px: 2-col squares ~346px, still capped at dialed values.
- Gotcha that caused a real regression: cqw in `.gallery-card-art`'s own properties
  resolves against the viewport (container can't query itself); children's cqw
  resolves against the content box, not the square.
