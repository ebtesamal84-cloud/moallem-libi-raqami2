/* =========================================================
   schedule.js — إدارة الوقت والتخطيط
   جدول الحصص الأسبوعي · خطة الأسبوع · المواعيد والتذكيرات
   تصدير تقويم بصيغة ICS · طباعة الجدول
   ========================================================= */
(function (global) {
  'use strict';

  var App = global.App;
  if (!App) { console.error('schedule.js: App غير متاح'); return; }
  var UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, notify = UI.notify;

  var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  var PERIODS = ['الحصة الأولى', 'الحصة الثانية', 'الحصة الثالثة', 'الحصة الرابعة',
    'الحصة الخامسة', 'الحصة السادسة', 'الحصة السابعة', 'الحصة الثامنة'];
  var DL_KINDS = ['اختبار', 'واجب منزلي', 'مشروع', 'تسليم عرض', 'موعد إداري'];

  /* ---------------- جدول الحصص ---------------- */
  function tt() {
    return Store.get('timetable', { cells: {} }) || { cells: {} };
  }
  function setTT(v) { return Store.set('timetable', v); }

  function drawTT() {
    var t = tt();
    var html = '<div class="tbl-wrap"><table class="tbl" style="min-width:760px"><thead><tr><th>اليوم / الحصة</th>' +
      PERIODS.map(function (p, i) { return '<th>' + esc(p) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      DAYS.map(function (d, di) {
        return '<tr><th style="text-align:start">' + esc(d) + '</th>' +
          PERIODS.map(function (p, pi) {
            var key = di + '-' + pi;
            return '<td><input type="text" class="tt-cell" data-k="' + key + '" value="' +
              esc(t.cells[key] || '') + '" placeholder="—" aria-label="' + esc(d + ' ' + p) + '"></td>';
          }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
    $('#ttWrap').innerHTML = html;
    $$('#ttWrap .tt-cell').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var c = tt().cells || {};
        c[inp.getAttribute('data-k')] = inp.value.trim();
        setTT({ cells: c });
      });
    });
  }

  function ttAsText() {
    var t = tt();
    var lines = ['جدول الحصص الأسبوعي — المعلم الليبي الرقمي', ''];
    lines.push(['الوقت'].concat(PERIODS).join('\t'));
    DAYS.forEach(function (d, di) {
      lines.push([d].concat(PERIODS.map(function (p, pi) { return (t.cells[di + '-' + pi] || '—'); })).join('\t'));
    });
    return lines.join('\n');
  }

  function printTT() {
    var t = tt();
    UI.print(
      UI.prHead('جدول الحصص الأسبوعي', 'المعلم الليبي الرقمي',
        [['الاسم', (Store.get('profile', {}).name || '—')], ['المدرسة', (Store.get('profile', {}).school || '—')]])
      + UI.prTable(['اليوم'].concat(PERIODS),
        DAYS.map(function (d, di) {
          return [d].concat(PERIODS.map(function (p, pi) { return t.cells[di + '-' + pi] || ''; }));
        }))
      + UI.prSign());
  }

  /* ---------------- خطة الأسبوع ---------------- */
  var PLAN_FIELDS = [
    { k: 'day', l: 'اليوم', t: 'select', opts: DAYS },
    { k: 'grade', l: 'الصف', ph: 'الثالث الإعدادي' },
    { k: 'subject', l: 'المادة', ph: 'الرياضيات' },
    { k: 'topic', l: 'موضوع الحصة', ph: 'المعادلات الخطية — التمثيل البياني', req: true },
    { k: 'notes', l: 'ملاحظات / واجبات', t: 'area', w: 2 }
  ];

  var planEditing = null;

  function drawPlan() {
    var list = UI.coll('weekplan');
    var box = $('#planList');
    if (!list.length) { box.innerHTML = '<div class="empty"><b>لا خطة أسبوع محفوظة</b>أضيفي حصصكِ لتظهر أمامكِ مرتبة حسب اليوم.</div>'; return; }
    box.innerHTML = list.map(function (r) {
      return '<div class="cr-row"><div class="cr-main"><b>' + esc(r.topic) + '</b>' +
        '<div class="mini">' + esc(r.day) + ' · ' + esc(r.grade || '—') + ' · ' + esc(r.subject || '—') +
        (r.notes ? ' · ' + esc(String(r.notes).slice(0, 60)) : '') + '</div></div>' +
        '<span class="btn-row">' +
        '<button class="btn btn-soft btn-sm" data-pe="' + r.id + '">✏️ تعديل</button>' +
        '<button class="btn btn-danger btn-sm" data-pd="' + r.id + '">حذف</button></span></div>';
    }).join('');
    $$('#planList [data-pe]').forEach(function (b) {
      b.onclick = function () {
        var r = UI.coll('weekplan').filter(function (x) { return x.id === b.getAttribute('data-pe'); })[0];
        planEditing = r.id;
        UI.fillForm(PLAN_FIELDS, r, 'pl_');
        notify('فُتحت الحصة للتعديل');
      };
    });
    $$('#planList [data-pd]').forEach(function (b) {
      b.onclick = function () {
        UI.confirm('حذف هذه الحصة من خطة الأسبوع؟').then(function (ok) {
          if (!ok) return;
          UI.removeRec('weekplan', b.getAttribute('data-pd'));
          drawPlan(); notify('حُذفت الحصة');
        });
      };
    });
  }

  function savePlan() {
    var d = UI.readForm(PLAN_FIELDS, 'pl_');
    if (!d.topic) { notify('اكتبي موضوع الحصة أولًا', 'err'); return; }
    if (!d.day) { notify('اختاري يوم الحصة أولًا', 'err'); return; }
    var list = UI.coll('weekplan');
    if (planEditing) {
      list = list.map(function (x) { if (x.id === planEditing) { d.id = x.id; d.createdAt = x.createdAt; d.updatedAt = new Date().toISOString(); return d; } return x; });
      planEditing = null;
    } else {
      d.id = Store.uid(); d.createdAt = new Date().toISOString(); d.updatedAt = d.createdAt;
      list.push(d);
    }
    var r = UI.setColl('weekplan', list);
    notify(r.ok ? 'حُفظت في خطة الأسبوع ✓' : r.error, r.ok ? 'ok' : 'err');
    UI.clearForm(PLAN_FIELDS, 'pl_');
    drawPlan();
  }

  /* ---------------- المواعيد والتذكيرات ---------------- */
  var DL_FIELDS = [
    { k: 'title', l: 'العنوان', ph: 'اختبار الوحدة الثالثة', req: true },
    { k: 'kind', l: 'النوع', t: 'select', opts: DL_KINDS },
    { k: 'date', l: 'التاريخ', t: 'date' },
    { k: 'grade', l: 'الصف', ph: 'الخامس' },
    { k: 'notes', l: 'ملاحظات', t: 'area', w: 2 }
  ];

  function drawDL() {
    var list = UI.coll('deadlines').slice().sort(function (a, b) { return (a.date || '') < (b.date || '') ? -1 : 1; });
    var box = $('#dlList');
    var today = UI.todayISO();
    $('#dlCount').textContent = list.length + ' موعد';
    if (!list.length) { box.innerHTML = '<div class="empty"><b>لا مواعيد مسجلة</b>سجّلي مواعيد الاختبارات والواجبات لتظهر هنا.</div>'; return; }
    box.innerHTML = list.map(function (r) {
      var late = r.date && r.date < today;
      return '<div class="cr-row"><div class="cr-main"><b>' + esc(r.title) + '</b> ' +
        '<span class="badge ' + (late ? 'wait' : 'info') + '">' + esc(r.kind) + '</span>' +
        '<div class="mini">' + esc(UI.fmtAr(r.date)) + (r.grade ? ' · ' + esc(r.grade) : '') +
        (r.notes ? ' · ' + esc(String(r.notes).slice(0, 50)) : '') + '</div></div>' +
        '<span class="btn-row">' +
        '<button class="btn btn-soft btn-sm" data-de="' + r.id + '">✏️ تعديل</button>' +
        '<button class="btn btn-danger btn-sm" data-dd="' + r.id + '">حذف</button></span></div>';
    }).join('');
    $$('#dlList [data-de]').forEach(function (b) {
      b.onclick = function () {
        var r = UI.coll('deadlines').filter(function (x) { return x.id === b.getAttribute('data-de'); })[0];
        planDL = r.id;
        UI.fillForm(DL_FIELDS, r, 'dl_');
      };
    });
    $$('#dlList [data-dd]').forEach(function (b) {
      b.onclick = function () {
        UI.confirm('حذف هذا الموعد؟').then(function (ok) {
          if (!ok) return;
          UI.removeRec('deadlines', b.getAttribute('data-dd'));
          drawDL(); notify('حُذف الموعد');
        });
      };
    });
  }

  var planDL = null;

  function saveDL() {
    var d = UI.readForm(DL_FIELDS, 'dl_');
    if (!d.title) { notify('اكتبي عنوان الموعد أولًا', 'err'); return; }
    if (!d.kind) { notify('اختاري نوع الموعد (اختبار · واجب · امتحان · اجتماع) أولًا', 'err'); return; }
    if (!d.date) { notify('اختاري تاريخ الموعد أولًا', 'err'); return; }
    var list = UI.coll('deadlines');
    if (planDL) {
      list = list.map(function (x) { if (x.id === planDL) { d.id = x.id; d.createdAt = x.createdAt; d.updatedAt = new Date().toISOString(); return d; } return x; });
      planDL = null;
    } else {
      d.id = Store.uid(); d.createdAt = new Date().toISOString(); d.updatedAt = d.createdAt;
      list.push(d);
    }
    var r = UI.setColl('deadlines', list);
    notify(r.ok ? 'سُجّل الموعد ✓' : r.error, r.ok ? 'ok' : 'err');
    UI.clearForm(DL_FIELDS, 'dl_');
    drawDL();
  }

  /* ---------------- تقويم ICS ---------------- */
  function icsEscape(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function utcStamp() {
    var d = new Date();
    return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + 'T' +
      pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';
  }
  function nextDay(dt) {
    var y = parseInt(dt.slice(0, 4), 10), m = parseInt(dt.slice(4, 6), 10) - 1, d = parseInt(dt.slice(6, 8), 10);
    var x = new Date(y, m, d + 1);
    return x.getFullYear() + pad2(x.getMonth() + 1) + pad2(x.getDate());
  }
  function buildICS() {
    var events = [];
    UI.coll('deadlines').forEach(function (d) { if (d.date) events.push({ t: (d.kind || 'موعد') + ': ' + d.title, d: d.date }); });
    UI.coll('exams').forEach(function (e) { if (e.date) events.push({ t: 'اختبار: ' + e.title, d: e.date }); });
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Moallem Libi Raqami//AR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    events.forEach(function (ev) {
      var dt = String(ev.d).replace(/-/g, '');
      if (!/^\d{8}$/.test(dt)) return;
      lines.push('BEGIN:VEVENT', 'UID:' + Store.uid() + '@moallem-libi', 'DTSTAMP:' + utcStamp(),
        'DTSTART;VALUE=DATE:' + dt, 'DTEND;VALUE=DATE:' + nextDay(dt),
        'SUMMARY:' + icsEscape(ev.t), 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return { text: lines.join('\r\n'), count: events.length };
  }

  /* ---------------- الصفحة ---------------- */
  App.register('schedule', function (main, mod) {
    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
        '<span class="mh-ic" aria-hidden="true">' + (mod ? mod.i : '🗓️') + '</span>' +
        '<div style="flex:1;min-width:220px"><h2>' + esc(mod ? mod.t : 'إدارة الوقت والتخطيط') + '</h2>' +
        '<p>' + esc(mod ? mod.d : '') + '</p></div>' +
        '<span class="badge ok">جاهز الآن</span>' +
      '</div></div>' +

      '<section class="card"><h3>🗓️ جدول الحصص الأسبوعي</h3>' +
        '<p class="mini" style="margin-top:0">اكتبي الصف والمادة في كل خانة. التغييرات تُحفظ تلقائيًا.</p>' +
        '<div id="ttWrap"></div>' +
        '<div class="btn-row" style="margin-top:12px">' +
          '<button class="btn btn-navy" id="ttPrint">🖨️ طباعة الجدول</button>' +
          '<button class="btn btn-soft" id="ttTxt">⬇️ تصدير كنص</button>' +
          '<button class="btn btn-ghost" id="ttClear">مسح الخانات</button>' +
        '</div></section>' +

      '<section class="card"><h3>📋 خطة الأسبوع</h3>' +
        UI.formHTML(PLAN_FIELDS, 'pl_') +
        '<div class="btn-row" style="margin-bottom:12px">' +
          '<button class="btn btn-primary" id="planSave">💾 حفظ في الخطة</button>' +
          '<button class="btn btn-ghost" id="planCancel">إلغاء التعديل</button>' +
        '</div>' +
        '<div id="planList"></div></section>' +

      '<section class="card"><h3>⏰ المواعيد والتذكيرات <span class="badge" id="dlCount"></span></h3>' +
        UI.formHTML(DL_FIELDS, 'dl_') +
        '<div class="btn-row" style="margin-bottom:12px">' +
          '<button class="btn btn-primary" id="dlSave">💾 تسجيل الموعد</button>' +
          '<button class="btn btn-soft" id="dlIcs">📅 تصدير تقويم (ICS)</button>' +
          '<button class="btn btn-navy" id="dlPrint">🖨️ طباعة المواعيد</button>' +
          '<button class="btn btn-ghost" id="dlCancel">إلغاء التعديل</button>' +
        '</div>' +
        '<div id="dlList"></div></section>' +

      '<div class="notice"><b>ملاحظة صادقة:</b> التذكيرات هنا داخل المنصة ولا تصل إشعارات إلى هاتفكِ تلقائيًا. ' +
        'استخدمي «تصدير تقويم (ICS)» ثم افتحي الملف في تقويم هاتفكِ أو حاسوبكِ ليصلك التذكير من هناك.</div>';

    drawTT();
    drawPlan();
    drawDL();

    $('#ttPrint').onclick = printTT;
    $('#ttTxt').onclick = function () {
      UI.download('جدول-الحصص.txt', ttAsText(), 'text/plain');
      notify('نُزِّل الجدول ✓', 'ok');
    };
    $('#ttClear').onclick = function () {
      UI.confirm('مسح كل خانات جدول الحصص؟').then(function (ok) {
        if (!ok) return;
        setTT({ cells: {} }); drawTT(); notify('مُسحت الخانات');
      });
    };

    $('#planSave').onclick = savePlan;
    $('#planCancel').onclick = function () { planEditing = null; UI.clearForm(PLAN_FIELDS, 'pl_'); notify('أُلغي التعديل'); };

    $('#dlSave').onclick = saveDL;
    $('#dlCancel').onclick = function () { planDL = null; UI.clearForm(DL_FIELDS, 'dl_'); notify('أُلغي التعديل'); };
    $('#dlIcs').onclick = function () {
      var r = buildICS();
      if (!r.count) { notify('لا مواعيد ذات تاريخ لتصديرها', 'err'); return; }
      UI.download('تقويم-المعلم.ics', r.text, 'text/calendar');
      notify('صُدِّر التقويم (' + r.count + ' موعد) — افتحيه في تقويم هاتفكِ ✓', 'ok');
    };
    $('#dlPrint').onclick = function () {
      var list = UI.coll('deadlines');
      if (!list.length) { notify('لا مواعيد لطباعتها', 'err'); return; }
      UI.print(UI.prHead('مواعيد الاختبارات والمهام', 'المعلم الليبي الرقمي', [['الاسم', Store.get('profile', {}).name || '—']])
        + UI.prTable(['التاريخ', 'النوع', 'العنوان', 'الصف', 'ملاحظات'],
          list.slice().sort(function (a, b) { return (a.date || '') < (b.date || '') ? -1 : 1; })
            .map(function (d) { return [UI.fmtAr(d.date), d.kind, d.title, d.grade, d.notes]; }))
        + UI.prSign());
    };
  });

})(window);
