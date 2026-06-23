const CACHE_NAME = 'finanzas-pro-v9';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ESTRATEGIA: NETWORK FIRST CON ROMPE-CACHÉ DINÁMICO
self.addEventListener('fetch', event => {
  // Solo aplicamos el rompe-caché a nuestro archivo index o rutas del mismo dominio
  if (event.request.method === 'GET' && event.request.url.includes(self.location.origin)) {
    
    // Creamos una nueva URL agregando un timestamp (?v=123456789) para saltarse el caché del servidor
    const urlModificada = new URL(event.request.url);
    urlModificada.searchParams.set('v', Date.now());

    event.respondWith(
      fetch(urlModificada)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              // Guardamos en caché con la URL original para que mantenga la coherencia offline
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // Para el resto de peticiones externas (CDN, fuentes, etc.) funciona normal
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => networkResponse)
        .catch(() => caches.match(event.request))
    );
  }
});