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
  var UI = global.UI;   /* نوافذ التأكيد المخصصة (ui.js تُحمَّل قبل هذا الملف) */

  var TYPES = { daily: 'تحضير يومي', weekly: 'تحضير أسبوعي', term: 'تحضير فصلي' };
  var TABS = [
    { id: 'gen', t: '✨ المولّد الذكي' },
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
    var g = $('#g_grade'); if (g) g.value = '';
    var gu = $('#g_unit'); if (gu) gu.value = '';
    var gd = $('#g_dur'); if (gd) gd.value = '45';
    var p = Store.get('profile', {}) || {};
    $('#p_teacher').value = p.name || '';
    $('#p_school').value = p.school || '';
    $('#p_subject').value = p.subject || '';
    fillSteps([{}]);
    showTab('gen');
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
    UI.prompt('اسم القالب (يُستخدم عند الاستخدام لاحقًا):', d.lesson + ' — قالب', 'حفظ كقالب')
      .then(function (name) {
        if (name === null) return;
        var t = templates();
        t.unshift({ id: Store.uid(), name: (name || d.lesson).trim(), data: d, at: new Date().toISOString() });
        var r = Store.set('prepTemplates', t.slice(0, 30));
        notify(r.ok ? 'حُفظ القالب ✓' : r.error, r.ok ? 'ok' : 'err');
        drawTemplates();
      });
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
        UI.confirm('حذف هذا القالب؟').then(function (ok) {
          if (!ok) return;
          Store.set('prepTemplates', templates().filter(function (y) { return y.id !== b.getAttribute('data-tdel'); }));
          drawTemplates(); notify('حُذف القالب');
        });
      };
    });
  }

  /* =========================================================
     المولّد الذكي — قوالب تعليمية جاهزة تعمل بلا إنترنت
     (توليد بقواعد محلية صريحة، وليست نتائج وهمية)
     ========================================================= */

  /* بنك المفاهيم الرياضية — مصنّف بصفوف المرحلة الإعدادية الثلاث + مفهوم حر
     صدق في العرض: هذه مسالك تعليمية متداولة تُساعد على التحضير، وليست نصوصًا
     من الكتاب الرسمي — تُطابَق مع منهج المدرسة من قبل المعلم/ة. */
  var CONCEPTS = [
    /* — الأول الإعدادي (السابع) — */
    { t: 'الأعداد الصحيحة والعمليات عليها', g: 'الأول الإعدادي',
      intro: 'نشبه العددات بدرجات الحرارة والارتفاعات (فوق وتحت الصفر) لتوضيح الجمع والطرح بالسالب.',
      ex: 'ترتيب العددات · الجمع والطرح · القيمة المطلقة · القوى.',
      prior: 'الأعداد الطبيعية · جدول الضرب' },
    { t: 'الكسور الاعتيادية', g: 'الأول الإعدادي',
      intro: 'نبدأ بموقف حياتي: قسمة تفاحة بين ثلاثة أصدقاء — كيف نكتب النصيب؟ نصل إلى مفهوم الكسر والبسط والمقام.',
      ex: 'تبسيط الكسور · إيجاد المضاعف المشترك · مقارنة كسور ذات مقامات مختلفة.',
      prior: 'القسمة على الأعداد · جدول الضرب · مفهوم الجزء من الكل' },
    { t: 'الكسور العشرية', g: 'الأول الإعدادي',
      intro: 'نعرض أسعارًا في المتجر (1.25 د.ل) ونسأل: كيف نقرأ هذا العدد ولماذا نستخدمه بدل الكسر؟',
      ex: 'قراءة وكتابة الكسور العشرية · جمع وطرحها · ضربها في 10 و100 و1000.',
      prior: 'الكسور الاعتيادية · الأعداد الطبيعية والأعداد العشرية' },
    { t: 'النسبة والتناسب', g: 'الأول الإعدادي',
      intro: 'نقارن بين وصفتين لمشروب (علبة: 200 مل بـ1.5 د.ل — علبة: 500 مل بـ3 د.ل): أيهما أفضل ولماذا؟',
      ex: 'كتابة النسبة بالصورة a:b وa/b · التناسب الموجب والسالب · حل مسائل التناسب.',
      prior: 'القسمة · الكسور · الضرب في الأعداد' },
    { t: 'النسبة المئوية', g: 'الأول الإعدادي',
      intro: 'نعرض إعلان «خصم 25%» في السوق ونسأل: كم ندفع فعلًا؟ وكيف نحوّل النسبة إلى رقم؟',
      ex: 'النسبة إلى الكسر والعكس · حساب النسبة المئوية لعدد · الربح والخسارة.',
      prior: 'الكسور · النسبة · الضرب والقسمة' },
    { t: 'القياس والتحويلات', g: 'الأول الإعدادي',
      intro: 'نقيس طول مقعد وطاولة بالمسطرة ثم نسأل: لو أردنا قياس طول الطريق — ما الوحدة أنسب؟ وكيف نحوّل بينها؟',
      ex: 'تحويل وحدات الطول (مم · سم · م · كم) · المساحة والحجم والسعات · تقدير النتيجة قبل الحساب.',
      prior: 'الحساب على الأعداد · المسطرة والمنقلة · الهندسة الصلبة' },
    /* — الثاني الإعدادي (الثامن) — */
    { t: 'المعادلات الخطية بمتغيّر واحد', g: 'الثاني الإعدادي',
      intro: 'لعبة الميزان: إذا أضفنا نفس الكتلة للطرفين يبقى متوازنًا — نمذجة مسألة حسابية بمجهول x.',
      ex: 'كتابة معادلة من مسألة · الحل بعمليات عكسية · التحقق من صحة الحل.',
      prior: 'الأعداد الصحيحة · العمليات الحسابية · مفهوم المجهول' },
    { t: 'الأعداد النسبية وعملياتها', g: 'الثاني الإعدادي',
      intro: 'نسأل: هل يمكن أن يكون الكسر سالبًا؟ نمثّل الأعداد النسبية على خط الأعداد ثم ننفّذ العمليات بترتيب الإشارات.',
      ex: 'جمع وطرح وضرب الكسور (بما فيها السالبة) · ترتيب الأعداد النسبية · مسائل حياتية بالسالب.',
      prior: 'الأعداد الصحيحة · الكسور · قانون الإشارات' },
    { t: 'مجموع زوايا المضلعات', g: 'الثاني الإعدادي',
      intro: 'نطلب من الطلاب قصّ مثلث وطيّ زواياه الثلاثة لتصطف على خط مستقيم — لماذا؟',
      ex: 'استنتاج قانون (ن−2)×180° · حساب زاوية ناقصة · التبرير بجدول الزوايا.',
      prior: 'أنواع المضلعات · قياس الزوايا · خصائص المثلث' },
    { t: 'التناسب في المثلث', g: 'الثاني الإعدادي',
      intro: 'نرسم ظل رمح في الشمس ونسأل: كيف نحسب ارتفاعه دون تسلقه؟ نستعرض قياسات غير مباشرة.',
      ex: 'تطابق المثلثات · نظرية طاليس · إيجاد طول مجهول في شكل شبكي.',
      prior: 'نسبة أضلاع · مثلثات متطابقة · قياسات' },
    { t: 'مساحات المثلث والمتوازي الأضلاع', g: 'الثاني الإعدادي',
      intro: 'نطبّع مثلثًا ومتوازي أضلاع للقواعد والارتفاعات ونسأل: أيهما أكبر مساحة ولماذا؟',
      ex: 'قانونا المساحة (ق×ال÷2 و ق×ال) · مساحة الشبه المنحرف · مسائل بعُلل مركّبة.',
      prior: 'مساحة المستطيل · الضرب والقسمة · خصائص المثلث' },
    /* — الثالث الإعدادي (التاسع) — */
    { t: 'الجذور التربيعية', g: 'الثالث الإعدادي',
      intro: 'نسأل: العدد الذي إذا ضرب في نفسه أعطانا 49 — ما هو؟ نمكّن الطلاب لاستنتاج التربيع الجذري.',
      ex: 'استخراج جذر تربيعي لعدد تام · عمليات الجمع والطرح · تقدير الجذور.',
      prior: 'التربيع · العدد التام · التحليل إلى عوامل' },
    { t: 'الاحتمالات', g: 'الثالث الإعدادي',
      intro: 'نرمي حجر نرد أمام الصف ونسأل: ما احتمال ظهور 6؟ ولماذا لا يتجاوز 1؟',
      ex: 'التعداد المبسط · احتمال حدث مقابل عدم وقوعه · تصوّر بصري بالأشكال.',
      prior: 'النسبة · العد · أنواع الأحداث' },
    { t: 'الإحصاء والتمثيل البياني', g: 'الثالث الإعدادي',
      intro: 'نصوّر درجات الصف في جدول ثم سؤال: ما الدرجة الأكثر تكرارًا؟ أي تمثيل يوضح ذلك؟',
      ex: 'المتوسط والوسيط والمدى · الأعمدة والدوائر · تحليل مخطط بسيط.',
      prior: 'الجمع · القسمة · قراءة الجداول' },
    { t: 'المجسمات والتحويلات', g: 'الثالث الإعدادي',
      intro: 'نعرض علبًا وأشكالًا من الصف ونسأل: كم وجهًا وحرفًا وركنًا لها؟ ثم نبني المجسم من الورق.',
      ex: 'أوجه وأحرف وأركان المجسمات · التكبير والتصغير · التناظر والإزاحة والدوران.',
      prior: 'الأشكال الصلبة · الزوايا · الرسم الهندسي' },
    { t: 'النسب المثلثية (تمهيد)', g: 'الثالث الإعدادي',
      intro: 'من برج مرتفع أو سطح مبنى نسأل: كيف نحسب ارتفاعه بظلّه دون تسلقه؟ ندخل العلاقة بين الزاوية والضلع.',
      ex: 'ظل وظاظل وجيب تمام زاوية حادة · حساب ضلع مجهول في مثلث قائم · مسائل السلالم والشمّاعات.',
      prior: 'المثلث القائم الزاوية · النسبة والتناسب · نظرية فيثاغورس' }
  ];

  /* كل الصفوف (ابتدائي · إعدادي · ثانوي) — اقتراحات لحقل الصف مع بقاء الكتابة حرّة */
  var GRADES_ALL = [
    'الصف الأول الابتدائي', 'الصف الثاني الابتدائي', 'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي', 'الصف الخامس الابتدائي', 'الصف السادس الابتدائي',
    'الأول الإعدادي (الصف السابع)', 'الثاني الإعدادي (الصف الثامن)', 'الثالث الإعدادي (الصف التاسع)',
    'الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'
  ];

  /* بنك الأهداف — يُضاف مباشرة إلى الحقل المناسب */
  var OBJ_BANK = [
    { k: 'K', t: 'أن يعرّف الطالب المفهوم ويذكر مثالًا عليه من واقعه' },
    { k: 'K', t: 'أن يستنتج الطالب القاعدة أو القانون من خلال أمثلة محسوسة' },
    { k: 'K', t: 'أن يميّز الطالب الحالات الصحيحة من الخاطئة في أمثلة مُعطاة' },
    { k: 'K', t: 'أن يوضّح الطالب العلاقة بين المفهوم وتطبيقاته في الحياة اليومية' },
    { k: 'K', t: 'أن يقارن الطالب بين مفهومين متقاربين ويحدد وجه الاختلاف' },
    { k: 'S', t: 'أن يطبّق الطالب خطوات الحل في مسائل متنوعة بدقة' },
    { k: 'S', t: 'أن يحسب الطالب نواتج المسائل ضمن زمن مناسب' },
    { k: 'S', t: 'أن يحل الطالب وضعية مشكلة واقعية باستعمال المفهوم' },
    { k: 'S', t: 'أن يستخدم الطالب الأدوات الرقمية والوسيلة البصرية في عرض الفكرة' },
    { k: 'S', t: 'أن يعرض الطالب خطوات حلّه أمام المجموعة بتسلسل منطقي' },
    { k: 'A', t: 'أن يتعاون الطالب مع زملائه في النشاط الجماعي ويتقبل آراءهم' },
    { k: 'A', t: 'أن يقدّر الطالب أهمية الدقة والتحقق من الإجابات' },
    { k: 'A', t: 'أن يبدي الطالب اهتمامًا وثقةً أثناء المشاركة الصفية' },
    { k: 'A', t: 'أن يوظّف الطالب ما تعلمه في تنظيم شؤونه اليومية' }
  ];

  /* بنك استراتيجيات التدريس النشط مع خطوات التنفيذ */
  var STRAT_BANK = [
    { n: 'فكر – زاوج – شارك',
      s: '1) يطرح المعلم سؤالًا مفتوحًا.\n2) تفكير فردي 30 ثانية.\n3) مناقشة ثنائية (زوج).\n4) مشاركة أزواج إجاباتهم مع الصف.' },
    { n: 'التعلم باللعب',
      s: '1) تقسيم الصف إلى فرق.\n2) قواعد واضحة ونقاط للإجابة الصحيحة.\n3) تطبيق الأسئلة بشكل تنافسي.\n4) تتويج الفائز وتلخيص المفهوم.' },
    { n: 'فجوة المعلومات',
      s: '1) توزيع بطاقات معلومات ناقصة على المجموعات.\n2) لا تكتمل معلومات أي مجموعة وحدها.\n3) تبادل المعلومات حتى اكتمال الحل.\n4) عرض الناتج وتقويمه.' },
    { n: 'الكرسي الساخن',
      s: '1) طالب في الكرسي يشرح مفهومًا.\n2) الزملاء يسألون ويضيفون.\n3) المعلم يصحح ويوجّه في النهاية.' },
    { n: 'الاستقصاء الموجّه',
      s: '1) سؤال مفتوح يثير التساؤل.\n2) ملاحظة/تجربة أو أمثلة مرتّبة.\n3) استنتاج القاعدة من الإجابات.\n4) تطبيق وتأكد من الفهم.' },
    { n: 'التعلم التعاوني',
      s: '1) مجموعات متجانسة (4-5 طلاب).\n2) أدوار محددة لكل عضو.\n3) مهمة مشتركة بنتيجة واحدة.\n4) تقويم جماعي وفردي.' },
    { n: 'حل المشكلات',
      s: '1) عرض موقف مشكل بصياغة واضحة.\n2) جمع المعطيات وتحديد المجهول.\n3) اقتراح استراتيجيات حل.\n4) التنفيذ والتحقق والتعميم.' },
    { n: 'العصف الذهني',
      s: '1) قاعدة: لا نقد أثناء التوليد.\n2) توليد أكبر عدد من الأفكار.\n3) التصنيف والمتابعة بالأولوية.\n4) اختيار أفضل فكرة وتطبيقها.' }
  ];

  function genConcept() {
    var el = $('#g_concept');
    return el ? el.value.trim() : '';
  }

  /* التوليد المحلي: يملأ حقول التحضير من القوالب مع تقسيم زمني */
  function generatePlan() {
    var concept = genConcept();
    if (!concept) { notify('اكتبي اسم الموضوع أو اختاري من البنك أولًا', 'err'); return; }
    var grade = $('#g_grade').value, unit = $('#g_unit').value,
        dur = parseInt($('#g_dur').value, 10) || 45;
    var c = CONCEPTS.filter(function (x) { return x.t === concept; })[0] || null;
    /* إن تركتِ حقل الصف فارغًا نقترح مرحلة المفهوم المختار (تُقبل تعديلكِ) */
    if (!grade && c && c.g) grade = c.g;

    function fill() {
      $('#p_grade').value = grade;
      if (unit) $('#p_unit').value = unit;
      /* نحافظ على عنوان الدرس الذي كتبته المعلمة: نستبدله فقط إن كان فارغًا
         أو ما يزال عنوانًا مولَّدًا من البنك (وهي الحالات التي تنتظر التوليد) */
      var cur = $('#p_lesson').value.trim();
      if (!cur || CONCEPTS.some(function (x) { return x.t === cur; })) $('#p_lesson').value = concept;
      $('#p_duration').value = String(dur);
      $('#p_objK').value =
        'أن يعرّف الطالب مفهوم ' + concept + ' ويذكر مثالًا عليه.\n' +
        'أن يستنتج الطالب القاعدة الأساسية في ' + concept + ' من خلال أمثلة محسوسة.';
      $('#p_objS').value =
        'أن يحسب الطالب مسائل ' + concept + ' ضمن زمن الحصة بدقة.\n' +
        'أن يوظّف الطالب ' + concept + ' في وضعية مشكلة واقعية.';
      $('#p_objA').value =
        'أن يتعاون الطالب مع زملائه أثناء نشاط المجموعة.\n' +
        'أن يقدّر الطالب أهمية الدقة والتحقق من الإجابات.';
      $('#p_prior').value = c ? c.prior : 'ما سبق من مهارات حسابية ومفاهيم سابقة مرتبطة بالدرس.';
      $('#p_intro').value = c ? c.intro : 'نبدأ بموقف حياتي مرتبط بـ' + concept + ' نطرح فيه سؤالًا تحفيزيًا، ثم ننتقل بالمنهجية إلى مفهوم الدرس.';
      $('#p_strategies').value = 'الاستقصاء الموجّه\nفكر – زاوج – شارك';
      $('#p_aids').value = 'السبورة الذكية\nأوراق عمل\n' + (c ? 'مجسم أو نموذج تطبيقي' : 'وسيلة بصرية مرتبطة بالمفهوم');
      $('#p_examples').value = c ? c.ex : 'أمثلة محلولة متدرجة من البسيط إلى المركب على ' + concept + '.';
      $('#p_act').value = 'نشاط ثنائي: تطبيق سريع لما شُرح.\nنشاط جماعي: مسألة واحدة لكل مجموعة وعرض الحل.';
      $('#p_diff').value = 'للمتفوقين: مسألة إثرائية مركبة.\nلمن يحتاج دعمًا: خطوات مساعدة وأمثلة محلولة مشابهة.';
      $('#p_evalPre').value = 'سؤال استدعاء لما سبق يرتبط مباشرة بـ' + concept + '.';
      $('#p_evalForm').value = 'أسئلة قصيرة أثناء الشرح للتحقق من الفهم اللحظي.';
      $('#p_evalEnd').value = 'مسألة تطبيقية واحدة على ' + concept + ' يحلها الطالب مستقلًا.';
      $('#p_homework').value = 'تمارين تطبيقية من الكتاب على ' + concept + ' (2-3 مسائل).';
      $('#p_summary').value = 'يكتب الطلاب سطرين: المفهوم الأساسي في ' + concept + ' + مثال واحد.';
      /* تقسيم زمني: تهيئة 10% · عرض 30% · استكشاف 20% · تطبيق 25% · تقويم 15% */
      var t1 = Math.max(3, Math.round(dur * 0.10)),
          t2 = Math.max(5, Math.round(dur * 0.30)),
          t3 = Math.max(5, Math.round(dur * 0.20)),
          t4 = Math.max(5, Math.round(dur * 0.25)),
          t5 = Math.max(3, dur - (t1 + t2 + t3 + t4));
      fillSteps([
        { time: t1 + ' د', step: 'التهيئة والتمهيد', tr: 'يطرح سؤالًا تحفيزيًا عن ' + concept + ' ويستمع لخبرات الطلاب', lr: 'يجيب ويشارك مثالًا من حياته' },
        { time: t2 + ' د', step: 'عرض المفهوم الجديد', tr: 'يشرح ' + concept + ' بالوسيلة البصرية مع مثال محلول', lr: 'يلاحظ ويسأل ويسجل تعريف المفهوم' },
        { time: t3 + ' د', step: 'الاستكشاف والمناقشة', tr: 'يوجّه المجموعات بأسئلة ممهّدة حتى الاستنتاج', lr: 'يناقش داخل مجموعته ويستنتج القاعدة' },
        { time: t4 + ' د', step: 'التطبيق الموجّه والمستقل', tr: 'يوزع تمارين ويجول بين المجموعات مقدّمًا تغذية راجعة', lr: 'يحل التمرين ثم يعرض حلّه' },
        { time: t5 + ' د', step: 'التقويم والغلق', tr: 'يطرح أسئلة قصيرة ويتحقق من تحقيق الأهداف', lr: 'يجيب ويراجع ما تعلمه' }
      ]);
      showTab('data');
      updateToolbar();
      notify('وُلّد التحضير من القوالب ✓ — راجعي الحقول ثم احفظيه', 'ok');
    }

    var dirty = $('#p_lesson').value.trim() || editingId;
    if (dirty) {
      UI.confirm('التوليد سيستبدل محتوى النموذج الحالي. هل تابعين؟').then(function (ok) { if (ok) fill(); });
    } else { fill(); }
  }

  /* توليد بمساعدة الذكاء الاصطناعي — يتطلب خدمة مفعّلة، وإلا رسالة صريحة */
  function generatePlanAI() {
    var st = (typeof AI !== 'undefined') ? AI.status() : { text: 'وحدة الذكاء الاصطناعي غير متاحة.' };
    if (typeof AI === 'undefined' || !AI.isReady()) {
      notify(st.text + ' يمكن تفعيلها من مركز الذكاء الاصطناعي — القوالب المحلية تعمل الآن بلا إنترنت.', 'err');
      return;
    }
    var concept = genConcept();
    if (!concept) { notify('اكتبي اسم الموضوع أو اختاري من البنك أولًا', 'err'); return; }
    var grade = $('#g_grade').value, dur = parseInt($('#g_dur').value, 10) || 45;
    notify('جارٍ التوليد بخدمة الذكاء الاصطناعي…');
    AI.run({
      tool: 'lesson-plan',
      prompt: 'أعد JSON فقط دون أي نص خارجه، لتحضير درس رياضيات بالمفاتيح: ' +
        '"intro","objK","objS","objA","prior","strategies","examples","act","evalEnd","homework","summary",' +
        '"steps" وهي مصفوفة من {time,step,tr,lr}. الدرس: ' + concept + ' — الصف: ' + (grade || 'غير محدد') +
        ' — زمن الحصة: ' + dur + ' دقيقة. القيم نصوص قصيرة بالعربية الفصحى المبسطة.'
    }).then(function (txt) {
      var obj;
      try { obj = JSON.parse(String(txt).replace(/```json|```/g, '').trim()); }
      catch (e) { notify('لم تُعد الخدمة JSON صالحًا — لن أُدخل بيانات غير مؤكدة.', 'err'); return; }
      ['intro', 'objK', 'objS', 'objA', 'prior', 'strategies', 'examples', 'act',
       'evalEnd', 'homework', 'summary'].forEach(function (k) {
        if (typeof obj[k] === 'string') {
          var el = $('#' + (k === 'objK' ? 'p_objK' : k === 'objS' ? 'p_objS' : k === 'objA' ? 'p_objA' : 'p_' + k));
          if (el) el.value = obj[k];
        }
      });
      if (Array.isArray(obj.steps) && obj.steps.length) {
        fillSteps(obj.steps.map(function (s) {
          return { time: s.time || '', step: s.step || '', tr: s.tr || '', lr: s.lr || '' };
        }));
      }
      $('#p_lesson').value = $('#p_lesson').value || concept;
      showTab('data');
      notify('توليد بالذكاء الاصطناعي ✓ — راجعي كل حقل قبل الحفظ', 'ok');
    }).catch(function (e) {
      notify('تعذّر التوليد: ' + ((e && e.message) || 'خطأ غير معروف'), 'err');
    });
  }

  /* إضافة هدف من البنك إلى حقل نوعه */
  function addObj(i) {
    var o = OBJ_BANK[i]; if (!o) return;
    var id = o.k === 'K' ? 'p_objK' : o.k === 'S' ? 'p_objS' : 'p_objA';
    var el = $('#' + id);
    el.value = el.value.trim() ? el.value.trim() + '\n' + o.t : o.t;
    showTab('obj');
    notify('أُضيف الهدف إلى تبويب «الأهداف» ✓');
  }

  /* إضافة استراتيجية من البنك باسمها وخطواتها */
  function addStrat(i) {
    var s = STRAT_BANK[i]; if (!s) return;
    var el = $('#p_strategies');
    el.value = el.value.trim()
      ? el.value.trim() + '\n' + s.n + '\n' + s.s.split('\n').map(function (l) { return '◦ ' + l; }).join('\n')
      : s.n + '\n' + s.s.split('\n').map(function (l) { return '◦ ' + l; }).join('\n');
    showTab('intro');
    notify('أُضيفت الاستراتيجية بخطواتها إلى تبويب «التمهيد» ✓');
  }

  /* الربط بالمصادر: بحث GeoGebra حقيقي في تبويب جديد */
  function geoLink() {
    var q = genConcept();
    if (!q) { notify('اختاري المفهوم أو اكتبيه أولًا', 'err'); return; }
    window.open('https://www.geogebra.org/search/' + encodeURIComponent(q), '_blank', 'noopener');
  }

  /* سحب أسئلة متدرجة من بنك الأسئلة إلى التقويم الختامي */
  function pullQuestions() {
    var bank = UI.coll('qbank') || [];
    if (!bank.length) {
      notify('بنك الأسئلة فارغ — احفظي أسئلة أي اختبار في البنك أولًا (من قسم الاختبارات).', 'err');
      return;
    }
    var concept = genConcept().toLowerCase();
    var match = bank.filter(function (x) {
      return ((x.topic || '') + ' ' + (x.text || '')).toLowerCase().indexOf(concept) !== -1;
    });
    var pool = (match.length >= 3 ? match : bank).slice();
    /* توزيع متدرج: سؤال أساسي ثم متوسط ثم متقدم تناوبًا */
    var order = ['أساسي', 'متوسط', 'متقدم'], picked = [], idx = 0;
    while (picked.length < Math.min(5, pool.length) && idx < 40) {
      var lvl = order[idx % 3];
      var q = pool.filter(function (x) { return (x.level || 'أساسي') === lvl && picked.indexOf(x) === -1; })[0];
      if (q) picked.push(q);
      idx++;
      if (idx > pool.length + 6) { pool.forEach(function (x) { if (picked.length < 5 && picked.indexOf(x) === -1) picked.push(x); }); }
    }
    if (!picked.length) { notify('لا توجد أسئلة لسحبها', 'err'); return; }
    var text = picked.map(function (q, i) {
      return (i + 1) + ') ' + (q.text || '') +
        (q.choices && q.choices[0] ? ' — ' + q.choices.filter(Boolean).map(function (c, j) {
          return ['أ', 'ب', 'ج', 'د'][j] + ') ' + c;
        }).join(' ') : '') +
        (q.answer ? '\n   المفتاح: ' + q.answer : '');
    }).join('\n');
    var el = $('#p_evalEnd');
    el.value = (el.value.trim() ? el.value.trim() + '\n\n' : '') +
      'أسئلة مسحوبة من البنك (' + picked.length + ' متدرجة):\n' + text;
    showTab('eval');
    notify('سُحبت ' + picked.length + ' أسئلة إلى التقويم الختامي ✓', 'ok');
  }

  /* تصدير Word: ملف .doc متوافق يفتحه Word مباشرة */
  function exportWord() {
    var d = collect();
    if (!d.lesson) { notify('اكتبي عنوان الدرس أو ولّدي التحضير أولًا', 'err'); $('#p_lesson').focus(); return; }
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="utf-8"><title>تحضير: ' + esc(d.lesson) + '</title>' +
      '<style>body{direction:rtl;font-family:Arial;font-size:12pt}' +
      'table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:5px 7px;vertical-align:top}' +
      'h4{margin:12px 0 4px}p{margin:4px 0}</style></head><body>' + buildPrint(d) + '</body></html>';
    UI.download('تحضير-' + d.lesson + '.doc', html, 'application/msword');
    notify('نُزّل ملف Word ✓ — إن ظهر تنبيه توافق في Word اضغطي «نعم/متابعة»', 'ok');
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
    var cnt = $('#pCount');
    if (cnt) cnt.textContent = preps().length + ' عنصر';

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
        UI.confirm('حذف تحضير «' + (p ? p.lesson : '') + '» نهائيًا؟').then(function (ok) {
          if (!ok) return;
          var r = setPreps(preps().filter(function (x) { return x.id !== id; }));
          if (editingId === id) { editingId = null; updateToolbar(); }
          drawList(); notify(r.ok ? 'حُذف التحضير ✓' : r.error, r.ok ? 'ok' : 'err');
        });
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
          /* المولّد الذكي */
          '<div data-pane="gen" style="display:none">' +
            '<div class="notice"><b>كيف يعمل المولّد:</b> تختارين الصف والوحدة والمفهوم وزمن الحصة، ثم يُبنى التحضير من ' +
              'قوالب تربوية جاهزة (أهداف · تمهيد · استراتيجيات · جدول زمني · تقويم) — <b>يعمل بلا إنترنت</b> ولا يُرسل شيئًا. ' +
              'واسم الموضوع <b>يُكتب مباشرة</b> لأي صف أو مرحلة، والبنك المصنّف بصفوف الإعدادي الثلاث يظهر لكِ كاقتراحات. ' +
              'صدقًا: المسالك هنا مساعدة للتحضير وليست نصوصًا من الكتاب الرسمي — راجعيها وطابقيها مع منهج مدرستكِ. ' +
              'كل ما يُولَّد قابل للتعديل والحذف قبل الحفظ، وعنوان الدرس الذي تكتبيه لا يُستبدل بالتوليد.</div>' +
            '<div class="row">' +
              '<div class="field"><label for="g_grade">الصف</label>' +
                '<input id="g_grade" list="g_grades" placeholder="مثال: الثالث الإعدادي (الصف التاسع)">' +
                '<datalist id="g_grades">' +
                  GRADES_ALL.map(function (x) { return '<option value="' + esc(x) + '"></option>'; }).join('') +
                '</datalist></div>' +
              field('g_unit', 'الوحدة', { ph: 'مثال: الوحدة الثالثة' }) +
              '<div class="field"><label for="g_concept">اسم الموضوع / المفهوم (اكتبيه أو اختاري)</label>' +
                '<input id="g_concept" list="conceptBank" placeholder="مثال: الكسور الاعتيادية — أو اكتبي عنوان درسكِ">' +
                '<datalist id="conceptBank">' +
                  ['الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي'].map(function (g) {
                    return '<optgroup label="' + g + '">' +
                      CONCEPTS.filter(function (c) { return c.g === g; })
                        .map(function (c) { return '<option value="' + esc(c.t) + '"></option>'; }).join('') +
                      '</optgroup>';
                  }).join('') +
                '</datalist></div>' +
              field('g_dur', 'زمن الحصة (دقيقة)', { type: 'number', v: '45', min: '1' }) +
            '</div>' +
            '<div class="btn-row" style="margin-top:6px">' +
              '<button class="btn btn-primary" id="gGo">✨ ولّدي التحضير</button>' +
              '<button class="btn btn-soft" id="gAI">🤖 توليد بمساعدة الذكاء الاصطناعي</button>' +
              '<button class="btn btn-navy" id="gGeo">🔗 بحث GeoGebra عن المفهوم</button>' +
              '<button class="btn btn-soft" id="gPull">📥 سحب 5 أسئلة من البنك إلى التقويم</button>' +
              '<button class="btn btn-soft" id="gWord">📄 تصدير Word</button>' +
            '</div>' +

            '<h4 style="margin:18px 0 8px">🎯 بنك الأهداف <span class="mini">(ضغطة واحدة إلى الحقل المناسب)</span></h4>' +
            '<div id="objBank"></div>' +

            '<h4 style="margin:18px 0 8px">🧭 بنك استراتيجيات التدريس <span class="mini">(بالخطوات التنفيذية)</span></h4>' +
            '<div id="stratBank"></div>' +
          '</div>' +

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

    /* --- المولّد الذكي --- */
    $('#gGo').onclick = generatePlan;
    $('#gAI').onclick = generatePlanAI;
    $('#gGeo').onclick = geoLink;
    $('#gPull').onclick = pullQuestions;
    $('#gWord').onclick = exportWord;

    function drawBanks() {
      $('#objBank').innerHTML = OBJ_BANK.map(function (o, i) {
        return '<div class="log-item"><div style="flex:1"><b>' +
          (o.k === 'K' ? 'معرفي' : o.k === 'S' ? 'مهاري' : 'وجداني') + ':</b> ' + esc(o.t) + '</div>' +
          '<button class="btn btn-soft btn-sm" data-obj="' + i + '">＋ إضافة</button></div>';
      }).join('');
      $$('[data-obj]').forEach(function (b) {
        b.onclick = function () { addObj(+b.getAttribute('data-obj')); };
      });

      $('#stratBank').innerHTML = STRAT_BANK.map(function (s, i) {
        return '<div class="log-item" style="align-items:flex-start"><div style="flex:1"><b>' + esc(s.n) + '</b>' +
          '<div class="mini" style="white-space:pre-line">' + esc(s.s) + '</div></div>' +
          '<button class="btn btn-soft btn-sm" data-str="' + i + '">＋ إضافة بخطواتها</button></div>';
      }).join('');
      $$('[data-str]').forEach(function (b) {
        b.onclick = function () { addStrat(+b.getAttribute('data-str')); };
      });
    }
    drawBanks();

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
      function fresh() { resetForm(); notify('نموذج جديد جاهز ✓'); }
      if (editingId || $('#p_lesson').value.trim()) {
        UI.confirm('فتح تحضير جديد؟ التغييرات غير المحفوظة في النموذج الحالي ستُفقد.')
          .then(function (ok) { if (ok) fresh(); });
        return;
      }
      fresh();
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
