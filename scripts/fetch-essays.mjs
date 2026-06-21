// Snapshots each essay's published Google Doc HTML into public/essay-content/,
// so the site serves essay text statically instead of proxying Google Docs at
// runtime. Runs automatically before `npm run build` (prebuild) and before
// `npm run dev` (predev, with --if-missing so dev start works offline once
// snapshots exist). Run `npm run fetch-essays` to force-refresh all essays
// after editing a doc.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const essays = JSON.parse(readFileSync(path.join(__dirname, '../src/essays.json'), 'utf8'));
const outDir = path.join(__dirname, '../public/essay-content');
const ifMissing = process.argv.includes('--if-missing');

mkdirSync(outDir, { recursive: true });

let failures = 0;
for (const essay of essays) {
  const outFile = path.join(outDir, `${essay.folder}.html`);
  if (ifMissing && existsSync(outFile)) {
    console.log(`skip   ${essay.folder} (exists)`);
    continue;
  }
  try {
    // Cache-bust: published-doc /pub URLs sit behind a 5-min Google cache and
    // propagate across edge nodes after an edit. A unique query param + no-cache
    // header makes each build more likely to pull the freshest version.
    const sep = essay.docUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${essay.docUrl}${sep}cb=${Date.now()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; essay-reader/1.0)',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    // A published doc is a full page; a tiny response means an error page
    if (html.length < 1000) throw new Error(`response too small (${html.length} bytes)`);
    writeFileSync(outFile, html);
    console.log(`fetch  ${essay.folder} (${(html.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    failures++;
    console.error(`FAIL   ${essay.folder}: ${e.message}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} essay(s) failed to fetch.`);
  process.exit(1);
}
