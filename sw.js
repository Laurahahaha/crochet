// Maille : service worker, lets the app open without a network connection.
// The app's files are served from the phone's cache, then refreshed in the
// background, so a new version appears on the next launch after an update.
// Bump VERSION only if you need to force everyone to drop the old cache.
const VERSION = 'maille-v1';
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'vendor/react.production.min.js',
  'vendor/react-dom.production.min.js',
  'vendor/babel.min.js',
  'assets/petits-pois.jpg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon.png',
];
// Google Fonts are cached the first time they load, so text keeps its look offline.
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return; // e.g. photo reading (OCR) needs the network

  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: sameOrigin });
    const fresh = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    const res = await fresh;
    if (res) return res;
    if (req.mode === 'navigate') return cache.match('index.html');
    return Response.error();
  }));
});
