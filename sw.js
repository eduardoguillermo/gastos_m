const CACHE_NAME = 'finanzaspro-network-first-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Instalación: Guarda la estructura base de forma preventiva
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA NW-First: Cacheando archivos base');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación: Limpia de inmediato las estrategias viejas (Cache-First)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('PWA NW-First: Eliminando caché obsoleto:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Intercepción con Estrategia NETWORK FIRST
self.addEventListener('fetch', (e) => {
  // Ignorar peticiones que no correspondan al origen de la app o sus recursos vectoriales
  if (!e.request.url.startsWith(self.location.origin)) {
    return;
  }

  e.respondWith(
    // Paso 1: Intentar ir siempre a buscar el recurso fresco a internet
    fetch(e.request).then((networkResponse) => {
      // Si la red responde bien, actualizamos dinámicamente el caché con la nueva copia
      if (networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      // Paso 2: SI LA RED FALLA (Offline), busca el respaldo en el caché local
      console.log('PWA NW-First: Modo offline detectado. Sirviendo desde caché:', e.request.url);
      return caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback definitivo para la navegación principal si nada funciona
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});