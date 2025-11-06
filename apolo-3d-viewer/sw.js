/* sw.js */
const VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

const matchRoute = (url) => {
  const { pathname } = new URL(url, self.location.origin);
  if (pathname.startsWith('/assets/hdr/')) return 'HDR';
  if (pathname.startsWith('/assets/posters/')) return 'POSTER';
  if (pathname === '/assets/info.json') return 'INFO';
  if (/^\/splat\/[^/]+\/index\.html$/.test(pathname)) return 'SPLAT_HTML';
  return null;
};

self.addEventListener('install', (event) => {
  // Precache mínimo (opcional): nada forzado, el runtime se irá llenando.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => (k.startsWith('static-') || k.startsWith('runtime-')) && k !== STATIC_CACHE && k !== RUNTIME_CACHE ? caches.delete(k) : null));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const route = matchRoute(req.url);
  if (!route || req.method !== 'GET') return;

  if (route === 'HDR' || route === 'POSTER') {
    // Cache-first
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req, { ignoreVary: true });
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  if (route === 'INFO') {
    // Stale-while-revalidate
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        return cached || (await network) || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
      })()
    );
    return;
  }

  if (route === 'SPLAT_HTML') {
    // Network-first con fallback cacheado
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        try {
          const res = await fetch(req, { cache: 'no-store' });
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          const fallback = await cache.match(req);
          return fallback || new Response('<!doctype html><meta charset="utf-8"><body style="background:#0f1115;color:#e9eef7;font:16px system-ui;padding:24px">Sin conexión. Reintenta.</body>', { headers: { 'Content-Type': 'text/html' } });
        }
      })()
    );
    return;
  }
});
