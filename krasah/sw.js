/* ==========================================================================
   krasah/sw.js — كرّاسة تحضير رياضيات التاسع (إبتسام مصباح الشمام)
   استراتيجية: تحديث النسخة أولًا ثم الكاش (Network-first للصفحة،
   Cache-first للثوابت) — مع مسح الكاش القديم عند تغيير رقم النسخة.
   ========================================================================== */
var CACHE = 'krasah-v11';

var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest'
];

/* تثبيت: نخزّن الأصول الأساسية */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

/* حذف الكاش القديم عند تفعيل نسخة جديدة */
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* الجلب: الصفحة والتنقل = الشبكة أولًا مع رجوع للكاش، والثوابت = الكاش أولًا */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  var url = new URL(e.request.url);

  /* صفحات التنقّل: شبكة أولًا ثم كاش */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () { return caches.match(e.request).then(function (r) { return r || caches.match('./index.html'); }); })
    );
    return;
  }

  /* الأصول: كاش أولًا ثم شبكة */
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (res) {
        if (res && res.status === 200 && url.origin === self.location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      });
    })
  );
});
