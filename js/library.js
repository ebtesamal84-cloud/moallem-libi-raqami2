/* =========================================================
   library.js — مكتبة الموارد التعليمية (موحّدة)
   تجمع كل ما أنشأتِه: تحضيرات · موارد مناهج · أنشطة · اختبارات
   خطط أسبوع · مواعيد · نتائج ذكاء اصطناعي · ملفات
   بحث · تصفية · مفضلة · مجلدات · تصدير · حذف
   ========================================================= */
(function (global) {
  'use strict';

  var App = global.App;
  if (!App) { console.error('library.js: App غير متاح'); return; }
  var UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, notify = UI.notify;

  var SOURCES = [
    { t: 'prep', key: 'preps', label: 'تحضير درس', mod: 'prep',
      titleOf: function (r) { return r.lesson; },
      subOf: function (r) { return [r.grade, r.subject, r.unit, UI.fmtAr(r.date)].filter(Boolean).join(' · '); } },
    { t: 'curriculum', key: 'curriculum', label: 'مورد منهجي', mod: 'curriculum',
      titleOf: function (r) { return r.title; },
      subOf: function (r) { return [r.stage, r.grade, r.subject, r.unit].filter(Boolean).join(' · '); } },
    { t: 'activities', key: 'activities', label: 'نشاط / ورقة عمل', mod: 'activities',
      titleOf: function (r) { return r.title; },
      subOf: function (r) { return [r.type, r.grade, r.subject, r.level].filter(Boolean).join(' · '); } },
    { t: 'exams', key: 'exams', label: 'اختبار', mod: 'exams',
      titleOf: function (r) { return r.title; },
      subOf: function (r) { return [r.kind, r.grade, r.subject, (r.questions || []).length + ' سؤال', (r.total || 0) + ' درجة'].filter(Boolean).join(' · '); } },
    { t: 'weekplan', key: 'weekplan', label: 'خطة أسبوع', mod: 'schedule',
      titleOf: function (r) { return r.topic; },
      subOf: function (r) { return [r.day, r.grade, r.subject].filter(Boolean).join(' · '); } },
    { t: 'deadlines', key: 'deadlines', label: 'موعد / تذكير', mod: 'schedule',
      titleOf: function (r) { return r.title; },
      subOf: function (r) { return [r.kind, UI.fmtAr(r.date), r.grade].filter(Boolean).join(' · '); } },
    { t: 'ai', key: 'aiResults', label: 'نتيجة ذكاء اصطناعي', mod: 'ai',
      titleOf: function (r) { return String(r.text || '').slice(0, 60); },
      subOf: function (r) { return UI.fmtAr(String(r.at || '').slice(0, 10)); } },
    { t: 'file', key: '__files', label: 'ملف مرفوع', mod: 'library',
      titleOf: function (r) { return r.name; },
      subOf: function (r) { return UI.fileSizeText(r.size || 0) + (r.type ? ' · ' + r.type : ''); } }
  ];

  function srcOf(t) { return SOURCES.filter(function (s) { return s.t === t; })[0]; }

  function isViewable(r) {
    if (!r) return false;
    return r.type === 'application/pdf' || /\.pdf$/i.test(r.name || '') || /^image\//.test(r.type || '');
  }

  function itemsOf(s) {
    if (s.t === 'file') {
      return UI.listFiles().map(function (f) {
        return { id: f.id, ref: f.rec, title: s.titleOf(f.rec), sub: s.subOf(f.rec), at: f.rec.at };
      });
    }
    return UI.coll(s.key).map(function (r) {
      return { id: r.id, ref: r, title: s.titleOf(r) || '(بلا عنوان)', sub: s.subOf(r), at: r.updatedAt || r.createdAt };
    });
  }

  function allItems() {
    var out = [];
    SOURCES.forEach(function (s) {
      itemsOf(s).forEach(function (it) {
        out.push({ t: s.t, label: s.label, mod: s.mod, id: it.id, ref: it.ref, title: it.title, sub: it.sub, at: it.at });
      });
    });
    return out;
  }

  function favs() { return Store.get('favs', {}) || {}; }
  function setFavs(v) { Store.set('favs', v); }
  function folders() { return UI.coll('folders'); }

  var curFolder = null;

  function draw() {
    var q = ($('#libSearch') ? $('#libSearch').value.trim() : '').toLowerCase();
    var typeF = $('#libType') ? $('#libType').value : 'all';
    var onlyFav = $('#libFav') ? $('#libFav').checked : false;

    var list = allItems();
    $('#libTotal').textContent = list.length + ' عنصر';

    if (curFolder) {
      var f = folders().filter(function (x) { return x.id === curFolder; })[0];
      var refs = f ? (f.items || []) : [];
      list = list.filter(function (it) { return refs.indexOf(it.t + ':' + it.id) !== -1; });
    }
    if (typeF !== 'all') list = list.filter(function (it) { return it.t === typeF; });
    if (onlyFav) list = list.filter(function (it) { return favs()[it.t + ':' + it.id]; });
    if (q) {
      list = list.filter(function (it) {
        var hay = (it.title + ' ' + it.sub + ' ' + it.label + ' ' +
          JSON.stringify(it.ref && it.ref.tags ? it.ref.tags : [])).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }

    var box = $('#libList');
    if (!box) return;

    if (!allItems().length) {
      box.innerHTML = '<div class="empty"><b>المكتبة فارغة</b>كل ما تنشئينه في تحضير الدروس أو الاختبارات أو المناهج أو الملفات سيظهر هنا تلقائيًا.</div>';
      return;
    }
    if (!list.length) { box.innerHTML = '<div class="empty"><b>لا نتائج مطابقة</b>جرّبي كلمة أخرى أو غيّري التصفية.</div>'; return; }

    box.innerHTML = list.map(function (it) {
      var key = it.t + ':' + it.id;
      return '<div class="cr-row"><div class="cr-main">' +
        '<span class="badge info">' + esc(it.label) + '</span> ' +
        (favs()[key] ? '<span class="badge wait">★ مفضلة</span>' : '') +
        ' <b>' + esc(it.title || '(بلا عنوان)') + '</b>' +
        '<div class="mini">' + esc(it.sub || '') + (it.at ? ' · آخر تعديل ' + esc(UI.fmtAr(String(it.at).slice(0, 10))) : '') + '</div></div>' +
        '<span class="btn-row">' +
        '<button class="btn btn-ghost btn-sm" data-fav="' + key + '" title="مفضلة">' + (favs()[key] ? '★' : '☆') + '</button>' +
        (it.t === 'file'
          ? (isViewable(it.ref)
              ? '<button class="btn btn-navy btn-sm" data-vw="' + it.id + '">👁 عرض</button>'
              : '') +
            '<button class="btn btn-soft btn-sm" data-dl="' + it.id + '">⬇️ تنزيل</button>'
          : '<a class="btn btn-soft btn-sm" href="#/' + it.mod + '">↗ فتح</a>' +
            '<button class="btn btn-navy btn-sm" data-xj="' + key + '">⬇️ تصدير JSON</button>') +
        '<button class="btn btn-soft btn-sm" data-fold="' + key + '">📁 مجلد</button>' +
        '<button class="btn btn-danger btn-sm" data-del="' + key + '">حذف</button>' +
        '</span></div>';
    }).join('');

    $$('#libList [data-fav]').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-fav');
        var f = favs();
        if (f[k]) delete f[k]; else f[k] = true;
        setFavs(f); draw();
      };
    });
    $$('#libList [data-dl]').forEach(function (b) {
      b.onclick = function () { UI.openFile(b.getAttribute('data-dl')); };
    });
    $$('#libList [data-vw]').forEach(function (b) {
      b.onclick = function () { UI.viewFile(b.getAttribute('data-vw')); };
    });
    $$('#libList [data-xj]').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-xj').split(':');
        var it = allItems().filter(function (x) { return x.t === k[0] && x.id === k[1]; })[0];
        if (it) { UI.download((it.title || 'عنصر') + '.json', JSON.stringify(it.ref, null, 2), 'application/json'); notify('صُدِّر العنصر ✓', 'ok'); }
      };
    });
    $$('#libList [data-fold]').forEach(function (b) {
      b.onclick = function () { addToFolder(b.getAttribute('data-fold')); };
    });
    $$('#libList [data-del]').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-del').split(':');
        UI.confirm('حذف هذا العنصر نهائيًا من المكتبة؟').then(function (ok) {
          if (!ok) return;
          var s = srcOf(k[0]);
          var p = (k[0] === 'file')
            ? UI.delFile(k[1])
            : Promise.resolve(UI.removeRec(s.key, k[1]));
          p.then(function (r) {
            var f = favs(); delete f[k[0] + ':' + k[1]]; setFavs(f);
            draw();
            notify((r && r.ok === false) ? r.error : 'حُذف العنصر ✓', (r && r.ok === false) ? 'err' : 'ok');
          }).catch(function (e) {
            notify(e.message || 'تعذّر الحذف', 'err');
          });
        });
      };
    });
  }

  function addToFolder(key) {
    var box = UI.modal('إضافة إلى مجلد',
      '<div id="foldList"></div>' +
      '<div class="btn-row" style="margin-top:12px">' +
      '<input type="text" id="newFold" placeholder="اسم مجلد جديد…" style="flex:1">' +
      '<button class="btn btn-primary btn-sm" id="newFoldGo">إنشاء وإضافة</button></div>');
    function drawFolds() {
      var fs = folders();
      $('#foldList').innerHTML = fs.length ? fs.map(function (f) {
        return '<button class="sc" data-fi="' + f.id + '" style="margin-bottom:8px">' +
          '<span class="sc-ic">📁</span><span><b>' + esc(f.name) + '</b><small>' +
          (f.items || []).length + ' عنصر</small></span></button>';
      }).join('') : '<div class="empty">لا مجلدات بعد — أنشئي أول مجلد من الأسفل.</div>';
      $$('#foldList [data-fi]').forEach(function (b) {
        b.onclick = function () {
          var fs2 = folders();
          fs2.forEach(function (f) {
            if (f.id === b.getAttribute('data-fi')) {
              f.items = f.items || [];
              if (f.items.indexOf(key) === -1) f.items.push(key);
            }
          });
          UI.setColl('folders', fs2);
          UI.closeModal(); notify('أُضيف إلى المجلد ✓', 'ok'); drawFolders();
        };
      });
    }
    drawFolds();
    $('#newFoldGo').onclick = function () {
      var n = $('#newFold').value.trim();
      if (!n) { notify('اكتبي اسم المجلد', 'err'); return; }
      var fs3 = folders();
      fs3.push({ id: Store.uid(), name: n, items: [key] });
      UI.setColl('folders', fs3);
      UI.closeModal(); notify('أُنشئ المجلد وأُضيف العنصر ✓', 'ok'); drawFolders();
    };
  }

  function drawFolders() {
    var box = $('#foldBox');
    if (!box) return;
    var fs = folders();
    if (!fs.length) { box.innerHTML = '<p class="mini" style="margin:0">لا مجلدات بعد — أنشئيها من زر «📁 مجلد» بجانب أي عنصر.</p>'; return; }
    box.innerHTML = '<div class="btn-row">' + fs.map(function (f) {
      return '<button class="btn ' + (curFolder === f.id ? 'btn-navy' : 'btn-soft') + ' btn-sm" data-openfold="' + f.id + '">📁 ' +
        esc(f.name) + ' (' + (f.items || []).length + ')</button>';
    }).join('') +
    (curFolder ? '<button class="btn btn-ghost btn-sm" data-openfold="all">عرض الكل</button>' : '') +
    '</div>';
    $$('#foldBox [data-openfold]').forEach(function (b) {
      b.onclick = function () {
        var v = b.getAttribute('data-openfold');
        curFolder = (v === 'all') ? null : (curFolder === v ? null : v);
        drawFolders(); draw();
      };
    });
  }

  App.register('library', function (main, mod) {
    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
        '<span class="mh-ic" aria-hidden="true">' + (mod ? mod.i : '🗂️') + '</span>' +
        '<div style="flex:1;min-width:220px"><h2>' + esc(mod ? mod.t : 'مكتبة الموارد') + '</h2>' +
        '<p>' + esc(mod ? mod.d : '') + '</p></div>' +
        '<span class="badge ok">جاهز الآن</span>' +
      '</div></div>' +

      '<section class="card"><h3>📚 كل مواردي <span class="badge" id="libTotal"></span></h3>' +
        '<div class="btn-row" style="margin-bottom:12px">' +
          '<input type="search" id="libSearch" placeholder="ابحثي في كل مواردكِ… (عنوان، صف، مادة، وسم)" aria-label="بحث شامل" style="flex:1;min-width:200px">' +
          '<select id="libType" style="flex:0 0 200px" aria-label="نوع المورد">' +
            '<option value="all">كل الأنواع</option>' +
            SOURCES.map(function (s) { return '<option value="' + s.t + '">' + esc(s.label) + '</option>'; }).join('') +
          '</select>' +
          '<label class="check mini" style="flex:0 0 auto"><input type="checkbox" id="libFav"> المفضلة فقط</label>' +
        '</div>' +
        '<div id="foldBox" style="margin-bottom:12px"></div>' +
        '<div id="libList"></div></section>' +

      '<div class="notice"><b>عن المشاركة والصلاحيات:</b> هذه النسخة تعمل على جهازكِ وحدكِ، ' +
        'ولذلك لا توجد مشاركة مباشرة بين المعلمين بعد. ما يمكنكِ فعله الآن: ' +
        'تصدير أي عنصر كملف JSON أو طباعته، ثم إرساله لزميلتكِ لتستورده في مكتبتها. ' +
        'المشاركة المباشرة بصلاحيات (عرض/تعديل/إدارة) تحتاج خدمة خارجية — وسنوضح تكاملها عند التنفيذ، ' +
        'ولن نعرض زرًا لا يعمل.</div>';

    drawFolders();
    draw();

    document.removeEventListener('filesready', draw);
    document.addEventListener('filesready', draw);
    if (global.Files) Files.init().then(draw);

    $('#libSearch').addEventListener('input', draw);
    $('#libType').addEventListener('change', draw);
    $('#libFav').addEventListener('change', draw);
  });

})(window);
