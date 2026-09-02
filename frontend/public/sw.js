/**
 * ==============================================================================
 * SIH ID 26001: MDoNER GIS PWA Service Worker (sw.js)
 * Offline Map Vector-Tile Caching & Asset Isolation
 * ==============================================================================
 * Intercepts map tile requests across the North Eastern Region so the GIS canvas
 * continues to render uninterrupted even when cellular networks fail completely.
 */

const CACHE_STATIC_NAME = 'mdoner-static-v2';
const CACHE_TILES_NAME = 'mdoner-tiles-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/index.css',
  '/src/main.jsx',
  '/src/App.jsx'
];

// Install Event: Pre-cache foundational shell assets
self.addEventListener('install', (event) => {
  console.log('🔧 [PWA Service Worker] Installing and pre-caching core assets...');
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Non-fatal pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup stale caches
self.addEventListener('activate', (event) => {
  console.log('✅ [PWA Service Worker] Activated.');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_TILES_NAME) {
            console.log('🧹 Purging obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event: Cache-First for Map Tiles & Stale-While-Revalidate for UI
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Map Tiles Interception (CartoDB, OpenStreetMap, Mapbox tile requests)
  if (
    url.hostname.includes('basemaps.cartocdn.com') ||
    url.hostname.includes('tile.openstreetmap.org') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg')
  ) {
    event.respondWith(
      caches.open(CACHE_TILES_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (networkError) {
          console.log('📡 [OFFLINE] Serving fallback tile cache for:', url.pathname);
          return cachedResponse || new Response('', { status: 408, statusText: 'Tile Offline' });
        }
      })
    );
    return;
  }

  // 2. Bypass API and WebSocket routes from service worker interception
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) {
    return;
  }

  // 3. Stale-While-Revalidate Strategy for UI assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_STATIC_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
