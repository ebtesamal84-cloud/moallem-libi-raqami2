/* =========================================================
   exams.js — منشئ الاختبارات والتقويم + بنك الأسئلة
   أنواع أسئلة متعددة · توزيع الدرجات · مفتاح إجابة منفصل
   طباعة ورقة الاختبار ومفتاح الإجابة · بنك أسئلة قابل للإدراج
   ملاحظة تربوية: التصحيح الآلي يقتصر على الأسئلة الموضوعية،
   والمقالي يبقى تحت مراجعة المعلم.
   ========================================================= */
(function (global) {
  'use strict';

  var App = global.App;
  if (!App) { console.error('exams.js: App غير متاح'); return; }
  var UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, notify = UI.notify;

  var QTYPES = [
    { v: 'mcq', l: 'اختيار من متعدد' },
    { v: 'tf', l: 'صح أو خطأ' },
    { v: 'fill', l: 'أكمل الفراغ' },
    { v: 'match', l: 'مطابقة' },
    { v: 'essay', l: 'سؤال مقالي / شرح' },
    { v: 'math', l: 'مسألة رياضية' }
  ];
  var QL = { mcq: 'اختيار من متعدد', tf: 'صح أو خطأ', fill: 'أكمل الفراغ', match: 'مطابقة', essay: 'مقالي', math: 'مسألة رياضية' };
  var EKINDS = ['اختبار قصير', 'تقويم قبلي', 'تقويم تكويني', 'اختبار أسبوعي', 'اختبار منتصف الفصل',
    'اختبار نهائي', 'تقويم ختامي', 'اختبار إثرائي'];
  var LEVELS = ['أساسي', 'متوسط', 'متقدم'];
  var LETTERS = ['أ', 'ب', 'ج', 'د'];

  var EXAM_FIELDS = [
    { k: 'title', l: 'عنوان الاختبار', ph: 'مثال: اختبار الوحدة الثالثة — المعادلات', req: true, w: 2 },
    { k: 'kind', l: 'نوع الاختبار', t: 'select', opts: EKINDS },
    { k: 'subject', l: 'المادة', ph: 'الرياضيات' },
    { k: 'grade', l: 'الصف', ph: 'الثالث الإعدادي' },
    { k: 'duration', l: 'الزمن (دقيقة)', t: 'number', min: '1', ph: '45' },
    { k: 'date', l: 'التاريخ', t: 'date' },
    { k: 'notes', l: 'إرشادات للطلاب', t: 'area', w: 2, ph: 'أجيبوا بخط واضح، لا تُحتسب الدرجات للإجابة غير المرتبة…' }
  ];

  function blankQ() {
    return { type: 'mcq', text: '', choices: ['', '', '', ''], answer: '', marks: 1, level: 'أساسي' };
  }

  /* ---------------- محرر الأسئلة ---------------- */
  function qRowHTML(q, i) {
    q = q || blankQ();
    var qid = 'q' + i + '_' + Store.uid();
    var extra = '';
    if (q.type === 'mcq') {
      extra = '<div class="row2" style="margin-top:8px">' +
        q.choices.concat(['', '', '', '']).slice(0, 4).map(function (c, ci) {
          return '<div class="field" style="margin-bottom:6px"><label>الاختيار ' + LETTERS[ci] + '</label>' +
            '<input type="text" class="q-ch" data-ci="' + ci + '" value="' + esc(c) + '"></div>';
        }).join('') +
        '<div class="field" style="margin-bottom:6px"><label>الإجابة الصحيحة</label>' +
        '<select class="q-ans">' + LETTERS.map(function (L, li) {
          return '<option value="' + li + '"' + (String(q.answer) === String(li) ? ' selected' : '') + '>الاختيار ' + L + '</option>';
        }).join('') + '</select></div></div>';
    } else if (q.type === 'tf') {
      extra = '<div class="field" style="margin-top:8px;max-width:220px"><label>الإجابة الصحيحة</label>' +
        '<select class="q-ans"><option value="صح"' + (q.answer === 'صح' ? ' selected' : '') + '>صح</option>' +
        '<option value="خطأ"' + (q.answer === 'خطأ' ? ' selected' : '') + '>خطأ</option></select></div>';
    } else {
      extra = '<div class="field" style="margin-top:8px"><label>' +
        (q.type === 'essay' ? 'مفتاح الإجابة / معايير التصحيح' : 'الإجابة النموذجية') + '</label>' +
        '<textarea class="q-ans" style="min-height:60px">' + esc(q.answer || '') + '</textarea></div>';
    }

    return '<div class="q-row card" data-qid="' + qid + '" style="padding:12px;margin-bottom:10px">' +
      '<div class="btn-row" style="margin-bottom:8px">' +
        '<span class="badge info">سؤال ' + (i + 1) + '</span>' +
        '<select class="q-type" style="flex:0 0 190px" aria-label="نوع السؤال">' +
          QTYPES.map(function (t) { return '<option value="' + t.v + '"' + (q.type === t.v ? ' selected' : '') + '>' + t.l + '</option>'; }).join('') +
        '</select>' +
        '<select class="q-level" style="flex:0 0 130px" aria-label="المستوى">' +
          LEVELS.map(function (l) { return '<option' + (q.level === l ? ' selected' : '') + '>' + l + '</option>'; }).join('') +
        '</select>' +
        '<label class="mini" style="align-self:center">الدرجة: ' +
          '<input type="number" class="q-marks" min="0" step="0.5" value="' + (q.marks || 1) +
          '" style="width:70px;display:inline-block" aria-label="درجة السؤال"></label>' +
        '<button type="button" class="btn btn-danger btn-sm q-del" style="margin-inline-start:auto">✕ حذف</button>' +
      '</div>' +
      '<div class="field" style="margin-bottom:0"><label>نص السؤال</label>' +
        '<textarea class="q-text" style="min-height:60px">' + esc(q.text || '') + '</textarea></div>' +
      extra + '</div>';
  }

  function readQs() {
    return $$('#qsBody .q-row').map(function (row) {
      var type = row.querySelector('.q-type').value;
      var q = {
        type: type,
        text: row.querySelector('.q-text').value.trim(),
        marks: parseFloat(row.querySelector('.q-marks').value) || 0,
        level: row.querySelector('.q-level').value,
        answer: '', choices: []
      };
      if (type === 'mcq') {
        q.choices = Array.prototype.slice.call(row.querySelectorAll('.q-ch')).map(function (i) { return i.value.trim(); });
        var sel = row.querySelector('.q-ans');
        q.answer = sel ? sel.value : '0';
      } else if (type === 'tf') {
        var s2 = row.querySelector('.q-ans');
        q.answer = s2 ? s2.value : 'صح';
      } else {
        var ta = row.querySelector('.q-ans');
        q.answer = ta ? ta.value.trim() : '';
      }
      return q;
    }).filter(function (q) { return q.text || q.answer; });
  }

  function totalMarks(qs) {
    return qs.reduce(function (s, q) { return s + (q.marks || 0); }, 0);
  }

  /* ---------------- الطباعة ---------------- */
  function printExam(r, withKey) {
    var qs = r.questions || [];
    var body = qs.map(function (q, i) {
      var s = '<div class="pr-sec" style="break-inside:avoid"><h4>السؤال ' + (i + 1) + ' — ' +
        esc(QL[q.type] || q.type) + ' (' + (q.marks || 0) + ' درجة)</h4>' +
        '<p>' + esc(q.text || '') + '</p>';
      if (q.type === 'mcq') {
        s += '<ul style="margin:4px 18px;padding:0">' + (q.choices || []).filter(Boolean).map(function (c, ci) {
          return '<li>' + LETTERS[ci] + ') ' + esc(c) + '</li>';
        }).join('') + '</ul>';
      } else if (q.type === 'tf') {
        s += '<p>☐ صح      ☐ خطأ</p>';
      } else if (q.type === 'match') {
        s += '<p>المطابقة: ..............................................................</p>';
      } else {
        s += '<p>..............................................................</p>' +
             '<p>..............................................................</p>' +
             '<p>..............................................................</p>';
      }
      if (withKey) {
        var ans = q.type === 'mcq'
          ? 'الاختيار ' + (LETTERS[parseInt(q.answer, 10) || 0])
          : (q.answer || '—');
        s += '<p style="background:#EEF2F7;padding:4px 8px"><b>مفتاح الإجابة:</b> ' + esc(ans) + ' — المستوى: ' + esc(q.level) + '</p>';
      }
      return s + '</div>';
    }).join('');

    return UI.prHead(r.title, (r.kind || 'اختبار') + (withKey ? ' — مفتاح الإجابة (ورقة المعلم)' : ' — ورقة الاختبار'),
        [['المادة', r.subject], ['الصف', r.grade], ['الزمن', (r.duration || '—') + ' دقيقة'],
         ['التاريخ', UI.fmtAr(r.date || UI.todayISO())], ['عدد الأسئلة', qs.length],
         ['الدرجة الكلية', totalMarks(qs) + ' درجة']])
      + (withKey ? '' : (r.notes ? UI.prSec('إرشادات عامة', UI.prPara(r.notes)) : ''))
      + body
      + (withKey ? '' : UI.prSec('بيانات الطالب', UI.prPara('الاسم: ....................................   الرقم: .........   الصف: ..........')))
      + (withKey ? '' : '<p class="pr-s" style="margin-top:12px">بالتوفيق — يُصحَّح المقالي من المعلم بعد مراجعته.</p>')
      + UI.prSign();
  }

  function examAsText(r) {
    var qs = r.questions || [];
    var t = r.title + '\n' + (r.kind || '') + ' — ' + (r.subject || '') + ' — ' + (r.grade || '') +
      '\nالزمن: ' + (r.duration || '—') + ' دقيقة | الدرجة الكلية: ' + totalMarks(qs) + '\n\n';
    return t + qs.map(function (q, i) {
      var s = (i + 1) + ') [' + (QL[q.type] || q.type) + ' — ' + (q.marks || 0) + ' درجة — ' + (q.level || '') + ']\n' + (q.text || '');
      if (q.type === 'mcq') s += '\n' + (q.choices || []).filter(Boolean).map(function (c, ci) { return '   ' + LETTERS[ci] + ') ' + c; }).join('\n');
      s += '\nالإجابة: ' + (q.type === 'mcq' ? 'الاختيار ' + LETTERS[parseInt(q.answer, 10) || 0] : (q.answer || '—'));
      return s;
    }).join('\n\n');
  }

  /* ---------------- البنك ---------------- */
  function bank() { return UI.coll('qbank'); }
  function setBank(v) { return UI.setColl('qbank', v); }

  function drawBank() {
    var box = $('#bankList');
    if (!box) return;
    var q = ($('#bankSearch') ? $('#bankSearch').value.trim() : '').toLowerCase();
    var list = bank().filter(function (x) {
      return !q || ((x.text || '') + ' ' + (x.subject || '') + ' ' + (x.grade || '') + ' ' + (x.topic || '')).toLowerCase().indexOf(q) !== -1;
    });
    $('#bankCount').textContent = bank().length + ' سؤال';
    if (!bank().length) {
      box.innerHTML = '<div class="empty"><b>بنك الأسئلة فارغ</b>احفظي أسئلة أي اختبار إلى البنك، ثم أعيدي إدراجها في اختبارات قادمة.</div>';
      return;
    }
    if (!list.length) { box.innerHTML = '<div class="empty">لا نتائج مطابقة.</div>'; return; }
    box.innerHTML = list.map(function (x) {
      return '<div class="cr-row"><div class="cr-main"><b>' + esc((x.text || '').slice(0, 80)) +
        ((x.text || '').length > 80 ? '…' : '') + '</b>' +
        '<div class="mini">' + esc(QL[x.type] || x.type) + ' · ' + esc(x.marks || 1) + ' درجة · ' +
        esc(x.level || '') + (x.subject ? ' · ' + esc(x.subject) : '') + (x.grade ? ' · ' + esc(x.grade) : '') +
        (x.topic ? ' · ' + esc(x.topic) : '') + '</div></div>' +
        '<span class="btn-row">' +
        '<button class="btn btn-soft btn-sm" data-bins="' + x.id + '">＋ إدراج في الاختبار المفتوح</button>' +
        '<button class="btn btn-danger btn-sm" data-bdel="' + x.id + '">حذف</button></span></div>';
    }).join('');

    $$('#bankList [data-bins]').forEach(function (b) {
      b.onclick = function () {
        var x = bank().filter(function (y) { return y.id === b.getAttribute('data-bins'); })[0];
        if (!x) return;
        var cur = readQs();
        var html = qRowHTML({
          type: x.type, text: x.text, choices: x.choices || ['', '', '', ''],
          answer: x.answer, marks: x.marks || 1, level: x.level || 'أساسي'
        }, cur.length);
        $('#qsBody').insertAdjacentHTML('beforeend', html);
        wireQRows();
        notify('أُدرج السؤال في الاختبار ✓', 'ok');
        $('#qsCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    });
    $$('#bankList [data-bdel]').forEach(function (b) {
      b.onclick = function () {
        UI.confirm('حذف هذا السؤال من البنك؟').then(function (ok) {
          if (!ok) return;
          setBank(bank().filter(function (y) { return y.id !== b.getAttribute('data-bdel'); }));
          drawBank(); notify('حُذف السؤال');
        });
      };
    });
  }

  function wireQRows() {
    $$('#qsBody .q-del').forEach(function (b) {
      b.onclick = function () {
        if ($('#qsBody').querySelectorAll('.q-row').length <= 1) { notify('يجب أن يبقى سؤال واحد على الأقل', 'err'); return; }
        b.closest('.q-row').remove();
        renumber();
      };
    });
    $$('#qsBody .q-type').forEach(function (sel) {
      sel.onchange = function () {
        var cur = readQs();
        var idx = $$('#qsBody .q-row').indexOf(sel.closest('.q-row'));
        var keep = cur[idx] || blankQ();
        keep.type = sel.value;
        if (keep.type === 'mcq' && (!keep.choices || keep.choices.length < 4)) keep.choices = ['', '', '', ''];
        sel.closest('.q-row').outerHTML = qRowHTML(keep, idx);
        wireQRows();
      };
    });
    updateMarks();
    $$('#qsBody .q-marks').forEach(function (i) { i.addEventListener('input', updateMarks); });
  }

  function renumber() {
    $$('#qsBody .q-row').forEach(function (row, i) {
      var b = row.querySelector('.badge');
      if (b) b.textContent = 'سؤال ' + (i + 1);
    });
    updateMarks();
  }

  function updateMarks() {
    var el = $('#marksState');
    if (!el) return;
    var qs = readQs();
    el.textContent = qs.length + ' سؤال · المجموع ' + totalMarks(qs) + ' درجة';
  }

  /* ---------------- الصفحة ---------------- */
  var editingId = null;

  function exams() { return UI.coll('exams'); }
  function setExams(v) { return UI.setColl('exams', v); }

  function resetForm() {
    editingId = null;
    UI.clearForm(EXAM_FIELDS, 'e_');
    $('#e_date').value = UI.todayISO();
    $('#e_duration').value = '45';
    $('#qsBody').innerHTML = qRowHTML(blankQ(), 0) + qRowHTML(blankQ(), 1);
    wireQRows();
    updateState();
  }

  function loadExam(r) {
    editingId = r.id;
    UI.fillForm(EXAM_FIELDS, r, 'e_');
    $('#qsBody').innerHTML = (r.questions && r.questions.length ? r.questions : [blankQ()]).map(qRowHTML).join('');
    wireQRows();
    updateState();
    window.scrollTo(0, 0);
    notify('فُتح الاختبار للتعديل — لا تنسَ الحفظ');
  }

  function updateState() {
    var el = $('#eState');
    if (!el) return;
    el.innerHTML = editingId
      ? '<span class="badge ok">تعدّلين اختبارًا محفوظًا</span>'
      : '<span class="badge">اختبار جديد غير محفوظ</span>';
  }

  function collect() {
    var d = UI.readForm(EXAM_FIELDS, 'e_');
    d.questions = readQs();
    d.total = totalMarks(d.questions);
    return d;
  }

  function save() {
    var d = collect();
    if (!d.title) { notify('اكتبي عنوان الاختبار أولًا', 'err'); $('#e_title').focus(); return; }
    if (!d.kind) { notify('اختاري نوع الاختبار (قبلي · تكويني · ختامي…) أولًا', 'err'); $('#e_kind').focus(); return; }
    if (!d.questions.length) { notify('أضيفي سؤالًا واحدًا على الأقل', 'err'); return; }
    var list = exams(), now = new Date().toISOString();
    if (editingId) {
      var found = false;
      list = list.map(function (x) {
        if (x.id === editingId) { found = true; d.id = x.id; d.createdAt = x.createdAt; d.updatedAt = now; return d; }
        return x;
      });
      if (!found) { editingId = null; return save(); }
      var r = setExams(list);
      notify(r.ok ? 'حُدِّث الاختبار ✓' : r.error, r.ok ? 'ok' : 'err');
    } else {
      d.id = Store.uid(); d.createdAt = now; d.updatedAt = now;
      list.unshift(d);
      var r2 = setExams(list);
      if (!r2.ok) { notify(r2.error, 'err'); return; }
      editingId = d.id;
      notify('حُفظ الاختبار ✓', 'ok');
    }
    drawExams();
    updateState();
  }

  function drawExams() {
    var box = $('#examList');
    var q = ($('#examSearch') ? $('#examSearch').value.trim() : '').toLowerCase();
    var list = exams();
    $('#examCount').textContent = list.length + ' اختبار';
    if (!box) return;
    var view = list.filter(function (r) {
      return !q || ((r.title || '') + ' ' + (r.grade || '') + ' ' + (r.subject || '') + ' ' + (r.kind || '')).toLowerCase().indexOf(q) !== -1;
    });
    if (!list.length) { box.innerHTML = '<div class="empty"><b>لا اختبارات محفوظة بعد</b>ابني اختباركِ الأول من النموذج أعلاه.</div>'; return; }
    if (!view.length) { box.innerHTML = '<div class="empty">لا نتائج مطابقة.</div>'; return; }
    box.innerHTML = view.map(function (r) {
      return '<div class="cr-row"><div class="cr-main"><b>' + esc(r.title) + '</b>' +
        '<div class="mini">' + esc(r.kind) + ' · ' + esc(r.grade || 'بلا صف') + ' · ' +
        esc((r.questions || []).length) + ' سؤال · ' + esc(r.total || 0) + ' درجة · ' +
        esc(r.duration || '—') + ' دقيقة</div></div>' +
        '<span class="btn-row">' +
        '<button class="btn btn-soft btn-sm" data-ex="' + r.id + '">✏️ تعديل</button>' +
        '<button class="btn btn-navy btn-sm" data-xp="' + r.id + '">🖨️ ورقة الاختبار</button>' +
        '<button class="btn btn-navy btn-sm" data-xk="' + r.id + '">🔑 مفتاح الإجابة</button>' +
        '<button class="btn btn-ghost btn-sm" data-xd="' + r.id + '">⧉ تكرار</button>' +
        '<button class="btn btn-ghost btn-sm" data-xt="' + r.id + '">⬇️ نص</button>' +
        '<button class="btn btn-danger btn-sm" data-xx="' + r.id + '">حذف</button>' +
        '</span></div>';
    }).join('');

    $$('#examList [data-ex]').forEach(function (b) { b.onclick = function () { loadExam(exams().filter(function (x) { return x.id === b.getAttribute('data-ex'); })[0]); }; });
    $$('#examList [data-xp]').forEach(function (b) { b.onclick = function () { var r = exams().filter(function (x) { return x.id === b.getAttribute('data-xp'); })[0]; UI.print(printExam(r, false)); }; });
    $$('#examList [data-xk]').forEach(function (b) { b.onclick = function () { var r = exams().filter(function (x) { return x.id === b.getAttribute('data-xk'); })[0]; UI.print(printExam(r, true)); }; });
    $$('#examList [data-xt]').forEach(function (b) {
      b.onclick = function () {
        var r = exams().filter(function (x) { return x.id === b.getAttribute('data-xt'); })[0];
        UI.download('اختبار-' + (r.title || '') + '.txt', examAsText(r), 'text/plain');
        notify('نُزِّل ملف النص ✓', 'ok');
      };
    });
    $$('#examList [data-xd]').forEach(function (b) {
      b.onclick = function () {
        var r = exams().filter(function (x) { return x.id === b.getAttribute('data-xd'); })[0];
        var c = JSON.parse(JSON.stringify(r));
        c.id = Store.uid(); c.title = r.title + ' (نسخة)'; c.createdAt = new Date().toISOString(); c.updatedAt = c.createdAt;
        var l = exams(); l.unshift(c); setExams(l);
        drawExams(); notify('أُنشئت نسخة من الاختبار ✓', 'ok');
      };
    });
    $$('#examList [data-xx]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-xx');
        var r = exams().filter(function (x) { return x.id === id; })[0];
        UI.confirm('حذف الاختبار «' + r.title + '» نهائيًا؟').then(function (ok) {
          if (!ok) return;
          setExams(exams().filter(function (x) { return x.id !== id; }));
          if (editingId === id) { editingId = null; resetForm(); }
          drawExams(); notify('حُذف الاختبار ✓', 'ok');
        });
      };
    });
  }

  App.register('exams', function (main, mod) {
    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
        '<span class="mh-ic" aria-hidden="true">' + (mod ? mod.i : '🧪') + '</span>' +
        '<div style="flex:1;min-width:220px"><h2>' + esc(mod ? mod.t : 'منشئ الاختبارات') + '</h2>' +
        '<p>' + esc(mod ? mod.d : '') + '</p></div>' +
        '<span class="badge ok">جاهز الآن</span>' +
      '</div></div>' +

      '<div class="notice warn"><b>قاعدة تربوية:</b> التصحيح الآلي يقتصر على الأسئلة الموضوعية ' +
        '(اختيار من متعدد، صح/خطأ، مطابقة). أما الأسئلة المفتوحة والمسائل فتُصحَّح بمرجعية من المعلم — ' +
        'ولا يُتخذ أي قرار تربوي بالاعتماد على الآلة وحدها.</div>' +

      '<section class="card">' +
        '<div class="btn-row" style="margin-bottom:12px">' +
          '<button class="btn btn-primary" id="eSave">💾 حفظ الاختبار</button>' +
          '<button class="btn btn-soft" id="eNew">➕ اختبار جديد</button>' +
          '<button class="btn btn-navy" id="ePrint">🖨️ ورقة الاختبار</button>' +
          '<button class="btn btn-navy" id="eKey">🔑 مفتاح الإجابة</button>' +
          '<span id="eState"></span>' +
        '</div>' +
        UI.formHTML(EXAM_FIELDS) +
        '<div id="qsCard"><h3 style="margin-top:16px">الأسئلة <span class="badge" id="marksState"></span></h3>' +
          '<div id="qsBody"></div>' +
          '<div class="btn-row">' +
            '<button class="btn btn-soft" id="qAdd">＋ إضافة سؤال</button>' +
            '<button class="btn btn-soft" id="qAddBank">📥 إدراج من بنك الأسئلة</button>' +
            '<button class="btn btn-ghost" id="qSaveBank">📤 حفظ أسئلة هذا الاختبار في البنك</button>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="card"><h3>📚 الاختبارات المحفوظة <span class="badge" id="examCount"></span></h3>' +
        '<div class="field"><input type="search" id="examSearch" placeholder="ابحثي بعنوان الاختبار أو الصف…" aria-label="بحث في الاختبارات"></div>' +
        '<div id="examList"></div></section>' +

      '<section class="card"><h3>🗃️ بنك الأسئلة <span class="badge" id="bankCount"></span></h3>' +
        '<p class="mini" style="margin-top:0">اسألي الأسئلة مرة واحدة واستخدميها في اختبارات متعددة. ' +
        'الإدراج يضيف السؤال إلى الاختبار المفتوح في الأعلى.</p>' +
        '<div class="field"><input type="search" id="bankSearch" placeholder="ابحثي في بنك الأسئلة…" aria-label="بحث في البنك"></div>' +
        '<div id="bankList"></div></section>';

    /* ربط الأحداث — حقول الاختبار تبدأ بـ e_ */
    EXAM_FIELDS.forEach(function (f) {
      var el = $('#f_' + f.k);
      if (el) el.id = 'e_' + f.k;
    });

    $('#eSave').onclick = save;
    $('#eNew').onclick = function () {
      if (editingId || readQs().length) {
        UI.confirm('فتح اختبار جديد؟ التغييرات غير المحفوظة ستُفقد.').then(function (ok) {
          if (!ok) return;
          resetForm(); notify('اختبار جديد جاهز ✓');
        });
        return;
      }
      resetForm(); notify('اختبار جديد جاهز ✓');
    };
    $('#ePrint').onclick = function () {
      var d = collect();
      if (!d.title) { notify('اكتبي عنوان الاختبار قبل الطباعة', 'err'); return; }
      if (!d.questions.length) { notify('أضيفي الأسئلة أولًا', 'err'); return; }
      UI.print(printExam(d, false));
    };
    $('#eKey').onclick = function () {
      var d = collect();
      if (!d.questions.length) { notify('لا أسئلة لطباعة المفتاح', 'err'); return; }
      UI.print(printExam(d, true));
    };
    $('#qAdd').onclick = function () {
      var n = readQs().length;
      $('#qsBody').insertAdjacentHTML('beforeend', qRowHTML(blankQ(), n));
      wireQRows();
      var rows = $$('#qsBody .q-row');
      rows[rows.length - 1].querySelector('.q-text').focus();
    };
    $('#qAddBank').onclick = function () {
      drawBank();
      var box = UI.modal('إدراج من بنك الأسئلة',
        '<div class="field"><input type="search" id="bankModalSearch" placeholder="ابحثي…"></div>' +
        '<div id="bankModalList" style="max-height:50vh;overflow:auto"></div>');
      function draw() {
        var q = ($('#bankModalSearch').value || '').trim().toLowerCase();
        var list = bank().filter(function (x) { return !q || ((x.text || '') + ' ' + (x.subject || '')).toLowerCase().indexOf(q) !== -1; });
        $('#bankModalList').innerHTML = list.length ? list.map(function (x) {
          return '<label class="check" style="padding:7px 0;border-bottom:1px dashed var(--border)">' +
            '<input type="checkbox" value="' + x.id + '" checked>' +
            '<span>' + esc((x.text || '').slice(0, 90)) + '<br><small class="mini">' +
            esc(QL[x.type] || x.type) + ' · ' + esc(x.marks || 1) + ' درجة</small></span></label>';
        }).join('') : '<div class="empty">لا أسئلة مطابقة في البنك.</div>';
      }
      draw();
      $('#bankModalSearch').addEventListener('input', draw);
      var btns = document.createElement('div');
      btns.className = 'btn-row';
      btns.style.marginTop = '12px';
      btns.innerHTML = '<button class="btn btn-primary" id="bmIn">إدراج المحدد</button>' +
        '<button class="btn btn-ghost" id="bmX">إلغاء</button>';
      box.appendChild(btns);
      $('#bmX').onclick = UI.closeModal;
      $('#bmIn').onclick = function () {
        var ids = $$('#bankModalList input:checked').map(function (c) { return c.value; });
        if (!ids.length) { notify('لم تُحددي أسئلة', 'err'); return; }
        var cur = readQs();
        var html = ids.map(function (id, i) {
          var x = bank().filter(function (y) { return y.id === id; })[0];
          return qRowHTML({ type: x.type, text: x.text, choices: x.choices || ['', '', '', ''],
            answer: x.answer, marks: x.marks || 1, level: x.level || 'أساسي' }, cur.length + i);
        }).join('');
        $('#qsBody').insertAdjacentHTML('beforeend', html);
        wireQRows();
        UI.closeModal();
        notify('أُدرج ' + ids.length + ' أسئلة ✓', 'ok');
      };
    };
    $('#qSaveBank').onclick = function () {
      var qs = readQs();
      if (!qs.length) { notify('لا أسئلة لحفظها في البنك', 'err'); return; }
      UI.prompt('موضوع/درس الأسئلة (يظهر في البنك):', $('#e_title').value).then(function (topic) {
        if (topic === null) return;
        var b = bank();
        qs.forEach(function (q) {
          b.unshift({
            id: Store.uid(), type: q.type, text: q.text, choices: q.choices, answer: q.answer,
            marks: q.marks, level: q.level, topic: topic || '',
            subject: $('#e_subject').value, grade: $('#e_grade').value, at: new Date().toISOString()
          });
        });
        setBank(b);
        drawBank();
        notify('حُفظ ' + qs.length + ' أسئلة في البنك ✓', 'ok');
      });
    };
    $('#bankSearch').addEventListener('input', drawBank);

    resetForm();
    drawExams();
    drawBank();
  });

})(window);
