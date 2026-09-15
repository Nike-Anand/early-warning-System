// MDoNER Landslide Risk System — PWA Offline Cache Service Worker
const CACHE_NAME = 'mdoner-pwa-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/zoom_earth/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core application assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first policy for API endpoints, Cache-first for static assets
  if (event.request.url.includes('/api/v1/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ offline: true, message: 'Device offline. Serving cached state.' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
