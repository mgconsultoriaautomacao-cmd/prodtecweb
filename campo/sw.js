const CACHE_NAME = 'prodtech-campo-v11';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './dragDropTouch.js',
];

// INSTALL: pre-caches the local assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// ACTIVATE: cleans up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// FETCH: Network-first for navigation, cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase, googleapis, jsdelivr: do NOT intercept — let browser handle it directly
  if (url.hostname.includes('supabase.co') || url.hostname.includes('googleapis') || url.hostname.includes('jsdelivr')) {
    return;
  }

  // Navigation: network-first with cache fallback
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

  // Assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
