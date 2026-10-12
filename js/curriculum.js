/* =========================================================
   curriculum.js — مركز المناهج الليبية
   تصنيف متعدد (مرحلة/صف/مادة/فصل/وحدة/درس) + تمييز المصدر
   (رسمي · موثق · مُنشأ من المستخدم · ذكاء اصطناعي) + مرفقات
   ========================================================= */
(function (global) {
  'use strict';

  var App = global.App;
  if (!App) { console.error('curriculum.js: App غير متاح'); return; }
  var UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, notify = UI.notify, fmtAr = UI.fmtAr;

  var STAGES = ['الابتدائي', 'الإعدادي', 'الثانوي', 'الجامعي', 'تعليم مهني'];
  var TERMS = ['الفصل الدراسي الأول', 'الفصل الدراسي الثاني', 'الفصل الدراسي الثالث', 'طوال العام'];
  var KINDS = [
    { v: 'official', l: 'منهج رسمي (من مصدر حكومي)' },
    { v: 'book', l: 'كتاب مدرسي' },
    { v: 'verified', l: 'مصدر موثق' },
    { v: 'user', l: 'مورد أنشأته/أنشأتِه أنتِ' },
    { v: 'ai', l: 'محتوى ذكاء اصطناعي' }
  ];
  var KIND_LABEL = { official: 'رسمي', book: 'كتاب', verified: 'موثق', user: 'مورد المستخدم', ai: 'ذكاء اصطناعي' };
  var KIND_BADGE = { official: 'ok', book: 'info', verified: 'srv', user: 'wait', ai: 'wait' };

  var FIELDS = [
    { k: 'title', l: 'عنوان المورد', ph: 'مثال: الوحدة الثالثة — المعادلات الخطية', req: true, w: 2 },
    { k: 'stage', l: 'المرحلة', t: 'select', opts: STAGES },
    { k: 'grade', l: 'الصف', ph: 'مثال: الثالث الإعدادي' },
    { k: 'subject', l: 'المادة', ph: 'مثال: الرياضيات' },
    { k: 'term', l: 'الفصل الدراسي', t: 'select', opts: TERMS },
    { k: 'unit', l: 'الوحدة', ph: 'مثال: الوحدة الثانية' },
    { k: 'lesson', l: 'الدرس', ph: 'مثال: حل المعادلة' },
    { k: 'kind', l: 'نوع المحتوى', t: 'select', opts: KINDS, req: true,
      hint: 'اختيار إلزامي: يحدّد الشارة التي تظهر بجانب المورد فلا يُخلط الرسمي بغيره.' },
    { k: 'source', l: 'المصدر / الجهة', ph: 'مثال: وزارة التربية — إصدار 2024', w: 2,
      hint: 'اذكري المصدر والإصدار إن وُجد — هذا يحمي حقوق الملكية الفكرية ويجعل المحتوى قابلًا للتحقق.' },
    { k: 'url', l: 'رابط المصدر (اختياري)', ph: 'https://…', dir: 'ltr', w: 2 },
    { k: 'tags', l: 'وسوم (افصلي بينها بفاصلة)', ph: 'معادلات، تدريب، إثرائي', t: 'tags', w: 2 },
    { k: 'notes', l: 'ملاحظات', t: 'area', w: 2, ph: 'ما الذي يحتويه هذا المورد؟ أين تجدينه؟' }
  ];

  var page, pendingFile = null;

  function onFilesReady() { if (page) page.drawList(); }

  function isPdfRec(m) {
    return !!m && (m.type === 'application/pdf' || /\.pdf$/i.test(m.name || ''));
  }

  function extra(r) {
    var b = KIND_BADGE[r.kind] || 'info';
    var s = '<span class="badge ' + b + '">' + esc(KIND_LABEL[r.kind] || r.kind) + '</span>';
    var m = r.fileId ? UI.getFile(r.fileId) : null;
    if (m) {
      s += '<span class="badge info">📎 ' + esc(m.name) + '</span>';
      s += '<button class="btn btn-navy btn-sm" data-view="' + esc(r.fileId) + '">👁 عرض</button>';
      if (isPdfRec(m)) s += '<button class="btn btn-soft btn-sm" data-xtr="' + esc(r.id) + '">🔍 استخراج النص</button>';
    }
    return s;
  }

  function printRec(r) {
    var m = r.fileId ? UI.getFile(r.fileId) : null;
    return UI.prHead(r.title, 'بطاقة مورد تعليمي — المعلم الليبي الرقمي',
      [['المرحلة', r.stage], ['الصف', r.grade], ['المادة', r.subject], ['الفصل', r.term],
       ['الوحدة', r.unit], ['الدرس', r.lesson], ['نوع المحتوى', KIND_LABEL[r.kind] || r.kind]])
      + UI.prSec('المصدر والتحقق', UI.prPara(r.source || '—') + (r.url ? UI.prPara('الرابط: ' + r.url) : ''))
      + UI.prSec('الوسوم', r.tags && r.tags.length ? UI.prBullets(r.tags) : '')
      + UI.prSec('ملاحظات', UI.prPara(r.notes))
      + UI.prSec('ملف مرفق', m ? UI.prPara(m.name + ' (' + UI.fileSizeText(m.size) + ') — يُفتح من مكتبة الموارد على الجهاز، وليس ضمن الطباعة') : '')
      + '<p class="pr-s" style="margin-top:14px">تم إنشاء هذه البطاقة بواسطة «المعلم الليبي الرقمي» — ' +
        esc(fmtAr((r.createdAt || '').slice(0, 10))) + '</p>' + UI.prSign();
  }

  /* =========================================================
     استخراج نص من ملف PDF إلى موارد منهجية قابلة للبحث والطباعة
     ========================================================= */
  function extractFlow(recId) {
    var rec = (UI.coll('curriculum') || []).filter(function (x) { return x.id === recId; })[0];
    if (!rec || !rec.fileId) { notify('لا يوجد ملف مرفق بهذا المورد', 'err'); return; }
    Files.get(rec.fileId).then(function (f) {
      if (!isPdfRec(f)) { notify('استخراج النص يعمل مع ملفات PDF فقط', 'err'); return; }
      var box = UI.modal('استخراج نص من: ' + f.name, '<div id="xtrBody"></div>');
      $('#xtrBody').innerHTML =
        '<p class="mini" style="margin-top:0">يُقرأ الملف داخل جهازكِ ولا يُرفع لأي خادم. ' +
        'قد يستغرق الكتاب الكبير بضع ثوانٍ…</p>' +
        '<div class="hint" id="xtrProg">جارٍ التحضير…</div>';

      PdfText.extract(f.blob, function (n, total) {
        var el = $('#xtrProg'); if (el) el.textContent = 'جارٍ قراءة الصفحة ' + n + ' من ' + total + '…';
      }).then(function (res) {
        showResult(rec, f, res, box);
      }).catch(function (e) {
        $('#xtrBody').innerHTML =
          '<div class="notice"><b>تعذّر الاستخراج</b><br>' + esc(e.message || 'خطأ غير معروف') + '</div>' +
          '<div class="btn-row"><button class="btn btn-soft" id="xtrClose">إغلاق</button>' +
          '<button class="btn btn-navy" id="xtrView">👁 عرض الملف بدلًا من ذلك</button></div>';
        $('#xtrClose').onclick = UI.closeModal;
        $('#xtrView').onclick = function () { UI.closeModal(); UI.viewFile(rec.fileId); };
      });
    }).catch(function (e) { notify(e.message || 'تعذّر فتح الملف', 'err'); });
  }

  function showResult(rec, file, res, box) {
    var parts = PdfText.chunk(res.pages);
    var emptyPages = res.pages.filter(function (p) { return !p.text; }).length;
    var perPage = Math.round(res.chars / Math.max(1, res.numPages));
    function z(v) { return v ? fmtAr(v) : '0'; }
    var head =
      '<p class="mini" style="margin-top:0">قُرئت <b>' + z(res.numPages) + '</b> صفحة · عدد الأحرف: <b>' +
        z(res.chars) + '</b> · أجزاء مقترحة: <b>' + z(parts.length) + '</b> · متوسط النص للصفحة: <b>' +
        z(perPage) + '</b> حرف</p>';

    /* لا نص أصلًا → لا نُخرج نصًا غير حقيقي */
    if (res.chars < 30 || !parts.length) {
      $('#xtrBody').innerHTML = head +
        '<div class="notice"><b>لا يوجد نص قابل للاستخراج في هذا الملف.</b><br>' +
        'يبدو أنه ممسوح ضوئيًا (صور) أو صُمِّم بدون طبقة نص. ' +
        'استخراج النص من الصور يتطلب تقنية OCR وهي غير متاحة في هذه النسخة — ' +
        'ولن نعرض لكِ نصًا غير حقيقي. يمكنكِ عرض الملف كاملًا أو تنزيله وطباعته PDF.</div>' +
        '<div class="btn-row"><button class="btn btn-soft" id="xtrClose">إغلاق</button>' +
        '<button class="btn btn-navy" id="xtrView">👁 عرض الملف</button></div>';
      $('#xtrClose').onclick = UI.closeModal;
      $('#xtrView').onclick = function () { UI.closeModal(); UI.viewFile(rec.fileId); };
      return;
    }

    var caution = '';
    if (emptyPages > 0 || perPage < 60) {
      caution = '<div class="notice warn"><b>انتبهي:</b> ' +
        (emptyPages ? fmtAr(emptyPages) + ' صفحة بلا نص مطلوب، و' : '') +
        'متوسط النص ' + fmtAr(perPage) + ' حرف للصفحة. هذا يشير إلى أن جزءًا من الملف ممسوح ضوئيًا. ' +
        'راجعية الأجزاء قبل استخدامها صفّيًا.</div>';
    }

    $('#xtrBody').innerHTML = head + caution +
      '<div class="xtr-prev">' + esc(res.pages.slice(0, 2).map(function (p) {
        return '— صفحة ' + p.n + ' —\n' + p.text;
      }).join('\n\n').slice(0, 900)) + (res.chars > 900 ? '\n…' : '') + '</div>' +
      '<div class="btn-row" style="margin-top:12px">' +
      '<button class="btn btn-primary" id="xtrGo">➕ إضافة ' + fmtAr(parts.length) + ' موردًا منهجيًا</button>' +
      '<button class="btn btn-soft" id="xtrClose">إلغاء</button>' +
      '<button class="btn btn-navy" id="xtrView">👁 عرض الملف</button></div>' +
      '<div class="hint">تُحفظ الأجزاء كمورد «مُنشأ من المستخدم» مع ذكر اسم الملف المصدر، ' +
      'ولا تُخلط بالموارد الرسمية. راجعيها وحرّريها قبل الاستخدام الصفّي.</div>';

    $('#xtrClose').onclick = UI.closeModal;
    $('#xtrView').onclick = function () { UI.closeModal(); UI.viewFile(rec.fileId); };
    $('#xtrGo').onclick = function () {
      var list = UI.coll('curriculum'), now = new Date().toISOString();
      parts.forEach(function (p, i) {
        list.unshift({
          id: Store.uid(),
          title: (rec.title || file.name) + ' — مقتطف ' + (i + 1) + ' (ص ' + p.from + '–' + p.to + ')',
          stage: rec.stage || '', grade: rec.grade || '', subject: rec.subject || '',
          term: rec.term || '', unit: rec.unit || '', lesson: '',
          kind: 'user',
          source: 'مستخرج نصيًا من: ' + file.name,
          url: rec.url || '',
          tags: ['مستخرج من PDF'].concat(Array.isArray(rec.tags) ? rec.tags : []),
          notes: p.text.slice(0, 6000),
          extractedFrom: rec.id, pagesFrom: p.from, pagesTo: p.to,
          createdAt: now, updatedAt: now
        });
      });
      var r = UI.setColl('curriculum', list);
      if (!r.ok) { notify(r.error, 'err'); return; }
      UI.closeModal();
      notify('أُضيف ' + parts.length + ' موردًا من الملف ✓', 'ok');
      page.drawList();
    };
  }

  App.register('curriculum', function (main, mod) {
    var cfg = {
      storeKey: 'curriculum',
      newLabel: 'إضافة مورد',
      listTitle: 'موارد المناهج',
      searchPh: 'ابحثي بعنوان الدرس أو الوحدة أو المصدر أو الوسم…',
      fields: FIELDS,
      cols: [
        { label: 'الصف', k: 'grade' }, { label: 'المادة', k: 'subject' },
        { label: 'الوحدة', k: 'unit' }
      ],
      searchKeys: ['title', 'subject', 'grade', 'unit', 'lesson', 'source', 'tags', 'notes'],
      filters: [
        { k: 'stage', label: 'المرحلة', opts: STAGES },
        { k: 'kind', label: 'نوع المحتوى', opts: KINDS.map(function (k) { return k.v; }) }
      ],
      sortKey: 'title',
      titleOf: function (r) { return r.title || '(بلا عنوان)'; },
      validate: function (r) {
        if (!r.title) return 'اكتبي عنوان المورد أولًا';
        if (!r.kind) return 'اختاري «نوع المحتوى» (رسمي · كتاب · موثق · مُنشأ منكِ · ذكاء اصطناعي) — هذا أساسي لتمييز المصدر';
        return null;
      },
      empty: 'لم تُضف أي مورد إلى مركز المناهج بعد.',
      extra: extra,
      print: printRec,
      notice: '<b>قاعدة الإسناد:</b> المحتوى الرسمي لا يُنسب إليه إلا مصدره الحقيقي. ' +
        'عند إضافة منهج أو كتاب اذكري الجهة والإصدار. ' +
        'الموارد التي تنشئها أنتِ أو التي يولدها الذكاء الاصطناعي تظهر بشارة واضحة ولا تُخلط بالرسمي.',
      afterForm: function () {
        return '<div class="field"><label for="f_file">ملف مرفق (اختياري — PDF أو صورة أو مستند حتى 50 ميجابايت)</label>' +
          '<input type="file" id="f_file" accept="application/pdf,.pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx">' +
          '<div class="hint">يُحفظ الملف داخل متصفحكِ فقط ولا يُرفع لأي خادم، ويُعرض داخل المنصة مباشرة. ' +
          '<span id="storeInfo">' + esc(Files.infoText()) + '</span></div>' +
          '<div id="fileState" class="mini" style="margin-top:4px"></div></div>';
      },
      wire: function () {
        var fin = $('#f_file');
        function refreshInfo() { var el = $('#storeInfo'); if (el) el.textContent = Files.infoText(); }
        refreshInfo();
        /* الملفات تُفهرس بعد تهيئة المخزن — أعد رسم القائمة عند جهوزيتها
           (حتى لو انتهت التهيئة قبل إنشاء الصفحة) */
        Files.init().then(function () { refreshInfo(); onFilesReady(); });
        document.removeEventListener('filesready', onFilesReady);
        document.addEventListener('filesready', onFilesReady);

        fin.onchange = function () {
          var f = this.files && this.files[0];
          if (!f) return;
          UI.fileToRecord(f).then(function (rec) {
            pendingFile = rec;
            $('#fileState').textContent = 'الملف المختار: ' + rec.name + ' (' +
              UI.fileSizeText(rec.size) + ') — سيُحفظ عند الحفظ';
          }).catch(function (e) {
            notify(e.message, 'err');
            fin.value = ''; pendingFile = null;
          });
        };

        $('#crSave').addEventListener('click', function () {
          if (!pendingFile) return;
          var rid = page.editingId();
          if (!rid) {
            notify('لم يُحفظ المرفق: أكملي بيانات المورد أولًا (العنوان مطلوب) ثم اضغطي حفظ مرة أخرى', 'err');
            return;
          }
          var rec = pendingFile, fid = Store.uid();
          UI.saveFile(fid, rec).then(function (id) {
            var list = UI.coll('curriculum');
            list.forEach(function (r) {
              if (r.id === rid) {
                r.fileId = id; r.fileName = rec.name; r.fileSize = rec.size; r.fileType = rec.type;
                r.updatedAt = new Date().toISOString();
              }
            });
            UI.setColl('curriculum', list);
            pendingFile = null;
            fin.value = '';
            $('#fileState').textContent = '';
            notify('حُفظ الملف المرفق ✓', 'ok');
            page.drawList();
            refreshInfo();
          }).catch(function (e) {
            notify(e.message || 'تعذّر حفظ الملف', 'err');
            refreshInfo();
          });
        });
      },
      wireList: function () {
        $$('#crList [data-view]').forEach(function (b) {
          b.onclick = function () { UI.viewFile(b.getAttribute('data-view')); };
        });
        $$('#crList [data-xtr]').forEach(function (b) {
          b.onclick = function () { extractFlow(b.getAttribute('data-xtr')); };
        });
      }
    };

    page = UI.crud(cfg);
    page.render(main, mod);
  });

})(window);
