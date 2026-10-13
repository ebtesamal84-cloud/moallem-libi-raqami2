/* =========================================================
   lock.js — قفل المنصة برمز PIN
   حدوده الصريحة (مذكورة في دليل التشغيل):
   - قفل واجهة يمنع المتصفّح العابر من رؤية المنصة، وليس حماية معمارية.
   - من يقرأ كود الصفحة أو يتقن وحدة التحكم (F12) يستطيع تجاوزه.
   - الرمز محفوظ كـ«بصمة» (hash) داخل الكود، لا كنصّ صريح.
   - لا تُرسل أي بيانات إلى أي خادم، وكل شيء يجري داخل المتصفح.
   ========================================================= */
(function () {
  'use strict';

  var PIN_HASH = '20851d29';  /* بصمة الرمز — تُحسب مرة واحدة وتُثبت هنا */
  var ROUNDS   = 200000;          /* عدد تكرارات الخلط: يُبطئ التعرّف على الرمز */
  var MAX_TRY  = 5;               /* محاولات خاطئة قبل الانتظار */
  var WAIT_MS  = 20000;           /* ثوانٍ الانتظار بعد تجاوز المحاولات */

  /* خلط حتمي (FNV-1a مكرّر) — يعمل في كل المتصفحات بلا مكتبات */
  function base36(n) {
    var d = '0123456789abcdefghijklmnopqrstuvwxyz', out = '';
    while (n > 0) { out = d.charAt(n % 36) + out; n = Math.floor(n / 36); }
    return out || '0';
  }
  function hash(pin) {
    var s = 'lm2|' + pin + '|moallem';
    var h = 2166136261;
    for (var i = 0; i < ROUNDS; i++) {
      for (var j = 0; j < s.length; j++) {
        h ^= s.charCodeAt(j);
        h = Math.imul(h, 16777619) >>> 0;
      }
      s = base36(h);
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }
  window.pinHash = hash; /* متاح من وحدة التحكم للتحقق من البصمة */

  var overlay = document.getElementById('lockScreen');

  /* زر قفل سريع في الرأس: يقفل المنصة فورًا (لحالات اقتراب أحد من الجهاز) */
  var btnLock = document.getElementById('btnLock');
  if (btnLock) btnLock.addEventListener('click', function () {
    try { sessionStorage.removeItem('lm.ok'); } catch (e) {}
    location.reload();
  });

  /* جلسة مفتوحة مسبقًا داخل هذا التبويب؟ */
  var ok = false;
  try { ok = sessionStorage.getItem('lm.ok') === '1'; } catch (e) { ok = false; }
  if (ok) { if (overlay) overlay.hidden = true; return; }

  /* مغلق: نمنع التطبيق من العمل قبل إدخال الرمز */
  window.LOCKED = true;
  if (!overlay) return;
  overlay.hidden = false;

  var form  = document.getElementById('lockForm'),
      pin   = document.getElementById('lockPin'),
      err   = document.getElementById('lockErr'),
      tries = 0, until = 0;
  try {
    tries = parseInt(sessionStorage.getItem('lm.try') || '0', 10) || 0;
    until = parseInt(sessionStorage.getItem('lm.wait') || '0', 10) || 0;
  } catch (e) {}

  function fail(msg) {
    err.textContent = msg;
    err.hidden = false;
    pin.value = '';
    pin.focus();
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var now = Date.now();
    if (until > now) {
      fail('انتظرِ ' + Math.ceil((until - now) / 1000) + ' ثوانٍ قبل المحاولة التالية.');
      return;
    }
    if (hash(pin.value) === PIN_HASH) {
      try {
        sessionStorage.setItem('lm.ok', '1');
        sessionStorage.removeItem('lm.try');
        sessionStorage.removeItem('lm.wait');
      } catch (e) {}
      location.reload();              /* إدخال صحيح → إعادة تشغيل كامل للتطبيق */
      return;
    }
    tries++;
    if (tries >= MAX_TRY) {
      until = Date.now() + WAIT_MS;
      tries = 0;
      try { sessionStorage.setItem('lm.wait', String(until)); } catch (e) {}
      fail('محاولات كثيرة — انتظرِ ' + (WAIT_MS / 1000) + ' ثوانٍ قبل المحاولة التالية.');
    } else {
      try { sessionStorage.setItem('lm.try', String(tries)); } catch (e) {}
      fail('رمز غير صحيح — ' + (MAX_TRY - tries) + ' محاولات متبقية.');
    }
  });

  setTimeout(function () { pin.focus(); }, 60);
})();
