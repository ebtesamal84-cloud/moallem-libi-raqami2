/* =========================================================
   lab.js — مختبر الرياضيات والعلوم
   رسم الدوال f(x) على محورين حقيقيين + جدول قيم محسوب
   + حاسبة هندسية موثّقة الحساب + بحث GeoGebra.
   كل النتائج محسوبة آليًا عبر LabMath — لا تخمين ولا نتائج وهمية.
   ========================================================= */
(function (global) {
  'use strict';
  var App = global.App;
  if (!App) { console.error('lab.js: App غير متاح'); return; }
  var UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, notify = UI.notify;
  var LM = global.LabMath;

  var COLORS = ['#123A6B', '#12B5AC', '#C9A227', '#C6382F'];
  var MAXF = 4;

  function labState() {
    var s = Store.get('lab', null);
    if (!s || !(s.exprs instanceof Array) || !s.exprs.length) s = { exprs: ['x^2'], a: -10, b: 10 };
    if (typeof s.a !== 'number') s.a = -10;
    if (typeof s.b !== 'number') s.b = 10;
    return s;
  }
  function saveLab(s) { Store.set('lab', s); }

  function niceStep(range, target) {
    var raw = range / target;
    if (!(raw > 0)) return 1;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag, step;
    if (norm < 1.5) step = 1; else if (norm < 3.5) step = 2;
    else if (norm < 7.5) step = 5; else step = 10;
    return step * mag;
  }
  function fnum(v) {
    if (!isFinite(v)) return '—';
    var r = Math.round(v * 10000) / 10000;
    return String(r);
  }

  /* ---------------- رسم الدوال ---------------- */
  function compileAll() {
    var st = labState(), fns = [], errs = [];
    st.exprs.forEach(function (e, i) {
      if (!String(e).replace(/\s/g, '')) return;
      try {
        var c = LM.compile(e);
        fns.push({ f: c.fn, color: COLORS[i % COLORS.length], e: String(e) });
      } catch (ex) {
        errs.push('الدالة ' + (i + 1) + ' «' + e + '»: ' + ex.message);
      }
    });
    return { fns: fns, errs: errs, st: st };
  }

  function drawPlot() {
    var cv = $('#lbCanvas');
    var errBox = $('#lbPlotErr');
    if (!cv) return;
    var W = 980, H = 620;
    if (cv.width !== W) { cv.width = W; cv.height = H; }
    var ctx = cv.getContext('2d');
    var res = compileAll(), fns = res.fns, st = res.st;
    var a = st.a, b = st.b;

    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    var msgs = res.errs.slice();
    if (!(b > a)) {
      msgs.push('نطاق x غير صحيح: بداية النطاق يجب أن تكون أصغر من نهايته.');
      errBox.innerHTML = msgs.map(function (m) { return '<div class="lock-err" style="margin:4px 0">⚠️ ' + esc(m) + '</div>'; }).join('');
      return;
    }
    if (!fns.length) {
      errBox.innerHTML = '<div class="mini">اكتبي دالة واحدة على الأقل مثل: <b>x^2</b> أو <b>sin(x)</b> ثم اضغطي «رسم».</div>';
      return;
    }

    /* مدى y من العينات */
    var yMin = Infinity, yMax = -Infinity, j, yv, N = 500, i;
    for (i = 0; i < fns.length; i++) {
      for (j = 0; j <= N; j++) {
        try { yv = fns[i].f(a + (b - a) * j / N); } catch (e2) { continue; }
        if (typeof yv !== 'number' || !isFinite(yv)) continue;
        if (yv < -1e5 || yv > 1e5) continue;
        if (yv < yMin) yMin = yv;
        if (yv > yMax) yMax = yv;
      }
    }
    if (yMin === Infinity) { yMin = -10; yMax = 10; }
    var span = yMax - yMin;
    if (span < 1e-6) { yMin -= 5; yMax += 5; span = 10; }
    var padY = span * 0.08; yMin -= padY; yMax += padY; span = yMax - yMin;

    var mL = 74, mR = 26, mT = 26, mB = 52;
    var pw = W - mL - mR, ph = H - mT - mB;
    function X(x) { return mL + (x - a) / (b - a) * pw; }
    function Y(y) { return mT + (1 - (y - yMin) / span) * ph; }

    /* الشبكة */
    var stepX = niceStep(b - a, 10), stepY = niceStep(span, 8), gx, gy;
    ctx.strokeStyle = '#E3EAF3'; ctx.lineWidth = 1;
    ctx.fillStyle = '#5C6E86'; ctx.font = '600 13px Tahoma, Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (gx = Math.ceil(a / stepX) * stepX; gx <= b + 1e-9; gx += stepX) {
      ctx.beginPath(); ctx.moveTo(X(gx), mT); ctx.lineTo(X(gx), mT + ph); ctx.stroke();
      if (Math.abs(gx) > 1e-9) ctx.fillText(fnum(gx), X(gx), mT + ph + 8);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (gy = Math.ceil(yMin / stepY) * stepY; gy <= yMax + 1e-9; gy += stepY) {
      ctx.beginPath(); ctx.moveTo(mL, Y(gy)); ctx.lineTo(mL + pw, Y(gy)); ctx.stroke();
      if (Math.abs(gy) > 1e-9) ctx.fillText(fnum(gy), mL - 8, Y(gy));
    }

    /* المحاور */
    ctx.strokeStyle = '#12253F'; ctx.lineWidth = 2;
    var y0 = (yMin <= 0 && yMax >= 0) ? Y(0) : null;
    var x0 = (a <= 0 && b >= 0) ? X(0) : null;
    if (y0 !== null) { ctx.beginPath(); ctx.moveTo(mL, y0); ctx.lineTo(mL + pw, y0); ctx.stroke(); }
    if (x0 !== null) { ctx.beginPath(); ctx.moveTo(x0, mT); ctx.lineTo(x0, mT + ph); ctx.stroke(); }
    ctx.fillStyle = '#12253F'; ctx.font = '700 16px Tahoma, Arial, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('x', mL + pw - 6, (y0 !== null ? y0 : mT + ph) - 8);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('y', (x0 !== null ? x0 : mL) + 14, mT + 8);
    if (x0 !== null && y0 !== null) { ctx.textAlign = 'right'; ctx.fillText('O', x0 - 6, y0 + 12); }

    /* المنحنيات */
    fns.forEach(function (fn) {
      ctx.strokeStyle = fn.color; ctx.lineWidth = 2.6;
      ctx.beginPath();
      var started = false, px, xv, y2, py;
      for (px = 0; px <= pw; px += 2) {
        xv = a + (px / pw) * (b - a);
        try { y2 = fn.f(xv); } catch (e3) { y2 = NaN; }
        if (typeof y2 !== 'number' || !isFinite(y2) || Math.abs(y2) > 1e7) { started = false; continue; }
        if (y2 < yMin - span) y2 = yMin - span;
        if (y2 > yMax + span) y2 = yMax + span;
        py = Y(y2);
        if (!started) { ctx.moveTo(px + mL, py); started = true; }
        else ctx.lineTo(px + mL, py);
      }
      ctx.stroke();
    });

    /* مفتاح المنحنيات */
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    var ly = mT + 16;
    fns.forEach(function (fn) {
      ctx.fillStyle = fn.color;
      roundRectC(ctx, mL + pw - 250, ly - 9, 20, 18, 5); ctx.fill();
      ctx.fillStyle = '#12253F'; ctx.font = '600 15px Tahoma, Arial, sans-serif';
      ctx.fillText('f(x) = ' + fn.e, mL + pw - 258, ly);
      ly += 30;
    });

    if (msgs.length) {
      errBox.innerHTML = msgs.map(function (m) { return '<div class="lock-err" style="margin:4px 0">⚠️ ' + esc(m) + '</div>'; }).join('');
    } else {
      errBox.innerHTML = '<div class="mini" style="margin:4px 0">المنحنى محسوب من صيغتكِ فعلًا عبر تحليل رياضي موثّق — مدى y تلقائي من ' +
        fnum(yMin) + ' إلى ' + fnum(yMax) + '.</div>';
    }
    buildTable(fns);
  }

  function roundRectC(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function tableHTML() {
    var res = compileAll(), fns = res.fns, st = res.st;
    if (!fns.length || !(st.b > st.a)) return '';
    var rows = '', n = 20, i, j, x, cells;
    for (i = 0; i <= n; i++) {
      x = st.a + (st.b - st.a) * i / n;
      cells = '';
      for (j = 0; j < fns.length; j++) {
        var y;
        try { y = fns[j].f(x); } catch (e) { y = NaN; }
        cells += '<td>' + esc(fnum(y)) + '</td>';
      }
      rows += '<tr><td>' + esc(fnum(Math.round(x * 10000) / 10000)) + '</td>' + cells + '</tr>';
    }
    return '<table class="tbl"><thead><tr><th>x</th>' +
      fns.map(function (fn) { return '<th>y = ' + esc(fn.e) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  }
  function buildTable() { $('#lbTableWrap').innerHTML = tableHTML(); }

  /* ---------------- الحساب الهندسي ---------------- */
  var SHAPES = {
    circle: {
      name: 'دائرة',
      inputs: [{ k: 'r', l: 'نصف القطر (سم)' }],
      calc: function (v) {
        var r = num(v.r, 'نصف القطر');
        return {
          rows: [['المساحة', fnum(Math.PI * r * r) + ' سم²'], ['المحيط', fnum(2 * Math.PI * r) + ' سم']],
          steps: ['المساحة = π × نق² = 3.14159 × ' + r + '² = ' + fnum(Math.PI * r * r),
                  'المحيط = 2 × π × نق = 2 × 3.14159 × ' + r + ' = ' + fnum(2 * Math.PI * r)]
        };
      }
    },
    rect: {
      name: 'مستطيل',
      inputs: [{ k: 'w', l: 'العرض (سم)' }, { k: 'h', l: 'الطول (سم)' }],
      calc: function (v) {
        var w = num(v.w, 'العرض'), h = num(v.h, 'الطول');
        return {
          rows: [['المساحة', fnum(w * h) + ' سم²'], ['المحيط', fnum(2 * (w + h)) + ' سم']],
          steps: ['المساحة = ع × ط = ' + w + ' × ' + h + ' = ' + fnum(w * h),
                  'المحيط = 2 × (ع + ط) = 2 × ' + fnum(w + h) + ' = ' + fnum(2 * (w + h))]
        };
      }
    },
    triangle: {
      name: 'مثلث (بأضلاعه الثلاثة)',
      inputs: [{ k: 'a', l: 'الضلع الأول (سم)' }, { k: 'b', l: 'الضلع الثاني (سم)' }, { k: 'c', l: 'الضلع الثالث (سم)' }],
      calc: function (v) {
        var a = num(v.a, 'الضلع الأول'), b = num(v.b, 'الضلع الثاني'), c = num(v.c, 'الضلع الثالث');
        if (a + b <= c || a + c <= b || b + c <= a) throw new Error('الأطوال لا تكوّن مثلثًا (يجب أن يكون مجموع أي ضلعين أكبر من الثالث).');
        var s = (a + b + c) / 2;
        var area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
        return {
          rows: [['المحيط', fnum(a + b + c) + ' سم'], ['المساحة (قانون هيرون)', fnum(area) + ' سم²']],
          steps: ['نصف المحيط s = (' + a + ' + ' + b + ' + ' + c + ') ÷ 2 = ' + fnum(s),
                  'المساحة = √(s(s−a)(s−b)(s−c)) = √(' + fnum(s * (s - a) * (s - b) * (s - c)) + ') = ' + fnum(area),
                  'المحيط = ' + a + ' + ' + b + ' + ' + c + ' = ' + fnum(a + b + c)]
        };
      }
    },
    parallelogram: {
      name: 'متوازي أضلاع',
      inputs: [{ k: 'b', l: 'القاعدة (سم)' }, { k: 'c', l: 'الجانب المائل (سم)' }, { k: 'h', l: 'الارتفاع (سم)' }],
      calc: function (v) {
        var b = num(v.b, 'القاعدة'), c = num(v.c, 'الجانب'), h = num(v.h, 'الارتفاع');
        return {
          rows: [['المساحة', fnum(b * h) + ' سم²'], ['المحيط', fnum(2 * (b + c)) + ' سم']],
          steps: ['المساحة = القاعدة × الارتفاع = ' + b + ' × ' + h + ' = ' + fnum(b * h),
                  'المحيط = 2 × (القاعدة + الجانب) = 2 × ' + fnum(b + c) + ' = ' + fnum(2 * (b + c))]
        };
      }
    }
  };
  function num(v, label) {
    var n = parseFloat(v);
    if (isNaN(n)) throw new Error('أدخلي رقمًا صحيحًا في حقل «' + label + '».');
    if (n <= 0) throw new Error('قيمة «' + label + '» يجب أن تكون موجبة.');
    return n;
  }

  function geoState() { return Store.get('labGeo', { shape: 'circle', v: {} }) || { shape: 'circle', v: {} }; }

  function drawShapeFigure(v) {
    var cv = $('#lbGeoCanvas');
    if (!cv) return;
    var W = 420, H = 320;
    if (cv.width !== W) { cv.width = W; cv.height = H; }
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#123A6B'; ctx.lineWidth = 3; ctx.fillStyle = '#12253F';
    ctx.font = '700 18px Tahoma, Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var sh = geoState().shape;
    if (sh === 'circle') {
      var r = Math.min(110, (parseFloat(v.r) || 1) * 8);
      ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W / 2, H / 2); ctx.lineTo(W / 2 + r, H / 2); ctx.stroke();
      ctx.fillText('نق = ' + (v.r || '?'), W / 2 + r / 2, H / 2 - 18);
    } else if (sh === 'rect') {
      var w = 240, h = 160;
      ctx.strokeRect((W - w) / 2, (H - h) / 2, w, h);
      ctx.fillText('ع = ' + (v.w || '?'), W / 2, H - 60 + 26);
      ctx.save(); ctx.translate((W - w) / 2 - 22, H / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('ط = ' + (v.h || '?'), 0, 0); ctx.restore();
    } else if (sh === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(90, 250); ctx.lineTo(330, 250); ctx.lineTo(210, 70); ctx.closePath(); ctx.stroke();
      ctx.fillText('ج = ' + (v.c || '?'), 210, 272);
      ctx.fillText('ب = ' + (v.b || '?'), 285, 180);
      ctx.fillText('أ = ' + (v.a || '?'), 138, 180);
    } else if (sh === 'parallelogram') {
      ctx.beginPath();
      ctx.moveTo(110, 250); ctx.lineTo(330, 250); ctx.lineTo(280, 80); ctx.lineTo(60, 80); ctx.closePath(); ctx.stroke();
      ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.moveTo(110, 80); ctx.lineTo(110, 250); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText('ق = ' + (v.b || '?'), 220, 272);
      ctx.fillText('جـ = ' + (v.c || '?'), 300, 170);
      ctx.fillText('هـ = ' + (v.h || '?'), 88, 168);
    }
  }

  function renderGeo() {
    var g = geoState();
    if (!SHAPES[g.shape]) g.shape = 'circle';
    var sh = SHAPES[g.shape];
    var opts = Object.keys(SHAPES).map(function (k) {
      return '<option value="' + k + '"' + (k === g.shape ? ' selected' : '') + '>' + esc(SHAPES[k].name) + '</option>';
    }).join('');
    var inputs = sh.inputs.map(function (fd) {
      return '<div class="field"><label for="geo-' + fd.k + '">' + esc(fd.l) + '</label>' +
        '<input type="number" step="any" min="0" id="geo-' + fd.k + '" value="' + esc(g.v[fd.k] || '') + '"></div>';
    }).join('');
    $('#lbGeoBox').innerHTML =
      '<div class="field" style="max-width:340px"><label for="geoShape">الشكل</label>' +
      '<select id="geoShape">' + opts + '</select></div>' +
      '<div class="g3" style="max-width:640px">' + inputs + '</div>' +
      '<div id="lbGeoOut"></div>' +
      '<div style="text-align:center;margin-top:10px"><canvas id="lbGeoCanvas" style="max-width:100%;border:1px solid var(--border);border-radius:8px"></canvas></div>';

    $('#geoShape').addEventListener('change', function () {
      Store.set('labGeo', { shape: this.value, v: {} });
      renderGeo();
    });
    sh.inputs.forEach(function (fd) {
      var el = $('#geo-' + fd.k);
      el.addEventListener('input', function () {
        var g2 = geoState(); g2.v[fd.k] = el.value; Store.set('labGeo', g2);
        calcGeo();
      });
    });
    calcGeo();
  }

  function calcGeo() {
    var g = geoState(), sh = SHAPES[g.shape], out = $('#lbGeoOut');
    try {
      var r = sh.calc(g.v || {});
      out.innerHTML =
        '<div class="notice ok" style="margin-top:12px"><b>النتيجة المحسوبة:</b><br>' +
        r.rows.map(function (row) { return row[0] + ' = <b>' + esc(row[1]) + '</b>'; }).join(' · ') +
        '</div>' +
        '<section class="card" style="margin-top:10px"><h3>خطوات الحساب (محسوبة آليًا)</h3>' +
        r.steps.map(function (s) { return '<div class="feat"><span class="f-c" aria-hidden="true">▸</span><span>' + esc(s) + '</span></div>'; }).join('') +
        '</section>';
      drawShapeFigure(g.v || {});
      window.__lbGeoPrint = { rows: r.rows, steps: r.steps, name: sh.name };
    } catch (e) {
      out.innerHTML = '<div class="notice warn" style="margin-top:12px">' + esc(e.message) + '</div>';
      drawShapeFigure({});
      window.__lbGeoPrint = null;
    }
  }

  /* ---------------- التصدير ---------------- */
  function exportPNG() {
    var cv = $('#lbCanvas'); if (!cv) return;
    cv.toBlob(function (blob) {
      if (!blob) { notify('تعذّر إنشاء الصورة', 'err'); return; }
      UI.download('رسم-دوال-' + UI.todayISO() + '.png', blob);
      notify('بدأ تنزيل رسم الدوال ✓', 'ok');
    }, 'image/png');
  }
  function printPlot() {
    var cv = $('#lbCanvas'); if (!cv) return;
    UI.print('<h2 style="font-family:Tahoma">رسم دوال — المختبر الرياضي</h2>' +
      '<img src="' + cv.toDataURL('image/png') + '" style="max-width:100%">' +
      UI.prSec('جدول القيم') + tableHTML());
  }
  function printGeo() {
    var gp = window.__lbGeoPrint;
    var cv = $('#lbGeoCanvas');
    if (!gp || !cv) { notify('أكملي بيانات الشكل أولًا', 'err'); return; }
    UI.print('<h2 style="font-family:Tahoma">' + esc(gp.name) + ' — مختبر الرياضيات</h2>' +
      '<img src="' + cv.toDataURL('image/png') + '" style="max-width:360px">' +
      UI.prTable(['العنوان', 'القيمة'], gp.rows) +
      UI.prSec('خطوات الحساب') + UI.prBullets(gp.steps));
  }

  /* ---------------- الصفحة ---------------- */
  function exprsHTML() {
    var st = labState();
    return st.exprs.map(function (e, i) {
      return '<div class="field" style="display:flex;gap:8px;align-items:flex-end;margin-bottom:8px">' +
        '<span style="width:16px;height:16px;border-radius:4px;background:' + COLORS[i % COLORS.length] + ';flex:none;margin-bottom:8px"></span>' +
        '<div style="flex:1"><label for="lbe-' + i + '">الدالة ' + (i + 1) + ' (بالمتغير x)</label>' +
        '<input type="text" id="lbe-' + i + '" class="lb-e" data-i="' + i + '" value="' + esc(e) + '" placeholder="مثال: x^2 - 4 أو sin(x) أو 1/x"></div>' +
        (st.exprs.length > 1 ? '<button class="btn btn-danger btn-sm lb-del" data-i="' + i + '" aria-label="حذف الدالة">✕</button>' : '') +
        '</div>';
    }).join('');
  }

  function render(main) {
    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
        '<span class="mh-ic" aria-hidden="true">🔬</span>' +
        '<div style="flex:1;min-width:220px"><h2>مختبر الرياضيات والعلوم</h2>' +
        '<p>ارسمي أي دالة f(x) على محورين حقيقيين بتحليل رياضي موثّق، واحسبي قيمها جدوليًا، واحسبي المساحات والمحيطات بخطوات ظاهرة.</p></div>' +
        '<span class="badge ok">جاهز الآن</span></div></div>' +

      '<div class="tabs" id="lbTabs" role="tablist">' +
        '<button class="active" id="lbTab1" role="tab" aria-selected="true">📈 رسم الدوال f(x)</button>' +
        '<button id="lbTab2" role="tab" aria-selected="false">📐 الحاسبة الهندسية</button>' +
      '</div>' +

      '<section class="card" id="lbPlotCard">' +
        '<h3>📈 الدوال (حتى 4 دوال معًا)</h3>' +
        '<div id="lbExprs"></div>' +
        '<div class="btn-row"><button class="btn btn-soft" id="lbAdd">➕ إضافة دالة</button></div>' +
        '<div class="g2" style="max-width:420px;margin-top:10px">' +
          '<div class="field"><label for="lbA">نطاق x من</label><input type="number" step="any" id="lbA"></div>' +
          '<div class="field"><label for="lbB">إلى</label><input type="number" step="any" id="lbB"></div>' +
        '</div>' +
        '<div class="btn-row">' +
          '<button class="btn btn-primary" id="lbDraw">📉 رسم</button>' +
          '<button class="btn btn-navy" id="lbPrint">🖨️ طباعة</button>' +
          '<button class="btn btn-gold" id="lbPng">🖼️ تنزيل PNG</button>' +
        '</div>' +
        '<div id="lbPlotErr" style="margin-top:8px"></div>' +
        '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r2);padding:10px;margin-top:10px">' +
          '<canvas id="lbCanvas" style="max-width:100%;height:auto" aria-label="رسم الدوال"></canvas>' +
        '</div>' +
        '<h3 style="margin-top:16px">📊 جدول القيم (21 قيمة محسوبة)</h3>' +
        '<div id="lbTableWrap" class="tbl-wrap"></div>' +
        '<h3 style="margin-top:16px">🌍 بحث GeoGebra</h3>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<input type="text" id="lbGeoQ" placeholder="اكتبي المفهوم مثل: النسبة والتناسب" style="flex:1;min-width:220px;padding:9px 12px;border:1px solid var(--border);border-radius:10px">' +
          '<button class="btn btn-soft" id="lbGeoBtn">🔍 البحث في GeoGebra</button>' +
        '</div>' +
        '<p class="mini">يفتح موقع GeoGebra الرسمي في تبويب جديد — لا يُرسل شيء من بياناتك.</p>' +
      '</section>' +

      '<section class="card hidden" id="lbGeoCard">' +
        '<h3>📐 احسبي المساحة والمحيط بخطوات ظاهرة</h3>' +
        '<p class="mini">كل الأرقام هنا محسوبة آليًا من إدخالاتكِ — والخطوات مطبوعة كما حُسبت فعلًا.</p>' +
        '<div id="lbGeoBox"></div>' +
        '<div class="btn-row"><button class="btn btn-navy" id="lbGeoPrint">🖨️ طباعة</button></div>' +
      '</section>';

    /* التبويبات */
    function showTab(n) {
      var t1 = n === 1;
      $('#lbPlotCard').classList.toggle('hidden', !t1);
      $('#lbGeoCard').classList.toggle('hidden', t1);
      $('#lbTab1').classList.toggle('active', t1);
      $('#lbTab2').classList.toggle('active', !t1);
      $('#lbTab1').setAttribute('aria-selected', t1 ? 'true' : 'false');
      $('#lbTab2').setAttribute('aria-selected', t1 ? 'false' : 'true');
      if (!t1) calcGeo();
    }
    $('#lbTab1').onclick = function () { showTab(1); };
    $('#lbTab2').onclick = function () { showTab(2); };

    /* تعبئة الحقول */
    function refreshExprs() {
      $('#lbExprs').innerHTML = exprsHTML();
      $$('.lb-e').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var st = labState();
          st.exprs[parseInt(inp.getAttribute('data-i'), 10)] = inp.value;
          saveLab(st);
        });
      });
      $$('.lb-del').forEach(function (b) {
        b.onclick = function () {
          var st = labState();
          st.exprs.splice(parseInt(b.getAttribute('data-i'), 10), 1);
          saveLab(st);
          refreshExprs(); drawPlot();
        };
      });
    }
    refreshExprs();
    var st0 = labState();
    $('#lbA').value = st0.a;
    $('#lbB').value = st0.b;
    $('#lbA').addEventListener('change', function () {
      var s = labState(); var v = parseFloat(this.value);
      if (!isNaN(v)) { s.a = v; saveLab(s); drawPlot(); }
    });
    $('#lbB').addEventListener('change', function () {
      var s = labState(); var v = parseFloat(this.value);
      if (!isNaN(v)) { s.b = v; saveLab(s); drawPlot(); }
    });
    $('#lbAdd').onclick = function () {
      var s = labState();
      if (s.exprs.length >= MAXF) { notify('الحد الأقصى ' + MAXF + ' دوال في اللوحة الواحدة', 'err'); return; }
      s.exprs.push('');
      saveLab(s);
      refreshExprs();
      var inputs = $$('.lb-e');
      if (inputs.length) inputs[inputs.length - 1].focus();
    };
    $('#lbDraw').onclick = drawPlot;
    $('#lbPng').onclick = exportPNG;
    $('#lbPrint').onclick = printPlot;
    $('#lbGeoPrint').onclick = printGeo;
    $('#lbGeoBtn').onclick = function () {
      var q = $('#lbGeoQ').value.replace(/^\s+|\s+$/g, '');
      if (!q) { notify('اكتبي مفهومًا للبحث أولًا', 'err'); return; }
      window.open('https://www.geogebra.org/search/' + encodeURIComponent(q), '_blank', 'noopener');
    };

    renderGeo();
    drawPlot();
  }

  App.register('lab', render);
})(window);
