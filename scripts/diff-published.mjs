// Preview what a redeploy would change: for each essay, fetch the CURRENT
// published Google Doc and diff its *rendered* text (what the site's parser
// keeps) against the currently-committed local snapshot in
// public/essay-content/. Use before `/redeploy` to confirm your Doc edits have
// republished and to see exactly what will change on the site.
//
//   node scripts/diff-published.mjs            # all essays
//   node scripts/diff-published.mjs 5          # by num ("05"/"5")
//   node scripts/diff-published.mjs supervillain   # by folder substring
//
// Exit 0 = differences found (or none); prints a word-level diff per essay.
// This mirrors App.tsx's extractTextFromDocHtml/serializeInline: only block
// structure (p/h1-h5/li), punctuation/wording, links, and literal [em]/[right]
// tags survive — native Doc bold/italic/color/alignment are flattened and will
// NOT appear here or on the site.
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const essays = JSON.parse(readFileSync(path.join(root, 'src/essays.json'), 'utf8'));

const filter = process.argv[2]?.toLowerCase();
const targets = essays.filter(e =>
  !filter ||
  e.folder.toLowerCase().includes(filter) ||
  e.title.toLowerCase().includes(filter) ||
  String(Number(e.num)) === String(Number(filter))
);
if (!targets.length) {
  console.error(`No essay matches "${filter}". Folders: ${essays.map(e => e.folder).join(', ')}`);
  process.exit(1);
}

function unwrapDocUrl(href) {
  try {
    const u = new URL(href);
    if (u.hostname.endsWith('google.com') && u.pathname === '/url') return u.searchParams.get('q') || href;
  } catch {}
  return href;
}
function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}
function serializeInline(html) {
  html = html.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
    const url = unwrapDocUrl(decode(href));
    const txt = inner.replace(/<[^>]+>/g, '');
    return url && txt.trim() ? `[link:${url}]${txt}[/link]` : txt;
  });
  return decode(html.replace(/<[^>]+>/g, '')).trim();
}
function extract(html) {
  const m = html.match(/<div[^>]*id="contents"[^>]*>([\s\S]*)/i);
  const scope = m ? m[1] : html;
  const blocks = [];
  const re = /<(p|h1|h2|h3|h4|h5|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let mm;
  while ((mm = re.exec(scope))) {
    const tag = mm[1].toLowerCase();
    const text = serializeInline(mm[2]);
    if (!text) continue;
    blocks.push(tag === 'li' ? '[li]' + text : tag.startsWith('h') ? `[${tag}]` + text : text);
  }
  return blocks.join('\n') + '\n';
}

const tmp = mkdtempSync(path.join(tmpdir(), 'diff-pub-'));
let anyDiff = false;

for (const essay of targets) {
  const snapPath = path.join(root, 'public/essay-content', `${essay.folder}.html`);
  process.stdout.write(`\n──── ${essay.num} ${essay.folder} — ${essay.title} ────\n`);
  if (!existsSync(snapPath)) {
    console.log(`(no local snapshot yet — run npm run fetch-essays; can't diff)`);
    continue;
  }
  let fresh;
  try {
    const sep = essay.docUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${essay.docUrl}${sep}cb=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; essay-reader/1.0)', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fresh = await res.text();
    if (fresh.length < 1000) throw new Error(`response too small (${fresh.length} bytes)`);
  } catch (e) {
    console.error(`FAIL fetching published doc: ${e.message}`);
    continue;
  }
  const curFile = path.join(tmp, `${essay.folder}.cur.txt`);
  const newFile = path.join(tmp, `${essay.folder}.new.txt`);
  writeFileSync(curFile, extract(readFileSync(snapPath, 'utf8')));
  writeFileSync(newFile, extract(fresh));
  try {
    execFileSync('git', ['diff', '--no-index', '--word-diff=plain', '--word-diff-regex=[^[:space:]]+', curFile, newFile], { stdio: 'inherit' });
    console.log('  (no changes — published doc matches the current local snapshot)');
  } catch {
    // git diff exits 1 when files differ; the diff itself was already printed to stdout
    anyDiff = true;
  }
}

process.stdout.write(anyDiff ? '\nChanges found ↑ — review, then redeploy.\n' : '\nNo changes to publish.\n');
