import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

let cachedScClientId = 'ZeISTkUY1Q4so1FsHJKZaJo898iWk0d3';
let lastClientIdFetch = 0;

async function getSoundCloudClientId(): Promise<string> {
  if (cachedScClientId && Date.now() - lastClientIdFetch < 1000 * 60 * 30) {
    return cachedScClientId;
  }
  try {
    const scPage = await fetch('https://soundcloud.com/discover', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    const html = await scPage.text();
    const scripts = [
      ...html.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g),
    ].map((m) => m[1]);
    for (const s of scripts.slice(-4)) {
      const js = await (await fetch(s)).text();
      const m = js.match(/client_id\s*:\s*"([a-zA-Z0-9]{32})"/);
      if (m?.[1]) {
        cachedScClientId = m[1];
        lastClientIdFetch = Date.now();
        return cachedScClientId;
      }
    }
  } catch {
    // Keep existing fallback client_id
  }
  return cachedScClientId;
}

function audioStreamPlugin(): Plugin {
  return {
    name: 'audio-stream-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const urlObj = new URL(req.url, 'http://localhost');

        // Direct Ad-Free Full-Track HTML5 Audio Stream Resolver
        if (
          urlObj.pathname === '/api/audio-resolve' ||
          urlObj.pathname === '/class-12b-web/api/audio-resolve'
        ) {
          const q = (urlObj.searchParams.get('q') || '').trim();
          const targetDur = Number(urlObj.searchParams.get('duration') || '0');
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'public, max-age=900');

          if (!q) {
            res.end(JSON.stringify({ streamUrl: null }));
            return;
          }

          try {
            let clientId = await getSoundCloudClientId();
            let searchRes = await fetch(
              `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
                q
              )}&client_id=${clientId}&limit=10`
            );

            if (searchRes.status === 401 || searchRes.status === 403) {
              lastClientIdFetch = 0;
              clientId = await getSoundCloudClientId();
              searchRes = await fetch(
                `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
                  q
                )}&client_id=${clientId}&limit=10`
              );
            }

            if (searchRes.ok) {
              const data: any = await searchRes.json();
              const candidates = (data?.collection || []).filter(
                (t: any) =>
                  t.policy === 'ALLOW' &&
                  t.duration >= 60000 &&
                  t.duration <= 600000 &&
                  Array.isArray(t.media?.transcodings) &&
                  t.media.transcodings.length > 0
              );

              if (candidates.length > 0) {
                // Score candidates: avoid DJ/breakbeat/remix unless requested, match target duration if known
                const qLower = q.toLowerCase();
                const wantsRemix =
                  qLower.includes('remix') ||
                  qLower.includes('dj') ||
                  qLower.includes('cover');

                const scored = candidates.map((t: any, idx: number) => {
                  let score = 100 - idx * 6;
                  const titleLower = String(t.title || '').toLowerCase();
                  const userLower = String(t.user?.username || '').toLowerCase();

                  if (!wantsRemix) {
                    if (
                      titleLower.includes('breakbeat') ||
                      titleLower.includes('jedag jedug') ||
                      titleLower.includes('dj ') ||
                      titleLower.includes('remix') ||
                      titleLower.includes('slowed') ||
                      titleLower.includes('nightcore')
                    ) {
                      score -= 45;
                    }
                  }

                  const durSec = Math.round(t.duration / 1000);
                  if (targetDur > 45) {
                    const diff = Math.abs(durSec - targetDur);
                    if (diff <= 5) score += 35;
                    else if (diff <= 15) score += 20;
                    else if (diff > 60) score -= 25;
                  }

                  // Bonus if progressive MP3 is available on a well-matching track
                  const hasProg = t.media.transcodings.some(
                    (tr: any) => tr.format?.protocol === 'progressive'
                  );
                  if (hasProg) score += 8;

                  // Bonus if artist/title tokens match
                  const tokens = qLower.split(/\s+/).filter((w) => w.length > 2);
                  for (const tok of tokens) {
                    if (titleLower.includes(tok) || userLower.includes(tok)) {
                      score += 10;
                    }
                  }

                  return { track: t, score };
                });

                scored.sort((a: any, b: any) => b.score - a.score);
                const best = scored[0].track;

                // Prefer progressive MP3 if available on best track, otherwise high-quality HLS (aac_160k or audio/mpeg)
                const transcodings: any[] = best.media.transcodings;
                const chosenTranscoding =
                  transcodings.find((tr) => tr.format?.protocol === 'progressive') ||
                  transcodings.find((tr) => tr.preset === 'aac_160k') ||
                  transcodings.find(
                    (tr) =>
                      tr.format?.protocol === 'hls' &&
                      String(tr.format?.mime_type || '').includes('audio/mpeg')
                  ) ||
                  transcodings[0];

                if (chosenTranscoding?.url) {
                  const sep = chosenTranscoding.url.includes('?') ? '&' : '?';
                  const resolveRes = await fetch(
                    `${chosenTranscoding.url}${sep}client_id=${clientId}`
                  );
                  if (resolveRes.ok) {
                    const resolveData: any = await resolveRes.json();
                    if (resolveData?.url) {
                      res.end(
                        JSON.stringify({
                          streamUrl: resolveData.url,
                          streamType:
                            chosenTranscoding.format?.protocol === 'progressive'
                              ? 'progressive'
                              : 'hls',
                          duration: Math.round(best.duration / 1000),
                          title: best.title,
                        })
                      );
                      return;
                    }
                  }
                }
              }
            }
          } catch {
            // Fall through
          }

          res.end(JSON.stringify({ streamUrl: null }));
          return;
        }

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
    plugins: [react(), tailwindcss(), audioStreamPlugin()],
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

