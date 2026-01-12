/* ==========================================================================
   Museo Virtual Service Worker — v2.0.0
   ========================================================================== */

   const VERSION = 'v1.1.0';
   const STATIC_CACHE = `museo-static-${VERSION}`;
   const DYNAMIC_CACHE = `museo-dynamic-${VERSION}`;
   const CLEANUP_INTERVAL_DAYS = 7;
   
   /* --- Tipos de rutas y estrategias --- */
   function matchRoute(pathname) {
     if (pathname.startsWith('/assets/hdr/')) return 'HDR';
     if (pathname.startsWith('/assets/posters/')) return 'POSTER';
     if (pathname.startsWith('/assets/audio/')) return 'AUDIO';
     if (pathname.startsWith('/models/')) return 'MODEL';
     if (pathname.endsWith('/info.json')) return 'INFO';
     if (pathname.endsWith('.splat.html')) return 'SPLAT_HTML';
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
           '/index.css',
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
               console.log('[SW] Borrando caché antigua:', key);
               return caches.delete(key);
             }
           })
         );
   
         // Guardamos fecha de última limpieza
         await caches.open(STATIC_CACHE).then((cache) =>
           cache.put('cleanup-date', new Response(Date.now().toString()))
         );
       })()
     );
     self.clients.claim();
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
   
   /* --- Manejador de peticiones --- */
   self.addEventListener('fetch', (event) => {
     const { request } = event;
     const url = new URL(request.url);
     const route = matchRoute(url.pathname);
   
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
   
     // MODEL → Cache First mejorado (para archivos grandes)
     if (route === 'MODEL') {
       event.respondWith(
         caches.open(STATIC_CACHE).then(async (cache) => {
           const hit = await cache.match(request);
           if (hit) {
             console.log('[SW] ✅ Modelo desde caché:', url.pathname);
             return hit;
           }
           console.log('[SW] 📥 Descargando modelo:', url.pathname);
           try {
             const res = await fetch(request);
             if (res.ok) cache.put(request, res.clone());
             return res;
           } catch {
             return new Response(null, { status: 504 });
           }
         })
       );
       return;
     }
   
     // INFO.JSON → Stale While Revalidate
     if (route === 'INFO') {
       event.respondWith(
         caches.open(DYNAMIC_CACHE).then(async (cache) => {
           const cached = await cache.match(request);
           const fetchPromise = fetch(request)
             .then((res) => {
               if (res.ok) cache.put(request, res.clone());
               return res;
             })
             .catch(() => cached);
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
   
     // Otras peticiones → Network First genérico
     event.respondWith(
       fetch(request).catch(() => caches.match(request))
     );
   });
   
   /* --- Tarea periódica: limpieza semanal --- */
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
             const cache = await caches.open(STATIC_CACHE);
             await cache.put('cleanup-date', new Response(Date.now().toString()));
             console.log('[SW] Limpieza semanal completada.');
           }
         })()
       );
     }
   });