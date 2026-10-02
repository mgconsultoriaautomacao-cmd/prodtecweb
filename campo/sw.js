const CACHE_NAME = 'prodtech-campo-v12';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './fieldOp.js',
  './dragDropTouch.js',
  './infoParcelasData.js',
  './campo-theme.css',
  './vendor/supabase.js',
  './vendor/lucide.min.js',
  './vendor/html5-qrcode.min.js',
  '../assets/fonts/ibm-plex-sans-latin.woff2',
  './logo.png',
  './favicon.ico',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

// INSTALL: pre-caches all critical local assets for 100% offline cold-start
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// ACTIVATE: cleans up old caches and claims clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// MESSAGE: handle SKIP_WAITING from app UI
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// FETCH: Handle GET requests only; network-first for navigation, stale-while-revalidate for local assets
self.addEventListener('fetch', event => {
  // Ignore non-GET requests (POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Supabase API requests: do NOT cache in SW (handled by offline IDB queue)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Navigation (HTML pages): Network-first with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Local assets: Stale-While-Revalidate strategy
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
