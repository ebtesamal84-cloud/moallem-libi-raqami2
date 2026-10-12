/* =========================================================
   files.js — مخزن الملفات الكبيرة (PDF / صور / مستندات)
   يحفظ الملفات في IndexedDB داخل متصفح المعلمة فقط.
   • لا يُرفع أي ملف إلى أي خادم.
   • هجرة تلقائية للملفات القديمة المحفوظة في localStorage.
   • فحص حقيقي لمساحة المتصفح قبل الحفظ + طلب تخزين دائم.
   • مسار احتياطي بـ localStorage (2MB) إن مُنع IndexedDB.
   ========================================================= */
(function (global) {
  'use strict';

  var DB_NAME = 'moallem-files', DB_VER = 1, STORE = 'bin';
  var MAX_FILE = 50 * 1024 * 1024;   /* 50 ميجابايت — يكفي كتاب منهج كامل */
  var LEGACY_MAX = 2 * 1024 * 1024;  /* حد المسار الاحتياطي داخل localStorage */

  var db = null, bigOK = false, initDone = false, initP = null;
  var meta = {};                                  /* id ← بيانات وصفية (بلا محتوى) */
  var st = { quota: 0, usage: 0, persisted: false, checked: false };
  var persistTried = false;

  function mb(n) { return (n / 1048576).toFixed(1); }
  function now() { return new Date().toISOString(); }
  function newId() { return (global.Store && Store.uid()) || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)); }
  function metaOf(r) {
    return { id: r.id, name: r.name, type: r.type, size: r.size || 0, at: r.at || now(), legacy: !!r.legacy };
  }

  /* ---------------- IndexedDB ---------------- */
  function openDB() {
    return new Promise(function (resolve) {
      if (!global.indexedDB) { resolve(null); return; }
      var rq;
      try { rq = global.indexedDB.open(DB_NAME, DB_VER); }
      catch (e) { resolve(null); return; }
      rq.onupgradeneeded = function () {
        var d = rq.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' });
      };
      rq.onsuccess = function () { resolve(rq.result); };
      rq.onerror = function () { resolve(null); };
      rq.onblocked = function () { resolve(null); };
    });
  }

  function idbRun(mode, fn) {
    return new Promise(function (resolve, reject) {
      if (!db) { reject(new Error('التخزين الكبير غير متاح في هذا المتصفح')); return; }
      var tx, req;
      try { tx = db.transaction(STORE, mode); req = fn(tx.objectStore(STORE)); }
      catch (e) { reject(new Error('تعذّرت عملية التخزين: ' + e.message)); return; }
      tx.oncomplete = function () { resolve(req ? req.result : true); };
      tx.onerror = function () { reject(new Error((tx.error && tx.error.message) || 'فشلت عملية التخزين')); };
      tx.onabort = tx.onerror;
    });
  }

  /* ---------------- مساحة المتصفح والتخزين الدائم ---------------- */
  function estimate() {
    if (!global.navigator || !navigator.storage || !navigator.storage.estimate) return Promise.resolve(st);
    return navigator.storage.estimate().then(function (e) {
      st.quota = e.quota || 0; st.usage = e.usage || 0; st.checked = true; return st;
    }).catch(function () { return st; });
  }

  function ensurePersist() {
    if (persistTried || !global.navigator || !navigator.storage || !navigator.storage.persist) return Promise.resolve(st.persisted);
    persistTried = true;
    var p = navigator.storage.persisted
      ? navigator.storage.persisted().then(function (v) { st.persisted = !!v; return v ? true : navigator.storage.persist(); })
      : navigator.storage.persist();
    return p.then(function (v) { st.persisted = !!v; return st.persisted; }).catch(function () { return false; });
  }

  /* ---------------- المسار القديم (localStorage) ---------------- */
  function legacyKeys() {
    try { return Store.keys().filter(function (k) { return k.indexOf('file.') === 0; }); }
    catch (e) { return []; }
  }

  function dataURLToBlob(data) {
    return new Promise(function (resolve, reject) {
      try {
        var s = String(data), i = s.indexOf(','), head = s.slice(0, i);
        var m = /^data:([^;,]+)/.exec(head);
        var type = (m && m[1]) || 'application/octet-stream';
        var bin;
        if (head.indexOf(';base64') !== -1) bin = atob(s.slice(i + 1));
        else bin = decodeURIComponent(s.slice(i + 1));
        var len = bin.length, arr = new Uint8Array(len);
        for (var k = 0; k < len; k++) arr[k] = bin.charCodeAt(k);
        resolve(new Blob([arr], { type: type }));
      } catch (e) { reject(new Error('تعذّر تحويل الملف المحفوظ')); }
    });
  }

  function readAsDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('تعذّرت قراءة الملف')); };
      fr.onload = function () { resolve(fr.result); };
      fr.readAsDataURL(blob);
    });
  }

  function indexLegacy() {
    legacyKeys().forEach(function (k) {
      var r = Store.get(k, null);
      if (r) meta[k.slice(5)] = metaOf({ id: k.slice(5), name: r.name, type: r.type, size: r.size, at: r.at, legacy: true });
    });
  }

  function migrateLegacy() {
    var keys = legacyKeys();
    if (!keys.length || !bigOK) return Promise.resolve();
    var chain = Promise.resolve();
    keys.forEach(function (k) {
      chain = chain.then(function () {
        var r = Store.get(k, null);
        if (!r || !r.data) return null;
        var id = k.slice(5);
        return dataURLToBlob(r.data).then(function (blob) {
          var rec = { id: id, name: r.name, type: r.type, size: r.size || blob.size, at: r.at || now(), blob: blob };
          return idbRun('readwrite', function (s) { return s.put(rec); }).then(function () {
            meta[id] = metaOf(rec);
            Store.remove(k);   /* تُحذف النسخة القديمة بعد نجاح النقل فقط */
          });
        });
      });
    });
    return chain.catch(function (e) { console.warn('هجرة الملفات القديمة لم تكتمل:', e && e.message); });
  }

  /* ---------------- التهيئة ---------------- */
  function init() {
    if (initP) return initP;
    initDone = true;
    initP = openDB().then(function (d) {
      db = d; bigOK = !!db;
      if (!bigOK) return null;
      return idbRun('readonly', function (s) { return s.getAll ? s.getAll() : []; })
        .then(function (rows) {
          (rows || []).forEach(function (r) { if (r && r.id) meta[r.id] = metaOf(r); });
          return migrateLegacy();
        })
        .catch(function (e) {
          bigOK = false; db = null;
          console.warn('IndexedDB غير متاح، سنستخدم المسار الاحتياطي:', e && e.message);
        });
    }).then(function () {
      if (!initDone) return null;
      if (!bigOK || !Object.keys(meta).length) indexLegacy();
      return estimate().then(ensurePersist);
    }).then(function () {
      try { document.dispatchEvent(new CustomEvent('filesready')); } catch (e) { }
      return api;
    });
    return initP;
  }

  /* ---------------- العمليات ---------------- */
  function check(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('لم يُختر ملف')); return; }
      if (file.size > MAX_FILE) {
        reject(new Error('حجم الملف ' + mb(file.size) + ' ميجابايت — والحد الأقصى 50 ميجابايت. ' +
          'جرّبي ضغط الملف أو احتفظي به خارج المنصة.'));
        return;
      }
      estimate().then(function () {
        if (bigOK && st.quota && (st.usage + file.size) > st.quota * 0.9) {
          reject(new Error('مساحة المتصفح لا تكفي: المتاح نحو ' + mb(Math.max(0, st.quota - st.usage)) +
            ' ميجابايت من أصل ' + mb(st.quota) + '. احذفي ملفات قديمة أو صغّري هذا الملف.'));
          return;
        }
        if (!bigOK && file.size > LEGACY_MAX) {
          reject(new Error('هذا المتصفح لا يتيح التخزين الكبير (IndexedDB)، والحد الحالي 2 ميجابايت. ' +
            'افتحي المنصة من Chrome أو Edge حديث، أو من نسخة منشورة على الإنترنت.'));
          return;
        }
        resolve({
          name: file.name, type: file.type || 'application/octet-stream',
          size: file.size, at: now(), blob: file
        });
      }).catch(function (e) { reject(new Error('تعذّر فحص مساحة التخزين: ' + e.message)); });
    });
  }

  function store(id, rec) {
    id = id || newId();
    if (bigOK) {
      var record = { id: id, name: rec.name, type: rec.type, size: rec.size, at: rec.at || now(), blob: rec.blob };
      return idbRun('readwrite', function (s) { return s.put(record); }).then(function () {
        meta[id] = metaOf(record);
        estimate(); ensurePersist();
        return id;
      });
    }
    if (!rec.blob || rec.size > LEGACY_MAX) {
      return Promise.reject(new Error('تعذّر حفظ الملف في هذا المتصفح (الحد 2 ميجابايت).'));
    }
    return readAsDataURL(rec.blob).then(function (data) {
      var r = Store.set('file.' + id, { name: rec.name, type: rec.type, size: rec.size, at: rec.at, data: data });
      if (!r.ok) throw new Error(r.error);
      meta[id] = { id: id, name: rec.name, type: rec.type, size: rec.size, at: rec.at || now(), legacy: true };
      return id;
    });
  }

  function add(file) { return check(file).then(function (rec) { return store(null, rec); }); }

  function get(id) {
    if (!id) return Promise.reject(new Error('لم يُحدد ملف'));
    if (meta[id] && meta[id].legacy) {
      var r = Store.get('file.' + id, null);
      if (!r) return Promise.reject(new Error('الملف غير موجود'));
      return dataURLToBlob(r.data).then(function (blob) {
        return { id: id, name: r.name, type: r.type, size: r.size, at: r.at, blob: blob };
      });
    }
    return idbRun('readonly', function (s) { return s.get(id); }).then(function (r) {
      if (!r) throw new Error('لم يعد هذا الملف موجودًا في التخزين');
      return r;
    });
  }

  function del(id) {
    if (!id) return Promise.resolve(true);
    var legacy = meta[id] && meta[id].legacy;
    delete meta[id];
    if (legacy || !bigOK) { Store.remove('file.' + id); return Promise.resolve(true); }
    return idbRun('readwrite', function (s) { return s.delete(id); }).then(function () { estimate(); return true; });
  }

  function wipe() {
    meta = {};
    legacyKeys().forEach(function (k) { Store.remove(k); });
    if (!bigOK) return Promise.resolve(true);
    return idbRun('readwrite', function (s) { return s.clear(); })
      .then(function () { estimate(); return true; })
      .catch(function () { return false; });
  }

  /* ---------------- الاستعلام ---------------- */
  function list() {
    var out = [];
    for (var k in meta) { if (Object.prototype.hasOwnProperty.call(meta, k)) out.push(meta[k]); }
    out.sort(function (a, b) { return (b.at || '') < (a.at || '') ? -1 : ((b.at || '') > (a.at || '') ? 1 : 0); });
    return out;
  }

  function info() {
    var bytes = 0, n = 0;
    list().forEach(function (m) { bytes += (m.size || 0); n++; });
    return {
      big: bigOK, ready: initDone, count: n, bytes: bytes, maxFile: MAX_FILE,
      quota: st.quota, usage: st.usage,
      free: st.quota ? Math.max(0, st.quota - st.usage) : 0,
      persisted: st.persisted, checked: st.checked
    };
  }

  function infoText() {
    var i = info();
    if (!i.checked) return 'الحد الأقصى للملف 50 ميجابايت — تُحفظ الملفات في جهازكِ فقط.';
    var s = 'المساحة المتاحة في متصفحكِ: ' + mb(i.free) + ' من ' + mb(i.quota) + ' ميجابايت';
    s += i.persisted
      ? ' — تخزين دائم ✓ (لن يُحذف الملفات إلا بأيدكِ).'
      : ' — لم يُمنح تخزين دائم، وقد يحذف المتصفح الملفات إن مسحتِ بيانات الموقع.';
    s += ' الحد الأقصى للملف الواحد 50 ميجابايت.';
    return s;
  }

  var api = {
    init: init, check: check, store: store, add: add, get: get, del: del, wipe: wipe,
    list: list, info: info, infoText: infoText, ensurePersist: ensurePersist,
    MAX_FILE: MAX_FILE, LEGACY_MAX: LEGACY_MAX, isReady: function () { return initDone; }
  };

  global.Files = api;
  if (global.Store) init();   /* يبدأ التهيئة والهجرة فور تحميل الصفحة */
})(window);
