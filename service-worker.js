/* آذردان — Service Worker
   نسخه کش با شماره نسخه اپ (APP_VER در index.html) هماهنگ نگه‌داشته می‌شود.
   هر بار که APP_VER در index.html تغییر کند، این عدد را هم دستی به‌روز کنید
   تا کاربران نسخه قدیمی از کش حذف و نسخه جدید دانلود شود. */
const CACHE_VERSION = 'azardan-v4.1.0';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/fonts/vazirmatn-variable.woff2',
  './assets/js/qrcode.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/favicon-32.png',
  './assets/icons/favicon-16.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('azardan-') && name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't touch third-party API calls (weather/IP/speed-test)

  // Navigation requests (the app shell): network-first so users get updates fast,
  // falling back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static local assets (fonts/icons/scripts): cache-first, fill cache on miss.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
