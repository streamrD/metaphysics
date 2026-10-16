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

## What to check (Seal design, October 2026)

- No horizontal overflow at 1440px and 390px (`scrollWidth === clientWidth` on the page
  and on the reading overlay `.fixed.inset-0`).
- Index, desktop 1440px: masthead in Hanken Grotesk (~95px), featured essay with the solid
  seal + "Latest · date · N min read", contents in two columns of `.seal-row` entries
  (N−1 of them, 01→N−1), each with a vermilion seal ring.
- Index, phone 390px: masthead ~44px, contents in one column, Contents/RSS nav links
  hidden (footer keeps RSS), nothing clipped.
- Reading view (`/essays/<folder>`): solid seal + meta, Hanken title (subtitle for
  "A: B" titles, kicker for First Principles), Spectral body (`.essay-content`),
  Previous/Next rows at the foot.
- Both themes: seed `localStorage['seal-theme']` = `day` / `night` before load; night ground is
  `#151413`, day `#F7F5F0`. The toggle in the header and reading bar stay in sync.
- After a Doc edit: confirm a distinctive edited phrase renders in the reading view.

The Nocturne-era card checks (cqw floors/caps, miniature cards) no longer apply — the
cards were removed; that history lives on the `nocturne` branch.
