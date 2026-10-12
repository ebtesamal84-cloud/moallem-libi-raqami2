/* =========================================================
   ai.js — طبقة ربط الذكاء الاصطناعي
   معمارية: الواجهة ← (هذه الطبقة) ← وسيط/مزود خارجي.
   القواعد المُلزمة (من مواصفات المشروع):
     - لا مفاتيح سرية داخل المتصفح ولا داخل المستودع.
     - لا نتائج وهمية: إذا لم تتوفر خدمة → رسالة صريحة.
     - إمكانية تبديل المزود دون إعادة بناء المنصة.
   ========================================================= */
(function (global) {
  'use strict';

  var DEF = {
    /* معرّف المزود (يُختار من الإعدادات): openai | anthropic | google | custom */
    provider: 'custom',
    /* عنوان الوسيط (Proxy) الذي يدير المفتاح على الخادم — لا يُخزَّن أي مفتاح هنا */
    endpoint: '',
    model: '',
    /* حدود الاستهلاك الإعلانية التي يضبطها مسؤول المنصة */
    monthlyQuota: 0,
    remaining: 0,
    /* الموافقة الواعية: عدم استخدام بيانات الطلاب في التدريب */
    consent: false,
    lastCheck: null
  };

  var PROVIDERS = {
    openai: { name: 'OpenAI — عبر وسيط', note: 'يتطلب وسيطًا خدميًا يُدير المفتاح.' },
    anthropic: { name: 'Anthropic — عبر وسيط', note: 'يتطلب وسيطًا خدميًا يُدير المفتاح.' },
    google: { name: 'Google — عبر وسيط', note: 'يتطلب وسيطًا خدميًا يُدير المفتاح.' },
    custom: { name: 'وسيط مخصص / بيئة داخلية', note: 'عنوان خادمكِ الخاص المتوافق مع النموذج.' }
  };

  function cfg() {
    var c = global.Store.get('ai', null);
    if (!c) return Object.assign({}, DEF);
    return Object.assign({}, DEF, c);
  }

  var AI = {
    DEF: DEF,
    PROVIDERS: PROVIDERS,

    get: cfg,

    save: function (patch) {
      var next = Object.assign(cfg(), patch || {});
      var r = global.Store.set('ai', next);
      return r;
    },

    reset: function () { return global.Store.set('ai', Object.assign({}, DEF)); },

    /* هل الخدمة مفعّلة فعلًا؟ */
    isReady: function () {
      var c = cfg();
      return !!(c.endpoint && c.model && c.consent);
    },

    /* وصف الحالة بلغة صريحة للمعلم */
    status: function () {
      var c = cfg();
      if (!c.endpoint) return { level: 'off', text: 'الخدمة غير مفعّلة: لم يُحدَّد عنوان وسيط ربط.' };
      if (!c.model) return { level: 'off', text: 'الخدمة غير مفعّلة: لم يُحدَّد نموذج الاستخدام.' };
      if (!c.consent) return { level: 'off', text: 'الخدمة غير مفعّلة: الموافقة على شروط الاستخدام لم تُسجَّل.' };
      return { level: 'on', text: 'الخدمة مهيّأة — جاهزة للإرسال عند أول استخدام.' };
    },

    /* ---------------- التوليد الفعلي ----------------
       يرسل طلبًا إلى الوسيط المُعرَّف. مسار غير مختبَر بعد
       لعدم توافر خدمة حاليًا — ومعالجته للأخطاء صريحة وواضحة. */
    run: function (opts) {
      var self = this;
      opts = opts || {};
      var c = cfg();

      if (!this.isReady()) {
        var st = this.status();
        return Promise.reject({ code: 'disabled', message: st.text });
      }
      if (global.Store.get('aiConsentRevoked', false)) {
        return Promise.reject({ code: 'consent', message: 'تم إيقاف الموافقة من الإعدادات.' });
      }

      var body = {
        tool: opts.tool || 'general',
        prompt: opts.prompt || '',
        inputs: opts.inputs || {},
        model: c.model,
        /* بيانات الطلاب لا تُرسل إلا ما يكتبه المعلم صراحةً */
        language: 'ar',
        rtl: true
      };

      var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 60000) : null;

      return fetch(c.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        if (timer) clearTimeout(timer);
        if (!res.ok) {
          return res.text().then(function (t) {
            throw { code: 'http', message: 'ردّ الخادم: ' + res.status + ' — ' + (t || '').slice(0, 220) };
          });
        }
        return res.json();
      }).then(function (data) {
        var text = (data && (data.output || data.text || data.result ||
          (data.choices && data.choices[0] && (data.choices[0].message ? data.choices[0].message.content : data.choices[0].text)))) || '';
        if (!text) throw { code: 'empty', message: 'لم يُرجع الخادم محتوى. تحققي من إعدادات الوسيط.' };
        self._use();
        return text;
      }).catch(function (e) {
        if (timer) clearTimeout(timer);
        if (e && e.name === 'AbortError') {
          throw { code: 'timeout', message: 'انتهت مهلة الاتصال بالخادم (60 ثانية).' };
        }
        if (e && e.code) throw e;
        throw { code: 'network',
          message: 'تعذّر الوصول إلى خادم الذكاء الاصطناعي. تحققي من العنوان ومن اتصال الإنترنت. ' +
                   '(' + (e && e.message ? e.message : 'خطأ شبكة') + ')' };
      });
    },

    _use: function () {
      var c = cfg();
      if (c.remaining > 0) { c.remaining -= 1; global.Store.set('ai', c); }
      var n = global.Store.get('aiUsage', { count: 0 });
      n.count = (n.count || 0) + 1;
      n.last = new Date().toISOString();
      global.Store.set('aiUsage', n);
    },

    usage: function () { return global.Store.get('aiUsage', { count: 0, last: null }); }
  };

  global.AI = AI;
})(window);
