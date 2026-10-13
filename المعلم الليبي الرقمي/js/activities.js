/* =========================================================
   activities.js — الأنشطة وأوراق العمل
   ورقات عمل · مسابقات · ألعاب · بطاقات · استقصاء · مشروعات
   بمستويات صعوبة (أساسي/متوسط/متقدم) وطباعة A4
   ========================================================= */
(function (global) {
  'use strict';

  var App = global.App;
  if (!App) { console.error('activities.js: App غير متاح'); return; }
  var UI = global.UI;
  var esc = UI.esc, notify = UI.notify, fmtAr = UI.fmtAr;

  var TYPES = ['ورقة عمل', 'مسابقة صفية', 'لعبة تعليمية', 'بطاقات تعليمية', 'نشاط استقصائي',
    'نشاط علاجي', 'نشاط إثرائي', 'مشروع تعلم', 'نشاط جماعي', 'تدريب منزلي'];
  var LEVELS = ['مستوى أساسي', 'مستوى متوسط', 'مستوى متقدم'];
  var GROUPS = ['فردي', 'ثنائي', 'جماعي'];
  var STAGES = ['الابتدائي', 'الإعدادي', 'الثانوي', 'أي مرحلة'];

  var LEVEL_BADGE = { 'مستوى أساسي': 'info', 'مستوى متوسط': 'wait', 'مستوى متقدم': 'srv' };

  var FIELDS = [
    { k: 'title', l: 'عنوان النشاط / ورقة العمل', ph: 'مثال: ورقة عمل: حل المعادلات الخطية', req: true, w: 2 },
    { k: 'type', l: 'نوع النشاط', t: 'select', opts: TYPES },
    { k: 'level', l: 'مستوى الصعوبة', t: 'select', opts: LEVELS },
    { k: 'stage', l: 'المرحلة', t: 'select', opts: STAGES },
    { k: 'grade', l: 'الصف', ph: 'مثال: الخامس الابتدائي' },
    { k: 'subject', l: 'المادة', ph: 'مثال: الرياضيات' },
    { k: 'duration', l: 'المدة (دقيقة)', t: 'number', min: '1', ph: '30' },
    { k: 'group', l: 'نمط العمل', t: 'select', opts: GROUPS },
    { k: 'goal', l: 'الهدف من النشاط', t: 'area', w: 2, ph: 'ما الذي سينجزه الطالب بعد إنجازه؟' },
    { k: 'materials', l: 'الأدوات والمواد (سطر لكل عنصر)', t: 'area', ph: 'أوراق قصيرة، أقلام، مقص…' },
    { k: 'steps', l: 'تعليمات وخطوات التنفيذ (سطر لكل خطوة)', t: 'area', w: 2,
      ph: '1. يوزّع المعلم الأوراق\n2. يقرأ الطلاب التعليمات\n3. …' },
    { k: 'questions', l: 'الأسئلة / الأنشطة (سطر لكل سؤال)', t: 'area', w: 2,
      ph: '1. أكمل...\n2. احسب...\n3. اربط العمودين…' },
    { k: 'answerKey', l: 'مفتاح الإجابات (سطر لكل إجابة)', t: 'area', w: 2,
      hint: 'يظهر في ورقة المعلم عند الطباعة فقط.' },
    { k: 'evaluation', l: 'معايير التقويم', t: 'area', ph: 'الدقة · إتمام الوقت · المشاركة' },
    { k: 'notes', l: 'ملاحظات وتكييفات', t: 'area', w: 2, ph: 'كيف تُكيَّف مع الفروق الفردية؟' }
  ];

  function printRec(r) {
    return UI.prHead(r.title, (r.type || 'نشاط') + ' — ورقة طالب',
        [['الصف', r.grade], ['المادة', r.subject], ['المرحلة', r.stage], ['المدة', (r.duration || '—') + ' دقيقة'],
         ['نمط العمل', r.group], ['المستوى', r.level], ['التاريخ', UI.fmtAr(UI.todayISO())]])
      + UI.prSec('الهدف', UI.prPara(r.goal))
      + UI.prSec('الأدوات والمواد', UI.prBullets(r.materials))
      + UI.prSec('التعليمات', UI.prBullets(r.steps))
      + UI.prSec('الأسئلة والأنشطة', UI.prBullets(r.questions))
      + UI.prSec('معايير التقويم', UI.prPara(r.evaluation))
      + UI.prSec('اسم الطالب', UI.prPara('الاسم: ....................................  الصف: ............'))
      + UI.prSign();
  }

  function printTeacher(r) {
    return UI.prHead(r.title, (r.type || 'نشاط') + ' — ورقة المعلم (مع مفتاح الإجابات)',
        [['الصف', r.grade], ['المادة', r.subject], ['المستوى', r.level], ['المدة', (r.duration || '—') + ' دقيقة']])
      + UI.prSec('الهدف', UI.prPara(r.goal))
      + UI.prSec('التعليمات', UI.prBullets(r.steps))
      + UI.prSec('الأسئلة', UI.prBullets(r.questions))
      + UI.prSec('مفتاح الإجابات', UI.prBullets(r.answerKey))
      + UI.prSec('ملاحظات وتكييفات', UI.prPara(r.notes))
      + UI.prSign();
  }

  App.register('activities', function (main, mod) {
    var page = UI.crud({
      storeKey: 'activities',
      newLabel: 'نشاط / ورقة عمل جديدة',
      listTitle: 'الأنشطة وأوراق العمل',
      searchPh: 'ابحثي بالعنوان أو الصف أو الموضوع…',
      fields: FIELDS,
      cols: [
        { label: 'النوع', k: 'type' }, { label: 'الصف', k: 'grade' },
        { label: 'المادة', k: 'subject' }
      ],
      searchKeys: ['title', 'type', 'grade', 'subject', 'goal', 'questions', 'notes'],
      filters: [
        { k: 'type', label: 'النوع', opts: TYPES },
        { k: 'level', label: 'المستوى', opts: LEVELS }
      ],
      sortKey: 'title',
      titleOf: function (r) { return r.title || '(بلا عنوان)'; },
      validate: function (r) {
        if (!r.title) return 'اكتبي عنوان النشاط أولًا';
        if (!r.type) return 'اختاري نوع النشاط (ورقة عمل · مسابقة · لعبة…) حتى يظهر تصنيفه صحيحًا';
        if (!r.level) return 'اختاري مستوى الصعوبة (أساسي · متوسط · متقدم) حتى تظهر الشارة بجانب النشاط';
        return null;
      },
      empty: 'لم تنشئي أي نشاط أو ورقة عمل بعد.',
      extra: function (r) {
        return '<span class="badge ' + (LEVEL_BADGE[r.level] || 'info') + '">' + esc(r.level || '') + '</span>' +
          '<button class="btn btn-ghost btn-sm" data-pt="' + r.id + '">🖨️ ورقة المعلم</button>';
      },
      print: printRec,
      wire: function () {},
      wireList: function () {
        UI.$$('#crList [data-pt]').forEach(function (b) {
          b.onclick = function () {
            var r = page.records().filter(function (x) { return x.id === b.getAttribute('data-pt'); })[0];
            if (r) UI.print(printTeacher(r));
          };
        });
      }
    });
    page.render(main, mod);
  });

})(window);
