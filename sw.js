const CACHE_NAME     = 'yanmegaofertas-v1';
const IMAGE_CACHE    = 'yanmegaofertas-images-v1';
const JSON_CACHE     = 'yanmegaofertas-data-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

// Al activar: limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== IMAGE_CACHE && k !== JSON_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Imágenes → Cache First
  if (/\.(webp|png|jpg|jpeg|svg|ico)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(IMAGE_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // JSON (inventario) → Network First
  if (url.pathname.endsWith('.json')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const resClone = res.clone(); // ✅ clonar inmediatamente
          caches.open(JSON_CACHE).then(cache =>
            cache.put(e.request, resClone)
          );
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // HTML/JS/CSS → Network First con fallback
  e.respondWith(
    fetch(e.request)
      .catch(() => caches.match(e.request))
  );
});