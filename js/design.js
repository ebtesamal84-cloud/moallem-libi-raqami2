/* =========================================================
   design.js — استوديو التصميم التعليمي
   قوالب A4: شهادة تقدير · ملصق تعليمي · بطاقة مصطلح رياضي
   بطاقة سؤال وإجابة · غلاف ورقة عمل
   رسم حقيقي على Canvas + تصدير PNG + طباعة A4
   كل شيء داخل المتصفح — بلا خدمة خارجية وبلا وعود وهمية.
   ========================================================= */
(function (global) {
  'use strict';
  var App = global.App;
  if (!App) { console.error('design.js: App غير متاح'); return; }
  var UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, notify = UI.notify;

  var MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  function dateAr() {
    var d = new Date();
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ---------- الهويات اللونية (من هوية المنصة) ---------- */
  var THEMES = {
    classic: { name: 'أزرق كلاسيكي', page: '#FFFFFF', ink: '#12253F', band: '#0B2545', bandInk: '#FFFFFF', accent: '#123A6B', gold: '#C9A227', soft: '#F2F6FB', muted: '#5C6E86' },
    turq:    { name: 'فيروزي',       page: '#FFFFFF', ink: '#083B39', band: '#0E9089', bandInk: '#FFFFFF', accent: '#12B5AC', gold: '#C9A227', soft: '#EFFBFA', muted: '#3E6B69' },
    gold:    { name: 'ذهبي',         page: '#FFFDF6', ink: '#3A2E05', band: '#C9A227', bandInk: '#3A2E05', accent: '#0B2545', gold: '#E6C45B', soft: '#FBF3DC', muted: '#7A6A2E' }
  };

  /* ---------- القوالب وحقولها ---------- */
  var TPLS = {
    cert: {
      t: 'شهادة تقدير', orient: 'land',
      f: [
        { k: 'title', l: 'عنوان الشهادة', d: 'شهادة تقدير' },
        { k: 'name',  l: 'اسم المُكرَّم', d: 'التلميذ / التلميذة أو زميل المعلم' },
        { k: 'line',  l: 'سبب التكريم', area: true, d: 'تقديرًا لتفوّقه في مسابقة الرياضيات على مستوى المدرسة' },
        { k: 'meta',  l: 'سطر إضافي (تواريخ/مراجع)', d: 'صدرت بتاريخ ' + dateAr() }
      ]
    },
    poster: {
      t: 'ملصق تعليمي', orient: 'port',
      f: [
        { k: 'title', l: 'العنوان الكبير', d: 'القواعد الملكية للضرب' },
        { k: 'sub',   l: 'عنوان فرعي', d: 'قاعدة 5 في 30 ثانية' },
        { k: 'body',  l: 'النص (سطر لكل قاعدة)', area: true, d: '1) اضرب في الآحاد ثم اجمع الأعشار\n2) الصفر لا يُكتب إلا في مكانه\n3) تحقّق: هل النتيجة منطقية؟' },
        { k: 'tip',   l: 'شارة صغيرة', d: 'احفظها تنجح' }
      ]
    },
    term: {
      t: 'بطاقة مصطلح رياضي', orient: 'port',
      f: [
        { k: 'term', l: 'المصطلح', d: 'المتوسط الحسابي' },
        { k: 'def',  l: 'التعريف', area: true, d: 'مجموع القيم مقسومًا على عددها' },
        { k: 'ex',   l: 'مثال محلول', area: true, d: '(4 + 6 + 8) ÷ 3 = 6' }
      ]
    },
    qcard: {
      t: 'بطاقة سؤال وإجابة', orient: 'port',
      f: [
        { k: 'q',    l: 'السؤال', area: true, d: 'ما ناتج 7 × 8؟' },
        { k: 'a',    l: 'الإجابة', area: true, d: '56' },
        { k: 'note', l: 'ملاحظة للمعلم', d: 'اطلب من التلميذ شرح طريقة إجابته' }
      ]
    },
    cover: {
      t: 'غلاف ورقة عمل', orient: 'port',
      f: [
        { k: 'title', l: 'عنوان الغلاف', d: 'ورقة عمل — الكسور' },
        { k: 'grade', l: 'الصف والفصل', d: 'الصف السادس / الفصل الدراسي الثاني' },
        { k: 'name',  l: 'اسم التلميذ', d: '........................................' },
        { k: 'goal',  l: 'هدف الورقة', area: true, d: 'أن يقارن التلميذ بين كسرين وحدة ويحدّد الأكبر' }
      ]
    }
  };

  var PAGE = { land: [1754, 1240], port: [1240, 1754] }; /* A4 بدقة ~150dpi */

  /* ---------- أدوات الرسم ---------- */
  function font(ctx, px, w) { ctx.font = (w || 600) + ' ' + px + 'px "Segoe UI", Tahoma, Arial, sans-serif'; }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  /* لفّ النص العربي المطول — يرجع نهاية آخر سطر */
  function wrapText(ctx, text, x, y, maxW, lh, maxLines) {
    var lines = [], paras = String(text || '').split('\n'), i, j;
    for (i = 0; i < paras.length; i++) {
      var words = paras[i].split(' '), cur = '';
      for (j = 0; j < words.length; j++) {
        var test = cur ? cur + ' ' + words[j] : words[j];
        if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[j]; }
        else cur = test;
      }
      lines.push(cur);
    }
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + ' …';
    }
    for (i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lh);
    return y + lines.length * lh;
  }
  function mark(ctx, x, y, size, bg, ink) {
    /* شعار المنصة المصغّر: مربع داكن بحرف «م» */
    ctx.save();
    ctx.fillStyle = bg;
    roundRect(ctx, x, y, size, size, size * 0.25); ctx.fill();
    ctx.fillStyle = ink;
    font(ctx, size * 0.62, 800);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('م', x + size / 2, y + size / 2 + size * 0.03);
    ctx.restore();
  }
  function footer(ctx, W, H, th, f, extra) {
    ctx.fillStyle = th.band;
    ctx.fillRect(0, H - 74, W, 74);
    ctx.fillStyle = th.bandInk;
    font(ctx, 30, 600);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var bits = [];
    if (f.teacher) bits.push('إعداد: ' + f.teacher);
    if (f.school) bits.push(f.school);
    bits.push(dateAr());
    if (extra) bits.push(extra);
    ctx.fillText(bits.join('   ·   '), W / 2, H - 36);
    ctx.restore && ctx.restore();
  }

  /* ---------- رسم القوالب ---------- */
  function drawCert(ctx, W, H, f, th, prof) {
    ctx.fillStyle = th.page; ctx.fillRect(0, 0, W, H);
    /* إطار ذهبي مزدوج */
    ctx.strokeStyle = th.gold; ctx.lineWidth = 8; ctx.strokeRect(36, 36, W - 72, H - 72);
    ctx.lineWidth = 2; ctx.strokeRect(56, 56, W - 112, H - 112);
    /* شريط العنوان */
    ctx.fillStyle = th.band;
    ctx.fillRect(56, 56, W - 112, 190);
    ctx.fillStyle = th.bandInk;
    font(ctx, 84, 800);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(f.title || 'شهادة تقدير', W / 2, 138);
    font(ctx, 30, 600);
    ctx.fillStyle = th.gold;
    ctx.fillText('المعلم الليبي الرقمي — نبدع رقميًا لنرتقي بتعليمنا', W / 2, 214);
    /* تمهيد */
    ctx.fillStyle = th.muted;
    font(ctx, 36, 600);
    ctx.fillText('تُمنح هذه الشهادة إلى', W / 2, 330);
    /* اسم المُكرَّم */
    ctx.fillStyle = th.ink;
    font(ctx, 92, 800);
    ctx.fillText(f.name || '........................................', W / 2, 440);
    /* خط تحت الاسم */
    ctx.strokeStyle = th.accent; ctx.lineWidth = 3;
    ctx.beginPath();
    var nw = Math.max(ctx.measureText(f.name || '').width + 120, 700);
    ctx.moveTo(W / 2 - nw / 2, 492); ctx.lineTo(W / 2 + nw / 2, 492); ctx.stroke();
    /* سبب التكريم */
    ctx.fillStyle = th.ink;
    font(ctx, 44, 600);
    ctx.textAlign = 'center';
    var endY = wrapText(ctx, f.line || '', W / 2, 590, W - 340, 68, 4);
    if (f.meta) {
      ctx.fillStyle = th.muted;
      font(ctx, 30, 600);
      ctx.fillText(f.meta, W / 2, endY + 46);
    }
    /* التوقيعات */
    font(ctx, 30, 600);
    ctx.fillStyle = th.ink;
    var colY = H - 250;
    ctx.textAlign = 'center';
    ctx.fillText('توقيع المعلم' + (f.teacher ? ': ' + f.teacher : ''), W * 0.72, colY);
    ctx.fillText(f.school || 'مدرسة', W * 0.28, colY);
    ctx.strokeStyle = th.muted; ctx.lineWidth = 2;
    [W * 0.72, W * 0.28].forEach(function (cx) {
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(cx - 210, colY + 34); ctx.lineTo(cx + 210, colY + 34); ctx.stroke();
      ctx.setLineDash([]);
    });
    /* دائرة الختم (تُختم فعليًا في المدرسة) */
    ctx.strokeStyle = th.gold; ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.arc(W / 2, H - 300, 78, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = th.muted; font(ctx, 24, 600);
    ctx.fillText('ختم المدرسة', W / 2, H - 292);
    ctx.fillStyle = th.muted; font(ctx, 24, 600);
    ctx.textAlign = 'center';
    ctx.fillText('تُطبع هذا الشهادة على ورقة A4 — ضعي ختم المدرسة وتوقيعك يدويًا', W / 2, H - 130);
  }

  function drawPoster(ctx, W, H, f, th, prof) {
    ctx.fillStyle = th.page; ctx.fillRect(0, 0, W, H);
    /* شريط علوي */
    ctx.fillStyle = th.band;
    ctx.fillRect(0, 0, W, 430);
    mark(ctx, W - 150, 40, 84, th.bandInk, th.band);
    ctx.fillStyle = th.bandInk;
    font(ctx, 34, 700);
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('المعلم الليبي الرقمي', W - 260, 100);
    ctx.fillStyle = th.bandInk;
    font(ctx, 92, 800);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var endY = wrapText(ctx, f.title || 'العنوان', W / 2, 250, W - 220, 108, 2);
    if (f.sub) {
      ctx.fillStyle = th.gold;
      font(ctx, 44, 800);
      ctx.fillText(f.sub, W / 2, endY + 52);
    }
    /* شارة */
    if (f.tip) {
      ctx.fillStyle = th.gold;
      var tw = ctx.measureText(f.tip).width + 90;
      roundRect(ctx, W - tw - 70, 470, tw, 78, 39); ctx.fill();
      ctx.fillStyle = th.band;
      font(ctx, 38, 800);
      ctx.fillText(f.tip, W - tw / 2 - 70, 510);
    }
    /* النص */
    ctx.fillStyle = th.ink;
    font(ctx, 52, 600);
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    wrapText(ctx, f.body || '', W - 100, 640, W - 200, 92, 8);
    footer(ctx, W, H, th, f, null);
  }

  function drawTerm(ctx, W, H, f, th, prof) {
    ctx.fillStyle = th.soft; ctx.fillRect(0, 0, W, H);
    /* بطاقة داخلية */
    ctx.fillStyle = th.page;
    roundRect(ctx, 70, 70, W - 140, H - 214, 36); ctx.fill();
    ctx.strokeStyle = th.accent; ctx.lineWidth = 5;
    roundRect(ctx, 70, 70, W - 140, H - 214, 36); ctx.stroke();
    /* رأس البطاقة */
    ctx.fillStyle = th.band;
    roundRect(ctx, 70, 70, W - 140, 210, 36); ctx.fill();
    ctx.fillStyle = th.bandInk;
    font(ctx, 30, 700);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('بطاقة مصطلح رياضي', W / 2, 130);
    font(ctx, 78, 800);
    ctx.fillText(f.term || 'المصطلح', W / 2, 216);
    /* التعريف */
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = th.accent;
    font(ctx, 40, 800);
    ctx.fillText('التعريف', W - 150, 400);
    ctx.fillStyle = th.ink;
    font(ctx, 50, 600);
    var y = wrapText(ctx, f.def || '', W - 150, 480, W - 300, 82, 5);
    /* المثال */
    ctx.fillStyle = th.soft;
    roundRect(ctx, 130, y + 50, W - 260, 300, 26); ctx.fill();
    ctx.strokeStyle = th.gold; ctx.lineWidth = 3;
    roundRect(ctx, 130, y + 50, W - 260, 300, 26); ctx.stroke();
    ctx.fillStyle = th.muted;
    font(ctx, 36, 800);
    ctx.textAlign = 'center';
    ctx.fillText('مثال', W / 2, y + 112);
    ctx.fillStyle = th.ink;
    font(ctx, 54, 800);
    ctx.textBaseline = 'middle';
    var exLines = String(f.ex || '').split('\n');
    for (var i = 0; i < exLines.length && i < 3; i++) {
      ctx.fillText(exLines[i], W / 2, y + 190 + i * 70);
    }
    footer(ctx, W, H, th, f, prof.subject || null);
  }

  function drawQCard(ctx, W, H, f, th, prof) {
    ctx.fillStyle = th.page; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = th.band;
    ctx.fillRect(0, 0, W, 150);
    ctx.fillStyle = th.bandInk;
    font(ctx, 48, 800);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('سؤال سريع', W / 2, 78);
    /* السؤال */
    ctx.fillStyle = th.ink;
    font(ctx, 56, 700);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var qEnd = wrapText(ctx, f.q || '', W / 2, 330, W - 240, 86, 5);
    /* فاصل */
    ctx.strokeStyle = th.muted; ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.moveTo(120, qEnd + 60); ctx.lineTo(W - 120, qEnd + 60); ctx.stroke();
    ctx.setLineDash([]);
    /* الإجابة */
    ctx.fillStyle = th.gold;
    roundRect(ctx, 160, qEnd + 130, W - 320, 260, 30); ctx.fill();
    ctx.fillStyle = th.band;
    font(ctx, 34, 800);
    ctx.fillText('الإجابة', W / 2, qEnd + 200);
    ctx.font = '800 72px "Segoe UI", Tahoma, Arial, sans-serif';
    var aLines = String(f.a || '').split('\n');
    for (var i = 0; i < aLines.length && i < 2; i++) {
      ctx.fillText(aLines[i], W / 2, qEnd + 290 + i * 80);
    }
    /* ملاحظة */
    if (f.note) {
      ctx.fillStyle = th.muted;
      font(ctx, 32, 600);
      wrapText(ctx, f.note, W / 2, H - 320, W - 300, 48, 2);
    }
    footer(ctx, W, H, th, f, null);
  }

  function drawCover(ctx, W, H, f, th, prof) {
    ctx.fillStyle = th.page; ctx.fillRect(0, 0, W, H);
    /* زوايا زخرفية */
    ctx.fillStyle = th.accent;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(330, 0); ctx.lineTo(0, 330); ctx.closePath(); ctx.fill();
    ctx.fillStyle = th.gold;
    ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W - 260, H); ctx.lineTo(W, H - 260); ctx.closePath(); ctx.fill();
    mark(ctx, W - 190, 60, 96, th.band, th.bandInk);
    /* العنوان */
    ctx.fillStyle = th.ink;
    font(ctx, 84, 800);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var tEnd = wrapText(ctx, f.title || 'غلاف', W / 2, 420, W - 220, 100, 3);
    /* الصف */
    ctx.fillStyle = th.accent;
    font(ctx, 46, 700);
    ctx.fillText(f.grade || '', W / 2, tEnd + 80);
    /* اسم التلميذ */
    ctx.fillStyle = th.ink;
    font(ctx, 44, 600);
    ctx.fillText('اسم التلميذ(ة)', W / 2, tEnd + 210);
    font(ctx, 52, 700);
    ctx.fillText(f.name || '........................................', W / 2, tEnd + 300);
    /* الهدف */
    if (f.goal) {
      ctx.fillStyle = th.soft;
      roundRect(ctx, 130, tEnd + 380, W - 260, 330, 30); ctx.fill();
      ctx.strokeStyle = th.accent; ctx.lineWidth = 3;
      roundRect(ctx, 130, tEnd + 380, W - 260, 330, 30); ctx.stroke();
      ctx.fillStyle = th.muted;
      font(ctx, 36, 800);
      ctx.textAlign = 'center';
      ctx.fillText('هدف هذه الورقة', W / 2, tEnd + 445);
      ctx.fillStyle = th.ink;
      font(ctx, 40, 600);
      wrapText(ctx, f.goal, W / 2, tEnd + 520, W - 340, 60, 3);
    }
    footer(ctx, W, H, th, f, null);
  }

  var DRAW = { cert: drawCert, poster: drawPoster, term: drawTerm, qcard: drawQCard, cover: drawCover };

  /* ---------- الحالة ---------- */
  var cur = null;
  var COMMON = [
    { k: 'teacher', l: 'اسم المعلم(ة)' },
    { k: 'school',  l: 'المدرسة' }
  ];

  function defaults(tplKey) {
    var prof = Store.get('profile', {}) || {};
    var f = { teacher: prof.name || '', school: prof.school || '' };
    TPLS[tplKey].f.forEach(function (fd) { f[fd.k] = ''; });
    return { id: null, tpl: tplKey, theme: 'classic', f: f };
  }
  function persist() { Store.set('designCur', cur); }

  function drawPreview() {
    var cv = $('#dsCanvas'); if (!cv) return;
    var tpl = TPLS[cur.tpl], th = THEMES[cur.theme] || THEMES.classic;
    var prof = Store.get('profile', {}) || {};
    var size = PAGE[tpl.orient];
    if (cv.width !== size[0]) { cv.width = size[0]; cv.height = size[1]; }
    var ctx = cv.getContext('2d');
    ctx.save();
    ctx.direction = 'rtl';
    DRAW[cur.tpl](ctx, size[0], size[1], cur.f, th, prof);
    ctx.restore();
  }

  /* ---------- الحفظ ---------- */
  function designs() { return Store.get('designs', []) || []; }
  function setDesigns(v) { return Store.set('designs', v); }
  function titleOf(d) {
    var first = '';
    var t = TPLS[d.tpl];
    if (t && t.f.length) first = d.f[t.f[0].k] || '';
    return (first || t.t).split('\n')[0].slice(0, 40);
  }
  function saveCurrent() {
    var list = designs();
    var at = new Date().toISOString();
    if (cur.id) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === cur.id) {
          list[i] = { id: cur.id, tpl: cur.tpl, theme: cur.theme, f: cur.f, at: at };
          var r1 = setDesigns(list);
          notify(r1.ok ? 'حُفظ التعديل ✓' : r1.error, r1.ok ? 'ok' : 'err');
          renderSaved(); return;
        }
      }
    }
    var d = { id: Store.uid(), tpl: cur.tpl, theme: cur.theme, f: cur.f, at: at };
    list.unshift(d);
    cur.id = d.id;
    var r = setDesigns(list);
    notify(r.ok ? 'حُفظ التصميم ✓ (تجديده في القائمة أدناه)' : r.error, r.ok ? 'ok' : 'err');
    renderSaved();
  }

  function exportPNG() {
    var cv = $('#dsCanvas'); if (!cv) return;
    var name = 'تصميم-' + TPLS[cur.tpl].t.replace(/\s+/g, '-') + '-' + UI.todayISO() + '.png';
    if (cv.toBlob) {
      cv.toBlob(function (blob) {
        if (!blob) { notify('تعذّر إنشاء الصورة في هذا المتصفح', 'err'); return; }
        UI.download(name, blob);
        notify('بدأ تنزيل الصورة (PNG بدقة الطباعة) ✓', 'ok');
      }, 'image/png');
    } else {
      var a = document.createElement('a');
      a.href = cv.toDataURL('image/png'); a.download = name; a.click();
      notify('بدأ تنزيل الصورة ✓', 'ok');
    }
  }

  function printDesign() {
    var cv = $('#dsCanvas'); if (!cv) return;
    UI.print('<div style="text-align:center"><img src="' + cv.toDataURL('image/png') +
      '" style="max-width:100%;max-height:96vh"></div>');
  }

  /* ---------- عرض الصفحة ---------- */
  function fieldsHTML() {
    var t = TPLS[cur.tpl], out = '';
    COMMON.concat(t.f).forEach(function (fd) {
      out += '<div class="field" style="grid-column:span ' + (fd.area ? 2 : 1) + '">' +
        '<label for="dsf-' + fd.k + '">' + esc(fd.l) + '</label>' +
        (fd.area
          ? '<textarea id="dsf-' + fd.k + '" rows="3">' + esc(cur.f[fd.k]) + '</textarea>'
          : '<input type="text" id="dsf-' + fd.k + '" value="' + esc(cur.f[fd.k]) + '">') +
        '</div>';
    });
    return out;
  }

  function tplOptions() {
    var out = '';
    Object.keys(TPLS).forEach(function (k) {
      out += '<option value="' + k + '"' + (k === cur.tpl ? ' selected' : '') + '>' + esc(TPLS[k].t) + '</option>';
    });
    return out;
  }
  function themeOptions() {
    var out = '';
    Object.keys(THEMES).forEach(function (k) {
      out += '<option value="' + k + '"' + (k === cur.theme ? ' selected' : '') + '>' + esc(THEMES[k].name) + '</option>';
    });
    return out;
  }

  function bindFields() {
    var t = TPLS[cur.tpl];
    COMMON.concat(t.f).forEach(function (fd) {
      var el = $('#dsf-' + fd.k);
      if (!el) return;
      el.addEventListener('input', function () {
        cur.f[fd.k] = el.value;
        persist();
        drawPreview();
      });
    });
  }

  function renderSaved() {
    var wrap = $('#dsSaved'); if (!wrap) return;
    var list = designs();
    if (!list.length) {
      wrap.innerHTML = '<p class="mini" style="margin:0">لا توجد تصاميم محفوظة بعد — احفظي تصميمك الأول ليظهر هنا.</p>';
      return;
    }
    wrap.innerHTML = list.map(function (d) {
      var t = TPLS[d.tpl] || { t: 'تصميم' };
      return '<div class="task" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
        '<b style="flex:1;min-width:180px">' + esc(titleOf(d)) + '</b>' +
        '<span class="badge wait">' + esc(t.t) + '</span>' +
        '<span class="mini">' + esc((d.at || '').slice(0, 10)) + '</span>' +
        '<button class="btn btn-soft btn-sm" data-open="' + d.id + '">📂 فتح</button>' +
        '<button class="btn btn-danger btn-sm" data-del="' + d.id + '">🗑️ حذف</button>' +
        '</div>';
    }).join('');

    $$('#dsSaved [data-open]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-open');
        var list2 = designs();
        for (var i = 0; i < list2.length; i++) {
          if (list2[i].id === id) {
            cur = { id: id, tpl: list2[i].tpl, theme: list2[i].theme, f: list2[i].f };
            persist();
            renderEditor();
            notify('فُتح التصميم — عدّليه ثم احفظي');
            return;
          }
        }
      };
    });
    $$('#dsSaved [data-del]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-del');
        UI.confirm('حذف هذا التصميم نهائيًا من متصفحكِ؟').then(function (yes) {
          if (!yes) return;
          setDesigns(designs().filter(function (x) { return x.id !== id; }));
          if (cur.id === id) cur.id = null;
          renderSaved();
          notify('حُذف التصميم');
        });
      };
    });
  }

  function renderEditor() {
    $('#dsTpl').value = cur.tpl;
    $('#dsTheme').value = cur.theme;
    $('#dsFields').innerHTML = fieldsHTML();
    $('#dsOrient').textContent = TPLS[cur.tpl].orient === 'land' ? 'A4 أفقي' : 'A4 عمودي';
    bindFields();
    drawPreview();
  }

  function render(main) {
    var last = Store.get('designCur', null);
    if (last && TPLS[last.tpl]) {
      cur = last;
      if (!THEMES[cur.theme]) cur.theme = 'classic';
      if (!cur.f) cur.f = {};
    } else cur = defaults('cert');
    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
        '<span class="mh-ic" aria-hidden="true">🎨</span>' +
        '<div style="flex:1;min-width:220px"><h2>استوديو التصميم التعليمي</h2>' +
        '<p>صمّمي شهادات وملصقات وبطاقات وأغلفة على مقاس A4 بالعربية، وصدّريها صورةً عالية الدقة أو اطبعيها مباشرة. كل الرسم يجري في متصفحكِ.</p></div>' +
        '<span class="badge ok">جاهز الآن</span></div></div>' +

      '<section class="card"><h3>🎨 ابدئي بالقالب والهوية</h3>' +
        '<div class="g2" style="align-items:end">' +
          '<div class="field"><label for="dsTpl">القالب</label><select id="dsTpl">' + tplOptions() + '</select></div>' +
          '<div class="field"><label for="dsTheme">الهوية اللونية</label><select id="dsTheme">' + themeOptions() + '</select></div>' +
        '</div>' +
        '<h3 style="margin-top:16px">✏️ محتوى التصميم <span class="mini" id="dsOrient"></span></h3>' +
        '<div class="g2" id="dsFields"></div>' +
        '<p class="mini">حقلا «اسم المعلم(ة)» و«المدرسة» يملآن تلقائيًا من <a href="#/basics">البيانات الأساسية</a>، ويمكن تعديلهما هنا في أي تصميم. وما تكتبينه في النموذج يبقى محفوظًا حتى بعد إغلاق المتصفح.</p>' +
      '</section>' +

      '<section class="card"><h3>👁️ المعاينة الحية</h3>' +
        '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r2);padding:14px;text-align:center">' +
          '<canvas id="dsCanvas" style="max-width:100%;height:auto;box-shadow:var(--shadow);border-radius:6px" ' +
          'aria-label="معاينة التصميم"></canvas>' +
        '</div>' +
        '<div class="btn-row" style="margin-top:12px">' +
          '<button class="btn btn-primary" id="dsSave">💾 حفظ التصميم</button>' +
          '<button class="btn btn-navy" id="dsPrint">🖨️ طباعة A4</button>' +
          '<button class="btn btn-gold" id="dsPng">🖼️ تنزيل صورة PNG</button>' +
        '</div>' +
        '<p class="mini">الطباعة: في نافذة الطباعة اختاري «حفظ بصيغة PDF» إن أردتِ ملفًا. الصورة بدقة طباعة (~150 نقطة/بوصة).</p>' +
      '</section>' +

      '<section class="card"><h3>🗂️ تصاميمكِ المحفوظة (في متصفحكِ فقط)</h3><div id="dsSaved"></div></section>';

    $('#dsTpl').addEventListener('change', function () {
      var oldF = cur.f, oldTpl = cur.tpl;
      cur = defaults(this.value);
      /* نقل ما يتطابق من الحقول القديمة */
      Object.keys(cur.f).forEach(function (k) { if (oldF[k] !== undefined) cur.f[k] = oldF[k]; });
      void oldTpl;
      persist();
      renderEditor();
    });
    $('#dsTheme').addEventListener('change', function () { cur.theme = this.value; persist(); drawPreview(); });
    $('#dsSave').onclick = saveCurrent;
    $('#dsPng').onclick = exportPNG;
    $('#dsPrint').onclick = printDesign;

    renderEditor();
    renderSaved();
  }

  App.register('design', render);
})(window);
