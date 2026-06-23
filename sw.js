// Firma de versión para control de ciclo de vida de la PWA
const CACHE_NAME = 'finanzas-pro-cache-v10.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Instalar y forzar el salto de espera inmediatamente
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Poblar el caché inicial asegurando romper la caché del servidor
      return Promise.all(
        ASSETS.map(asset => {
          const requestUrl = asset === './' ? './index.html' : asset;
          return fetch(`${requestUrl}?v=${Date.now()}`).then(response => {
            if (!response.ok) throw new Error(`Error al cachear asset: ${asset}`);
            return cache.put(asset, response);
          });
        })
      );
    })
  );
});

// 2. Activación: Limpieza total de cachés viejos y tomar control inmediato
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

// 3. Estrategia NETWORK-FIRST con Rompe-Caché dinámico (?v=Date.now())
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Solo alteramos peticiones que van hacia nuestro propio origen (assets locales)
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin) {
    e.respondWith(
      // Forzar la petición a la red inyectando timestamp dinámico para saltar la caché perimetral
      fetch(`${e.request.url}${e.request.url.includes('?') ? '&' : '?'}v=${Date.now()}`, { cache: 'no-store' })
        .then((res) => {
          // Si la red responde correctamente, actualizamos el caché local con la última versión limpia
          if (res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
          }
          return res;
        })
        .catch(() => {
          // FALLBACK: Si no hay red (modo offline), servimos del caché local sin alterar
          return caches.match(e.request);
        })
    );
  } else {
    // Peticiones externas se procesan de forma nativa por defecto
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});