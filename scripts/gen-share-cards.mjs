#!/usr/bin/env node
// Renders the Seal share cards (1200×630 PNG) in headless Chrome, so they use
// the site's real web fonts (Hanken Grotesk + Spectral):
//   public<rssCard>  e.g. public/slides/13-diminished/essay13_share.png
//                    — the per-essay OG/Twitter image and the RSS media image
//   public/og-image.png — the homepage share image
//
// Usage:
//   node scripts/gen-share-cards.mjs          # every essay + the homepage card
//   node scripts/gen-share-cards.mjs 14 3     # only these essay nums
//   node scripts/gen-share-cards.mjs home     # only the homepage card
//
// Needs Google Chrome (override the binary with CHROME=/path/to/chrome) and
// network access for Google Fonts. Output paths come from each essay's
// `rssCard` field in src/essays.json.

import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 1200, H = 630;

const essays = JSON.parse(readFileSync(path.join(ROOT, 'src/essays.json'), 'utf8'));

const args = process.argv.slice(2);
const wantHome = args.length === 0 || args.includes('home');
const nums = args.filter(a => a !== 'home').map(a => a.padStart(2, '0'));
const targets = args.length === 0 ? essays : essays.filter(e => nums.includes(e.num));
const missing = nums.filter(n => !essays.some(e => e.num === n));
if (missing.length) { console.error(`No essay with num ${missing.join(', ')}`); process.exit(1); }

// ─── Card markup (mirrors the approved canvas comps) ─────────────────────────

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Same house typesetting as typeset() in src/App.tsx: curly quotes, and em
// dashes set closed with hair spaces
const smart = s => s
  .replace(/([A-Za-z])[ \u00A0]*–[ \u00A0]*(?=[A-Za-z])/g, '$1—')
  .replace(/[ \u00A0]*—[ \u00A0]*/g, '\u200A—\u200A')
  .replace(/(^|[\s([{\u200A—–-])"/g, '$1“').replace(/"/g, '”')
  .replace(/'(?=\d)/g, '’')
  .replace(/(^|[\s([{\u200A—–\-“])'/g, '$1‘').replace(/'/g, '’');

// Same split as titleParts() in src/App.tsx
function titleParts(title) {
  const fp = title.match(/^First Principles \d+: ([\s\S]*)$/);
  if (fp) return { kicker: 'First Principles', title: fp[1], sub: '' };
  const colon = title.indexOf(': ');
  if (colon > -1) return { kicker: '', title: title.slice(0, colon), sub: title.slice(colon + 2) };
  return { kicker: '', title, sub: '' };
}

const page = body => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Spectral:ital,wght@1,400&display=block">
<style>
  html, body { margin: 0; }
  body { -webkit-font-smoothing: antialiased; }
  #card { width: ${W}px; height: ${H}px; box-sizing: border-box; overflow: hidden;
    background: #F7F5F0; color: #1B1A18; font-family: 'Hanken Grotesk', sans-serif;
    display: flex; flex-direction: column; }
  .serif { font-family: 'Spectral', serif; font-style: italic; }
</style></head><body>${body}</body></html>`;

function essayCard(e) {
  const { kicker, title, sub } = titleParts(e.title);
  const titleSize = title.length <= 20 ? 80 : title.length <= 32 ? 64 : 54;
  const quote = smart(e.quote || '');
  const quoteSize = quote.length > 100 ? 26 : 30;
  return page(`
<div id="card" style="padding: 56px 72px 72px">
  <div style="display: flex; justify-content: space-between; align-items: center; gap: 24px">
    <span style="display: flex; align-items: center; gap: 14px; font-size: 28px; font-weight: 600; letter-spacing: -0.01em">
      <span style="width: 22px; height: 22px; border-radius: 50%; background: #C23B22"></span>Metaphysical Essays</span>
    <span style="font-size: 24px; color: #6E6A62">Todd Stabley</span>
  </div>
  <div style="flex: 1; min-height: 0; display: flex; align-items: center; gap: 56px">
    <span style="flex: none; width: 184px; height: 184px; border-radius: 50%; background: #C23B22; color: #F7F5F0; display: flex; align-items: center; justify-content: center; font-size: 68px; font-weight: 600; letter-spacing: -0.03em">${esc(e.num)}</span>
    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px">
      ${kicker ? `<span style="font-size: 26px; color: #6E6A62">${esc(kicker)}</span>` : ''}
      <span id="title" style="font-size: ${titleSize}px; font-weight: 600; line-height: 1; letter-spacing: -0.04em; text-wrap: balance">${esc(smart(title))}</span>
      ${sub ? `<span style="font-size: 30px; font-weight: 500; line-height: 1.15; letter-spacing: -0.015em; color: #44413C">${esc(sub)}</span>` : ''}
      ${quote ? `<span id="quote" class="serif" style="margin-top: 6px; font-size: ${quoteSize}px; line-height: 1.38; color: #44413C; text-wrap: pretty">${esc(quote)}</span>` : ''}
    </div>
  </div>
</div>`);
}

function homeCard() {
  const years = essays.map(e => Number((e.isoDate || '').slice(0, 4))).filter(Boolean);
  const lo = Math.min(...years), hi = Math.max(...years);
  return page(`
<div id="card" style="padding: 64px 72px; justify-content: space-between">
  <span style="width: 120px; height: 120px; border-radius: 50%; background: #C23B22"></span>
  <div style="display: flex; flex-direction: column; gap: 22px">
    <span style="font-size: 112px; font-weight: 600; line-height: 0.96; letter-spacing: -0.045em">Metaphysical Essays</span>
    <span class="serif" style="font-size: 36px; line-height: 1.3; color: #44413C">No one arrives here with a manual.</span>
    <div style="height: 1px; margin-top: 14px; background: rgba(27, 26, 24, 0.14)"></div>
    <span style="font-size: 26px; color: #6E6A62"><span style="font-weight: 600; color: #1B1A18">Todd Stabley</span> · ${essays.length} essays, ${lo === hi ? hi : `${lo}–${hi}`}</span>
  </div>
</div>`);
}

// Runs in the page: wait for the web fonts, then shrink the quote (and, last
// resort, the title) until nothing overflows the 1200×630 card.
const SETTLE = `(async () => {
  await Promise.all([
    document.fonts.load('600 64px "Hanken Grotesk"'),
    document.fonts.load('500 30px "Hanken Grotesk"'),
    document.fonts.load('400 24px "Hanken Grotesk"'),
    document.fonts.load('italic 400 30px Spectral'),
  ]);
  await document.fonts.ready;
  const card = document.getElementById('card');
  const q = document.getElementById('quote'), t = document.getElementById('title');
  const px = el => parseFloat(getComputedStyle(el).fontSize);
  const over = () => [...card.querySelectorAll('*')].some(el => el.getBoundingClientRect().bottom > ${H} - 40);
  for (let i = 0; i < 24 && over(); i++) {
    if (q && px(q) > 22) q.style.fontSize = (px(q) - 2) + 'px';
    else if (t && px(t) > 44) t.style.fontSize = (px(t) - 4) + 'px';
    else break;
  }
  return {
    fonts: document.fonts.check('600 64px "Hanken Grotesk"') && document.fonts.check('italic 400 30px Spectral'),
    overflow: over(),
  };
})()`;

// ─── Minimal Chrome DevTools Protocol driver ──────────────────────────────────

const port = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(path.join(tmpdir(), 'share-cards-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 75 && !wsUrl; i++) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    wsUrl = list.find(t => t.type === 'page')?.webSocketDebuggerUrl;
  } catch { /* not up yet */ }
}
if (!wsUrl) { chrome.kill(); console.error(`Could not start Chrome at ${CHROME}`); process.exit(1); }

const ws = new WebSocket(wsUrl);
await new Promise(r => ws.addEventListener('open', r));
let seq = 0;
const pending = new Map(), waiters = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method) waiters.filter(w => w.method === m.method).forEach(w => { waiters.splice(waiters.indexOf(w), 1); w.resolve(m); });
});
const send = (method, params = {}) => new Promise(r => {
  const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params }));
});
const once = method => new Promise(resolve => waiters.push({ method, resolve }));

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });

async function render(html, outFile) {
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });
  await loaded;
  const r = await send('Runtime.evaluate', { expression: SETTLE, awaitPromise: true, returnByValue: true });
  const state = r.result?.result?.value;
  if (!state?.fonts) throw new Error(`web fonts did not load for ${outFile}`);
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, Buffer.from(shot.result.data, 'base64'));
  console.log(`${state.overflow ? 'WARN overflow ' : 'card '} ${path.relative(ROOT, outFile)}`);
}

try {
  for (const e of targets) {
    const rel = e.rssCard || `/slides/${e.folder}/essay${e.num}_share.png`;
    if (!e.rssCard) console.warn(`essay ${e.num} has no rssCard in essays.json — add "rssCard": "${rel}"`);
    await render(essayCard(e), path.join(ROOT, 'public', rel));
  }
  if (wantHome) await render(homeCard(), path.join(ROOT, 'public/og-image.png'));
} finally {
  ws.close();
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
