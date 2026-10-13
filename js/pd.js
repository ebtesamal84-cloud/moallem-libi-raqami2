/* =========================================================
   pd.js — التطوير المهني
   ملف مهني: خبرة ومهارات وشهادات ودورات + خطة تطوير ذاتي
   بحالة يحددها قلم المعلمة لا الخوارزمية. طباعة سيرة ذاتية
   وخطة بخانة التوقيع. كل شيء محلي في المتصفح.
   ========================================================= */
(function (global) {
  'use strict';
  var App = global.App;
  if (!App) { console.error('pd.js: App غير متاح'); return; }
  var UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, notify = UI.notify;

  var STATUSES = ['مخطط', 'قيد التنفيذ', 'مكتمل'];

  /* ---------------- التخزين ---------------- */
  function st() {
    var s = Store.get('pd', null);
    if (!s || typeof s !== 'object') s = null;
    if (!s) s = { quals: [], skills: [], exp: '', goals: [] };
    if (!(s.quals instanceof Array)) s.quals = [];
    if (!(s.skills instanceof Array)) s.skills = [];
    if (!(s.goals instanceof Array)) s.goals = [];
    if (typeof s.exp !== 'string') s.exp = '';
    return s;
  }
  function save(s) { Store.set('pd', s); }
  function nonEmpty(arr) { return arr.filter(function (x) { return String(x).replace(/\s/g, ''); }); }
  function sec(title, body) { return body ? UI.prSec(title, body) : UI.prSec(title, '<p>—</p>'); }

  /* ---------------- الصفحة ---------------- */
  function render(main) {
    var s = st();

    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
      '<span class="mh-ic" aria-hidden="true">🎓</span>' +
      '<div style="flex:1;min-width:220px"><h2>التطوير المهني</h2>' +
      '<p>ملفكِ المهني وخطتكِ للتطور: ما تعلّمته وما تتقنه وما تنوي تحقيقه — يُطبع سيرة ذاتية وخطة جاهزة للتوقيع.</p></div>' +
      '<span class="badge ok">جاهز الآن</span></div></div>' +

      '<section class="card"><h3>👤 بياناتي المهنية</h3>' +
      '<p class="mini" id="pdFromProfile"></p>' +
      '<div class="field"><label for="pdExp">خبرتي المهنية (سطر أو أكثر)</label>' +
      '<textarea id="pdExp" rows="3" placeholder="مثال: 12 سنة تدريس الرياضيات — متوسطة الأندلس (2014 — الآن)">' + esc(s.exp) + '</textarea></div>' +
      '<div class="field" style="margin-bottom:0"><label>مهاراتي (اضغطي Enter للإضافة)</label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<input type="text" id="pdSkill" placeholder="مثال: تصميم أوراق عمل" aria-label="مهارة جديدة" ' +
      'style="flex:1;min-width:180px;padding:9px 12px;border:1px solid var(--border);border-radius:10px">' +
      '<button class="btn btn-soft" id="pdSkillAdd">➕ مهارة</button></div>' +
      '<div id="pdSkills" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"></div></div>' +
      '</section>' +

      '<section class="card"><h3>📜 شهاداتي ودوراتي</h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<input type="text" id="pdQT" placeholder="اسم الدورة أو الشهادة" aria-label="اسم الشهادة" ' +
      'style="flex:2;min-width:170px;padding:9px 12px;border:1px solid var(--border);border-radius:10px">' +
      '<input type="text" id="pdQI" placeholder="الجهة المانحة" aria-label="الجهة المانحة" ' +
      'style="flex:1.5;min-width:130px;padding:9px 12px;border:1px solid var(--border);border-radius:10px">' +
      '<input type="number" id="pdQY" placeholder="السنة" aria-label="السنة" ' +
      'style="flex:0.7;min-width:80px;padding:9px 12px;border:1px solid var(--border);border-radius:10px">' +
      '<button class="btn btn-primary" id="pdQAdd">إضافة</button></div>' +
      '<p class="mini">أضيفي شهاداتكِ الحقيقية فقط — وتميّز بوضوح بين ما تدربتِ عليه وما اعترفت به جهة رسمية.</p>' +
      '<div id="pdQList" style="margin-top:10px"></div>' +
      '</section>' +

      '<section class="card"><h3>🎯 خطة التطوير الذاتي</h3>' +
      '<p class="mini">حالة كل هدف تحددها أنتِ — لا تقدير آلي ولا وعود.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<input type="text" id="pdGT" placeholder="الهدف — مثال: إتقان GeoGebra" aria-label="الهدف" ' +
      'style="flex:2;min-width:160px;padding:9px 12px;border:1px solid var(--border);border-radius:10px">' +
      '<input type="text" id="pdGA" placeholder="الإجراء — مثال: 3 حصص تدريب أسبوعيًا" aria-label="الإجراء" ' +
      'style="flex:2;min-width:160px;padding:9px 12px;border:1px solid var(--border);border-radius:10px">' +
      '<input type="date" id="pdGD" aria-label="موعد المراجعة" ' +
      'style="flex:1;min-width:130px;padding:9px 12px;border:1px solid var(--border);border-radius:10px">' +
      '<button class="btn btn-primary" id="pdGAdd">إضافة الهدف</button></div>' +
      '<div id="pdGList" style="margin-top:12px"></div>' +
      '</section>' +

      '<section class="card"><h3>🖨️ التصدير</h3>' +
      '<div class="btn-row">' +
      '<button class="btn btn-navy" id="pdCv">📄 طباعة السيرة الذاتية</button>' +
      '<button class="btn btn-primary" id="pdPlan">🖨️ طباعة خطة التطوير</button>' +
      '<button class="btn btn-gold" id="pdJson">⬇️ JSON</button>' +
      '</div></section>';

    /* تعبئة من الملف الشخصي */
    var p = Store.get('profile', {}) || {};
    $('#pdFromProfile').innerHTML = p.name || p.school || p.subject
      ? 'تُملأ هذه الخانات من ملفكِ الشخصي: <b>' + esc(p.name || 'بدون اسم') + '</b> · ' +
        esc(p.school || 'بدون مدرسة') + ' · ' + esc(p.subject || 'بدون مادة') + ' · ' + esc(p.year || '') +
        ' — تعديلها من <a href="#/settings">الإعدادات</a>.'
      : 'املئي بياناتكِ الأساسية من <a href="#/settings">الملف الشخصي</a> لتظهر في سيرتكِ الذاتية تلقائيًا.';

    /* المهارات */
    function paintSkills() {
      $('#pdSkills').innerHTML = s.skills.length
        ? s.skills.map(function (k, i) {
            return '<span style="background:var(--surface2);border:1px solid var(--border);border-radius:20px;' +
              'padding:6px 12px;display:inline-flex;gap:8px;align-items:center">' + esc(k) +
              '<button class="pd-skd" data-i="' + i + '" aria-label="حذف المهارة" ' +
              'style="background:none;border:none;cursor:pointer;color:var(--danger)">✕</button></span>';
          }).join('')
        : '<p class="mini" style="margin:0">لا مهارات بعد.</p>';
      $$('.pd-skd').forEach(function (b) {
        b.onclick = function () {
          s.skills.splice(parseInt(b.getAttribute('data-i'), 10), 1);
          save(s);
          paintSkills();
        };
      });
    }
    function addSkill() {
      var v = $('#pdSkill').value.replace(/^\s+|\s+$/g, '');
      if (!v) return;
      s.skills.push(v);
      save(s);
      $('#pdSkill').value = '';
      paintSkills();
      $('#pdSkill').focus();
    }
    $('#pdSkillAdd').onclick = addSkill;
    $('#pdSkill').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } });
    paintSkills();
    $('#pdExp').addEventListener('input', function () { s.exp = this.value; save(s); });

    /* الشهادات */
    function paintQuals() {
      $('#pdQList').innerHTML = s.quals.length
        ? s.quals.map(function (q, i) {
            return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px">' +
              '<b style="color:var(--teal)">★</b><span style="flex:1;min-width:140px">' + esc(q.t) + '</span>' +
              '<span class="mini">' + esc(q.issuer || '') + (q.year ? ' · ' + esc(q.year) : '') + '</span>' +
              '<button class="btn btn-danger btn-sm pd-qd" data-i="' + i + '" aria-label="حذف الشهادة">🗑</button></div>';
          }).join('')
        : '<p class="mini" style="margin:0">لا شهادات بعد.</p>';
      $$('.pd-qd').forEach(function (b) {
        b.onclick = function () {
          s.quals.splice(parseInt(b.getAttribute('data-i'), 10), 1);
          save(s);
          paintQuals();
        };
      });
    }
    $('#pdQAdd').onclick = function () {
      var t = $('#pdQT').value.replace(/^\s+|\s+$/g, '');
      if (!t) { notify('اكتبي اسم الدورة أو الشهادة أولًا', 'err'); return; }
      s.quals.push({ id: 'q' + Date.now(), t: t, issuer: $('#pdQI').value, year: $('#pdQY').value });
      save(s);
      $('#pdQT').value = ''; $('#pdQI').value = ''; $('#pdQY').value = '';
      paintQuals();
      $('#pdQT').focus();
    };
    paintQuals();

    /* خطة التطوير */
    function paintGoals() {
      if (!s.goals.length) {
        $('#pdGList').innerHTML = '<p class="mini" style="margin:0">لا أهداف بعد — أضيفي هدفكِ الأول من النموذج أعلاه.</p>';
        return;
      }
      var done = s.goals.filter(function (g) { return g.status === 'مكتمل'; }).length;
      $('#pdGList').innerHTML =
        '<p class="mini" style="margin:0 0 8px"><b>' + done + '</b> مكتمل من <b>' + s.goals.length + '</b> هدفًا.</p>' +
        s.goals.map(function (g, i) {
          return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;' +
            'border:1px solid var(--border);border-radius:10px;padding:8px 10px">' +
            '<div style="flex:2;min-width:150px"><b>' + esc(g.t) + '</b>' +
            '<div class="mini">' + esc(g.action || '') + (g.due ? ' · مراجعة: ' + esc(g.due) : '') + '</div></div>' +
            '<select class="pd-gs" data-i="' + i + '" aria-label="حالة الهدف" ' +
            'style="padding:8px;border:1px solid var(--border);border-radius:8px">' +
            STATUSES.map(function (x) { return '<option' + (x === g.status ? ' selected' : '') + '>' + x + '</option>'; }).join('') +
            '</select>' +
            '<button class="btn btn-danger btn-sm pd-gd" data-i="' + i + '" aria-label="حذف الهدف">🗑</button></div>';
        }).join('');
      $$('.pd-gs').forEach(function (sel) {
        sel.addEventListener('change', function () {
          s.goals[parseInt(sel.getAttribute('data-i'), 10)].status = sel.value;
          save(s);
          paintGoals();
        });
      });
      $$('.pd-gd').forEach(function (b) {
        b.onclick = function () {
          s.goals.splice(parseInt(b.getAttribute('data-i'), 10), 1);
          save(s);
          paintGoals();
        };
      });
    }
    $('#pdGAdd').onclick = function () {
      var t = $('#pdGT').value.replace(/^\s+|\s+$/g, '');
      if (!t) { notify('اكتبي الهدف أولًا', 'err'); return; }
      s.goals.push({ id: 'g' + Date.now(), t: t, action: $('#pdGA').value, due: $('#pdGD').value, status: 'مخطط' });
      save(s);
      $('#pdGT').value = ''; $('#pdGA').value = ''; $('#pdGD').value = '';
      paintGoals();
      $('#pdGT').focus();
    };
    paintGoals();

    /* التصدير */
    $('#pdCv').onclick = function () {
      var p2 = Store.get('profile', {}) || {};
      var body = UI.prHead('سيرة ذاتية مهنية', p2.name || '', [
        ['المدرسة', p2.school || '—'], ['المادة', p2.subject || '—'], ['السنة الدراسية', p2.year || '—']
      ]);
      body += sec('الخبرة المهنية', s.exp ? UI.prPara(s.exp) : '');
      body += sec('الشهادات والدورات',
        s.quals.length ? UI.prTable(['الشهادة / الدورة', 'الجهة', 'السنة'],
          s.quals.map(function (q) { return [q.t, q.issuer || '—', q.year || '—']; })) : '');
      body += sec('المهارات', s.skills.length ? UI.prBullets(s.skills) : '');
      UI.print(body + UI.prSign());
    };
    $('#pdPlan').onclick = function () {
      if (!s.goals.length) { notify('أضيفي أهدافًا للخطة أولًا', 'err'); return; }
      UI.print(UI.prHead('خطة التطوير الذاتي', Store.get('profile', {}).name || '', null) +
        UI.prTable(['الهدف', 'الإجراء', 'موعد المراجعة', 'الحالة'],
          s.goals.map(function (g) { return [g.t, g.action || '—', g.due || '—', g.status]; })) +
        UI.prSign());
    };
    $('#pdJson').onclick = function () {
      UI.download('ملفي-المهني.json', JSON.stringify(s, null, 2), 'application/json');
      notify('بدأ تنزيل ملفكِ المهني ✓');
    };
  }

  App.register('pd', render);
})(window);
