/* =========================================================
   slides.js — العروض التقديمية والكتب الرقمية
   عروض شرائح حقيقية في المتصفح: تحرير · معاينة حية ·
   عرض كامل الشاشة بلوحة المفاتيح · طباعة A4 عرضية → PDF ·
   تنزيل/استيراد JSON. بلا خدمات خارجية وبلا ادعاء PPTX.
   ========================================================= */
(function (global) {
  'use strict';
  var App = global.App;
  if (!App) { console.error('slides.js: App غير متاح'); return; }
  var UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, notify = UI.notify;

  var THEMES = [
    { name: 'أزرق كلاسيكي', main: '#123A6B', soft: '#E8EEF6', text: '#12253F' },
    { name: 'فيروزي', main: '#0E7C7B', soft: '#E2F4F3', text: '#0B4A49' },
    { name: 'ذهبي دافئ', main: '#8A6D12', soft: '#F7F1DE', text: '#4A3B08' }
  ];

  var TEMPLATES = {
    math: {
      name: 'حصة رياضيات', icon: '➗',
      title: 'درس: اكتبي العنوان هنا',
      slides: [
        { t: 'غلاف الدرس', b: ['الصف والفرقة: ...', 'المادة: الرياضيات', 'المعلم/المعلمة: ...'] },
        { t: 'أهداف الدرس', b: ['يُعرِّف الطالب المفهوم بأسلوبه', 'يطبّق القاعدة على مثال محلول', 'يحلّ مسألة من الحياة اليومية'] },
        { t: 'المفهوم الجديد', b: ['التعريف: اكتبيه هنا', 'القاعدة: a^2 + b^2 = c^2', 'ملاحظة مهمة: ...'] },
        { t: 'مثال محلول', b: ['المسألة: ...', 'الخطوة الأولى: ...', 'الخطوة الثانية: ...', 'الناتج: ...'] },
        { t: 'تدريب', b: ['تمرين 1: ...', 'تمرين 2: ...', 'تمرين 3: ...'] },
        { t: 'ملخص الدرس', b: ['الفكرة الأساسية', 'القاعدة النهائية', 'الواجب المنزلي: ...'] }
      ]
    },
    science: {
      name: 'حصة علوم', icon: '🔬',
      title: 'عنوان التجربة أو الدرس',
      slides: [
        { t: 'غلاف الدرس', b: ['المادة: العلوم', 'الصف: ...', 'المعلم/المعلمة: ...'] },
        { t: 'أهداف الدرس', b: ['يصف الطالب خطوات التجربة', 'يسجّل الملاحظات بدقة', 'يستنتج العلاقة بين المتغيّرات'] },
        { t: 'الأدوات والمواد', b: ['أداة 1: ...', 'أداة 2: ...', 'مواد أخرى: ...'] },
        { t: 'خطوات التجربة', b: ['الخطوة 1: ...', 'الخطوة 2: ...', 'الخطوة 3: ...'] },
        { t: 'الملاحظات والنتائج', b: ['سجّلوا ما رأيتموه', 'الجدول/الرسم: ...'] },
        { t: 'الاستنتاج', b: ['النتيجة العامة: ...', 'أسئلة للمراجعة: ...'] }
      ]
    },
    blank: {
      name: 'عرض فارغ', icon: '📄',
      title: 'عنوان العرض',
      slides: [
        { t: 'شريحة العنوان', b: ['اكتبي هنا'] },
        { t: 'محتوى الشريحة', b: ['نقطة أولى', 'نقطة ثانية'] }
      ]
    }
  };

  /* ---------------- التخزين ---------------- */
  function state() {
    var s = Store.get('slides', null);
    if (!s || !(s.decks instanceof Array)) s = { decks: [], last: null };
    return s;
  }
  function save(s) { Store.set('slides', s); }
  function curDeck() {
    var s = state();
    for (var i = 0; i < s.decks.length; i++) if (s.decks[i].id === s.last) return s.decks[i];
    return null;
  }
  function selIdx(deck) {
    var n = parseInt(Store.get('slidesSel', 0), 10);
    if (isNaN(n) || n < 0 || n >= deck.slides.length) n = 0;
    return n;
  }

  /* ---------------- بناء الشريحة ---------------- */
  /* x^2 يُعرض بـ x² — وحدها الأرقام بعد ^ تتحول لأس منشور */
  function fmtBullet(t) {
    return esc(String(t)).replace(/\^(\d+)/g, '<sup>$1</sup>');
  }
  function slideHTML(deck, i, mode) {
    var th = THEMES[deck.theme] || THEMES[0];
    var sl = deck.slides[i];
    if (!sl) return '';
    var p = Store.get('profile', {}) || {};
    var screen = (mode === 'screen');
    var bullets = (sl.b instanceof Array ? sl.b : [])
      .filter(function (x) { return String(x).replace(/\s/g, ''); });
    return '<div style="width:100%;height:100%;background:#FFFFFF;border-radius:' + (screen ? '14px' : '0') +
      ';overflow:hidden;display:flex;flex-direction:column;font-family:Tahoma,Arial,sans-serif">' +
      '<div style="background:' + th.main + ';color:#FFFFFF;display:flex;justify-content:space-between;align-items:center;' +
      'padding:' + (screen ? '14px 30px;font-size:24px' : '8pt 14pt;font-size:13pt') + ';font-weight:700">' +
      '<span>' + esc(deck.title || 'عرض') + '</span>' +
      (p.school ? '<span style="opacity:.85">' + esc(p.school) + '</span>' : '') + '</div>' +
      '<div style="flex:1;padding:' + (screen ? '30px 60px' : '16pt 28pt') + ';color:' + th.text + ';overflow:hidden">' +
      '<h2 style="margin:0 0 ' + (screen ? '22px' : '12pt') + ';font-size:' + (screen ? '46px' : '24pt') +
      ';border-bottom:3px solid ' + th.soft + ';padding-bottom:10px">' + esc(sl.t || 'بدون عنوان') + '</h2>' +
      '<ul style="margin:0;padding:0 ' + (screen ? '34px' : '20pt') + ' 0 0;list-style:square;font-size:' +
      (screen ? '30px' : '16pt') + ';line-height:2">' +
      bullets.map(function (b) { return '<li style="margin-bottom:' + (screen ? '10px' : '5pt') + '">' + fmtBullet(b) + '</li>'; }).join('') +
      '</ul></div>' +
      '<div style="background:' + th.soft + ';color:' + th.text + ';display:flex;justify-content:space-between;' +
      'padding:' + (screen ? '10px 30px;font-size:19px' : '6pt 14pt;font-size:11pt') + '">' +
      '<span>' + esc(p.name || '') + '</span>' +
      '<span>شريحة ' + (i + 1) + ' من ' + deck.slides.length + '</span></div></div>';
  }

  /* ---------------- وضع العرض الكامل ---------------- */
  var presenting = null;

  function present(deck) {
    if (!deck || !deck.slides.length) { notify('لا توجد شرائح في هذا العرض', 'err'); return; }
    var ov = document.createElement('div');
    ov.id = 'slPresent';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'وضع العرض الكامل');
    ov.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:#0B1622;z-index:3000;overflow:hidden';
    ov.innerHTML =
      '<div class="sl-hold" style="position:absolute;left:0;top:0;right:0;bottom:86px"></div>' +
      '<div style="position:absolute;left:0;right:0;bottom:0;height:86px;background:#132437;display:flex;' +
      'align-items:center;justify-content:center;gap:14px;direction:rtl">' +
      '<button class="btn btn-primary" id="slNext">التالي ←</button>' +
      '<span id="slCount" style="color:#CBD6E2;font-weight:700"></span>' +
      '<button class="btn btn-soft" id="slPrev">→ السابق</button>' +
      '<button class="btn btn-danger" id="slExit" style="margin-right:24px">✕ خروج (Esc)</button>' +
      '</div>';
    document.body.appendChild(ov);
    presenting = { deck: deck, i: 0, ov: ov };
    paintPresent();
    $('#slNext').onclick = function () { step(1); };
    $('#slPrev').onclick = function () { step(-1); };
    $('#slExit').onclick = exitPresent;
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.className === 'sl-hold') step(1); });
    document.addEventListener('keydown', presentKeys, true);
    window.addEventListener('resize', paintPresent);
  }
  function paintPresent() {
    var st = presenting;
    if (!st) return;
    var hold = st.ov.querySelector('.sl-hold');
    var W = hold.clientWidth || window.innerWidth;
    var H = hold.clientHeight || (window.innerHeight - 86);
    var s = Math.min(W / 1280, H / 720);
    if (s > 1.2) s = 1.2; /* لا داعي لتضخيم الصورة فوق حجمها الأصلي */
    hold.innerHTML = '<div style="width:1280px;height:720px;position:absolute;transform-origin:top left;' +
      'left:' + ((W - 1280 * s) / 2) + 'px;top:' + ((H - 720 * s) / 2) + 'px;' +
      'transform:scale(' + s + ')">' + slideHTML(st.deck, st.i, 'screen') + '</div>';
    $('#slCount').textContent = (st.i + 1) + ' / ' + st.deck.slides.length;
  }
  function step(d) {
    if (!presenting) return;
    var n = presenting.deck.slides.length;
    var j = presenting.i + d;
    if (j < 0) j = 0;
    if (j > n - 1) j = n - 1;
    if (j === presenting.i) { notify(d > 0 ? 'هذه آخر شريحة' : 'هذه أول شريحة'); return; }
    presenting.i = j;
    paintPresent();
  }
  function presentKeys(e) {
    if (!presenting) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); exitPresent(); }
    else if (e.key === 'ArrowLeft' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); e.stopPropagation(); step(1); }
    else if (e.key === 'ArrowRight' || e.key === 'PageUp') { e.preventDefault(); e.stopPropagation(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); presenting.i = 0; paintPresent(); }
    else if (e.key === 'End') { e.preventDefault(); presenting.i = presenting.deck.slides.length - 1; paintPresent(); }
  }
  function exitPresent() {
    if (!presenting) return;
    document.removeEventListener('keydown', presentKeys, true);
    window.removeEventListener('resize', paintPresent);
    if (presenting.ov.parentNode) presenting.ov.parentNode.removeChild(presenting.ov);
    presenting = null;
  }

  /* ---------------- الطباعة (A4 عرضية) ---------------- */
  function printDeck(deck) {
    if (!deck || !deck.slides.length) { notify('لا توجد شرائح للطباعة', 'err'); return; }
    var html = '<style>@page{size:A4 landscape;margin:8mm}' +
      '.slp{page-break-after:always;height:174mm}' +
      '.slp:last-child{page-break-after:auto}</style>';
    deck.slides.forEach(function (sl, i) {
      html += '<div class="slp">' + slideHTML(deck, i, 'print') + '</div>';
    });
    UI.print(html);
  }

  /* ---------------- قائمة العروض ---------------- */
  function renderList(main) {
    var s = state();
    var decksHTML = s.decks.length
      ? s.decks.map(function (d) {
          return '<section class="card"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:200px"><h3 style="margin:0">' + esc(d.title || 'عرض بدون عنوان') + '</h3>' +
            '<p class="mini" style="margin:4px 0 0">' + (d.slides.length) + ' شرائح · ' + esc(THEMES[d.theme] ? THEMES[d.theme].name : '') +
            ' · حُفظ محليًا في متصفحكِ</p></div>' +
            '<div class="btn-row" style="margin:0">' +
            '<button class="btn btn-primary btn-sm sl-open" data-id="' + d.id + '">✏️ تحرير</button>' +
            '<button class="btn btn-navy btn-sm sl-show" data-id="' + d.id + '">▶️ عرض</button>' +
            '<button class="btn btn-soft btn-sm sl-prn" data-id="' + d.id + '">🖨️ طباعة</button>' +
            '<button class="btn btn-gold btn-sm sl-dl" data-id="' + d.id + '">⬇️ JSON</button>' +
            '<button class="btn btn-danger btn-sm sl-del" data-id="' + d.id + '">🗑️</button>' +
            '</div></div></section>';
        }).join('')
      : '<section class="card"><p class="mini" style="margin:0">لا توجد عروض محفوظة بعد — ابدئي بقالب جاهز من الأعلى.</p></section>';

    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
      '<span class="mh-ic" aria-hidden="true">📊</span>' +
      '<div style="flex:1;min-width:220px"><h2>العروض والكتب الرقمية</h2>' +
      '<p>اعرِضي دروسكِ كشرائح في المتصفح، وشاهديها كاملة الشاشة، واطبعيها PDF — كل شيء محلي بلا خدمات خارجية.</p></div>' +
      '<span class="badge ok">جاهز الآن</span></div></div>' +

      '<section class="card"><h3>➕ عرض جديد</h3>' +
      '<p class="mini">اختاري قالبًا جاهزًا — يفتح بجُدول تحرير كامل، وكل كلمة قابلة للتعديل.</p>' +
      '<div class="g3">' +
      Object.keys(TEMPLATES).map(function (k) {
        return '<button class="btn btn-soft sl-tpl" data-tpl="' + k + '" style="text-align:center;padding:18px">' +
          '<span style="font-size:30px;display:block" aria-hidden="true">' + TEMPLATES[k].icon + '</span>' +
          esc(TEMPLATES[k].name) + '</button>';
      }).join('') + '</div>' +
      '<div class="btn-row" style="margin-top:10px">' +
      '<button class="btn btn-soft" id="slImportBtn">📥 استيراد عرض من ملف JSON</button>' +
      '<input type="file" id="slImport" accept=".json,application/json" class="hidden" aria-label="استيراد ملف عرض JSON">' +
      '</div></section>' +

      '<h3 style="margin:18px 0 8px">📚 عروضكِ (' + s.decks.length + ')</h3>' +
      decksHTML;

    $$('.sl-tpl').forEach(function (b) { b.onclick = function () { createDeck(b.getAttribute('data-tpl')); }; });
    $$('.sl-open').forEach(function (b) { b.onclick = function () { openDeck(b.getAttribute('data-id')); }; });
    $$('.sl-show').forEach(function (b) { b.onclick = function () { present(findDeck(b.getAttribute('data-id'))); }; });
    $$('.sl-prn').forEach(function (b) { b.onclick = function () { printDeck(findDeck(b.getAttribute('data-id'))); }; });
    $$('.sl-dl').forEach(function (b) { b.onclick = function () { exportDeck(findDeck(b.getAttribute('data-id'))); }; });
    $$('.sl-del').forEach(function (b) {
      b.onclick = function () {
        UI.confirm('حذف هذا العرض نهائيًا من متصفحكِ؟').then(function (yes) {
          if (!yes) return;
          var s2 = state();
          s2.decks = s2.decks.filter(function (d) { return d.id !== b.getAttribute('data-id'); });
          if (s2.last === b.getAttribute('data-id')) s2.last = null;
          save(s2);
          notify('حُذف العرض ✓');
          renderList(main);
        });
      };
    });
    $('#slImportBtn').onclick = function () { $('#slImport').click(); };
    $('#slImport').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var d = JSON.parse(rd.result);
          if (!d || !(d.slides instanceof Array) || !d.slides.length) throw new Error('bad');
          d.id = 'd' + Date.now();
          if (typeof d.theme !== 'number' || !THEMES[d.theme]) d.theme = 0;
          var s3 = state();
          s3.decks.push(d);
          save(s3);
          notify('استُورد العرض «' + (d.title || 'بدون عنوان') + '» ✓');
          renderList(main);
        } catch (e) {
          notify('الملف ليس عرضًا صالحًا من هذه المنصة', 'err');
        }
      };
      rd.readAsText(f);
      this.value = '';
    });
  }

  function findDeck(id) {
    var s = state();
    for (var i = 0; i < s.decks.length; i++) if (s.decks[i].id === id) return s.decks[i];
    return null;
  }
  function createDeck(k) {
    var tpl = TEMPLATES[k];
    if (!tpl) return;
    var s = state();
    var d = {
      id: 'd' + Date.now(),
      title: tpl.title,
      theme: 0,
      at: Date.now(),
      slides: tpl.slides.map(function (sl) { return { t: sl.t, b: sl.b.slice(0) }; })
    };
    s.decks.push(d);
    s.last = d.id;
    save(s);
    Store.set('slidesSel', 0);
    renderEditor($('#main'), d);
  }
  function openDeck(id) {
    var s = state();
    s.last = id;
    save(s);
    Store.set('slidesSel', 0);
    renderEditor($('#main'), findDeck(id));
  }
  function exportDeck(d) {
    if (!d) return;
    UI.download((d.title || 'عرض') + '.json', JSON.stringify(d, null, 2), 'application/json');
    notify('بدأ تنزيل ملف العرض ✓');
  }

  /* ---------------- محرّر العرض ---------------- */
  function renderEditor(main, deck) {
    if (!deck) { renderList(main); return; }
    var sel = selIdx(deck);

    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
      '<button class="btn btn-soft" id="slBack">↩︎ كل العروض</button>' +
      '<div style="flex:1;min-width:220px"><h2 style="margin:0">' + esc(deck.title || 'عرض بدون عنوان') + '</h2>' +
      '<p class="mini" style="margin:4px 0 0">' + deck.slides.length + ' شرائح · الحفظ تلقائي في متصفحكِ</p></div>' +
      '<button class="btn btn-navy" id="slShow">▶️ عرض كامل الشاشة</button>' +
      '<button class="btn btn-primary" id="slPrint">🖨️ طباعة PDF</button>' +
      '<button class="btn btn-gold" id="slExp">⬇️ JSON</button>' +
      '</div></div>' +

      '<section class="card"><div class="g2" style="max-width:640px">' +
      '<div class="field"><label for="slTitle">عنوان العرض (يظهر أعلى كل شريحة)</label>' +
      '<input type="text" id="slTitle" value="' + esc(deck.title || '') + '"></div>' +
      '<div class="field"><label for="slTheme">الهوية اللونية</label><select id="slTheme">' +
      THEMES.map(function (t, i) { return '<option value="' + i + '"' + (i === deck.theme ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') +
      '</select></div></div>' +
      '<p class="mini">تلميح: اكتبي الأس هكذا <b>x^2</b> ليظهر هكذا x² في الشريحة.</p>' +
      '</section>' +

      '<section class="card"><h3>👁️ المعاينة الحية للشريحة المحدَّدة</h3>' +
      '<div id="slPreviewBox" style="background:#0B1622;border-radius:12px;padding:12px">' +
      '<div id="slPreview" style="position:relative;width:100%;padding-bottom:56.25%;overflow:hidden;border-radius:8px"></div>' +
      '</div></section>' +

      '<section class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
      '<h3 style="margin:0">📑 الشرائح</h3>' +
      '<button class="btn btn-primary btn-sm" id="slAdd">➕ إضافة شريحة</button></div>' +
      '<div id="slSlides" style="margin-top:10px"></div></section>';

    function paintPreview() {
      var i = selIdx(deck);
      var box = $('#slPreview');
      var sc = (box.clientWidth || 900) / 1280;
      box.innerHTML = '<div style="position:absolute;left:0;top:0;width:1280px;height:720px;' +
        'transform-origin:top left;transform:scale(' + sc + ')">' + slideHTML(deck, i, 'screen') + '</div>';
      $$('.sl-card').forEach(function (c, j) {
        c.style.borderColor = (j === i) ? 'var(--teal)' : 'var(--border)';
      });
    }
    function paintSlides() {
      $('#slSlides').innerHTML = deck.slides.map(function (sl, i) {
        return '<div class="sl-card card" data-i="' + i + '" style="margin-bottom:10px;padding:12px">' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
          '<b style="color:var(--teal)">شريحة ' + (i + 1) + '</b>' +
          '<input type="text" class="sl-t" data-i="' + i + '" value="' + esc(sl.t || '') + '" ' +
          'placeholder="عنوان الشريحة" aria-label="عنوان الشريحة ' + (i + 1) + '" ' +
          'style="flex:1;min-width:160px;padding:8px 10px;border:1px solid var(--border);border-radius:8px">' +
          '<button class="btn btn-soft btn-sm sl-up" data-i="' + i + '" aria-label="تحريك لأعلى"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button class="btn btn-soft btn-sm sl-dn" data-i="' + i + '" aria-label="تحريك لأسفل"' + (i === deck.slides.length - 1 ? ' disabled' : '') + '>↓</button>' +
          '<button class="btn btn-soft btn-sm sl-cp" data-i="' + i + '" aria-label="تكرار الشريحة">🔁</button>' +
          '<button class="btn btn-danger btn-sm sl-dl2" data-i="' + i + '" aria-label="حذف الشريحة"' + (deck.slides.length <= 1 ? ' disabled' : '') + '>🗑</button>' +
          '</div>' +
          '<textarea class="sl-b" data-i="' + i + '" rows="3" ' +
          'placeholder="النقاط — سطر لكل نقطة (استخدمي x^2 لعرض x²)" aria-label="نقاط الشريحة ' + (i + 1) + '" ' +
          'style="width:100%;margin-top:8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;resize:vertical">' +
          esc((sl.b instanceof Array ? sl.b : []).join('\n')) + '</textarea></div>';
      }).join('');

      $$('.sl-card').forEach(function (c) {
        c.addEventListener('click', function (e) {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
          Store.set('slidesSel', parseInt(c.getAttribute('data-i'), 10));
          paintPreview();
        });
      });
      $$('.sl-t').forEach(function (inp) {
        inp.addEventListener('input', function () {
          deck.slides[parseInt(inp.getAttribute('data-i'), 10)].t = inp.value;
          touch();
          paintPreview();
        });
        inp.addEventListener('focus', function () {
          Store.set('slidesSel', parseInt(inp.getAttribute('data-i'), 10));
          paintPreview();
        });
      });
      $$('.sl-b').forEach(function (ta) {
        ta.addEventListener('input', function () {
          deck.slides[parseInt(ta.getAttribute('data-i'), 10)].b =
            ta.value.split('\n').map(function (l) { return l.replace(/^\s+|\s+$/g, ''); });
          touch();
          paintPreview();
        });
        ta.addEventListener('focus', function () {
          Store.set('slidesSel', parseInt(ta.getAttribute('data-i'), 10));
          paintPreview();
        });
      });
      $$('.sl-up').forEach(function (b) { b.onclick = function () { move(parseInt(b.getAttribute('data-i'), 10), -1); }; });
      $$('.sl-dn').forEach(function (b) { b.onclick = function () { move(parseInt(b.getAttribute('data-i'), 10), 1); }; });
      $$('.sl-cp').forEach(function (b) {
        b.onclick = function () {
          var i = parseInt(b.getAttribute('data-i'), 10);
          var src = deck.slides[i];
          deck.slides.splice(i + 1, 0, { t: src.t, b: (src.b || []).slice(0) });
          touch(); paintSlides(); paintPreview();
          notify('كُرّرت الشريحة ✓');
        };
      });
      $$('.sl-dl2').forEach(function (b) {
        b.onclick = function () {
          if (deck.slides.length <= 1) return;
          deck.slides.splice(parseInt(b.getAttribute('data-i'), 10), 1);
          touch(); paintSlides(); paintPreview();
        };
      });
    }
    function move(i, d) {
      var j = i + d;
      if (j < 0 || j >= deck.slides.length) return;
      var tmp = deck.slides[i];
      deck.slides[i] = deck.slides[j];
      deck.slides[j] = tmp;
      Store.set('slidesSel', j);
      touch(); paintSlides(); paintPreview();
    }
    function touch() {
      deck.at = Date.now();
      var s = state();
      for (var i = 0; i < s.decks.length; i++) if (s.decks[i].id === deck.id) s.decks[i] = deck;
      save(s);
    }

    $('#slBack').onclick = function () {
      var s = state();
      s.last = null;
      save(s);
      renderList(main);
    };
    $('#slTitle').addEventListener('input', function () {
      deck.title = this.value;
      touch();
      main.querySelector('.mh-top h2').textContent = deck.title || 'عرض بدون عنوان';
      paintPreview();
    });
    $('#slTheme').addEventListener('change', function () {
      deck.theme = parseInt(this.value, 10) || 0;
      touch();
      paintPreview();
    });
    $('#slAdd').onclick = function () {
      deck.slides.push({ t: 'شريحة جديدة', b: ['اكتبي النقاط هنا'] });
      Store.set('slidesSel', deck.slides.length - 1);
      touch(); paintSlides(); paintPreview();
    };
    $('#slShow').onclick = function () { present(deck); };
    $('#slPrint').onclick = function () { printDeck(deck); };
    $('#slExp').onclick = function () { exportDeck(deck); };

    paintSlides();
    paintPreview();
  }

  /* ---------------- تسجيل القسم ---------------- */
  function render(main) {
    var deck = curDeck();
    if (deck) renderEditor(main, deck);
    else renderList(main);
  }

  App.register('slides', render);
})(window);
