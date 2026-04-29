const CACHE_NAME = 'af-packing-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/globals.css',
  '/bg-login.png',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap'
];

/**
 * Instalação do Service Worker.
 * Aqui eu garanto que os arquivos essenciais sejam salvos no cache do navegador.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

/**
 * Ativação e limpeza de caches antigos.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

/**
 * Estratégia de Fetch (Cache First, falling back to Network).
 * Essencial para performance no campo com conexão instável.
 */
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
