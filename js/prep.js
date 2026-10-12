/* =========================================================
   prep.js — استوديو تحضير الدروس
   إنشاء · تعديل · حذف · بحث · قوالب · طباعة A4
   يعتمد على App.ui المُعرَّف في app.js
   ========================================================= */
(function (global) {
  'use strict';

  var App = global.App;
  if (!App) { console.error('prep.js: وحدة App غير متاحة'); return; }

  var U = App.ui;
  var $ = U.$, $$ = U.$$, esc = U.esc, notify = U.notify,
      fmtAr = U.fmtAr, todayISO = U.todayISO;

  var TYPES = { daily: 'تحضير يومي', weekly: 'تحضير أسبوعي', term: 'تحضير فصلي' };
  var TABS = [
    { id: 'data', t: 'البيانات الأساسية' },
    { id: 'obj', t: 'الأهداف والمتطلبات' },
    { id: 'intro', t: 'التمهيد والاستراتيجيات' },
    { id: 'steps', t: 'خطوات الدرس' },
    { id: 'acts', t: 'الأنشطة والفروق' },
    { id: 'eval', t: 'التقويم والواجب' },
    { id: 'refl', t: 'التأمل الذاتي' }
  ];

  var editingId = null;

  /* ---------------- أدوات مساعدة ---------------- */
  function preps() { return Store.get('preps', []) || []; }
  function setPreps(v) { return Store.set('preps', v); }
  function templates() { return Store.get('prepTemplates', []) || []; }

  function val(id) { var e = $('#' + id); return e ? e.value.trim() : ''; }

  function stepRow(v) {
    v = v || {};
    return '<tr>' +
      '<td><input type="text" class="s-time" value="' + esc(v.time || '') + '" placeholder="5 د" aria-label="الزمن"></td>' +
      '<td><input type="text" class="s-step" value="' + esc(v.step || '') + '" placeholder="وصف الخطوة" aria-label="الخطوة"></td>' +
      '<td><input type="text" class="s-tr" value="' + esc(v.tr || '') + '" placeholder="ماذا يفعل المعلم" aria-label="دور المعلم"></td>' +
      '<td><input type="text" class="s-lr" value="' + esc(v.lr || '') + '" placeholder="ماذا يفعل المتعلم" aria-label="دور المتعلم"></td>' +
      '<td style="text-align:center"><button type="button" class="btn btn-danger btn-sm s-del" aria-label="حذف هذا الصف">✕</button></td>' +
      '</tr>';
  }

  function readSteps() {
    return $$('#stepsBody tr').map(function (tr) {
      return {
        time: tr.querySelector('.s-time').value.trim(),
        step: tr.querySelector('.s-step').value.trim(),
        tr: tr.querySelector('.s-tr').value.trim(),
        lr: tr.querySelector('.s-lr').value.trim()
      };
    }).filter(function (s) { return s.step || s.tr || s.lr || s.time; });
  }

  function fillSteps(steps) {
    $('#stepsBody').innerHTML = (steps && steps.length ? steps : [{}]).map(stepRow).join('');
    wireStepRows();
  }
  function wireStepRows() {
    $$('#stepsBody .s-del').forEach(function (b) {
      b.onclick = function () {
        if ($('#stepsBody').rows.length <= 1) { notify('يجب أن يبقى صف واحد على الأقل', 'err'); return; }
        b.closest('tr').remove();
      };
    });
  }

  /* ---------------- الحفظ ---------------- */
  function collect() {
    return {
      type: val('p_type') || 'daily',
      date: val('p_date') || todayISO(),
      teacher: val('p_teacher'), school: val('p_school'),
      subject: val('p_subject'), grade: val('p_grade'),
      unit: val('p_unit'), lesson: val('p_lesson'), duration: val('p_duration'),
      objK: val('p_objK'), objS: val('p_objS'), objA: val('p_objA'), objX: val('p_objX'),
      prior: val('p_prior'),
      intro: val('p_intro'), strategies: val('p_strategies'),
      aids: val('p_aids'), examples: val('p_examples'),
      steps: readSteps(),
      act: val('p_act'), diff: val('p_diff'),
      evalPre: val('p_evalPre'), evalForm: val('p_evalForm'), evalEnd: val('p_evalEnd'),
      homework: val('p_homework'), summary: val('p_summary'), reflection: val('p_reflection')
    };
  }

  function save() {
    var d = collect();
    if (!d.lesson) { notify('اكتبي عنوان الدرس أولًا', 'err'); $('#p_lesson').focus(); return; }
    var list = preps(), now = new Date().toISOString();

    if (editingId) {
      var found = false;
      list = list.map(function (p) {
        if (p.id === editingId) { found = true; d.id = p.id; d.createdAt = p.createdAt; d.updatedAt = now; return d; }
        return p;
      });
      if (!found) { editingId = null; return save(); }
      var r = setPreps(list);
      notify(r.ok ? 'حُدِّث التحضير ✓' : r.error, r.ok ? 'ok' : 'err');
    } else {
      d.id = Store.uid(); d.createdAt = now; d.updatedAt = now;
      list.unshift(d);
      var r2 = setPreps(list);
      if (!r2.ok) { notify(r2.error, 'err'); list.shift(); return; }
      editingId = d.id;
      notify('حُفظ التحضير ✓', 'ok');
    }
    drawList();
    updateToolbar();
  }

  function resetForm() {
    editingId = null;
    ['p_lesson', 'p_unit', 'p_objK', 'p_objS', 'p_objA', 'p_objX', 'p_prior', 'p_intro',
     'p_strategies', 'p_aids', 'p_examples', 'p_act', 'p_diff', 'p_evalPre', 'p_evalForm',
     'p_evalEnd', 'p_homework', 'p_summary', 'p_reflection'].forEach(function (id) {
      var e = $('#' + id); if (e) e.value = '';
    });
    $('#p_date').value = todayISO();
    $('#p_duration').value = '45';
    $('#p_type').value = 'daily';
    var p = Store.get('profile', {}) || {};
    $('#p_teacher').value = p.name || '';
    $('#p_school').value = p.school || '';
    $('#p_subject').value = p.subject || '';
    fillSteps([{}]);
    showTab('data');
    updateToolbar();
  }

  function loadIntoForm(d) {
    editingId = d.id || null;
    $('#p_type').value = d.type || 'daily';
    $('#p_date').value = d.date || todayISO();
    $('#p_teacher').value = d.teacher || '';
    $('#p_school').value = d.school || '';
    $('#p_subject').value = d.subject || '';
    $('#p_grade').value = d.grade || '';
    $('#p_unit').value = d.unit || '';
    $('#p_lesson').value = d.lesson || '';
    $('#p_duration').value = d.duration || '45';
    $('#p_objK').value = d.objK || '';
    $('#p_objS').value = d.objS || '';
    $('#p_objA').value = d.objA || '';
    $('#p_objX').value = d.objX || '';
    $('#p_prior').value = d.prior || '';
    $('#p_intro').value = d.intro || '';
    $('#p_strategies').value = d.strategies || '';
    $('#p_aids').value = d.aids || '';
    $('#p_examples').value = d.examples || '';
    $('#p_act').value = d.act || '';
    $('#p_diff').value = d.diff || '';
    $('#p_evalPre').value = d.evalPre || '';
    $('#p_evalForm').value = d.evalForm || '';
    $('#p_evalEnd').value = d.evalEnd || '';
    $('#p_homework').value = d.homework || '';
    $('#p_summary').value = d.summary || '';
    $('#p_reflection').value = d.reflection || '';
    fillSteps(d.steps);
    showTab('data');
    updateToolbar();
    window.scrollTo(0, 0);
    notify(d.id ? 'فُتح التحضير للتعديل — لا تنسَ الحفظ' : 'نُسخت البنية إلى النموذج');
  }

  function updateToolbar() {
    var el = $('#editState');
    if (!el) return;
    if (editingId) {
      var p = preps().filter(function (x) { return x.id === editingId; })[0];
      el.innerHTML = '<span class="badge ok">تعدّلين الآن: ' + esc(p ? p.lesson : '') + '</span>';
    } else {
      el.innerHTML = '<span class="badge">تحضير جديد غير محفوظ</span>';
    }
  }

  /* ---------------- القوالب ---------------- */
  function saveTemplate() {
    var d = collect();
    if (!d.lesson) { notify('اكتبي عنوان الدرس حتى تعرفين القالب لاحقًا', 'err'); return; }
    var name = prompt('اسم القالب (يُستخدم عند الاستخدام لاحقًا):', d.lesson + ' — قالب');
    if (name === null) return;
    var t = templates();
    t.unshift({ id: Store.uid(), name: (name || d.lesson).trim(), data: d, at: new Date().toISOString() });
    var r = Store.set('prepTemplates', t.slice(0, 30));
    notify(r.ok ? 'حُفظ القالب ✓' : r.error, r.ok ? 'ok' : 'err');
    drawTemplates();
  }

  function drawTemplates() {
    var box = $('#tmplBox'); if (!box) return;
    var t = templates();
    box.innerHTML = t.length
      ? t.map(function (x) {
          return '<div class="log-item"><div style="flex:1"><b>' + esc(x.name) + '</b>' +
            '<div class="mini">' + esc(fmtAr(String(x.at).slice(0, 10))) + '</div></div>' +
            '<span class="btn-row">' +
            '<button class="btn btn-soft btn-sm" data-uset="' + x.id + '">استخدام</button>' +
            '<button class="btn btn-danger btn-sm" data-tdel="' + x.id + '">حذف</button></span></div>';
        }).join('')
      : '<div class="empty">لا توجد قوالب محفوظة. حدّثي الحقول ثم اضغطي «حفظ كقالب».</div>';

    $$('[data-uset]').forEach(function (b) {
      b.onclick = function () {
        var x = templates().filter(function (y) { return y.id === b.getAttribute('data-uset'); })[0];
        if (x) loadIntoForm(x.data);
      };
    });
    $$('[data-tdel]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('حذف هذا القالب؟')) return;
        Store.set('prepTemplates', templates().filter(function (y) { return y.id !== b.getAttribute('data-tdel'); }));
        drawTemplates(); notify('حُذف القالب');
      };
    });
  }

  /* ---------------- القائمة والبحث ---------------- */
  function drawList() {
    var q = ($('#listSearch') ? $('#listSearch').value.trim() : '').toLowerCase();
    var typeF = $('#listType') ? $('#listType').value : 'all';
    var list = preps().slice();

    var view = list.filter(function (p) {
      if (typeF !== 'all' && p.type !== typeF) return false;
      if (!q) return true;
      return ((p.lesson || '') + ' ' + (p.grade || '') + ' ' + (p.unit || '') + ' ' + (p.subject || ''))
        .toLowerCase().indexOf(q) !== -1;
    });

    var box = $('#listBox');
    if (!box) return;

    if (!list.length) {
      box.innerHTML = '<div class="empty"><b>لا توجد تحضيرات محفوظة بعد</b>املئي النموذج أعلاه ثم اضغطي «حفظ التحضير».</div>';
      return;
    }
    if (!view.length) {
      box.innerHTML = '<div class="empty"><b>لا نتائج مطابقة للبحث</b>جرّبي كلمة أخرى أو غيّري التصفية.</div>';
      return;
    }

    box.innerHTML = view.map(function (p) {
      return '<div class="log-item" style="align-items:flex-start">' +
        '<div style="flex:1">' +
          '<b>' + esc(p.lesson || '(بلا عنوان)') + '</b> ' +
          '<span class="badge ' + (p.type === 'daily' ? 'info' : 'wait') + '">' + esc(TYPES[p.type] || p.type) + '</span>' +
          '<div class="mini">' +
            esc(p.grade || 'بلا صف') + (p.unit ? ' · ' + esc(p.unit) : '') +
            (p.subject ? ' · ' + esc(p.subject) : '') +
            ' · ' + esc(fmtAr(p.date)) +
            (p.duration ? ' · ' + esc(p.duration) + ' دقيقة' : '') +
          '</div>' +
        '</div>' +
        '<span class="btn-row">' +
          '<button class="btn btn-soft btn-sm" data-edit="' + p.id + '">✏️ تعديل</button>' +
          '<button class="btn btn-navy btn-sm" data-print="' + p.id + '">🖨️ طباعة</button>' +
          '<button class="btn btn-danger btn-sm" data-del="' + p.id + '">حذف</button>' +
        '</span></div>';
    }).join('');

    $$('[data-edit]').forEach(function (b) {
      b.onclick = function () {
        var p = preps().filter(function (x) { return x.id === b.getAttribute('data-edit'); })[0];
        if (p) loadIntoForm(p);
      };
    });
    $$('[data-print]').forEach(function (b) {
      b.onclick = function () {
        var p = preps().filter(function (x) { return x.id === b.getAttribute('data-print'); })[0];
        if (p) printPrep(p);
      };
    });
    $$('[data-del]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-del');
        var p = preps().filter(function (x) { return x.id === id; })[0];
        if (!confirm('حذف تحضير «' + (p ? p.lesson : '') + '» نهائيًا؟')) return;
        var r = setPreps(preps().filter(function (x) { return x.id !== id; }));
        if (editingId === id) { editingId = null; updateToolbar(); }
        drawList(); notify(r.ok ? 'حُذف التحضير ✓' : r.error, r.ok ? 'ok' : 'err');
      };
    });
  }

  /* ---------------- الطباعة A4 ---------------- */
  function sec(title, body) {
    if (!body) return '';
    return '<div class="pr-sec"><h4>' + esc(title) + '</h4>' + body + '</div>';
  }
  function para(t) { return t ? '<p>' + esc(t) + '</p>' : ''; }
  function bullets(t) {
    if (!t) return '';
    return '<ul style="margin:4px 18px;padding:0">' +
      String(t).split(/\n+/).filter(function (l) { return l.trim(); })
        .map(function (l) { return '<li>' + esc(l.trim()) + '</li>'; }).join('') + '</ul>';
  }

  function buildPrint(d) {
    var meta =
      '<div class="pr-meta">' +
        '<span><b>المعلم:</b> ' + esc(d.teacher || '—') + '</span>' +
        '<span><b>المدرسة:</b> ' + esc(d.school || '—') + '</span>' +
        '<span><b>المادة:</b> ' + esc(d.subject || '—') + '</span>' +
        '<span><b>الصف:</b> ' + esc(d.grade || '—') + '</span>' +
        '<span><b>الوحدة:</b> ' + esc(d.unit || '—') + '</span>' +
        '<span><b>زمن الحصة:</b> ' + esc(d.duration || '—') + '</span>' +
        '<span><b>التاريخ:</b> ' + esc(fmtAr(d.date)) + '</span>' +
        '<span><b>النوع:</b> ' + esc(TYPES[d.type] || '—') + '</span>' +
      '</div>';

    var steps = (d.steps && d.steps.length)
      ? '<table class="pr-tbl"><thead><tr>' +
          '<th style="width:12%">الزمن</th><th style="width:30%">الخطوة</th>' +
          '<th style="width:29%">دور المعلم</th><th style="width:29%">دور المتعلم</th>' +
        '</tr></thead><tbody>' +
        d.steps.map(function (s) {
          return '<tr><td>' + esc(s.time || '') + '</td><td>' + esc(s.step || '') + '</td>' +
            '<td>' + esc(s.tr || '') + '</td><td>' + esc(s.lr || '') + '</td></tr>';
        }).join('') + '</tbody></table>'
      : '';

    return '' +
      '<div class="pr-h">' +
        '<p class="pr-t">تحضير درس: ' + esc(d.lesson || '—') + '</p>' +
        '<p class="pr-s">' + esc(TYPES[d.type] || '') + ' · المعلم الليبي الرقمي</p>' +
        meta +
      '</div>' +
      sec('الأهداف', '<div style="font-size:13.5px">' +
        (d.objK ? '<p><b>المعرفية:</b> ' + esc(d.objK) + '</p>' : '') +
        (d.objS ? '<p><b>المهارية:</b> ' + esc(d.objS) + '</p>' : '') +
        (d.objA ? '<p><b>الوجدانية:</b> ' + esc(d.objA) + '</p>' : '') +
        (d.objX ? '<p><b>أهداف إضافية:</b> ' + esc(d.objX) + '</p>' : '') + '</div>') +
      sec('المتطلبات السابقة', para(d.prior)) +
      sec('التمهيد والتهيئة', para(d.intro)) +
      sec('استراتيجيات التدريس', bullets(d.strategies)) +
      sec('الوسائل التعليمية', bullets(d.aids)) +
      sec('خطوات عرض الدرس بالتوقيت', steps) +
      sec('الأمثلة والتطبيقات', para(d.examples)) +
      sec('الأنشطة (فردية/جماعية)', para(d.act)) +
      sec('مراعاة الفروق الفردية', para(d.diff)) +
      sec('التقويم', '<div style="font-size:13.5px">' +
        (d.evalPre ? '<p><b>القبلي:</b> ' + esc(d.evalPre) + '</p>' : '') +
        (d.evalForm ? '<p><b>التكويني:</b> ' + esc(d.evalForm) + '</p>' : '') +
        (d.evalEnd ? '<p><b>الختامي:</b> ' + esc(d.evalEnd) + '</p>' : '') + '</div>') +
      sec('الواجب المنزلي', para(d.homework)) +
      sec('ملخص الدرس', para(d.summary)) +
      sec('التأمل الذاتي للمعلم بعد التنفيذ', para(d.reflection)) +
      '<div class="pr-sign"><span>توقيع المعلم: ..............................</span>' +
      '<span>تأشيرة المشرف: ..............................</span></div>';
  }

  function printPrep(d) {
    $('#print-area').innerHTML = buildPrint(d);
    notify('ستُفتح نافذة الطباعة — لحفظ PDF اختاري الوجهة «حفظ بصيغة PDF»');
    setTimeout(function () { window.print(); }, 150);
  }

  /* ---------------- التبويبات ---------------- */
  function showTab(id) {
    $$('#prepTabs button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === id); });
    $$('#prepPanes [data-pane]').forEach(function (p) { p.style.display = p.getAttribute('data-pane') === id ? '' : 'none'; });
  }

  /* ---------------- البناء ---------------- */
  function field(id, label, opts) {
    opts = opts || {};
    var input;
    if (opts.area) {
      input = '<textarea id="' + id + '" placeholder="' + esc(opts.ph || '') + '">' + esc(opts.v || '') + '</textarea>';
    } else {
      input = '<input type="' + (opts.type || 'text') + '" id="' + id + '" value="' + esc(opts.v || '') +
        '" placeholder="' + esc(opts.ph || '') + '"' + (opts.dir ? ' dir="' + opts.dir + '"' : '') +
        (opts.min ? ' min="' + opts.min + '"' : '') + '>';
    }
    return '<div class="field"' + (opts.wide ? ' style="grid-column:1/-1"' : '') + '>' +
      '<label for="' + id + '">' + esc(label) + '</label>' + input +
      (opts.hint ? '<div class="hint">' + esc(opts.hint) + '</div>' : '') + '</div>';
  }

  function render(main) {
    var p = Store.get('profile', {}) || {};

    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
        '<span class="mh-ic" aria-hidden="true">📝</span>' +
        '<div style="flex:1;min-width:220px"><h2>استوديو تحضير الدروس</h2>' +
        '<p>تحضير متكامل: أهداف وخطوات بتوقيت وتقويم وتأمل — مع حفظ القوالب والطباعة A4.</p></div>' +
        '<span class="badge ok">جاهز الآن</span>' +
      '</div></div>' +

      '<section class="card">' +
        '<div class="btn-row" style="margin-bottom:14px">' +
          '<button class="btn btn-primary" id="pSave">💾 حفظ التحضير</button>' +
          '<button class="btn btn-soft" id="pNew">➕ تحضير جديد</button>' +
          '<button class="btn btn-navy" id="pPrint">🖨️ طباعة (A4 / PDF)</button>' +
          '<button class="btn btn-soft" id="pTmpl">⭐ حفظ كقالب</button>' +
          '<span id="editState"></span>' +
        '</div>' +

        '<div class="tabs" id="prepTabs" role="tablist">' +
          TABS.map(function (t, i) {
            return '<button type="button" role="tab" data-tab="' + t.id + '"' +
              (i === 0 ? ' class="active"' : '') + '>' + esc(t.t) + '</button>';
          }).join('') +
        '</div>' +

        '<div id="prepPanes">' +
          /* البيانات */
          '<div data-pane="data">' +
            '<div class="row">' +
              '<div class="field"><label for="p_type">نوع التحضير</label>' +
                '<select id="p_type">' +
                  '<option value="daily">تحضير يومي</option>' +
                  '<option value="weekly">تحضير أسبوعي</option>' +
                  '<option value="term">تحضير فصلي</option>' +
                '</select></div>' +
              field('p_date', 'التاريخ', { type: 'date' }) +
              field('p_duration', 'زمن الحصة (دقيقة)', { type: 'number', ph: '45', min: '1' }) +
            '</div>' +
            '<div class="row">' +
              field('p_teacher', 'اسم المعلم/المعلمة', { v: p.name || '', ph: 'أ. ...' }) +
              field('p_school', 'المدرسة', { v: p.school || '', ph: 'مثال: متوسطة الأندلس' }) +
              field('p_subject', 'المادة', { v: p.subject || '', ph: 'مثال: الرياضيات' }) +
            '</div>' +
            '<div class="row">' +
              field('p_grade', 'الصف', { ph: 'مثال: الخامس الأساسي' }) +
              field('p_unit', 'الوحدة', { ph: 'مثال: الوحدة الثانية' }) +
              field('p_lesson', 'عنوان الدرس *', { ph: 'مثال: النسبة والتناسب' }) +
            '</div>' +
          '</div>' +

          /* الأهداف */
          '<div data-pane="obj" style="display:none">' +
            '<div class="row2">' +
              field('p_objK', 'الأهداف المعرفية', { area: true, ph: 'مثال: أن يعرّف الطالب مفهوم النسبة' }) +
              field('p_objS', 'الأهداف المهارية', { area: true, ph: 'مثال: أن يحسب نسبًا بسيطة بدقة' }) +
              field('p_objA', 'الأهداف الوجدانية', { area: true, ph: 'مثال: أن يقدّر أهمية الدقة في الحساب' }) +
              field('p_objX', 'أهداف إضافية (سطر لكل هدف)', { area: true, ph: 'اختياري' }) +
            '</div>' +
            field('p_prior', 'المتطلبات السابقة', { area: true, ph: 'ما الذي تعلمه الطلاب قبل هذا الدرس؟' }) +
          '</div>' +

          /* التمهيد */
          '<div data-pane="intro" style="display:none">' +
            field('p_intro', 'التمهيد والتهيئة', { area: true, ph: 'كيف تفتحين الحصة؟ سؤال تحفيزي، موقف حياتي، صورة…' }) +
            '<div class="row2">' +
              field('p_strategies', 'استراتيجيات التدريس (سطر لكل استراتيجية)', { area: true, ph: 'الاستقصاء\nالتعلم التعاوني\nالعصف الذهني' }) +
              field('p_aids', 'الوسائل التعليمية (سطر لكل وسيلة)', { area: true, ph: 'السبورة الذكية\nبطاقات\nمجسمات' }) +
            '</div>' +
          '</div>' +

          /* الخطوات */
          '<div data-pane="steps" style="display:none">' +
            '<div class="tbl-wrap" style="margin-bottom:10px"><table class="tbl">' +
              '<thead><tr><th style="width:11%">الزمن</th><th style="width:31%">الخطوة</th>' +
              '<th style="width:28%">دور المعلم</th><th style="width:28%">دور المتعلم</th><th></th></tr></thead>' +
              '<tbody id="stepsBody"></tbody>' +
            '</table></div>' +
            '<button type="button" class="btn btn-soft btn-sm" id="addStep">＋ إضافة خطوة</button>' +
          '</div>' +

          /* الأنشطة */
          '<div data-pane="acts" style="display:none">' +
            field('p_examples', 'الأمثلة والتطبيقات', { area: true, ph: 'أمثلة محلولة تشرحها في الحصة' }) +
            field('p_act', 'الأنشطة الفردية والجماعية', { area: true, ph: 'نشاط ثنائي… مشروع جماعي…' }) +
            field('p_diff', 'مراعاة الفروق الفردية', { area: true, ph: 'كيف تدعمين المتفوقين ومن يحتاج دعمًا إضافيًا؟' }) +
          '</div>' +

          /* التقويم */
          '<div data-pane="eval" style="display:none">' +
            '<div class="row">' +
              field('p_evalPre', 'التقويم القبلي', { area: true, ph: 'سؤال البداية' }) +
              field('p_evalForm', 'التقويم التكويني', { area: true, ph: 'أثناء الشرح' }) +
              field('p_evalEnd', 'التقويم الختامي', { area: true, ph: 'نهاية الحصة' }) +
            '</div>' +
            field('p_homework', 'الواجب المنزلي', { area: true }) +
            field('p_summary', 'ملخص الدرس', { area: true }) +
          '</div>' +

          /* التأمل */
          '<div data-pane="refl" style="display:none">' +
            '<div class="notice">التأمل الذاتي يُكتب <b>بعد تنفيذ الدرس</b>: ما نجح؟ ما الذي يحتاج تحسينًا؟ وما خطوتكِ القادمة؟</div>' +
            field('p_reflection', 'تأملاتي بعد التنفيذ', { area: true, ph: 'اكتبية بحرية — هذا الحقل لكِ وحدكِ.' }) +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="card"><h3>⭐ القوالب المحفوظة</h3><div id="tmplBox"></div></section>' +

      '<section class="card"><h3>📚 التحضيرات المحفوظة <span class="badge" id="pCount"></span></h3>' +
        '<div class="row2" style="margin-bottom:12px">' +
          '<div class="field" style="margin:0"><input type="search" id="listSearch" placeholder="ابحثي بعنوان الدرس أو الصف أو الوحدة…" aria-label="بحث في التحضيرات"></div>' +
          '<div class="field" style="margin:0"><select id="listType" aria-label="تصفية بالنوع">' +
            '<option value="all">كل الأنواع</option>' +
            '<option value="daily">تحضير يومي</option>' +
            '<option value="weekly">تحضير أسبوعي</option>' +
            '<option value="term">تحضير فصلي</option>' +
          '</select></div>' +
        '</div>' +
        '<div id="listBox"></div>' +
      '</section>';

    /* --- التبويبات --- */
    $$('#prepTabs button').forEach(function (b) {
      b.onclick = function () { showTab(b.getAttribute('data-tab')); };
    });

    /* --- الخطوات --- */
    fillSteps([{}]);
    $('#addStep').onclick = function () {
      $('#stepsBody').insertAdjacentHTML('beforeend', stepRow({}));
      wireStepRows();
      var rows = $$('#stepsBody tr');
      rows[rows.length - 1].querySelector('.s-time').focus();
    };

    /* --- الأزرار --- */
    $('#pSave').onclick = save;
    $('#pNew').onclick = function () {
      if (editingId || $('#p_lesson').value.trim()) {
        if (!confirm('فتح تحضير جديد؟ التغييرات غير المحفوظة في النموذج الحالي ستُفقد.')) return;
      }
      resetForm(); notify('نموذج جديد جاهز ✓');
    };
    $('#pPrint').onclick = function () {
      var d = collect();
      if (!d.lesson) { notify('اكتبي عنوان الدرس قبل الطباعة', 'err'); $('#p_lesson').focus(); return; }
      printPrep(d);
    };
    $('#pTmpl').onclick = saveTemplate;

    /* --- القائمة --- */
    $('#listSearch').addEventListener('input', drawList);
    $('#listType').addEventListener('change', drawList);

    resetForm();
    drawList();
    drawTemplates();
    updateToolbar();
    $('#pCount').textContent = preps().length + ' عنصر';
  }

  App.register('prep', function (main) { render(main); });

})(window);
