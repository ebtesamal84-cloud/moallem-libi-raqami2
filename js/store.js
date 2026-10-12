/* =========================================================
   store.js — طبقة التخزين المحلي
   كل البيانات تبقى في متصفح المستخدم على جهازه فقط.
   البادئة: lm.  (Libyan Teacher)
   ========================================================= */
(function (global) {
  'use strict';

  var PREFIX = 'lm.';
  var OK = { ok: true };
  var FAIL = { ok: false };

  function full(k) { return PREFIX + k; }

  var Store = {
    /* ---------- قراءة/كتابة ---------- */
    get: function (k, def) {
      try {
        var v = localStorage.getItem(full(k));
        if (v === null) return (def === undefined ? null : def);
        return JSON.parse(v);
      } catch (e) { return (def === undefined ? null : def); }
    },

    set: function (k, v) {
      try { localStorage.setItem(full(k), JSON.stringify(v)); return OK; }
      catch (e) {
        console.error('Store.set فشل:', k, e);
        return { ok: false, error: e && e.name === 'QuotaExceededError'
          ? 'امتلأت مساحة التخزين في المتصفح. صدّري نسخة احتياطية واحذفي بعض العناصر القديمة.'
          : 'تعذّر الحفظ: ' + (e && e.message ? e.message : 'خطأ غير معروف') };
      }
    },

    remove: function (k) { try { localStorage.removeItem(full(k)); return true; } catch (e) { return false; } },

    keys: function () {
      try {
        return Object.keys(localStorage)
          .filter(function (k) { return k.indexOf(PREFIX) === 0; })
          .map(function (k) { return k.slice(PREFIX.length); })
          .sort();
      } catch (e) { return []; }
    },

    /* ---------- استخدام المساحة ---------- */
    bytes: function () {
      var t = 0, ks = this.keys();
      for (var i = 0; i < ks.length; i++) {
        var v = localStorage.getItem(full(ks[i]));
        t += (v ? v.length : 0);
      }
      return t;
    },
    usageText: function () {
      var b = this.bytes();
      if (b < 1024) return b + ' بايت';
      if (b < 1048576) return (b / 1024).toFixed(1) + ' كيلوبايت';
      return (b / 1048576).toFixed(2) + ' ميجابايت';
    },

    /* ---------- معرّف فريد ---------- */
    uid: function () {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    /* ---------- نسخة احتياطية ---------- */
    exportJSON: function () {
      var data = { app: 'المعلم الليبي الرقمي', version: 1, exportedAt: new Date().toISOString(), values: {} };
      var ks = this.keys();
      for (var i = 0; i < ks.length; i++) data.values[ks[i]] = this.get(ks[i]);
      return JSON.stringify(data, null, 2);
    },

    importJSON: function (text) {
      var data;
      try { data = JSON.parse(text); } catch (e) { return FAIL; }
      if (!data || typeof data !== 'object' || typeof data.values !== 'object' || data.values === null) return FAIL;
      var n = 0;
      for (var k in data.values) {
        if (Object.prototype.hasOwnProperty.call(data.values, k)) {
          if (this.set(k, data.values[k]).ok) n++;
        }
      }
      return n > 0 ? { ok: true, count: n } : FAIL;
    },

    /* ---------- حذف كل شيء ---------- */
    wipe: function () {
      var ks = this.keys();
      for (var i = 0; i < ks.length; i++) {
        try { localStorage.removeItem(full(ks[i])); } catch (e) { }
      }
      return true;
    },

    /* ---------- بيانات عرض تجريبية (اختيارية) ---------- */
    seedDemo: function (profile) {
      this.set('profile', profile || {
        name: 'أ. محمد السنوسي', school: 'متوسطة الأندلس', subject: 'الرياضيات',
        year: '2025 / 2026'
      });
      this.set('tasks', [
        { id: this.uid(), text: 'مراجعة تحضير درس «النسبة والتناسب»', done: false, due: '' },
        { id: this.uid(), text: 'طباعة ورقة عمل للصف الثاني', done: true, due: '' },
        { id: this.uid(), text: 'إعداد اختبار الوحدة الثالثة', done: false, due: '' }
      ]);
      return true;
    }
  };

  global.Store = Store;
})(window);
