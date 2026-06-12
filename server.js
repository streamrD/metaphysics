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
  const image = `${SITE_URL}${essay.indexRollover}`;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`);
  html = setMeta(html, 'property', 'og:type', 'article');
  html = setMeta(html, 'property', 'og:title', essay.title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', `${SITE_URL}/essays/${essay.folder}`);
  html = setMeta(html, 'property', 'og:image', image);
  html = setMeta(html, 'property', 'og:image:width', '1080');
  html = setMeta(html, 'property', 'og:image:height', '1080');
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

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
