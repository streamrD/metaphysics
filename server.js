import express from 'express';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = 'https://metaphysics.up.railway.app';

const essays = JSON.parse(readFileSync(path.join(__dirname, 'src/essays.json'), 'utf8'));
const indexHtml = readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf8');

const escapeAttr = (s) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function setMeta(html, attr, name, value) {
  const re = new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`);
  return html.replace(re, `$1${escapeAttr(value)}$2`);
}

// Inject per-essay OpenGraph/Twitter tags so shared essay links unfurl
// with their own title, quote, and cover image instead of the site-wide card
function essayHtml(essay) {
  let html = indexHtml;
  const title = `${essay.title} — Metaphysical Essays`;
  const description = essay.quote || '';
  // Landscape title/subtitle card — the universally safe 1.91:1 ratio that
  // unfurls uncropped everywhere (iMessage, Twitter, Slack, Feedly, ...)
  const image = `${SITE_URL}${essay.rssCard || essay.indexRollover}`;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`);
  html = setMeta(html, 'property', 'og:type', 'article');
  html = setMeta(html, 'property', 'og:title', essay.title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', `${SITE_URL}/essays/${essay.folder}`);
  html = setMeta(html, 'property', 'og:image', image);
  html = setMeta(html, 'property', 'og:image:width', '1200');
  html = setMeta(html, 'property', 'og:image:height', '630');
  html = setMeta(html, 'property', 'og:image:alt', title);
  html = setMeta(html, 'name', 'twitter:title', essay.title);
  html = setMeta(html, 'name', 'twitter:description', description);
  html = setMeta(html, 'name', 'twitter:image', image);
  return html;
}

app.get('/essays/:folder', (req, res) => {
  const essay = essays.find(e => e.folder === req.params.folder);
  res.send(essay ? essayHtml(essay) : indexHtml);
});

const escapeXml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// RSS 2.0 feed so the essays can be syndicated to feed readers.
// Built from src/essays.json; uses each essay's quote as the item summary.
function buildRss() {
  const items = [...essays]
    .sort((a, b) => (b.isoDate || '').localeCompare(a.isoDate || ''))
    .map(e => {
      const link = `${SITE_URL}/essays/${e.folder}`;
      const pubDate = e.isoDate ? new Date(`${e.isoDate}T12:00:00Z`).toUTCString() : '';
      const image = e.rssCard ? `${SITE_URL}${e.rssCard}` : '';
      const media = image
        ? `\n      <media:content url="${escapeXml(image)}" medium="image" type="image/png" width="1200" height="630" />` +
          `\n      <media:thumbnail url="${escapeXml(image)}" width="1200" height="630" />`
        : '';
      return `    <item>
      <title>${escapeXml(e.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>${pubDate ? `\n      <pubDate>${pubDate}</pubDate>` : ''}
      <description>${escapeXml(e.quote || '')}</description>${media}
    </item>`;
    })
    .join('\n');

  const lastBuildDate = new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>A Collection of Metaphysical Essays</title>
    <link>${SITE_URL}</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <description>No one arrives here with a manual. These essays are an attempt to write the one I wish I'd had.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

app.get('/rss.xml', (req, res) => {
  res.type('application/rss+xml').send(buildRss());
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
