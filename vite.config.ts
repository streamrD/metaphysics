import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import type { Plugin } from 'vite';

function essayProxyPlugin(): Plugin {
  return {
    name: 'essay-proxy',
    configureServer(server) {
      server.middlewares.use('/api/fetch-essay', async (req, res) => {
        const urlParam = new URL(req.url!, `http://localhost`).searchParams.get('url');
        if (!urlParam) { res.statusCode = 400; res.end('Missing url'); return; }
        try {
          const r = await fetch(urlParam, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; essay-reader/1.0)' }
          });
          const html = await r.text();
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(html);
        } catch (e) {
          res.statusCode = 502; res.end('Fetch failed');
        }
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), essayProxyPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
