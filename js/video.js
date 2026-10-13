/* =========================================================
   video.js — استوديو الفيديو التعليمي
   حزمة إنتاج حقيقية: مشاهد (وصف بصري + نص منطوق + مدة)
   مع حسابات فعلية للمدة وسرعة الكلام، ونص سيناريو كامل
   جاهز للنسخ/التنزيل/الطباعة. لا زر «إنشاء فيديو» وهمي.
   ========================================================= */
(function (global) {
  'use strict';
  var App = global.App;
  if (!App) { console.error('video.js: App غير متاح'); return; }
  var UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, notify = UI.notify;

  /* ---------------- التخزين ---------------- */
  function state() {
    var s = Store.get('video', null);
    if (!s || !(s.projects instanceof Array)) s = { projects: [], last: null };
    return s;
  }
  function save(s) { Store.set('video', s); }
  function curProj() {
    var s = state();
    for (var i = 0; i < s.projects.length; i++) if (s.projects[i].id === s.last) return s.projects[i];
    return null;
  }
  function findProj(id) {
    var s = state();
    for (var i = 0; i < s.projects.length; i++) if (s.projects[i].id === id) return s.projects[i];
    return null;
  }

  /* ---------------- حسابات فعلية ---------------- */
  function words(text) {
    var t = String(text || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    return t ? t.split(' ').length : 0;
  }
  function stats(p) {
    var totalSec = 0, totalWords = 0;
    p.scenes.forEach(function (sc) {
      var d = parseFloat(sc.dur);
      if (!isNaN(d) && d > 0) totalSec += d;
      totalWords += words(sc.narration);
    });
    var targetSec = (parseFloat(p.target) || 0) * 60;
    var wpm = totalSec > 0 ? Math.round(totalWords / (totalSec / 60)) : 0;
    var verdict;
    if (!p.scenes.length) verdict = { cls: 'warn', txt: 'أضيفي مشهدًا واحدًا على الأقل لنبدأ الحساب.' };
    else if (!targetSec) verdict = { cls: 'ok', txt: 'حدّدي المدة المستهدفة (بالدقائق) لأقارنها بالمحتوى الفعلي.' };
    else if (totalSec > targetSec + 15) verdict = { cls: 'warn', txt: 'المحتوى أطول من المدة المستهدفة بـ ' + Math.round(totalSec - targetSec) + ' ثانية — قصّري أو أضيفي المدة.' };
    else if (totalSec < targetSec - 15) verdict = { cls: 'warn', txt: 'المحتوى أقصر من المدة المستهدفة بـ ' + Math.round(targetSec - totalSec) + ' ثانية — أضيفي تفاصيل.' };
    else verdict = { cls: 'ok', txt: 'المدة الفعلية تقارب المدة المستهدفة ✓' };
    var pace;
    if (!totalSec || !totalWords) pace = { cls: '', txt: '—' };
    else if (wpm > 180) pace = { cls: 'warn', txt: wpm + ' كلمة/دقيقة — أسرع من الطبيعي، فصّلي المشاهد.' };
    else if (wpm < 90) pace = { cls: 'warn', txt: wpm + ' كلمة/دقيقة — أبطأ من الطبيعي، خفّفي فترات الصمت.' };
    else pace = { cls: 'ok', txt: wpm + ' كلمة/دقيقة — ضمن المعدل الطبيعي (90–180).' };
    return { totalSec: totalSec, totalWords: totalWords, targetSec: targetSec, verdict: verdict, pace: pace };
  }
  function fmtDur(sec) {
    var m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return m + ' د ' + s + ' ث';
  }

  /* ---------------- نص السيناريو الكامل ---------------- */
  function fullScript(p) {
    var lines = ['«' + (p.title || 'فيديو تعليمي') + '»'];
    if (p.audience) lines.push('الجمهور: ' + p.audience);
    if (p.target) lines.push('المدة المستهدفة: ' + p.target + ' دقيقة');
    lines.push('');
    p.scenes.forEach(function (sc, i) {
      lines.push('— المشهد ' + (i + 1) + (sc.dur ? ' (' + sc.dur + ' ثانية)' : '') + ' —');
      if (String(sc.visual || '').trim()) lines.push('المشهد البصري: ' + sc.visual);
      if (String(sc.narration || '').trim()) lines.push('التعليق المنطوق: ' + sc.narration);
      if (String(sc.notes || '').trim()) lines.push('ملاحظة إنتاج: ' + sc.notes);
      lines.push('');
    });
    var st = stats(p);
    lines.push('المجموع: ' + fmtDur(st.totalSec) + ' · ' + st.totalWords + ' كلمة');
    return lines.join('\n');
  }

  /* ---------------- صفحة القائمة ---------------- */
  function renderList(main) {
    var s = state();
    var list = s.projects.length
      ? s.projects.map(function (p) {
          var st = stats(p);
          return '<section class="card"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:200px"><h3 style="margin:0">' + esc(p.title || 'فيديو بدون عنوان') + '</h3>' +
            '<p class="mini" style="margin:4px 0 0">' + p.scenes.length + ' مشاهد · ' + fmtDur(st.totalSec) +
            ' محسوبة · حُفظ محليًا</p></div>' +
            '<div class="btn-row" style="margin:0">' +
            '<button class="btn btn-primary btn-sm vd-open" data-id="' + p.id + '">✏️ تحرير</button>' +
            '<button class="btn btn-soft btn-sm vd-cp" data-id="' + p.id + '">📋 نص السيناريو</button>' +
            '<button class="btn btn-navy btn-sm vd-prn" data-id="' + p.id + '">🖨️ طباعة</button>' +
            '<button class="btn btn-gold btn-sm vd-dl" data-id="' + p.id + '">⬇️ JSON</button>' +
            '<button class="btn btn-danger btn-sm vd-del" data-id="' + p.id + '">🗑️</button>' +
            '</div></div></section>';
        }).join('')
      : '<section class="card"><p class="mini" style="margin:0">لا توجد مشاريع بعد — اضغطي «مشروع جديد» بالأعلى.</p></section>';

    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
      '<span class="mh-ic" aria-hidden="true">🎬</span>' +
      '<div style="flex:1;min-width:220px"><h2>استوديو الفيديو التعليمي</h2>' +
      '<p>من الفكرة إلى حزمة إنتاج كاملة: مشاهد ونصوص تعليق ومدد زمنية محسوبة — ثم تسلّمينها لأي أداة توليد.</p></div>' +
      '<span class="badge ok">جاهز الآن</span></div></div>' +

      '<section class="card"><h3>➕ مشروع جديد</h3>' +
      '<p class="mini">نحن نُجهّز السيناريو وحزمة الإنتاج — لا نُنتج الفيديو داخل المتصفح، ولن نَعِد بزر لا يعمل.</p>' +
      '<button class="btn btn-primary" id="vdNew">🎬 ابدأ مشهدك الأول</button></section>' +

      '<h3 style="margin:18px 0 8px">🎞️ مشاريعكِ (' + s.projects.length + ')</h3>' + list;

    $('#vdNew').onclick = function () {
      var s2 = state();
      var p = {
        id: 'v' + Date.now(),
        title: 'فيديو: اكتبي العنوان',
        audience: '',
        target: '',
        at: Date.now(),
        scenes: [{ visual: 'ما سيُرى على الشاشة', narration: 'ما سيُقال بصوت المعلم', dur: '20', notes: '' }]
      };
      s2.projects.push(p);
      s2.last = p.id;
      save(s2);
      renderEditor(main, p);
    };
    $$('.vd-open').forEach(function (b) { b.onclick = function () { openProj(b.getAttribute('data-id'), main); }; });
    $$('.vd-cp').forEach(function (b) { b.onclick = function () { copyScript(findProj(b.getAttribute('data-id'))); }; });
    $$('.vd-prn').forEach(function (b) { b.onclick = function () { printProj(findProj(b.getAttribute('data-id'))); }; });
    $$('.vd-dl').forEach(function (b) {
      b.onclick = function () {
        var p = findProj(b.getAttribute('data-id'));
        UI.download((p.title || 'فيديو') + '.json', JSON.stringify(p, null, 2), 'application/json');
        notify('بدأ تنزيل المشروع ✓');
      };
    });
    $$('.vd-del').forEach(function (b) {
      b.onclick = function () {
        UI.confirm('حذف هذا المشروع نهائيًا من متصفحكِ؟').then(function (yes) {
          if (!yes) return;
          var s2 = state();
          s2.projects = s2.projects.filter(function (p) { return p.id !== b.getAttribute('data-id'); });
          if (s2.last === b.getAttribute('data-id')) s2.last = null;
          save(s2);
          notify('حُذف المشروع ✓');
          renderList(main);
        });
      };
    });
  }

  function openProj(id, main) {
    var s = state();
    s.last = id;
    save(s);
    renderEditor(main, findProj(id));
  }

  /* ---------------- النسخ والطباعة ---------------- */
  function copyScript(p) {
    if (!p) return;
    var txt = fullScript(p);
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      notify(ok ? 'نُسخ نص السيناريو إلى الحافظة ✓' : 'تعذّر النسخ — استخدمي «تنزيل نص»', ok ? 'ok' : 'err');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { notify('نُسخ نص السيناريو إلى الحافظة ✓'); }, fallback);
    } else fallback();
  }

  function printProj(p) {
    if (!p) return;
    var st = stats(p);
    var body = UI.prHead(p.title || 'فيديو تعليمي', 'حزمة إنتاج — استوديو الفيديو التعليمي',
      [['الجمهور', p.audience || '—'], ['المدة المستهدفة', (p.target || '—') + ' دقيقة'],
       ['المدة الفعلية المحسوبة', fmtDur(st.totalSec)], ['عدد الكلمات', String(st.totalWords)]]);
    p.scenes.forEach(function (sc, i) {
      body += UI.prSec('المشهد ' + (i + 1) + (sc.dur ? ' — ' + sc.dur + ' ثانية' : ''),
        UI.prPara('المشهد البصري: ' + (sc.visual || '—')) +
        UI.prPara('التعليق المنطوق: ' + (sc.narration || '—')) +
        (String(sc.notes || '').trim() ? UI.prPara('ملاحظة إنتاج: ' + sc.notes) : ''));
    });
    UI.print(body);
  }

  /* ---------------- المحرّر ---------------- */
  function renderEditor(main, p) {
    if (!p) { renderList(main); return; }

    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
      '<button class="btn btn-soft" id="vdBack">↩︎ المشاريع</button>' +
      '<div style="flex:1;min-width:220px"><h2 style="margin:0">' + esc(p.title || 'فيديو بدون عنوان') + '</h2>' +
      '<p class="mini" style="margin:4px 0 0">' + p.scenes.length + ' مشاهد · الحفظ تلقائي</p></div>' +
      '<button class="btn btn-primary" id="vdCp">📋 نص السيناريو</button>' +
      '<button class="btn btn-navy" id="vdPrn">🖨️ طباعة</button>' +
      '<button class="btn btn-gold" id="vdDl">⬇️ JSON</button>' +
      '</div></div>' +

      '<section class="card"><h3>🎥 بيانات الفيديو</h3>' +
      '<div class="g3" style="max-width:760px">' +
      '<div class="field"><label for="vdTitle">العنوان</label><input type="text" id="vdTitle" value="' + esc(p.title || '') + '"></div>' +
      '<div class="field"><label for="vdAud">الجمهور (صف/مستوى)</label><input type="text" id="vdAud" value="' + esc(p.audience || '') + '" placeholder="مثال: الصف السادس"></div>' +
      '<div class="field"><label for="vdTgt">المدة المستهدفة (دقائق)</label><input type="number" min="0" step="1" id="vdTgt" value="' + esc(p.target || '') + '"></div>' +
      '</div></section>' +

      '<section class="card"><h3>📐 حسابات فعلية (تتغيّر مع كل حرف)</h3>' +
      '<div id="vdStats"></div></section>' +

      '<section class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
      '<h3 style="margin:0">🎞️ المشاهد</h3>' +
      '<button class="btn btn-primary btn-sm" id="vdAdd">➕ مشهد جديد</button></div>' +
      '<div id="vdScenes" style="margin-top:10px"></div></section>' +

      '<section class="card"><h3>📄 نص السيناريو الكامل (معاينة)</h3>' +
      '<pre id="vdScript" style="white-space:pre-wrap;background:var(--surface2);border:1px solid var(--border);' +
      'border-radius:10px;padding:14px;font-family:Tahoma,Arial,sans-serif;font-size:14px;line-height:1.9;margin:0"></pre>' +
      '<div class="btn-row"><button class="btn btn-soft" id="vdDlTxt">⬇️ تنزيل نص (.txt)</button></div>' +
      '</section>';

    function touch() {
      p.at = Date.now();
      var s = state();
      for (var i = 0; i < s.projects.length; i++) if (s.projects[i].id === p.id) s.projects[i] = p;
      save(s);
    }
    function paintStats() {
      var st = stats(p);
      $('#vdStats').innerHTML =
        '<div class="g3">' +
        '<div class="mini" style="text-align:center;padding:10px;background:var(--surface2);border-radius:10px">' +
        '<b style="font-size:20px;display:block">' + fmtDur(st.totalSec) + '</b>المدة الفعلية المحسوبة</div>' +
        '<div class="mini" style="text-align:center;padding:10px;background:var(--surface2);border-radius:10px">' +
        '<b style="font-size:20px;display:block">' + (p.target ? p.target + ' دقيقة' : '—') + '</b>المدة المستهدفة</div>' +
        '<div class="mini" style="text-align:center;padding:10px;background:var(--surface2);border-radius:10px">' +
        '<b style="font-size:20px;display:block">' + st.totalWords + '</b>كلمة في نصوص التعليق</div>' +
        '</div>' +
        '<div class="notice ' + st.verdict.cls + '" style="margin-top:10px">' + esc(st.verdict.txt) + '</div>' +
        '<div class="notice ' + st.pace.cls + '" style="margin-top:6px">سرعة الكلام: ' + esc(st.pace.txt) + '</div>';
      $('#vdScript').textContent = fullScript(p);
    }
    function paintScenes() {
      $('#vdScenes').innerHTML = p.scenes.map(function (sc, i) {
        return '<div class="card" style="margin-bottom:10px;padding:12px">' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
          '<b style="color:var(--teal)">المشهد ' + (i + 1) + '</b>' +
          '<div class="field" style="margin:0;display:flex;align-items:center;gap:6px">' +
          '<label for="vdd-' + i + '" style="margin:0">ثانية</label>' +
          '<input type="number" min="0" step="any" id="vdd-' + i + '" class="vd-d" data-i="' + i + '" value="' + esc(sc.dur || '') + '" style="width:80px">' +
          '</div>' +
          '<span style="flex:1"></span>' +
          '<button class="btn btn-soft btn-sm vd-up" data-i="' + i + '" aria-label="تحريك لأعلى"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button class="btn btn-soft btn-sm vd-dn" data-i="' + i + '" aria-label="تحريك لأسفل"' + (i === p.scenes.length - 1 ? ' disabled' : '') + '>↓</button>' +
          '<button class="btn btn-soft btn-sm vd-cp2" data-i="' + i + '" aria-label="تكرار المشهد">🔁</button>' +
          '<button class="btn btn-danger btn-sm vd-rm" data-i="' + i + '" aria-label="حذف المشهد"' + (p.scenes.length <= 1 ? ' disabled' : '') + '>🗑</button>' +
          '</div>' +
          '<div class="field" style="margin-top:8px"><label for="vdv-' + i + '">ما الذي سيُرى على الشاشة؟</label>' +
          '<textarea id="vdv-' + i + '" class="vd-v" data-i="' + i + '" rows="2" ' +
          'placeholder="مثال: مخطط دائرة مقسوم إلى أرباع + عنوان: ما المحيط؟">' + esc(sc.visual || '') + '</textarea></div>' +
          '<div class="field"><label for="vdn-' + i + '">التعليق المنطوق (ما سيقال)</label>' +
          '<textarea id="vdn-' + i + '" class="vd-n" data-i="' + i + '" rows="2" ' +
          'placeholder="مثال: اليوم سنقيس محيط الدائرة، وهو مجموع أطوال حدودها.">' + esc(sc.narration || '') + '</textarea></div>' +
          '<div class="field" style="margin-bottom:0"><label for="vdm-' + i + '">ملاحظة إنتاج (اختياري)</label>' +
          '<input type="text" id="vdm-' + i + '" class="vd-m" data-i="' + i + '" value="' + esc(sc.notes || '') + '" ' +
          'placeholder="مثال: أضيفي موسيقى هادئة + تكبير تدريجي"></div>' +
          '</div>';
      }).join('');

      function bind(cls, key) {
        $$('.' + cls).forEach(function (el) {
          el.addEventListener('input', function () {
            p.scenes[parseInt(el.getAttribute('data-i'), 10)][key] = el.value;
            touch(); paintStats();
          });
        });
      }
      bind('vd-v', 'visual');
      bind('vd-n', 'narration');
      bind('vd-m', 'notes');
      bind('vd-d', 'dur');
      $$('.vd-up').forEach(function (b) {
        b.onclick = function () {
          var i = parseInt(b.getAttribute('data-i'), 10);
          var t = p.scenes[i]; p.scenes[i] = p.scenes[i - 1]; p.scenes[i - 1] = t;
          touch(); paintScenes(); paintStats();
        };
      });
      $$('.vd-dn').forEach(function (b) {
        b.onclick = function () {
          var i = parseInt(b.getAttribute('data-i'), 10);
          var t = p.scenes[i]; p.scenes[i] = p.scenes[i + 1]; p.scenes[i + 1] = t;
          touch(); paintScenes(); paintStats();
        };
      });
      $$('.vd-cp2').forEach(function (b) {
        b.onclick = function () {
          var i = parseInt(b.getAttribute('data-i'), 10);
          var sc = p.scenes[i];
          p.scenes.splice(i + 1, 0, { visual: sc.visual, narration: sc.narration, dur: sc.dur, notes: sc.notes });
          touch(); paintScenes(); paintStats();
          notify('كُرّر المشهد ✓');
        };
      });
      $$('.vd-rm').forEach(function (b) {
        b.onclick = function () {
          if (p.scenes.length <= 1) return;
          p.scenes.splice(parseInt(b.getAttribute('data-i'), 10), 1);
          touch(); paintScenes(); paintStats();
        };
      });
    }

    $('#vdBack').onclick = function () {
      var s = state();
      s.last = null;
      save(s);
      renderList(main);
    };
    $('#vdTitle').addEventListener('input', function () {
      p.title = this.value;
      touch(); paintStats();
      main.querySelector('.mh-top h2').textContent = p.title || 'فيديو بدون عنوان';
    });
    $('#vdAud').addEventListener('input', function () { p.audience = this.value; touch(); paintStats(); });
    $('#vdTgt').addEventListener('input', function () { p.target = this.value; touch(); paintStats(); });
    $('#vdAdd').onclick = function () {
      p.scenes.push({ visual: '', narration: '', dur: '20', notes: '' });
      touch(); paintScenes(); paintStats();
      var ds = $$('.vd-d');
      if (ds.length) ds[ds.length - 1].focus();
    };
    $('#vdCp').onclick = function () { copyScript(p); };
    $('#vdPrn').onclick = function () { printProj(p); };
    $('#vdDl').onclick = function () {
      UI.download((p.title || 'فيديو') + '.json', JSON.stringify(p, null, 2), 'application/json');
      notify('بدأ تنزيل المشروع ✓');
    };
    $('#vdDlTxt').onclick = function () {
      UI.download((p.title || 'فيديو') + '-سيناريو.txt', fullScript(p), 'text/plain');
      notify('بدأ تنزيل نص السيناريو ✓');
    };

    paintScenes();
    paintStats();
  }

  /* ---------------- تسجيل القسم ---------------- */
  function render(main) {
    var p = curProj();
    if (p) renderEditor(main, p);
    else renderList(main);
  }

  App.register('video', render);
})(window);
