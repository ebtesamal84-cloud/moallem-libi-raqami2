/* =========================================================
   pdftext.js — قراءة ملفات PDF واستخراج نصوصها
   يستخدم مكتبة PDF.js (mozilla) المحفوظة محليًا في vendor/
   لا يُرسل الملف إلى أي خادم — كل المعالجة داخل المتصفح.
   ملاحظة صادقة: الملفات المصوَّرة ضوئيًا (صور) لا تحتوي نصًا
   قابلًا للاستخراج، ويتطلب ذلك OCR وهو غير متاح حاليًا.
   ========================================================= */
(function (global) {
  'use strict';

  var LOCAL_LIB = 'vendor/pdf.min.js';
  var LOCAL_WORKER = 'vendor/pdf.worker.min.js';
  var CDN_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  var CDN_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  var loading = null;

  function attach(lib, workerSrc) {
    try { lib.GlobalWorkerOptions.workerSrc = workerSrc; } catch (e) { }
    global.pdfjsLib = lib;
    return lib;
  }

  function inject(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(global.pdfjsLib || null); };
      s.onerror = function () { resolve(null); };
      document.head.appendChild(s);
    });
  }

  function loadEngine() {
    if (global.pdfjsLib) return Promise.resolve(global.pdfjsLib);
    if (loading) return loading;
    loading = inject(LOCAL_LIB).then(function (lib) {
      if (lib) return attach(lib, LOCAL_WORKER);
      /* الفشل المحلي (مثل فتح الصفحة بـ file://) → نجرب CDN */
      return inject(CDN_LIB).then(function (lib2) {
        if (lib2) return attach(lib2, CDN_WORKER);
        throw new Error('تعذّر تحميل محرك قراءة PDF. تحقق من اتصال الإنترنت، ' +
          'وإن كانت الصفحة مفتوحة بنقرة مزدوجة على الملف (file://) فافتحيها عبر خادم أو منشور GitHub Pages.');
      });
    }).catch(function (e) {
      throw new Error('تعذّر تشغيل محرك قراءة PDF: ' + (e && e.message ? e.message : 'خطأ غير معروف'));
    });
    return loading;
  }

  function toArrayBuffer(blob) {
    if (blob.arrayBuffer) return blob.arrayBuffer();
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error('تعذّرت قراءة الملف')); };
      fr.onload = function () { res(fr.result); };
      fr.readAsArrayBuffer(blob);
    });
  }

  function clean(t) {
    return String(t || '')
      .replace(/\u0000/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * يستخرج نصوص كل صفحات الملف.
   * @param {Blob} blob   ملف PDF
   * @param {function(number,number):void} [onProgress] (صفحة، إجمالي)
   * @returns {Promise<{pages:Array<{n:number,text:string}>, chars:number, numPages:number, encrypted:boolean}>}
   */
  function extract(blob, onProgress) {
    if (!blob) return Promise.reject(new Error('لم يُحدد ملف'));
    return loadEngine().then(function (lib) {
      return toArrayBuffer(blob).then(function (buf) {
        return lib.getDocument({ data: buf, isEvalSupported: false }).promise;
      });
    }).then(function (pdf) {
      var pages = [], n = 0;
      function step() {
        if (n >= pdf.numPages) {
          var chars = pages.reduce(function (a, p) { return a + p.text.length; }, 0);
          return Promise.resolve({ pages: pages, chars: chars, numPages: pdf.numPages, encrypted: !!pdf._pdfInfo && !!pdf._pdfInfo.encrypt });
        }
        n++;
        if (onProgress) { try { onProgress(n, pdf.numPages); } catch (e) { } }
        return pdf.getPage(n).then(function (page) {
          return page.getTextContent();
        }).then(function (tc) {
          var txt = tc.items.map(function (it) {
            return (it.str || '') + (it.hasEOL ? '\n' : '');
          }).join('');
          pages.push({ n: n, text: clean(txt) });
          return step();
        });
      }
      return step();
    }).catch(function (e) {
      var m = e && e.message ? e.message : String(e);
      if (/password/i.test(m)) throw new Error('هذا الملف محمي بكلمة مرور — أزيلي الحماية أولًا.');
      if (/Invalid PDF|Unexpected|format/i.test(m)) throw new Error('الملف ليس PDF صالحًا أو أنه تالف.');
      throw new Error('تعذّر استخراج النص: ' + m);
    });
  }

  /**
   * يجمع الصفحات في أجزاء قابلة للحفظ كموارد.
   * @param {Array<{n:number,text:string}>} pages
   * @param {number} [minChars] الحد الأدنى لطول الجزء
   */
  function chunk(pages, minChars) {
    var target = minChars || 900;
    var parts = [], buf = '', from = 1, to = 1;
    (pages || []).forEach(function (p) {
      var t = (p.text || '').trim();
      if (!t) return;
      if (!buf) from = p.n;
      if (buf && (buf.length + t.length + 1) > target) {
        parts.push({ from: from, to: to, text: buf });
        buf = '';
        from = p.n;
      }
      buf = buf ? (buf + '\n' + t) : t;
      to = p.n;
    });
    if (buf) parts.push({ from: from, to: to, text: buf });
    return parts;
  }

  global.PdfText = {
    extract: extract,
    chunk: chunk,
    ready: function () { return !!global.pdfjsLib; },
    loadEngine: loadEngine
  };
})(window);
