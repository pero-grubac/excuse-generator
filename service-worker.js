const CACHE_NAME = 'excuse-generator-v1';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './excuses.en.json',
  './excuses.sr.json',
  './assets/fonts/Syne-Variable.woff2',
  './assets/fonts/DMMono-Regular.woff2',
  './assets/fonts/DMMono-Medium.woff2',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

const isLocal =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1';

// Install — skip caching on localhost
self.addEventListener('install', (event) => {
  if (isLocal) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — delete old caches (skip on localhost)
self.addEventListener('activate', (event) => {
  if (isLocal) {
    self.clients.claim();
    return;
  }
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — always network on localhost, cache-first on production
self.addEventListener('fetch', (event) => {
  if (isLocal) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
