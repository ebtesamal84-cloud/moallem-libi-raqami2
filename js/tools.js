/* =========================================================
   tools.js — مركز أدوات المعلم الرقمية
   دليل مصنّف بروابط المواقع الرسمية المعروفة (تُفتح في
   تبويب جديد) + اختصارات داخلية لأقسام المنصة الجاهزة.
   لا روابط مموّلة ولا تقييمات مباعة — فقط ما نعرفه رسميًا.
   ========================================================= */
(function (global) {
  'use strict';
  var App = global.App;
  if (!App) { console.error('tools.js: App غير متاح'); return; }
  var UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc;

  var INTERNAL = [
    { h: '#/lab', i: '🔬', t: 'المختبر الرياضي', d: 'ارسمي أي دالة f(x) واحسبي المساحات' },
    { h: '#/slides', i: '📊', t: 'العروض التقديمية', d: 'ابني عرضًا كاملًا واطبعيه PDF' },
    { h: '#/design', i: '🎨', t: 'استوديو التصميم', d: 'شهادات وملصقات وبطاقات A4' },
    { h: '#/classes', i: '👥', t: 'إدارة الصف', d: 'فصول وطلاب ودرجات بخصوصية كاملة' },
    { h: '#/exams', i: '📝', t: 'منشئ الاختبارات', d: 'اختبارات وبنك أسئلة' },
    { h: '#/library', i: '🗂️', t: 'مكتبة الموارد', d: 'كل ما تنشئينه في مكان واحد' }
  ];

  var GROUPS = [
    {
      t: '🧪 محاكاة ورياضيات', tools: [
        { n: 'GeoGebra', d: 'محادثات ورسوم رياضية تفاعلية مجانية — مساحات ودوال وهندسة', u: 'https://www.geogebra.org' },
        { n: 'Desmos', d: 'رسم الدوال والمنحنيات بسرعة ودقة في المتصفح', u: 'https://www.desmos.com' },
        { n: 'أكاديمية خان (العربية)', d: 'دروس رياضيات وعلوم مشروحة بالعربية مجانًا', u: 'https://ar.khanacademy.org' }
      ]
    },
    {
      t: '🎬 إنتاج المحتوى', tools: [
        { n: 'Canva للتعليم', d: 'تصاميم وعروض جاهزة بقوالب كثيرة (حساب تعليمي مجاني)', u: 'https://www.canva.com/edu/' },
        { n: 'Microsoft 365', d: 'Word وPowerPoint وExcel على الويب مجانًا', u: 'https://www.office.com' },
        { n: 'YouTube', d: 'استضافة ومشاهدة الدروس المصورة (حسابكِ الخاص)', u: 'https://www.youtube.com' }
      ]
    },
    {
      t: '📁 ملفات ووثائق', tools: [
        { n: 'Google Drive', d: 'تخزين ملفاتكِ ومشاركتها مع طلابكِ بحسابكِ', u: 'https://drive.google.com' },
        { n: 'iLovePDF', d: 'دمج وتقسيم وضغط ملفات PDF من المتصفح', u: 'https://www.ilovepdf.com' },
        { n: 'PDF24 Tools', d: 'أدوات PDF كثيرة بواجهة عربية — مجانية', u: 'https://tools.pdf24.org/ar' },
        { n: 'WPS Office', d: 'حزمة مكتبية مجانية تفتح وتحفظ صيغ Office', u: 'https://www.wps.com' }
      ]
    },
    {
      t: '📚 معرفة ومصادر', tools: [
        { n: 'ويكيبيديا العربية', d: 'موسوعة حرة — مصادر أولية للتحضير والمراجعة', u: 'https://ar.wikipedia.org' },
        { n: 'Internet Archive', d: 'أرشيف كتب ووسائق قديمة بترخيص حر', u: 'https://archive.org' }
      ]
    }
  ];

  function render(main) {
    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
      '<span class="mh-ic" aria-hidden="true">🧰</span>' +
      '<div style="flex:1;min-width:220px"><h2>مركز أدوات المعلم الرقمية</h2>' +
      '<p>اختصارات أقسام منصتكِ + روابط رسمية معروفة لما لا يمكن بناؤه داخل المتصفح — كلها تُفتح في تبويب جديد.</p></div>' +
      '<span class="badge ok">جاهز الآن</span></div></div>' +

      '<section class="card"><h3>🔎 بحث سريع في الدليل</h3>' +
      '<input type="text" id="tlQ" placeholder="اكتبي كلمة — مثال: PDF أو رياضيات أو عروض" aria-label="بحث في الأدوات" ' +
      'style="width:100%;max-width:460px;padding:10px 14px;border:1px solid var(--border);border-radius:10px">' +
      '<p class="mini" style="margin:8px 0 0">هذه روابط مواقع رسمية معروفة تُفتح في تبويب جديد — ' +
      'منصتكِ لا تُرسل إليها أي شيء، وتصفحكِ هناك يخضع لسياسات تلك المواقع.</p></section>' +

      '<section class="card"><h3>🏠 داخل منصتكِ (تعمل الآن بلا إنترنت)</h3>' +
      '<div class="g3">' + INTERNAL.map(function (x) {
        return '<a href="' + x.h + '" style="display:block;text-decoration:none;color:inherit;' +
          'border:1px solid var(--border);border-radius:12px;padding:14px">' +
          '<span style="font-size:26px" aria-hidden="true">' + x.i + '</span>' +
          '<b style="display:block;margin-top:6px">' + esc(x.t) + '</b>' +
          '<span class="mini">' + esc(x.d) + '</span></a>';
      }).join('') + '</div></section>' +

      GROUPS.map(function (g, gi) {
        return '<section class="card tl-g" data-q="' + esc((g.t + ' ' + g.tools.map(function (t) { return t.n + ' ' + t.d; }).join(' ')).toLowerCase()) + '">' +
          '<h3>' + esc(g.t) + '</h3>' +
          g.tools.map(function (t) {
            return '<div class="tl-t" data-q="' + esc((t.n + ' ' + t.d).toLowerCase()) + '" ' +
              'style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--border)">' +
              '<div style="flex:1;min-width:200px"><b>' + esc(t.n) + '</b>' +
              '<div class="mini" style="margin-top:2px">' + esc(t.d) + '</div></div>' +
              '<a class="btn btn-soft btn-sm" href="' + t.u + '" target="_blank" rel="noopener" ' +
              'aria-label="فتح ' + esc(t.n) + ' في تبويب جديد">↗️ فتح الموقع</a></div>';
          }).join('') + '</section>';
      }).join('') +

      '<p class="mini">لم ندرج أدوات لا نعرفها جيدًا ولا نضع روابط مموّلة — إن عرفتِ أداة رسمية مفيدة ' +
      'أضيفيها بنفسكِ من محرّر المتصفح، أو اطلبي منّا التوثيق بعدين.</p>';

    $('#tlQ').addEventListener('input', function () {
      var q = this.value.replace(/^\s+|\s+$/g, '').toLowerCase();
      $$('.tl-t').forEach(function (el) {
        el.style.display = (!q || el.getAttribute('data-q').indexOf(q) >= 0) ? '' : 'none';
      });
      $$('.tl-g').forEach(function (gEl) {
        var any = false;
        $$('.tl-t', gEl).forEach(function (t) { if (t.style.display !== 'none') any = true; });
        gEl.style.display = (!q || any || gEl.getAttribute('data-q').indexOf(q) >= 0) ? '' : 'none';
      });
    });
  }

  App.register('tools', render);
})(window);
