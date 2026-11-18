import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function localApiMiddlewarePlugin() {
  return {
    name: 'hrhub-local-api-middleware',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
        res.setHeader('X-Serverless-Proxy', 'HRHub-Local-Dev-Proxy/2.0');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        try {
          const parsedReqUrl = new URL(req.url || '', 'http://localhost');
          const targetUrl = parsedReqUrl.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: "Missing required parameter: 'url'" }));
            return;
          }

          const parsedTarget = new URL(targetUrl);
          if (parsedTarget.protocol !== 'http:' && parsedTarget.protocol !== 'https:') {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Unsupported protocol' }));
            return;
          }

          const forwardHeaders = {
            Accept: req.headers['accept'] || 'application/json',
            'User-Agent': 'HRHub-Serverless-Proxy/2.0 (Simpal Group Enterprise)'
          };
          if (req.headers['authorization']) {
            forwardHeaders['Authorization'] = req.headers['authorization'];
          }
          if (req.headers['content-type']) {
            forwardHeaders['Content-Type'] = req.headers['content-type'];
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);
          const fetchOpts = {
            method: req.method || 'GET',
            headers: forwardHeaders,
            signal: controller.signal
          };

          if (['POST', 'PUT', 'PATCH'].includes(fetchOpts.method)) {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            if (chunks.length > 0) {
              fetchOpts.body = Buffer.concat(chunks);
            }
          }

          const upstream = await fetch(parsedTarget.toString(), fetchOpts);
          clearTimeout(timeoutId);

          const ctype = upstream.headers.get('content-type') || 'application/json';
          const rateRem = upstream.headers.get('x-ratelimit-remaining');
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', ctype);
          if (rateRem !== null) res.setHeader('x-ratelimit-remaining', rateRem);
          res.setHeader('Cache-Control', 'no-store');

          const buf = Buffer.from(await upstream.arrayBuffer());
          res.end(buf);
        } catch (err) {
          res.statusCode = err?.name === 'AbortError' ? 504 : 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: err?.message || 'Local proxy error' }));
        }
      });

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
        } catch {
          res.statusCode = 500;
          res.end('TTS error');
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), localApiMiddlewarePlugin()],
})
