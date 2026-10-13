/* =========================================================
   وسيط-الذكاء.js — وسيط «المعلم الليبي الرقمي» إلى Google Gemini
   ---------------------------------------------------------
   هذا الخادم الصغير يحمل مفتاحكِ السرّي وحده، ويستقبل طلبات
   المنصة بصيغتها (JSON) ويحوّلها إلى Gemini API ويردّ نصًّا.

   بعد لصق الكود في Cloudflare ابدئي من السطرين التاليين فقط:
     1) GEMINI_KEY ← مفتاحكِ من Google AI Studio (يبدأ بـ AIza)
     2) SECRET     ← كلمة عشوائية من اختياركِ (حروف وأرقام إنجليزية)
   ثم اضغطي Deploy. ولا تمسّي بقية الكود.

   الأمان: مفتاحكِ لا يظهر للمنصة ولا للزوار — هذا الملف في
   حسابكِ الخاص على Cloudflare فقط. ورابط الوسيط بكلمة السرّ
   معروف لموقعكِ وحده.
   ========================================================= */

var GEMINI_KEY = 'AIza___________ضع_مفتاحك_هنا___________';
var SECRET = 'moallem2026';

/* من يجوز له من المتصفحات استعمال هذا الوسيط: موقعكِ وحدكِ (+ خادمكِ المحلي) */
var ALLOWED_ORIGINS = {
  'https://ebtesamal84-cloud.github.io': true,
  'http://localhost:8793': true,
  'http://127.0.0.1:8793': true
};

/* النموذج الافتراضي إن لم تحدّده المنصة */
var DEFAULT_MODEL = 'gemini-2.5-flash';

/* حماية بسيطة ضد الإغراق: حد أقصى 20 طلبًا في الدقيقة لكل عنوان */
var HITS = {};

function corsHeaders(origin) {
  var h = {
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  };
  if (origin && ALLOWED_ORIGINS[origin]) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function reply(status, origin, obj) {
  return new Response(JSON.stringify(obj), { status: status, headers: corsHeaders(origin) });
}

function errReply(status, origin, msg) {
  return new Response(msg, { status: status, headers: corsHeaders(origin) });
}

function rateLimited(ip) {
  var now = Date.now();
  if (!HITS[ip]) HITS[ip] = [];
  HITS[ip] = HITS[ip].filter(function (t) { return now - t < 60000; });
  if (HITS[ip].length >= 20) return true;
  HITS[ip].push(now);
  return false;
}

/* الاتصال بـ Gemini وردّ {output: نص} أو {error: سبب صريح} */
function callGemini(model, prompt) {
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(GEMINI_KEY);

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      /* تعليمات ثابتة: ردّ عربي موجز وبلا اختراع معلومات */
      systemInstruction: { parts: [{ text: 'أنتِ مساعِدة تربوية داخل منصة «المعلم الليبي الرقمي». ' +
        'أجيبي بالعربية الفصحى المبسطة وبإيجاز، دون مقدمات، وبلا اختراع معلومات غير مؤكدة؛ ' +
        'إن لم تتأكدي من إجابة قولي ذلك صراحة.' }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.6 }
    })
  }).then(function (res) {
    return res.json().then(function (data) {
      return { ok: res.ok, status: res.status, data: data };
    }, function () {
      return { ok: false, status: res.status, data: null };
    });
  }).then(function (r) {
    if (!r.ok) {
      var m = (r.data && r.data.error && r.data.error.message) ||
        ('تعذّر الاتصال بخدمة Google (HTTP ' + r.status + ')');
      return { error: m };
    }
    var d = r.data || {};
    var cand = (d.candidates && d.candidates[0]) || null;
    if (!cand || !cand.content || !cand.content.parts) {
      var why = (d.promptFeedback && d.promptFeedback.blockReason) || (cand && cand.finishReason) || '';
      return { error: 'لم تُرجع الخدمة محتوى' + (why ? ' — السبب: ' + why : '') + '.' };
    }
    var text = cand.content.parts.map(function (p) { return p.text || ''; }).join('');
    if (!text) return { error: 'ردّ الخدمة فارغًا.' };
    return { output: text, model: model };
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  var u = new URL(req.url);
  var origin = req.headers.get('Origin') || '';

  /* 1) المسار الصحيح: / + كلمة السر — وكل شيء آخر 404 */
  if (u.pathname !== '/' + SECRET) {
    event.respondWith(errReply(404, origin, 'غير موجود'));
    return;
  }

  /* 2) استعلام المتصفح (preflight) قبل أي طلب POST */
  if (req.method === 'OPTIONS') {
    event.respondWith(new Response(null, { status: 204, headers: corsHeaders(origin) }));
    return;
  }

  /* 3) فحص صحة الوسيط: افتحي الرابط يدويًا في المتصفح فتظهر لكِ بطاقة صحة */
  if (req.method === 'GET') {
    event.respondWith(reply(200, origin, { ok: true, service: 'moallem-proxy', defaultModel: DEFAULT_MODEL }));
    return;
  }

  /* 4) الطلب الحقيقي من المنصة */
  if (req.method !== 'POST') {
    event.respondWith(errReply(405, origin, 'يُقبل POST فقط.'));
    return;
  }

  var ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  if (rateLimited(ip)) {
    event.respondWith(errReply(429, origin, 'تجاوزتِ الحد المسموح: 20 طلبًا في الدقيقة — انتظري قليلًا ثم أعيدي المحاولة.'));
    return;
  }

  event.respondWith(
    req.json().then(function (body) {
      var prompt = (body && body.prompt) || '';
      if (!prompt || prompt.length > 20000) {
        return errReply(400, origin, 'طلب غير صالح: لا يوجد نص، أو النص أطول من الحد (20000 حرف).');
      }
      var model = (body && body.model) || '';
      if (!/^[A-Za-z0-9.\-]{1,60}$/.test(model)) model = DEFAULT_MODEL;

      return callGemini(model, prompt).then(function (r) {
        if (r.error) return errReply(502, origin, 'من الوسيط: ' + r.error);
        return reply(200, origin, { output: r.output, model: r.model });
      });
    }, function () {
      return errReply(400, origin, 'تعذّرت قراءة الطلب — تأكدي من إرساله بصيغة JSON.');
    })
  );
});
