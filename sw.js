const CACHE_NAME = 'finanzaspro-core-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Etapa de Instalación: Forzar almacenamiento de la estructura core
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Guardando archivos base en caché');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Etapa de Activación: Destruir cachés obsoletos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('PWA: Eliminando caché antiguo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Etapa de Intercepción (FETCH): El validador que exige Brave para la instalación
self.addEventListener('fetch', (e) => {
  // Evitar interceptar peticiones de extensiones de Brave o esquemas raros
  if (!e.request.url.startsWith(self.location.origin) && !e.request.url.startsWith('https://images.unsplash.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Si el archivo está en el caché, lo sirve de inmediato (Offline OK)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Si no está, lo va a buscar a la red
      return fetch(e.request).then((networkResponse) => {
        // Guardar dinámicamente en caché copias de imágenes válidas (como el ícono de Unsplash)
        if (networkResponse.status === 200 && e.request.url.startsWith('https://images.unsplash.com')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback en caso de desconexión absoluta para que Chromium no anule la PWA
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});