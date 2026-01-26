const VERSION = 'v8'; 
const CACHE_NAME = `eos-tools-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles.css', // Updated to plural to match your index.html
  './app.js',
  './icon-192.png',
  './icon-512.png'
];

// 1. Install: Pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 2. Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim()) // Immediate control
  );
});

// 3. Fetch: Offline-first with Navigation Fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached asset if found
      if (response) return response;

      // Otherwise try network
      return fetch(event.request).catch(() => {
        // FAILSAFE: If offline and refreshing, serve index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});
