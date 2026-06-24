// FinanzasPro Ledger · Service Worker v13.14
// Estrategia: Network-First con fallback a caché para activos propios.
const CACHE_NAME = 'finanzas-pro-v13.14';
const ASSETS = ['./index.html', './manifest.json'];

// ── INSTALL: pre-cachear activos críticos ──────────────────────────────────
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        ASSETS.map(asset =>
          fetch(`${asset}?v=${Date.now()}`, { cache: 'no-store' })
            .then(res => { if (res.ok) cache.put(asset, res); })
            .catch(() => {}) // no bloquear install si un asset falla
        )
      )
    )
  );
});

// ── ACTIVATE: limpiar cachés obsoletos ────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: Network-First para activos propios, Network-Only para externos ──
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const esPropio = url.origin === self.location.origin;

  if (!esPropio) {
    // Recursos externos (CDN, APIs, Unsplash): directo a red sin caché
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Activos propios: Network-First con timestamp para evadir caché HTTP
  const urlBustada = new URL(e.request.url);
  urlBustada.searchParams.set('_sw', Date.now());

  const req = new Request(urlBustada.toString(), {
    method:      'GET',
    headers:     e.request.headers,
    mode:        e.request.mode === 'navigate' ? 'same-origin' : e.request.mode,
    credentials: e.request.credentials,
    redirect:    e.request.redirect,
    cache:       'no-store'
  });

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
