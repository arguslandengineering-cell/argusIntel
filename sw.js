// ============================================================
// ARGUSINTEL — SERVICE WORKER
// Handles offline caching and PWA install support
// Version: bump CACHE_NAME when you deploy app updates
// ============================================================

const CACHE_NAME = 'argusintel-v0-1';
const STATIC_FILES = [
  '/argusintel/',
  '/argusintel/index.html',
  '/argusintel/css/style.css',
  '/argusintel/js/app.js',
  '/argusintel/js/auth.js',
  '/argusintel/js/modules/dummy-data.js',
  '/argusintel/js/modules/bottleneck.js',
  '/argusintel/js/modules/prompts.js',
  '/argusintel/js/tabs/home.js',
  '/argusintel/js/tabs/work.js',
  '/argusintel/js/tabs/csw.js',
  '/argusintel/js/tabs/daily.js',
  '/argusintel/js/tabs/report.js',
  '/argusintel/js/tabs/standard.js',
  '/argusintel/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Let Firebase/Firestore requests go straight to network — never cache API calls
  if (e.request.url.includes('firestore.googleapis.com') ||
      e.request.url.includes('firebase') ||
      e.request.url.includes('googleapis.com')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
