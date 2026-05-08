import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Proxy endpoint — fetches Google Doc HTML server-side to avoid CORS
app.get('/api/fetch-essay', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; essay-reader/1.0)' }
    });
    const html = await r.text();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(html);
  } catch (e) {
    res.status(502).send('Fetch failed');
  }
});

// Serve built Vite app
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
