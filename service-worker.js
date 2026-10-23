/*
 * service-worker.js — offline support.
 *
 *   - Precache the app shell on install (relative URLs, so it works from a
 *     GitHub Pages project path).
 *   - Page navigations: network first, cached index.html when offline, so a
 *     new release shows up on the next visit with a connection.
 *   - Same-origin files: served from the cache, refreshed in the background.
 *   - localhost / 127.0.0.1: no caching at all, so development is never stale.
 *
 * Bump CACHE on every release; old caches are deleted on activate.
 */
const CACHE = 'excuse-generator-v3';

const SHELL = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'core.js',
  'manifest.json',
  'favicon.ico',
  'excuses.en.json',
  'excuses.sr.json',
  'assets/fonts/Syne-Variable.woff2',
  'assets/fonts/DMMono-Regular.woff2',
  'assets/fonts/DMMono-Medium.woff2',
  'assets/icons/icon-16.png',
  'assets/icons/icon-32.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
];

const isLocal = ['localhost', '127.0.0.1'].includes(self.location.hostname);

self.addEventListener('install', (event) => {
  if (!isLocal) event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (isLocal || req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('index.html').then((r) => r || caches.match('./'))),
    );
    return;
  }

  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
