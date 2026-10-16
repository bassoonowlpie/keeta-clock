const CACHE_NAME = 'keeta-clock-v4';
const URLS_TO_CACHE = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // For the main page (index.html or /keeta-clock/), always fetch from network first
  if (req.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(req).then((response) => {
        // Update cache with fresh copy
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return response;
      }).catch(() => {
        // Fallback to cache if offline
        return caches.match(req);
      })
    );
    return;
  }

  // manifest 同圖標要永遠攞最新，否則 PWA 安裝會繼續用舊圖標
  if (url.pathname.endsWith('manifest.json') || url.pathname.endsWith('.png')) {
    event.respondWith(
      fetch(req).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return response;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // For other assets (chart.js, etc.), use cache-first for offline support
  event.respondWith(
    caches.match(req).then((response) => {
      if (response) return response;
      return fetch(req).catch(() => {});
    })
  );
});