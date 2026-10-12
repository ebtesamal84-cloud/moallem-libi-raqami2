/* =========================================================
   sw.js — عامل التخزين المؤقت (PWA)
   يعمل فقط عند التشغيل عبر HTTPS (أثناء النشر على GitHub Pages).
   لا يعمل بالنقر المزدوج على الملف — وهذا طبيعي ومذكور في الدليل.
   ========================================================= */
var CACHE = 'moallem-libi-v1';
var ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/store.js',
  './js/ai.js',
  './js/app.js',
  './js/prep.js',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
