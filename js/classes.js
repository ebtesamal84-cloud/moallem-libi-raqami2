/* =========================================================
   classes.js — إدارة الصف
   فصول وطلاب وسجل درجات: مجموع ونسبة وترتيب محسوب فورًا.
   لا قرارات تربوية آلية — أرقام محسوبة فقط أمام المعلمة.
   كل البيانات تبقى في متصفح المعلمة ولا تُرفع إلى أي خادم.
   ========================================================= */
(function (global) {
  'use strict';
  var App = global.App;
  if (!App) { console.error('classes.js: App غير متاح'); return; }
  var UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, notify = UI.notify;

  /* ---------------- التخزين ---------------- */
  function state() {
    var s = Store.get('classes', null);
    if (!s || !(s.list instanceof Array)) s = { list: [], last: null };
    return s;
  }
  function save(s) { Store.set('classes', s); }
  function findClass(id) {
    var s = state();
    for (var i = 0; i < s.list.length; i++) if (s.list[i].id === id) return s.list[i];
    return null;
  }
  function curClass() {
    var s = state();
    for (var i = 0; i < s.list.length; i++) if (s.list[i].id === s.last) return s.list[i];
    return null;
  }
  function touch(cls) {
    cls.at = Date.now();
    var s = state();
    for (var i = 0; i < s.list.length; i++) if (s.list[i].id === cls.id) s.list[i] = cls;
    save(s);
  }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function f2(n) { return Math.round(n * 100) / 100; }

  /* ---------------- حسابات فعلية ---------------- */
  function studentStats(cls, st) {
    var sum = 0, maxSum = 0;
    cls.assessments.forEach(function (a) {
      var m = num(a.max);
      if (m === null || m <= 0) return;
      maxSum += m;
      var g = num(a.grades ? a.grades[st.id] : null);
      if (g !== null) sum += g;
    });
    return { sum: sum, max: maxSum, pct: maxSum > 0 ? (sum / maxSum) * 100 : null };
  }
  /* الترتيب تنازلي حسب النسبة — والتعادل يحصل على نفس الترتيب */
  function ranked(cls) {
    var rows = cls.students.map(function (st) { return { st: st, s: studentStats(cls, st) }; });
    rows.sort(function (a, b) {
      return (b.s.pct === null ? -1 : b.s.pct) - (a.s.pct === null ? -1 : a.s.pct);
    });
    var rank = 0, prev = null;
    rows.forEach(function (r, i) {
      if (r.s.pct !== null && r.s.pct !== prev) { rank = i + 1; prev = r.s.pct; }
      r.rank = (r.s.pct === null) ? null : rank;
    });
    return rows;
  }
  function classAvg(cls) {
    var rows = ranked(cls), sum = 0, n = 0;
    rows.forEach(function (r) { if (r.s.pct !== null) { sum += r.s.pct; n++; } });
    return n ? f2(sum / n) : null;
  }

  /* ---------------- قائمة الفصول ---------------- */
  function renderList(main) {
    var s = state();
    var cards = s.list.length
      ? s.list.map(function (c) {
          var avg = classAvg(c);
          return '<section class="card"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:200px"><h3 style="margin:0">' + esc(c.name || 'فصل بدون اسم') + '</h3>' +
            '<p class="mini" style="margin:4px 0 0">' + c.students.length + ' طالبًا · ' + c.assessments.length +
            ' عمل صفّي · ' + (avg === null ? 'لا نسب بعد' : 'متوسط الفصل ' + avg + '%') + '</p></div>' +
            '<div class="btn-row" style="margin:0">' +
            '<button class="btn btn-primary btn-sm cl-open" data-id="' + c.id + '">📂 فتح</button>' +
            '<button class="btn btn-navy btn-sm cl-prn" data-id="' + c.id + '">🖨️ كشف</button>' +
            '<button class="btn btn-gold btn-sm cl-dl" data-id="' + c.id + '">⬇️ JSON</button>' +
            '<button class="btn btn-danger btn-sm cl-del" data-id="' + c.id + '">🗑️</button>' +
            '</div></div></section>';
        }).join('')
      : '<section class="card"><p class="mini" style="margin:0">لا توجد فصول بعد — أنشئي فصلكِ الأول من النموذج أعلاه.</p></section>';

    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
      '<span class="mh-ic" aria-hidden="true">👥</span>' +
      '<div style="flex:1;min-width:220px"><h2>إدارة الصف</h2>' +
      '<p>فصولكِ وطلابكِ ودرجاتكِ في جدول واحد — الأرقام محسوبة فورًا، والحكم لكِ وحدكِ.</p></div>' +
      '<span class="badge ok">جاهز الآن</span></div></div>' +

      '<section class="card"><h3>🔒 خصوصية طلابكِ أولًا</h3>' +
      '<p class="mini" style="margin:0">أسماء طلابكِ ودرجاتكِ تُحفظ في متصفحكِ وحده — لا خادم ولا رفع ولا مشاركة. ' +
      'ولا تمنح المنصة أي تقدير أو قرار تربوي آلي: المجموع والنسبة والترتيب محسوبة أمامكِ، وأنتِ من يحكم.</p></section>' +

      '<section class="card"><h3>➕ فصل جديد</h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<input type="text" id="clNew" placeholder="اسم الفصل — مثال: السادس/أ" aria-label="اسم الفصل جديد" ' +
      'style="flex:1;min-width:200px;padding:9px 12px;border:1px solid var(--border);border-radius:10px">' +
      '<button class="btn btn-primary" id="clAdd">إنشاء الفصل</button></div></section>' +

      '<h3 style="margin:18px 0 8px">🏫 فصولكِ (' + s.list.length + ')</h3>' + cards;

    $('#clAdd').onclick = function () {
      var name = $('#clNew').value.replace(/^\s+|\s+$/g, '');
      if (!name) { notify('اكتبي اسم الفصل أولًا', 'err'); return; }
      var s2 = state();
      var c = { id: 'c' + Date.now(), name: name, students: [], assessments: [], at: Date.now() };
      s2.list.push(c);
      s2.last = c.id;
      save(s2);
      renderEditor(main, c);
    };
    $('#clNew').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#clAdd').onclick(); });
    $$('.cl-open').forEach(function (b) { b.onclick = function () { openClass(b.getAttribute('data-id'), main); }; });
    $$('.cl-prn').forEach(function (b) { b.onclick = function () { printRoster(findClass(b.getAttribute('data-id'))); }; });
    $$('.cl-dl').forEach(function (b) {
      b.onclick = function () {
        var c = findClass(b.getAttribute('data-id'));
        UI.download((c.name || 'فصل') + '.json', JSON.stringify(c, null, 2), 'application/json');
        notify('بدأ تنزيل نسخة الفصل ✓');
      };
    });
    $$('.cl-del').forEach(function (b) {
      b.onclick = function () {
        UI.confirm('حذف الفصل وكل طلابه ودرجاته نهائيًا من متصفحكِ؟').then(function (yes) {
          if (!yes) return;
          var s2 = state();
          s2.list = s2.list.filter(function (c) { return c.id !== b.getAttribute('data-id'); });
          if (s2.last === b.getAttribute('data-id')) s2.last = null;
          save(s2);
          notify('حُذف الفصل ✓');
          renderList(main);
        });
      };
    });
  }

  function openClass(id, main) {
    var s = state();
    s.last = id;
    save(s);
    renderEditor(main, findClass(id));
  }

  /* ---------------- كشف الدرجات ---------------- */
  function printRoster(cls) {
    if (!cls) return;
    if (!cls.students.length || !cls.assessments.length) {
      notify('أضيفي الطلاب والأعمال الصفية قبل الطباعة', 'err');
      return;
    }
    var rows = ranked(cls);
    var table = UI.prTable(
      ['الطالب'].concat(cls.assessments.map(function (a) { return (a.t || 'عمل') + ' (/' + (a.max || '؟') + ')'; }))
        .concat(['المجموع', 'النسبة %', 'الترتيب']),
      rows.map(function (r) {
        return [r.st.name].concat(cls.assessments.map(function (a) {
          var g = num(a.grades ? a.grades[r.st.id] : null);
          return g === null ? '—' : String(g);
        })).concat([
          f2(r.s.sum) + ' / ' + f2(r.s.max),
          r.s.pct === null ? '—' : f2(r.s.pct) + '%',
          r.rank === null ? '—' : String(r.rank)
        ]);
      })
    );
    UI.print(UI.prHead('كشف درجات — ' + (cls.name || 'فصل'), 'من قسم إدارة الصف في المعلم الليبي الرقمي',
      [['عدد الطلاب', String(cls.students.length)], ['الأعمال الصفية', String(cls.assessments.length)]]) +
      table + UI.prSign());
  }

  /* ---------------- محرّر الفصل ---------------- */
  function renderEditor(main, cls) {
    if (!cls) { renderList(main); return; }

    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
      '<button class="btn btn-soft" id="clBack">↩︎ الفصول</button>' +
      '<div style="flex:1;min-width:200px"><h2 style="margin:0">' + esc(cls.name || 'فصل') + '</h2>' +
      '<p class="mini" style="margin:4px 0 0" id="clSub"></p></div>' +
      '<button class="btn btn-navy" id="clPrint">🖨️ كشف الدرجات</button>' +
      '<button class="btn btn-gold" id="clExp">⬇️ JSON</button>' +
      '</div></div>' +

      '<section class="card"><div class="field" style="max-width:360px">' +
      '<label for="clName">اسم الفصل</label><input type="text" id="clName" value="' + esc(cls.name || '') + '"></div></section>' +

      '<div class="tabs" id="clTabs" role="tablist">' +
      '<button class="active" id="clTab1" role="tab" aria-selected="true">🎓 الطلاب</button>' +
      '<button id="clTab2" role="tab" aria-selected="false">📊 الأعمال والدرجات</button>' +
      '</div>' +

      '<section class="card" id="clStudCard">' +
      '<h3>➕ إضافة طالب</h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<input type="text" id="clSName" placeholder="اسم الطالب كما في السجل" aria-label="اسم الطالب" ' +
      'style="flex:1;min-width:180px;padding:9px 12px;border:1px solid var(--border);border-radius:10px">' +
      '<input type="text" id="clSNote" placeholder="ملاحظة (اختياري)" aria-label="ملاحظة الطالب" ' +
      'style="flex:1;min-width:140px;padding:9px 12px;border:1px solid var(--border);border-radius:10px">' +
      '<button class="btn btn-primary" id="clSAdd">إضافة</button></div>' +
      '<div id="clStudList" style="margin-top:12px"></div>' +
      '</section>' +

      '<section class="card hidden" id="clGradeCard">' +
      '<h3>➕ إضافة عمل صفّي</h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<input type="text" id="clATitle" placeholder="اسم العمل — مثال: اختبار الوحدة الأولى" aria-label="اسم العمل الصفّي" ' +
      'style="flex:2;min-width:180px;padding:9px 12px;border:1px solid var(--border);border-radius:10px">' +
      '<input type="number" min="0" step="any" id="clAMax" placeholder="الدرجة العظمى" aria-label="الدرجة العظمى" ' +
      'style="flex:1;min-width:100px;padding:9px 12px;border:1px solid var(--border);border-radius:10px">' +
      '<button class="btn btn-primary" id="clAAdd">إضافة</button></div>' +
      '<div id="clTable" style="margin-top:14px"></div>' +
      '</section>';

    /* التبويبات */
    function showTab(n) {
      var t1 = n === 1;
      $('#clStudCard').classList.toggle('hidden', !t1);
      $('#clGradeCard').classList.toggle('hidden', t1);
      $('#clTab1').classList.toggle('active', t1);
      $('#clTab2').classList.toggle('active', !t1);
      $('#clTab1').setAttribute('aria-selected', t1 ? 'true' : 'false');
      $('#clTab2').setAttribute('aria-selected', t1 ? 'false' : 'true');
      if (!t1) paintTable();
    }
    $('#clTab1').onclick = function () { showTab(1); };
    $('#clTab2').onclick = function () { showTab(2); };

    function paintSub() {
      var avg = classAvg(cls);
      $('#clSub').textContent = cls.students.length + ' طالبًا · ' + cls.assessments.length +
        ' عمل صفّي · ' + (avg === null ? 'لا نسب بعد' : 'متوسط الفصل ' + avg + '%');
    }

    /* الطلاب */
    function paintStudents() {
      if (!cls.students.length) {
        $('#clStudList').innerHTML = '<p class="mini" style="margin:0">لا طلاب بعد — أضيفي أول طالب من النموذج أعلاه.</p>';
        return;
      }
      $('#clStudList').innerHTML = cls.students.map(function (st, i) {
        return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">' +
          '<b style="color:var(--teal);min-width:24px">' + (i + 1) + '.</b>' +
          '<input type="text" class="cl-sn" data-id="' + st.id + '" value="' + esc(st.name) + '" aria-label="اسم الطالب" ' +
          'style="flex:2;min-width:150px;padding:8px 10px;border:1px solid var(--border);border-radius:8px">' +
          '<input type="text" class="cl-snote" data-id="' + st.id + '" value="' + esc(st.note || '') + '" placeholder="ملاحظة" aria-label="ملاحظة الطالب" ' +
          'style="flex:1;min-width:120px;padding:8px 10px;border:1px solid var(--border);border-radius:8px">' +
          '<button class="btn btn-danger btn-sm cl-sdel" data-id="' + st.id + '" aria-label="حذف الطالب">🗑</button>' +
          '</div>';
      }).join('');
      $$('.cl-sn').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var st = findStudent(inp.getAttribute('data-id'));
          if (st) { st.name = inp.value; touch(cls); paintSub(); }
        });
      });
      $$('.cl-snote').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var st = findStudent(inp.getAttribute('data-id'));
          if (st) { st.note = inp.value; touch(cls); }
        });
      });
      $$('.cl-sdel').forEach(function (b) {
        b.onclick = function () {
          var st = findStudent(b.getAttribute('data-id'));
          UI.confirm('حذف الطالب «' + (st ? st.name : '') + '» ودرجاته من هذا الفصل؟').then(function (yes) {
            if (!yes) return;
            cls.students = cls.students.filter(function (x) { return x.id !== b.getAttribute('data-id'); });
            cls.assessments.forEach(function (a) {
              if (a.grades) delete a.grades[b.getAttribute('data-id')];
            });
            touch(cls);
            paintStudents(); paintTable(); paintSub();
            notify('حُذف الطالب ✓');
          });
        };
      });
    }
    function findStudent(id) {
      for (var i = 0; i < cls.students.length; i++) if (cls.students[i].id === id) return cls.students[i];
      return null;
    }
    $('#clSAdd').onclick = function () {
      var name = $('#clSName').value.replace(/^\s+|\s+$/g, '');
      if (!name) { notify('اكتبي اسم الطالب أولًا', 'err'); return; }
      cls.students.push({ id: 's' + Date.now() + Math.floor(Math.random() * 1000), name: name, note: $('#clSNote').value });
      $('#clSName').value = '';
      $('#clSNote').value = '';
      touch(cls);
      paintStudents(); paintTable(); paintSub();
      $('#clSName').focus();
    };
    $('#clSName').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); $('#clSAdd').onclick(); }
    });

    /* الدرجات */
    function paintTable() {
      var box = $('#clTable');
      if (!cls.students.length) {
        box.innerHTML = '<p class="mini" style="margin:0">أضيفي طلابكِ من تبويب «الطلاب» أولًا — ثم تظهر جدول الدرجات هنا.</p>';
        return;
      }
      if (!cls.assessments.length) {
        box.innerHTML = '<p class="mini" style="margin:0">أضيفي عملًا صفّيًا (اختبار أو واجب) من النموذج أعلاه.</p>';
        return;
      }
      var rows = ranked(cls);
      var head = '<tr><th style="min-width:130px">الطالب</th>' +
        cls.assessments.map(function (a, j) {
          return '<th style="min-width:120px">' + esc(a.t || 'عمل ' + (j + 1)) +
            '<br><span class="mini">العظمى ' + esc(String(a.max || '؟')) + '</span>' +
            '<br><button class="btn btn-danger btn-sm cl-adel" data-j="' + j + '" aria-label="حذف العمل الصفّي">✕ حذف</button></th>';
        }).join('') +
        '<th>المجموع</th><th>النسبة %</th><th>الترتيب</th></tr>';
      var body = rows.map(function (r) {
        return '<tr><td><b>' + esc(r.st.name) + '</b></td>' +
          cls.assessments.map(function (a, j) {
            var v = (a.grades && a.grades[r.st.id]) || '';
            return '<td><input type="number" step="any" class="cl-g" data-sid="' + r.st.id + '" data-j="' + j + '" ' +
              'value="' + esc(v) + '" style="width:80px;padding:6px" ' +
              'aria-label="درجة ' + esc(r.st.name) + ' في ' + esc(a.t || 'عمل') + '"></td>';
          }).join('') +
          '<td><b class="cl-sum">' + f2(r.s.sum) + ' / ' + f2(r.s.max) + '</b></td>' +
          '<td><b class="cl-pct">' + (r.s.pct === null ? '—' : f2(r.s.pct) + '%') + '</b></td>' +
          '<td><b class="cl-rk">' + (r.rank === null ? '—' : r.rank) + '</b></td></tr>';
      }).join('');
      box.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
        '<p class="mini">الأعمال بلا درجة تُحسب صفرًا في المجموع. المجموع والنسبة والترتيب محسوبة آليًا — ' +
        'ولا أي تقدير أو قرار تربوي دون مراجعتكِ.</p>';

      /* إدخال الدرجة: الحفظ فورًا، وتحديث الجدول عند مغادرة الخانة (Tab) */
      $$('.cl-g').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var a = cls.assessments[parseInt(inp.getAttribute('data-j'), 10)];
          if (!a.grades) a.grades = {};
          a.grades[inp.getAttribute('data-sid')] = inp.value.replace(/^\s+|\s+$/g, '');
          touch(cls);
        });
        inp.addEventListener('change', function () { paintTable(); paintSub(); });
      });
      $$('.cl-adel').forEach(function (b) {
        b.onclick = function () {
          var j = parseInt(b.getAttribute('data-j'), 10);
          UI.confirm('حذف العمل الصفّي «' + (cls.assessments[j].t || '') + '» ودرجاته؟').then(function (yes) {
            if (!yes) return;
            cls.assessments.splice(j, 1);
            touch(cls);
            paintTable(); paintSub();
            notify('حُذف العمل الصفّي ✓');
          });
        };
      });
    }
    $('#clAAdd').onclick = function () {
      var t = $('#clATitle').value.replace(/^\s+|\s+$/g, '');
      var m = parseFloat($('#clAMax').value);
      if (!t) { notify('اكتبي اسم العمل الصفّي أولًا', 'err'); return; }
      if (isNaN(m) || m <= 0) { notify('أدخلي درجة عظمى موجبة', 'err'); return; }
      cls.assessments.push({ id: 'a' + Date.now(), t: t, max: String(f2(m)), grades: {} });
      $('#clATitle').value = '';
      $('#clAMax').value = '';
      touch(cls);
      paintTable(); paintSub();
      $('#clATitle').focus();
    };

    /* الشريط العلوي */
    $('#clBack').onclick = function () {
      var s = state();
      s.last = null;
      save(s);
      renderList(main);
    };
    $('#clName').addEventListener('input', function () {
      cls.name = this.value;
      touch(cls);
      main.querySelector('.mh-top h2').textContent = cls.name || 'فصل';
      paintSub();
    });
    $('#clPrint').onclick = function () { printRoster(cls); };
    $('#clExp').onclick = function () {
      UI.download((cls.name || 'فصل') + '.json', JSON.stringify(cls, null, 2), 'application/json');
      notify('بدأ تنزيل نسخة الفصل ✓');
    };

    paintStudents();
    paintTable();
    paintSub();
  }

  /* ---------------- تسجيل القسم ---------------- */
  function render(main) {
    var cls = curClass();
    if (cls) renderEditor(main, cls);
    else renderList(main);
  }

  App.register('classes', render);
})(window);
