const CACHE_NAME = 'finanzaspro-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Instalar el Service Worker y guardar en caché los archivos estáticos
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activar y limpiar cachés antiguos si los hubiera
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia de Cache First / Network Fallback para asegurar funcionamiento offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(e.request).catch(() => {
        // Fallback en caso de que no haya red ni caché (para recursos externos)
      });
    })
  );
});