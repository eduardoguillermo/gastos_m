// Firma de versión para control de ciclo de vida de la PWA (v11.0)
const CACHE_NAME = 'finanzas-pro-cache-v11.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
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

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(`${e.request.url}${e.request.url.includes('?') ? '&' : '?'}v=${Date.now()}`, { cache: 'no-store' })
        .then((res) => {
          if (res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
          }
          return res;
        })
        .catch(() => {
          return caches.match(e.request);
        })
    );
  } else {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});