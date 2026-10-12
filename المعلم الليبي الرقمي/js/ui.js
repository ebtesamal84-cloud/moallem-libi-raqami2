/* =========================================================
   ui.js — طبقة الواجهات المشتركة
   نوافذ التأكيد · النماذج الديناميكية · صفحات CRUD كاملة
   الطباعة · التنزيل · تخزين الملفات
   تُستخدم من: activities / curriculum / exams / library / schedule
   ========================================================= */
(function (global) {
  'use strict';

  var App = global.App;
  if (!App) { console.error('ui.js: وحدة App غير متاحة'); return; }
  var U = App.ui;
  var $ = U.$, $$ = U.$$, esc = U.esc, notify = U.notify, fmtAr = U.fmtAr, todayISO = U.todayISO;

  /* ---------------- نوافذ ---------------- */
  function modal(title, html) {
    var box = $('#modalBox');
    box.classList.remove('wide');
    box.innerHTML =
      '<div class="modal-h"><h3>' + esc(title) + '</h3>' +
      '<button class="modal-x" id="uiX" aria-label="إغلاق">✕</button></div>' + html;
    $('#modalWrap').classList.add('on');
    $('#uiX').onclick = closeModal;
    var f = box.querySelector('input,textarea,select,button.btn');
    if (f) f.focus();
    return box;
  }
  function closeModal() { $('#modalWrap').classList.remove('on'); }

  function withEsc(onClose) {
    function h(e) { if (e.key === 'Escape') { onClose(); document.removeEventListener('keydown', h); } }
    document.addEventListener('keydown', h);
    return function () { document.removeEventListener('keydown', h); };
  }

  function confirmBox(msg, title) {
    return new Promise(function (res) {
      var box = modal(title || 'تأكيد العملية',
        '<p style="margin-top:0">' + esc(msg) + '</p>' +
        '<div class="btn-row"><button class="btn btn-danger" id="cfY">نعم، تابع</button>' +
        '<button class="btn btn-soft" id="cfN">إلغاء</button></div>');
      var off = withEsc(function () { closeModal(); res(false); });
      box.querySelector('#cfY').onclick = function () { off(); closeModal(); res(true); };
      box.querySelector('#cfN').onclick = function () { off(); closeModal(); res(false); };
    });
  }

  function promptBox(msg, def, title) {
    return new Promise(function (res) {
      var box = modal(title || 'إدخال اسم',
        '<p class="mini" style="margin-top:0">' + esc(msg) + '</p>' +
        '<div class="field"><input type="text" id="pbIn" value="' + esc(def || '') + '"></div>' +
        '<div class="btn-row"><button class="btn btn-primary" id="pbY">موافق</button>' +
        '<button class="btn btn-soft" id="pbN">إلغاء</button></div>');
      var off = withEsc(function () { closeModal(); res(null); });
      var inp = box.querySelector('#pbIn');
      inp.select();
      function ok() { off(); closeModal(); res(inp.value); }
      box.querySelector('#pbY').onclick = ok;
      box.querySelector('#pbN').onclick = function () { off(); closeModal(); res(null); };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
    });
  }

  /* ---------------- الطباعة والتنزيل ---------------- */
  function print(html) {
    $('#print-area').innerHTML = html;
    notify('ستُفتح نافذة الطباعة — للحفظ كـ PDF اختاري «حفظ بصيغة PDF»');
    setTimeout(function () { window.print(); }, 150);
  }

  function download(filename, content, mime) {
    var blob = (content instanceof Blob) ? content
      : new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* ---------------- الملفات (تفويض إلى Files) ----------------
     التخزين في IndexedDB (ملفات كبيرة) مع مسار احتياطي في
     localStorage. كل شيء داخل متصفح المعلمة — بلا رفع لأي خادم. */
  var MAX_FILE = (global.Files && Files.MAX_FILE) || 50 * 1024 * 1024;

  /* فحص وتحقق دون حفظ — ترجع بيانات وصفية فيها blob */
  function fileToRecord(file) { return Files.check(file); }

  /* حفظ الملف — ترجع Promise بالمعرّف */
  function saveFile(id, rec) { return Files.store(id, rec); }

  /* حذف الملف — ترجع Promise */
  function delFile(id) { return Files.del(id); }

  function getFile(id) {
    var all = Files.list();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) {
        return { name: all[i].name, type: all[i].type, size: all[i].size, at: all[i].at };
      }
    }
    return null;
  }

  function listFiles() {
    return Files.list().map(function (m) {
      return { id: m.id, rec: { name: m.name, type: m.type, size: m.size, at: m.at } };
    });
  }

  function openFile(id) {
    return Files.get(id).then(function (r) {
      var url = URL.createObjectURL(r.blob);
      var a = document.createElement('a');
      a.href = url; a.download = r.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      notify('بدأ تنزيل «' + r.name + '» ✓', 'ok');
      return true;
    }).catch(function (e) { notify(e.message || 'تعذّر تنزيل الملف', 'err'); return false; });
  }

  function isPdf(r) { return r.type === 'application/pdf' || /\.pdf$/i.test(r.name || ''); }
  function isImage(r) {
    return /^image\//.test(r.type || '') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(r.name || '');
  }

  /* معاينة داخل المنصة (PDF · صورة) من ملف جهازكِ مباشرة */
  function viewFile(id) {
    return Files.get(id).then(function (r) {
      var url = URL.createObjectURL(r.blob);
      var body;
      if (isPdf(r)) body = '<iframe class="viewer-frame" src="' + url + '" title="معاينة الملف"></iframe>';
      else if (isImage(r)) body = '<img class="viewer-img" src="' + url + '" alt="' + esc(r.name) + '">';
      else body = '<p class="mini">هذا النوع لا يُعرض داخل المتصفّح — استخدمي زر التنزيل.</p>';

      var box = modal('معاينة: ' + r.name,
        body +
        '<div class="hint">' + esc(r.name) + ' · ' + fileSizeText(r.size) +
          ' · تُعرض من جهازكِ مباشرة ولا تُرفع لأي خادم.</div>' +
        '<div class="btn-row" style="margin-top:10px">' +
        '<button class="btn btn-navy" id="vwDl">⬇️ تنزيل</button>' +
        '<button class="btn btn-soft" id="vwClose">إغلاق</button></div>');
      box.classList.add('wide');

      function done() { closeModal(); setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { } }, 300); }
      var x = box.querySelector('#uiX');
      if (x) { var prev = x.onclick; x.onclick = function () { if (prev) prev(); done(); }; }
      box.querySelector('#vwClose').onclick = done;
      box.querySelector('#vwDl').onclick = function () { openFile(id); };
      return true;
    }).catch(function (e) { notify(e.message || 'تعذّر فتح الملف', 'err'); return false; });
  }

  function filesInfoText() { return Files.infoText(); }

  function fileSizeText(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  }

  /* ---------------- المجموعات ---------------- */
  function coll(key) { return Store.get(key, []) || []; }
  function setColl(key, v) { return Store.set(key, v); }
  function removeRec(key, id) { return setColl(key, coll(key).filter(function (r) { return r.id !== id; })); }

  /* ---------------- النماذج ---------------- */
  function fieldHTML(f, val, pfx) {
    var id = (pfx || 'f_') + f.k;
    var v = (val === undefined || val === null) ? '' : val;
    var input;
    if (f.t === 'area') {
      input = '<textarea id="' + id + '" placeholder="' + esc(f.ph || '') + '"' +
        (f.rows ? ' style="min-height:' + f.rows + 'px"' : '') + '>' + esc(v) + '</textarea>';
    } else if (f.t === 'select') {
      /* خيار فارغ صريح حتى لا تكون القائمة «مُحددة بلا قيمة» وربما تُحفظ فارغة دون وعي */
      input = '<select id="' + id + '"><option value="">— اختر —</option>' + (f.opts || []).map(function (o) {
        var ov = (typeof o === 'object') ? o.v : o, ol = (typeof o === 'object') ? o.l : o;
        return '<option value="' + esc(ov) + '"' + (String(ov) === String(v) ? ' selected' : '') + '>' + esc(ol) + '</option>';
      }).join('') + '</select>';
    } else {
      var type = f.t || 'text';
      input = '<input type="' + (type === 'tags' ? 'text' : type) + '" id="' + id + '" value="' + esc(v) +
        '" placeholder="' + esc(f.ph || '') + '"' + (f.min !== undefined ? ' min="' + f.min + '"' : '') +
        (f.dir ? ' dir="' + f.dir + '"' : '') + '>';
    }
    return '<div class="field"' + (f.w === 2 ? ' style="grid-column:1/-1"' : '') + '>' +
      '<label for="' + id + '">' + esc(f.l) + (f.req ? ' *' : '') + '</label>' + input +
      (f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '') + '</div>';
  }

  function formHTML(fields, pfx) {
    return '<div class="row">' + fields.map(function (f) { return fieldHTML(f, '', pfx); }).join('') + '</div>';
  }

  function readForm(fields, pfx) {
    var o = {};
    fields.forEach(function (f) {
      var el = $('#' + (pfx || 'f_') + f.k);
      if (!el) { o[f.k] = ''; return; }
      var v = (el.value || '').trim();
      if (f.t === 'tags') v = v ? v.split(/[،,]/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
      if (f.t === 'number') v = v === '' ? 0 : (parseFloat(v) || 0);
      o[f.k] = v;
    });
    return o;
  }

  function fillForm(fields, obj, pfx) {
    fields.forEach(function (f) {
      var el = $('#' + (pfx || 'f_') + f.k);
      if (!el) return;
      var v = obj ? obj[f.k] : '';
      if (f.t === 'tags') el.value = Array.isArray(v) ? v.join('، ') : (v || '');
      else if (f.t === 'select') {
        /* اختر القيمة المحفوظة، وإلا ارجع إلى خيار «— اختر —» بدل قائمة بلا تحديد */
        if (v !== undefined && v !== null && v !== '' && el.querySelector('option[value="' + String(v).replace(/"/g, '\\"') + '"]')) {
          el.value = String(v);
        } else { el.selectedIndex = el.options.length ? 0 : -1; }
      }
      else el.value = (v === undefined || v === null) ? '' : v;
    });
  }

  function clearForm(fields, pfx) { fillForm(fields, null, pfx); }

  /* ---------------- صفحة CRUD كاملة ---------------- */
  /* cfg: id, title, icon, desc, storeKey, fields, cols[], searchKeys[],
          filters[], print(rec)->html, titleOf(rec), validate(rec)->msg|null,
          empty, extra(rec)->html (أزرار إضافية), sortKey */
  function crud(cfg) {
    var editingId = null;

    function records() { return coll(cfg.storeKey); }
    function setRecords(v) { return setColl(cfg.storeKey, v); }

    function filtered() {
      var q = ($('#crSearch') ? $('#crSearch').value.trim() : '').toLowerCase();
      var list = records().slice();
      (cfg.filters || []).forEach(function (f) {
        var sel = $('#crF_' + f.k);
        if (sel && sel.value !== 'all') {
          list = list.filter(function (r) { return String(r[f.k] || '') === sel.value; });
        }
      });
      if (cfg.sortKey) {
        list.sort(function (a, b) {
          var x = a[cfg.sortKey] || '', y = b[cfg.sortKey] || '';
          return y < x ? -1 : (y > x ? 1 : 0);
        });
      }
      if (!q) return list;
      return list.filter(function (r) {
        return (cfg.searchKeys || ['title']).some(function (k) {
          var v = r[k];
          if (Array.isArray(v)) v = v.join(' ');
          return String(v || '').toLowerCase().indexOf(q) !== -1;
        });
      });
    }

    function drawList() {
      var box = $('#crList');
      var all = records();
      var view = filtered();
      $('#crCount').textContent = all.length + ' عنصر';
      if (!box) return;
      if (!all.length) {
        box.innerHTML = '<div class="empty"><b>' + esc(cfg.empty || 'لا توجد عناصر بعد') + '</b>' +
          'اضغطي «عنصر جديد» للبدء.</div>';
        return;
      }
      if (!view.length) {
        box.innerHTML = '<div class="empty"><b>لا نتائج مطابقة</b>جرّبي كلمة أخرى أو غيّري التصفية.</div>';
        return;
      }
      box.innerHTML = view.map(function (r) {
        var title = cfg.titleOf ? cfg.titleOf(r) : (r.title || r.name || '(بلا عنوان)');
        return '<div class="cr-row">' +
          '<div class="cr-main"><b>' + esc(title) + '</b>' +
          '<div class="mini">' + (cfg.cols || []).map(function (c) {
            var v = c.fmt ? c.fmt(r) : r[c.k];
            return v ? esc(c.label + ': ' + v) : '';
          }).filter(Boolean).join(' · ') + '</div></div>' +
          '<span class="btn-row">' + (cfg.extra ? cfg.extra(r) : '') +
          '<button class="btn btn-soft btn-sm" data-e="' + r.id + '">✏️ تعديل</button>' +
          '<button class="btn btn-navy btn-sm" data-p="' + r.id + '">🖨️ طباعة</button>' +
          '<button class="btn btn-danger btn-sm" data-d="' + r.id + '">حذف</button>' +
          '</span></div>';
      }).join('');

      $$('#crList [data-e]').forEach(function (b) {
        b.onclick = function () {
          var r = records().filter(function (x) { return x.id === b.getAttribute('data-e'); })[0];
          if (!r) return;
          editingId = r.id;
          fillForm(cfg.fields, r);
          showForm(true);
          notify('فُتح العنصر للتعديل — لا تنسَ الحفظ');
        };
      });
      $$('#crList [data-p]').forEach(function (b) {
        b.onclick = function () {
          var r = records().filter(function (x) { return x.id === b.getAttribute('data-p'); })[0];
          if (r && cfg.print) print(cfg.print(r));
        };
      });
      $$('#crList [data-d]').forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-d');
          var r = records().filter(function (x) { return x.id === id; })[0];
          confirmBox('حذف «' + (cfg.titleOf ? cfg.titleOf(r) : r.title) + '» نهائيًا؟').then(function (ok) {
            if (!ok) return;
            var rr = removeRec(cfg.storeKey, id);
            if (editingId === id) { editingId = null; clearForm(cfg.fields); showForm(false); }
            drawList();
            notify(rr.ok ? 'حُذف العنصر ✓' : rr.error, rr.ok ? 'ok' : 'err');
          });
        };
      });
      /* أزرار وحدات الوصف (extra) تُعاد ربطها بعد كل رسم للقائمة */
      if (cfg.wireList) cfg.wireList();
    }

    function showForm(on) {
      var wrap = $('#crForm');
      if (!wrap) return;
      wrap.style.display = on ? '' : 'none';
      if (on) { var t = $('#f_' + (cfg.fields[0] || {}).k); if (t) t.focus(); }
    }

    function save() {
      var rec = readForm(cfg.fields);
      if (cfg.validate) {
        var msg = cfg.validate(rec);
        if (msg) { notify(msg, 'err'); return; }
      }
      var list = records(), now = new Date().toISOString();
      if (editingId) {
        var found = false;
        list = list.map(function (x) {
          if (x.id === editingId) { found = true; rec.id = x.id; rec.createdAt = x.createdAt; rec.updatedAt = now; return rec; }
          return x;
        });
        if (!found) { editingId = null; return save(); }
        var r1 = setRecords(list);
        notify(r1.ok ? 'حُدِّث العنصر ✓' : r1.error, r1.ok ? 'ok' : 'err');
      } else {
        rec.id = Store.uid(); rec.createdAt = now; rec.updatedAt = now;
        list.unshift(rec);
        var r2 = setRecords(list);
        if (!r2.ok) { notify(r2.error, 'err'); return; }
        editingId = rec.id;
        notify('حُفظ العنصر ✓', 'ok');
      }
      drawList();
      updateState();
    }

    function updateState() {
      var el = $('#crState');
      if (!el) return;
      if (editingId) {
        var r = records().filter(function (x) { return x.id === editingId; })[0];
        el.innerHTML = '<span class="badge ok">تعدّلين: ' + esc(cfg.titleOf ? cfg.titleOf(r) : r.title) + '</span>';
      } else {
        el.innerHTML = '<span class="badge">عنصر جديد</span>';
      }
    }

    function render(main, mod) {
      main.innerHTML =
        '<div class="mod-hero"><div class="mh-top">' +
          '<span class="mh-ic" aria-hidden="true">' + (mod ? mod.i : cfg.icon) + '</span>' +
          '<div style="flex:1;min-width:220px"><h2>' + esc(mod ? mod.t : cfg.title) + '</h2>' +
          '<p>' + esc(mod ? mod.d : cfg.desc) + '</p></div>' +
          '<span class="badge ok">جاهز الآن</span>' +
        '</div></div>' +
        (cfg.notice ? '<div class="notice">' + cfg.notice + '</div>' : '') +
        '<section class="card">' +
          '<div class="btn-row" style="margin-bottom:12px">' +
            '<button class="btn btn-primary" id="crNew">＋ ' + esc(cfg.newLabel || 'عنصر جديد') + '</button>' +
            '<button class="btn btn-soft" id="crSave" style="display:none">💾 حفظ</button>' +
            '<button class="btn btn-ghost" id="crCancel" style="display:none">إلغاء</button>' +
            '<span id="crState"></span>' +
          '</div>' +
          '<div id="crForm" style="display:none">' + formHTML(cfg.fields) +
            (cfg.afterForm ? cfg.afterForm() : '') + '</div>' +
        '</section>' +
        '<section class="card"><h3>' + esc(cfg.listTitle || 'العناصر المحفوظة') +
          ' <span class="badge" id="crCount"></span></h3>' +
          '<div class="btn-row" style="margin-bottom:12px">' +
            '<input type="search" id="crSearch" placeholder="' + esc(cfg.searchPh || 'ابحثي…') +
              '" aria-label="بحث" style="flex:1;min-width:180px">' +
            (cfg.filters || []).map(function (f) {
              return '<select id="crF_' + f.k + '" aria-label="' + esc(f.label) + '" style="flex:0 0 170px">' +
                '<option value="all">' + esc(f.label) + ': الكل</option>' +
                f.opts.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('') +
                '</select>';
            }).join('') +
          '</div>' +
          '<div id="crList"></div>' +
        '</section>';

      $('#crNew').onclick = function () {
        editingId = null; clearForm(cfg.fields); showForm(true); updateState();
        if (cfg.onNew) cfg.onNew();
      };
      $('#crSave').onclick = save;
      $('#crCancel').onclick = function () { showForm(false); editingId = null; updateState(); };
      $('#crSearch').addEventListener('input', drawList);
      (cfg.filters || []).forEach(function (f) { $('#crF_' + f.k).addEventListener('change', drawList); });
      if (cfg.wire) cfg.wire();

      updateState();
      drawList();
      if (records().length === 0) showForm(true); /* أول استخدام: النموذج مفتوح */
      if (cfg.wireList) cfg.wireList();
    }

    return { render: render, records: records, setRecords: setRecords, filtered: filtered,
             drawList: drawList, editingId: function () { return editingId; } };
  }

  /* ---------------- مساعدات طباعة مشتركة ---------------- */
  function prHead(title, sub, metaPairs) {
    return '<div class="pr-h"><p class="pr-t">' + esc(title) + '</p>' +
      (sub ? '<p class="pr-s">' + esc(sub) + '</p>' : '') +
      (metaPairs && metaPairs.length
        ? '<div class="pr-meta">' + metaPairs.map(function (p) {
            return '<span><b>' + esc(p[0]) + ':</b> ' + esc(p[1] || '—') + '</span>';
          }).join('') + '</div>'
        : '') + '</div>';
  }
  function prSec(title, body) { return body ? '<div class="pr-sec"><h4>' + esc(title) + '</h4>' + body + '</div>' : ''; }
  function prPara(t) { return t ? '<p>' + esc(t) + '</p>' : ''; }
  function prBullets(t) {
    if (!t) return '';
    var arr = Array.isArray(t) ? t : String(t).split(/\n+/);
    return '<ul style="margin:4px 18px;padding:0">' + arr.filter(function (l) { return String(l).trim(); })
      .map(function (l) { return '<li>' + esc(String(l).trim()) + '</li>'; }).join('') + '</ul>';
  }
  function prSign() {
    return '<div class="pr-sign"><span>توقيع: ..............................</span>' +
      '<span>تأشيرة: ..............................</span></div>';
  }
  function prTable(heads, rows) {
    if (!rows || !rows.length) return '';
    return '<table class="pr-tbl"><thead><tr>' + heads.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td>' + esc(c === undefined || c === null ? '' : c) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
  }

  global.UI = {
    $: $, $$: $$, esc: esc, notify: notify, fmtAr: fmtAr, todayISO: todayISO,
    modal: modal, closeModal: closeModal, confirm: confirmBox, prompt: promptBox,
    print: print, download: download,
    fileToRecord: fileToRecord, saveFile: saveFile, getFile: getFile, delFile: delFile,
    listFiles: listFiles, openFile: openFile, viewFile: viewFile, fileSizeText: fileSizeText,
    filesInfoText: filesInfoText, MAX_FILE: MAX_FILE,
    coll: coll, setColl: setColl, removeRec: removeRec,
    crud: crud, fieldHTML: fieldHTML, formHTML: formHTML, readForm: readForm,
    fillForm: fillForm, clearForm: clearForm,
    prHead: prHead, prSec: prSec, prPara: prPara, prBullets: prBullets, prSign: prSign, prTable: prTable
  };

})(window);
