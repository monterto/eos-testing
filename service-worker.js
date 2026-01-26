const VERSION = 'v7'; // Increment this to force a full update
const CACHE_NAME = `calculator-hub-${VERSION}`;
const RUNTIME_CACHE = `calculator-hub-runtime-${VERSION}`;

// Core assets required for the app to function offline
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './style.css', 
  './app.js',   
  './icon-192.png',
  './icon-512.png'
];

// 1. Install Event: Populate the static cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Dynamic Cleanup of ALL old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // If the cache name isn't in our current whitelist, delete it
          if (!currentCaches.includes(cacheName)) {
            console.log('[SW] Purging outdated cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Offline-First Strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return the cached asset if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise, hit the network and store the result in the runtime cache
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Fallback for navigation (ensures deep-linked URLs load the app shell)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
