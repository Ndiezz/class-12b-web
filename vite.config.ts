import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function ytSearchPlugin(): Plugin {
  return {
    name: 'yt-search-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const urlObj = new URL(req.url, 'http://localhost');
        if (
          urlObj.pathname === '/api/yt-search' ||
          urlObj.pathname === '/class-12b-web/api/yt-search'
        ) {
          const q = urlObj.searchParams.get('q') || '';
          res.setHeader('Content-Type', 'application/json');
          if (!q.trim()) {
            res.end(JSON.stringify({ videoId: null }));
            return;
          }
          try {
            const ytRes = await fetch(
              `https://www.youtube.com/results?search_query=${encodeURIComponent(
                q + ' official audio'
              )}`,
              {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                  'Accept-Language': 'en-US,en;q=0.9',
                },
              }
            );
            const html = await ytRes.text();
            const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
            const videoId = match ? match[1] : null;
            res.end(JSON.stringify({ videoId }));
          } catch {
            res.end(JSON.stringify({ videoId: null }));
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/class-12b-web/',
    plugins: [react(), tailwindcss(), ytSearchPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

