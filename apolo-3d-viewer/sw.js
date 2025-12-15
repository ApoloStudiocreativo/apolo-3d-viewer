/* ==========================================================================
   Museo Virtual Service Worker — v3.0.0 OPTIMIZED
   ========================================================================== */

const VERSION = 'v3.0.0';
const STATIC_CACHE = `museo-static-${VERSION}`;
const DYNAMIC_CACHE = `museo-dynamic-${VERSION}`;
const MODEL_CACHE = `museo-models-${VERSION}`;
const CLEANUP_INTERVAL_DAYS = 7;
const MAX_CACHE_SIZE_MB = 200; // Límite total de cache

/* --- Tipos de rutas y estrategias --- */
function matchRoute(pathname) {
  if (pathname.startsWith('/assets/hdr/')) return 'HDR';
  if (pathname.startsWith('/assets/posters/')) return 'POSTER';
  if (pathname.startsWith('/assets/audio/')) return 'AUDIO';
  if (pathname.startsWith('/models/')) return 'MODEL';
  if (pathname.endsWith('/info.json') || pathname.endsWith('/info_en.json')) return 'INFO';
  if (pathname.endsWith('.splat.html')) return 'SPLAT_HTML';
  if (pathname === '/critical.css') return 'CRITICAL_CSS';
  if (pathname === '/network-monitor.js') return 'CRITICAL_JS';
  return 'OTHER';
}

/* --- Instalación inicial --- */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([
        '/',
        '/index.html',
        '/index.min.css',
        '/critical.css',
        '/network-monitor.js',
        '/assets/brand/logo-museo.svg',
        '/assets/brand/isotipo.svg',
      ])
    )
  );
});

/* --- Activación + limpieza antigua --- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (!key.includes(VERSION)) {
            console.log('[SW] 🗑️ Borrando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );

      // Guardamos fecha de última limpieza
      await caches.open(STATIC_CACHE).then((cache) =>
        cache.put('cleanup-date', new Response(Date.now().toString()))
      );

      console.log('[SW] ✅ Activado v3.0.0 con optimizaciones');
    })()
  );
  self.clients.claim();
});

/* --- LRU Cache Cleanup (Least Recently Used) --- */
async function cleanupLRU() {
  const cache = await caches.open(MODEL_CACHE);
  const requests = await cache.keys();

  if (requests.length === 0) return;

  // Calcular tamaño aproximado y ordenar por antigüedad
  const entries = await Promise.all(
    requests.map(async (req) => {
      const res = await cache.match(req);
      const blob = await res.blob();
      return {
        request: req,
        size: blob.size,
        url: req.url
      };
    })
  );

  // Calcular tamaño total
  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
  const totalSizeMB = totalSize / (1024 * 1024);

  console.log(`[SW] 📊 Cache de modelos: ${totalSizeMB.toFixed(1)}MB (${entries.length} items)`);

  // Si excede el límite, eliminar los más antiguos
  if (totalSizeMB > MAX_CACHE_SIZE_MB) {
    const toDelete = entries.slice(0, Math.ceil(entries.length * 0.3)); // Eliminar 30%
    await Promise.all(toDelete.map(e => cache.delete(e.request)));
    console.log(`[SW] 🧹 Limpieza LRU: eliminados ${toDelete.length} modelos antiguos`);
  }
}

/* --- Soporte para Range Requests (streaming parcial) --- */
async function handleRangeRequest(request, cache) {
  const rangeHeader = request.headers.get('range');

  if (!rangeHeader) {
    // No es range request, manejarlo normal
    return null;
  }

  // Intentar obtener el recurso completo del cache
  const cachedResponse = await cache.match(request.url);

  if (!cachedResponse) {
    // No está en cache, hacer fetch normal
    return fetch(request);
  }

  // Parsear el range header: "bytes=0-1023"
  const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!rangeMatch) return cachedResponse;

  const start = parseInt(rangeMatch[1]);
  const blob = await cachedResponse.blob();
  const end = rangeMatch[2] ? parseInt(rangeMatch[2]) : blob.size - 1;

  // Crear respuesta parcial
  const slicedBlob = blob.slice(start, end + 1);

  return new Response(slicedBlob, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cachedResponse.headers.get('Content-Type'),
      'Content-Length': slicedBlob.size,
      'Content-Range': `bytes ${start}-${end}/${blob.size}`,
      'Accept-Ranges': 'bytes'
    }
  });
}

/* --- Manejador de peticiones --- */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const route = matchRoute(url.pathname);

  // CRITICAL CSS/JS → Cache First con fallback a network
  if (['CRITICAL_CSS', 'CRITICAL_JS'].includes(route)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;

        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return hit || new Response('/* fallback */', { status: 200 });
        }
      })
    );
    return;
  }

  // HDR, POSTER, AUDIO → Cache First
  if (['HDR', 'POSTER', 'AUDIO'].includes(route)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return hit || new Response(null, { status: 504 });
        }
      })
    );
    return;
  }

  // MODEL → Cache First con Range Request support
  if (route === 'MODEL') {
    event.respondWith(
      caches.open(MODEL_CACHE).then(async (cache) => {
        // Intentar manejar range request
        const rangeResponse = await handleRangeRequest(request, cache);
        if (rangeResponse) {
          console.log('[SW] ✂️ Range request servido:', url.pathname);
          return rangeResponse;
        }

        const hit = await cache.match(request);
        if (hit) {
          console.log('[SW] ✅ Modelo desde caché:', url.pathname);
          // Touch para LRU (actualizar timestamp)
          cache.put(request, hit.clone());
          return hit;
        }

        console.log('[SW] 📥 Descargando modelo:', url.pathname);
        try {
          const res = await fetch(request);
          if (res.ok && res.status === 200) {
            cache.put(request, res.clone());
            // Cleanup periódico después de cachear modelo nuevo
            setTimeout(() => cleanupLRU(), 1000);
          }
          return res;
        } catch {
          return new Response(null, { status: 504 });
        }
      })
    );
    return;
  }

  // INFO.JSON → Stale While Revalidate (servir cache + actualizar background)
  if (route === 'INFO') {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);

        const fetchPromise = fetch(request)
          .then((res) => {
            if (res.ok) {
              cache.put(request, res.clone());
              console.log('[SW] 🔄 Info.json actualizado en background');
            }
            return res;
          })
          .catch(() => cached);

        // Devolver cache inmediatamente si existe, sino esperar fetch
        return cached || fetchPromise;
      })
    );
    return;
  }

  // SPLAT HTML → Network First con fallback a caché
  if (route === 'SPLAT_HTML') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, res.clone());
            return res;
          }
        } catch (err) {
          const cached = await caches.match(request);
          if (cached) return cached;
        }
        return new Response('<h1>Offline</h1>', {
          headers: { 'Content-Type': 'text/html' },
        });
      })()
    );
    return;
  }

  // Otras peticiones → Network First genérico con timeout
  event.respondWith(
    Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000)
      )
    ]).catch(() => caches.match(request))
  );
});

/* --- Smart Prefetching (en requestIdleCallback simulation) --- */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PREFETCH_MODEL') {
    const modelUrl = event.data.url;

    // Prefetch solo si no está ya en cache
    caches.open(MODEL_CACHE).then(async (cache) => {
      const cached = await cache.match(modelUrl);
      if (!cached) {
        console.log('[SW] 🚀 Prefetching modelo:', modelUrl);
        fetch(modelUrl, { priority: 'low' })
          .then(res => {
            if (res.ok) cache.put(modelUrl, res);
          })
          .catch(() => console.log('[SW] ⚠️ Prefetch falló'));
      }
    });
  }

  // Comando para limpiar cache manualmente
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    cleanupLRU().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

/* --- Limpieza semanal automática --- */
async function shouldCleanup() {
  const cache = await caches.open(STATIC_CACHE);
  const resp = await cache.match('cleanup-date');
  if (!resp) return true;
  const last = parseInt(await resp.text());
  const diffDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
  return diffDays >= CLEANUP_INTERVAL_DAYS;
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cleanup') {
    event.waitUntil(
      (async () => {
        if (await shouldCleanup()) {
          const keys = await caches.keys();
          await Promise.all(
            keys.map((key) => {
              if (!key.includes(VERSION)) return caches.delete(key);
            })
          );
          await cleanupLRU();
          const cache = await caches.open(STATIC_CACHE);
          await cache.put('cleanup-date', new Response(Date.now().toString()));
          console.log('[SW] 🧹 Limpieza semanal completada.');
        }
      })()
    );
  }
});
