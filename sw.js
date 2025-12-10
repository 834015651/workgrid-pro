const CACHE_NAME = 'workgrid-pro-v1';

// Assets that should be cached immediately
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

// Install Event: Cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network First, then Cache (or Stale-While-Revalidate logic)
// Since we rely on CDNs (ESM.sh, Tailwind), we need to cache them dynamically upon first load.
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests (like POST for analytics)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. If found in cache, return it (Offline First strategy for speed)
      if (cachedResponse) {
        // Optional: Update cache in background (Stale-while-revalidate)
        // fetch(event.request).then(response => {
        //   caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
        // });
        return cachedResponse;
      }

      // 2. If not in cache, fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
          return networkResponse;
        }

        // 3. Cache the new resource for future offline use
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // 4. Network failed (Offline) and not in cache
        console.log('Fetch failed; returning offline page if available.');
      });
    })
  );
});