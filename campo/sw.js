const CACHE_NAME = 'prodtech-campo-v7';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// FETCH: Network-first para navegação, cache-first para assets estáticos
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase, googleapis, jsdelivr: sempre rede
  if (url.hostname.includes('supabase.co') || url.hostname.includes('googleapis') || url.hostname.includes('jsdelivr')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Navegação: network-first com fallback para cache
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
