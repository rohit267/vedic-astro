/* sw.js: makes the app installable and usable offline. Every file is answered from
 * the cache at once and refreshed in the background, so a new release shows up on
 * the visit after it is published. */
const CACHE = 'vedic-astro';
const FILES = ['./', 'styles.css', 'manifest.webmanifest', 'icons/icon-192.png',
  'js/app.js',
  'js/charts.js',
  'js/cities.js',
  'js/dasha.js',
  'js/ephemeris.js',
  'js/kundali.js',
  'js/matching.js',
  'js/panchang.js',
  'js/predictions.js',
  'js/strength.js',
  'js/timing.js',
  'vendor/astronomy.browser.min.js',
  'vendor/fonts/eczar-400-800.woff2',
  'vendor/fonts/mukta-400.woff2',
  'vendor/fonts/mukta-600.woff2',
];

self.addEventListener('install', (e) => e.waitUntil(
  caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(e.request);
    const fresh = fetch(e.request).then((res) => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    });
    if (!hit) return fresh;
    e.waitUntil(fresh.catch(() => {}));   // offline: keep serving the cached copy
    return hit;
  }));
});
