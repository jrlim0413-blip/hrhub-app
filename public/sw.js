const CACHE_NAME = "hrhub-pwa-v3";
const MAP_TILE_CACHE = "hrhub-offline-map-tiles-v1";
const TTS_AUDIO_CACHE = "hrhub-offline-tts-v1";
const PRESERVED_CACHES = new Set([CACHE_NAME, MAP_TILE_CACHE, TTS_AUDIO_CACHE]);

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.png",
  "/favicon.svg",
  "/pwa-192x192.png",
  "/pwa-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!PRESERVED_CACHES.has(key)) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (!url.protocol.startsWith("http")) return;

  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    event.respondWith(
      caches.open(MAP_TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const netRes = await fetch(event.request);
          if (netRes && (netRes.status === 200 || netRes.type === "opaque")) {
            cache.put(event.request, netRes.clone()).catch(() => {});
          }
          return netRes;
        } catch {
          return cached || new Response("", { status: 504 });
        }
      })
    );
    return;
  }

  if (url.pathname.startsWith("/api/tts")) {
    event.respondWith(
      caches.open(TTS_AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const netRes = await fetch(event.request);
          if (netRes && netRes.status === 200) {
            cache.put(event.request, netRes.clone()).catch(() => {});
          }
          return netRes;
        } catch {
          return new Response("", { status: 503 });
        }
      })
    );
    return;
  }

  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("stl-mandaue-api.com") ||
    url.hostname.includes("stl-ldn-api.com") ||
    url.hostname.includes("stl-mag-api.com") ||
    url.hostname.includes("stl-cotabato-api.com") ||
    url.hostname.includes("google.com") ||
    url.hostname.includes("googleapis.com") ||
    url.pathname.startsWith("/api/proxy")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
          return null;
        });
      })
  );
});
