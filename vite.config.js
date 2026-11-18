import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev middleware for /api/tts so natural human voice navigation works seamlessly on localhost
function localTtsPlugin() {
  return {
    name: 'hrhub-local-tts',
    configureServer(server) {
      server.middlewares.use('/api/tts', async (req, res) => {
        try {
          const parsedUrl = new URL(req.url || '', 'http://localhost');
          const rawText = String(parsedUrl.searchParams.get('text') || '').trim();
          const rawLang = String(parsedUrl.searchParams.get('lang') || 'tl').toLowerCase().trim();
          const lang = rawLang === 'en' ? 'en' : 'tl';

          if (!rawText) {
            res.statusCode = 400;
            res.end('Missing text');
            return;
          }

          const text = rawText.slice(0, 200);
          const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text)}`;
          const upstream = await fetch(ttsUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
            }
          });

          if (!upstream.ok) {
            res.statusCode = upstream.status;
            res.end('TTS upstream error');
            return;
          }

          const buf = Buffer.from(await upstream.arrayBuffer());
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.statusCode = 200;
          res.end(buf);
        } catch (err) {
          res.statusCode = 500;
          res.end('TTS error');
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localTtsPlugin()],
})
