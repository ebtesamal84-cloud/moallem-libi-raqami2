/* =========================================================
   app.js — نواة «المعلم الليبي الرقمي»
   التوجيه · لوحة التحكم · الملف الشخصي · مركز الذكاء · الإعدادات
   ملاحظة: تُستخدم دوال تقليدية (ليست ES Modules) لأن الملف
   يُفتح بالنقر المزدوج على file:// حيث لا تعمل الوحدات النمطية.
   ========================================================= */
(function (global) {
  'use strict';

  /* ---------------- أدوات عامة ---------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  var MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  function fmtAr(iso) {
    if (!iso) return '—';
    var p = String(iso).split('-');
    if (p.length < 3) return iso;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(d.getTime())) return iso;
    return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function initials(name) {
    if (!name) return 'م';
    var parts = String(name).replace(/^(أ\.|استاذ|أستاذ|معلم|معلمة)\s*/i, '').trim().split(/\s+/);
    var a = (parts[0] || '').charAt(0), b = (parts[1] || '').charAt(0);
    return (a + b).trim() || 'م';
  }
  function ago(iso) {
    if (!iso) return '';
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'الآن';
    if (s < 3600) return Math.floor(s / 60) + ' دقيقة';
    if (s < 86400) return Math.floor(s / 3600) + ' ساعة';
    return Math.floor(s / 86400) + ' يوم';
  }

  var toastTimer;
  function notify(msg, type) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast on' + (type === 'err' ? ' err' : type === 'ok' ? ' ok' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 4000);
  }

  function openModal(title, html) {
    $('#modalBox').innerHTML =
      '<div class="modal-h"><h3>' + esc(title) + '</h3>' +
      '<button class="modal-x" id="modalX" aria-label="إغلاق">✕</button></div>' + html;
    $('#modalWrap').classList.add('on');
    $('#modalX').onclick = closeModal;
    var f = $('#modalBox').querySelector('input,textarea,button.btn');
    if (f) f.focus();
  }
  function closeModal() { $('#modalWrap').classList.remove('on'); }

  /* ---------------- خريطة المنصة ---------------- */
  var GROUPS = [
    { id: 'main', t: 'الرئيسية' },
    { id: 'teach', t: 'التدريس والتخطيط' },
    { id: 'create', t: 'الإنتاج والإبداع' },
    { id: 'grow', t: 'الموارد والتطوير' },
    { id: 'sys', t: 'النظام' }
  ];

  var STATUS = {
    ready:   { t: 'جاهز الآن', c: 'ok', d: 'ok' },
    p2:      { t: 'المرحلة 2', c: 'wait', d: 'wait' },
    p3:      { t: 'المرحلة 3', c: 'wait', d: 'wait' },
    p4:      { t: 'المرحلة 4', c: 'wait', d: 'wait' },
    server:  { t: 'يتطلب خدمة خارجية', c: 'srv', d: 'srv' }
  };

  var MODULES = [
    { id: 'home', g: 'main', t: 'لوحة التحكم', i: '🏠', st: 'ready',
      d: 'مركز كل شيء: اختصاراتك، مهامك، آخر ما عملت عليه، واقتراحات لتوفير وقتك.',
      f: ['ترحيب وملف شخصي بصورة اختيارية', 'اختصارات الأدوات الأكثر استخدامًا', 'مهام يومية وتذكيرات تُحفظ تلقائيًا',
          'آخر ما عملت عليه ومساحة العمل الأخيرة', 'سجل استخدام المنصة', 'اقتراحات ذكية مبنية على بياناتك فعلًا'] },

    { id: 'prep', g: 'teach', t: 'استوديو تحضير الدروس', i: '📝', st: 'ready',
      d: 'تحضير متكامل (يومي/أسبوعي/فصلي) مع أهداف وخطوات وتوقيت وتقويم وتأمل — ومولّد ذكي يبنيه من قوالب جاهزة.',
      f: ['✨ مولّد ذكي: اختارِ الصف والوحدة والمفهوم وزمن الحصة ← تحضير كامل (أهداف وتمهيد وجدول زمني وتقويم) بضغطة',
          'بنك أهداف (معرفي/مهاري/وجداني) + بنك استراتيجيات بخطوات تنفيذية — إضافة بضغطة واحدة',
          'سحب أسئلة متدرجة من بنك الأسئلة إلى التقويم الختامي · بحث GeoGebra عن المفهوم',
          'البيانات الأساسية: المعلم، المدرسة، المادة، الصف، الوحدة، الدرس، زمن الحصة',
          'جدول خطوات الدرس بالتوقيت مع دور المعلم ودور المتعلم · الأنشطة والفروق الفردية',
          'التأمل الذاتي · حفظ كقالب · بحث وتعديل وحذف · طباعة A4 وتصدير Word'] },

    { id: 'ai', g: 'grow', t: 'مركز الذكاء الاصطناعي', i: '🤖', st: 'ready',
      d: 'اثنا عشر مساعدًا تربويًا بنماذج جاهزة، مع طبقة ربط قابلة لتبديل المزود دون إعادة بناء المنصة.',
      f: ['تحضير الدروس · شرح المفاهيم الصعبة · الأنشطة الصفية',
          'القصص التعليمية · أوراق العمل · الأسئلة والاختبارات',
          'تحليل النتائج · التقارير التربوية · سيناريوهات الفيديو',
          'تبسيط المحتوى للمستويات · مراجعة الأخطاء اللغوية والتربوية',
          'تكييف المحتوى لذوي الاحتياجات التعليمية المختلفة',
          'حالة صريحة: «الخدمة غير مفعّلة» حتى تُضبط — بلا نتائج وهمية'] },

    { id: 'ai-settings', g: 'grow', t: 'ربط الخدمات الذكية', i: '🔌', st: 'ready',
      d: 'تحديد المزود وعنوان الوسيط والنموذج وحدود الاستهلاك والموافقة — دون إدخال أي مفتاح سري هنا.',
      f: ['اختيار المزود (OpenAI / Anthropic / Google / مخصص)', 'عنوان وسيط يدير المفتاح على الخادم',
          'تحديد النموذج وحدود الاستهلاك الشهرية', 'تسجيل موافقة صريحة بعدم استخدام بيانات الطلاب في التدريب',
          'لا مفاتيح سرية داخل المتصفح أو المستودع'] },

    { id: 'curriculum', g: 'teach', t: 'مركز المناهج الليبية', i: '📚', st: 'ready',
      d: 'مكتبة مصنفة حسب المرحلة والصف والمادة والفصل والوحدة والدرس، مع تمييز واضح لمصدر كل محتوى وإمكانية إرفاق ملفات.',
      f: ['تصنيف متعدد المستويات: المرحلة · الصف · المادة · الفصل · الوحدة · الدرس',
          'تمييز صريح لمصدر المحتوى: رسمي · كتاب مدرسي · موثق · مُنشأ من المستخدم · ذكاء اصطناعي',
          'إرفاق ملف PDF أو صورة حتى 50 ميجابايت يُحفظ في متصفحكِ ويُعرض داخل المنصة',
          'استخراج نص ملف PDF إلى موارد منهجية قابلة للبحث والطباعة (لا يعمل مع الملفات المصوَّرة ضوئيًا)',
          'وسوم وبحث وتصفية بالمرحلة ونوع المحتوى',
          'طباعة بطاقة المورد بالكامل'] },

    { id: 'activities', g: 'teach', t: 'الأنشطة وأوراق العمل', i: '🧩', st: 'ready',
      d: 'ورقات عمل ومسابقات وألغاز وبطاقات وأنشطة استقصائية وعلاجية وإثرائية بثلاثة مستويات، بطباعة ورقة الطالب وورقة المعلم.',
      f: ['عشرة أنواع: ورقة عمل · مسابقة · لعبة · بطاقات · استقصاء · علاجي · إثرائي · مشروع · جماعي · تدريب منزلي',
          'ثلاثة مستويات صعوبة: أساسي / متوسط / متقدم مع شارة واضحة',
          'الهدف والأدوات والتعليمات والأسئلة ومعايير التقويم',
          'مفتاح إجابة منفصل يُطبع في ورقة المعلم فقط',
          'بحث وتصفية بالنوع والمستوى · طباعة A4'] },

    { id: 'exams', g: 'teach', t: 'منشئ الاختبارات والتقويم', i: '🧪', st: 'ready',
      d: 'بناء اختبارات بأنواع أسئلة متعددة مع توزيع الدرجات وبنك أسئلة وتصحيح آلي للأنواع الموضوعية فقط.',
      f: ['اختيار من متعدد · صح/خطأ · أكمل الفراغ · مطابقة · مقالي · مسألة رياضية',
          'درجة ومستوى صعوبة لكل سؤال + مجموع تلقائي + مستويات (قبلي/تكويني/ختامي/نهائي…)',
          'ورقة اختبار ومفتاح إجابة منفصل للطباعة · تصدير الاختبار كنص',
          'بنك أسئلة: احفظي الأسئلة مرة واستعيدي إدراجها في اختبارات قادمة',
          'تكرار الاختبار لنسخ متعددة · بحث في الاختبارات المحفوظة'] },

    { id: 'classes', g: 'teach', t: 'إدارة الصف', i: '👥', st: 'ready',
      d: 'فصولكِ وطلابكِ وسجل الدرجات — مجموع ونسبة وترتيب محسوب فورًا، والأحكام لكِ وحدكِ.',
      f: ['فصول متعددة وطلاب بلا حد: إضافة وتعديل وحذف بضغطة — مع ملاحظة لكل طالب',
          'أعمال صفية بعدد عظمى (اختبار/واجب): جدول درجات يتحدّث فورًا مع كل درجة',
          'المجموع والنسبة والترتيب (والتعادل بنفس الترتيب) محسوبة آليًا — بلا تقديرات آلية',
          'كشف درجات الفصل جاهزًا للطباعة بخانة التوقيع · تصدير JSON احتياطي للفصل',
          'خصوصية الطلاب أولوية: لا خادم ولا رفع ولا مشاركة — كل شيء في متصفحكِ'] },

    { id: 'schedule', g: 'teach', t: 'إدارة الوقت والتخطيط', i: '🗓️', st: 'ready',
      d: 'جدول حصص أسبوعي قابل للتعبئة والطباعة، خطة أسبوع، ومواعيد اختبارات ومهام مع تصدير تقويم ICS.',
      f: ['جدول حصص (6 أيام × 8 حصص) يُحفظ تلقائيًا ويُطبع',
          'خطة أسبوع: اليوم والصف والمادة والموضوع والملاحظات',
          'مواعيد الاختبارات والواجبات مع إبراز المواعيد المتأخرة',
          'تصدير تقويم بصيغة ICS يُفتح في تقويم الهاتف أو الحاسوب',
          'تصدير الجدول كنص · طباعة الجدول والمواعيد'] },

    { id: 'design', g: 'create', t: 'استوديو التصميم التعليمي', i: '🎨', st: 'ready',
      d: 'شهادات تقدير وملصقات تعليمية وبطاقات مصطلحات وأسئلة وأغلفة أوراق عمل — تصميم حقيقي على مقاس A4 بالعربية.',
      f: ['خمسة قوالب: شهادة تقدير · ملصق تعليمي · بطاقة مصطلح رياضي · بطاقة سؤال وإجابة · غلاف ورقة عمل',
          'ثلاث هويات لونية من هوية المنصة + رسم عربي RTL على Canvas مع معاينة حية أثناء الكتابة',
          'الاسم والمدرسة والمادة تُملأ تلقائيًا من بياناتك الأساسية',
          'حفظ التصاميم في متصفحكِ وإعادة فتحها وتعديلها وحذفها',
          'تنزيل PNG بدقة طباعة (~150dpi) وطباعة A4 مباشرة أو الحفظ كـ PDF'] },

    { id: 'slides', g: 'create', t: 'العروض والكتب الرقمية', i: '📊', st: 'ready',
      d: 'اعرِضي دروسكِ كشرائح في المتصفح، وشاهديها كاملة الشاشة، واطبعيها PDF — كل شيء محلي بلا خدمات خارجية.',
      f: ['عروض من شرائح: عنوان ونقاط (اكتبي x^2 فتظهر x²) مع ثلاثة قوالب جاهزة: رياضيات · علوم · فارغ',
          'وضع عرض كامل الشاشة بلوحة المفاتيح: الأسهم والمسافة للتنقل، Esc للخروج، Home/End للبداية والنهاية',
          'معاينة حية أثناء الكتابة · ترتيب الشرائح وتكرارها · القوالب تملأ من ملفكِ تلقائيًا',
          'طباعة العرض كاملًا كصفحات A4 عرضية → حفظه PDF من نافذة الطباعة',
          'تنزيل العرض واستيراده كملف JSON · لا نبيع «PPTX» ولا نقدم زرًا لا يعمل'] },

    { id: 'video', g: 'create', t: 'استوديو الفيديو التعليمي', i: '🎬', st: 'ready',
      d: 'من الفكرة إلى حزمة إنتاج كاملة: مشاهد ونصوص تعليق ومدد محسوبة — بلا زر «إنشاء فيديو» وهمي.',
      f: ['مشاهد قابلة للترتيب: الوصف البصري + النص المنطوق + مدة كل مشهد + ملاحظة إنتاج',
          'حسابات فعلية تتحدّث مع كل حرف: المدة الفعلية مقابل المستهدفة + سرعة الكلام (كلمة/دقيقة) بتنبيه عند الشدة',
          'نص السيناريو الكامل يُبنى من مشاهدكِ فعلًا: نسخ للحافظة · تنزيل txt · طباعة',
          'تنزيل المشروع JSON والحفاظ عليه محليًا في متصفحكِ',
          'لا نُنتج الفيديو هنا: أدوات مثل HeyGen وCapCut تأخذ حزمتكِ جاهزة — وهذا مكتوب بصراحة'] },

    { id: 'lab', g: 'create', t: 'مختبر الرياضيات والعلوم', i: '🔬', st: 'ready',
      d: 'ارسمي أي دالة f(x) بتحليل رياضي حقيقي، واحسبي المساحات والمحيطات بخطوات ظاهرة — كل النتائج محسوبة آليًا.',
      f: ['رسم دوال f(x) على محورين حقيقيين: حتى 4 دوال معًا مع شبكة واختصارات محورية',
          'مُحلّل رياضي محكم (بلا eval): أولويات ودوال وجذور وأسس وضرب ضمني — خطأ واضح بدل رسم وهمي',
          'جدول 21 قيمة محسوب آليًا لكل دالة · حفظ تلقائي لآخر عمل في متصفحكِ',
          'حاسبة هندسية: دائرة ومستطيل ومثلث (هيرون) ومتوازي أضلاع — مساحة ومحيط بخطوات ظاهرة',
          'تصدير الرسم PNG وطباعة A4 · بحث GeoGebra في موقعه الرسمي'] },

    { id: 'library', g: 'grow', t: 'مكتبة الموارد التعليمية', i: '🗂️', st: 'ready',
      d: 'كل ما تنشئينه في المنصة يُجمع هنا تلقائيًا: تحضيرات وموارد وأنشطة واختبارات وخطط ومواعيد وملفات.',
      f: ['بحث شامل في كل الموارد + تصفية بالنوع + عرض المفضلة',
          'مجلدات شخصية تُنشئينها وتضيفين إليها ما تريدين',
          'تنزيل الملفات المرفوعة · تصدير أي عنصر كملف JSON',
          'حذف من المصدر نفسه مع بقاء المفضلة متزامنة',
          'الشرح الصريح: المشاركة المباشرة تحتاج خدمة خارجية — لا زر وهمي'] },

    { id: 'tools', g: 'grow', t: 'مركز أدوات المعلم الرقمية', i: '🧰', st: 'p4',
      d: 'دليل مصنّف للأدوات الرقمية بوصف واستخدامات تعليمية وطريقة بدء والرابط الرسمي.',
      f: ['صور · فيديو · نص إلى صوت · عروض · كتب رقمية · اختبارات', 'محاكاة رياضية وعلمية · اجتماعات وتعلم عن بعد · تنظيم ملفات',
          'أدوات الذكاء الاصطناعي التوليدي', 'بيانات الاشتراك والحساب مذكورة فقط بعد التحقق منها'] },

    { id: 'pd', g: 'grow', t: 'التطوير المهني', i: '🎓', st: 'p4',
      d: 'دورات ومهارات رقمية وشهادات وسيرة ذاتية وخطة تطوير مهني شخصي.',
      f: ['دورات: الذكاء الاصطناعي، التصميم التعليمي، GeoGebra، الفيديو، الصف الرقمي، التقويم الإلكتروني',
          'ملف إنجاز إلكتروني وتوثيق الشهادات', 'سيرة ذاتية مهنية وخطة تطوير شخصية',
          'تمييز واضح: شهادات مشاركة داخلية مقابل شهادات معترف بها من جهة مخولة'] },

    { id: 'community', g: 'grow', t: 'مجتمع المعلمين', i: '💬', st: 'server',
      d: 'مشاركة الموارد والنقاش وتقييم المحتوى ومجموعات حسب المادة والصف.',
      f: ['نشر الأفكار والتجارب ومناقشة استراتيجيات التدريس', 'تقييم الموارد والإبلاغ عن المحتوى المخالف',
          'مجموعات حسب المادة والصف مع إشراف ومراجعة محتوى',
          '⚠️ يتطلب خادمًا وحسابات — لن يُعرض زر لا يعمل'] },

    { id: 'accounts', g: 'sys', t: 'الحسابات والصلاحيات', i: '🔐', st: 'server',
      d: 'أدوار: معلم · مشرف تربوي · مدير مدرسة · مدير المنصة — مع مساحات عامة وشخصية ومشتركة.',
      f: ['تسجيل دخول آمن واستعادة كلمة المرور وإدارة جلسات', 'صلاحيات مناسبة لكل دور',
          'مساحة عامة للموارد ومساحة شخصية ومساحات مؤسساتية', 'حذف الحساب والبيانات وفق السياسة المعتمدة',
          '⚠️ يحتاج قاعدة بيانات وتسجيل جلسات على خادم — لا يمكن تنفيذه داخل متصفح واحد'] },

    { id: 'settings', g: 'sys', t: 'الإعدادات والملف الشخصي', i: '⚙️', st: 'ready',
      d: 'بياناتكِ، مظهر المنصة، حجم الخط، النسخ الاحتياطي، واستعادة كل شيء.',
      f: ['الاسم والمدرسة والمادة والسنة الدراسية والصورة', 'وضع فاتح/داكن وحجم خط قابل للتعديل',
          'تصدير واستيراد نسخة احتياطية كاملة', 'بيانات تجريبية لتجربة الأدوات'] },

    { id: 'privacy', g: 'sys', t: 'الخصوصية والأمان وإتاحة الوصول', i: '🛡️', st: 'ready',
      d: 'أين تُحفظ بياناتكِ؟ ما الذي لا نفعله؟ وكيف نجعل المنصة ميسّرة للجميع؟',
      f: ['بياناتك تبقى في متصفحك ولا تُرفع لأي خادم', 'لا مفاتيح سرية في الكود أو المستودع العام',
          'تنقل بلوحة المفاتيح وتباين مناسب وحجم خط قابل للتعديل',
          'رسائل خطأ مفهومة وليست اعتمادية على اللون وحده'] }
  ];

  function findModule(id) {
    for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) return MODULES[i];
    return null;
  }

  /* ---------------- سجل الزيارات ---------------- */
  function logVisit(id) {
    if (id === 'home' || id === 'settings') return;
    var recent = Store.get('recent', []);
    var m = findModule(id);
    recent = recent.filter(function (r) { return r.id !== id; });
    recent.unshift({ id: id, t: m ? m.t : id, at: new Date().toISOString() });
    Store.set('recent', recent.slice(0, 8));

    var usage = Store.get('usage', {});
    var e = usage[id] || { n: 0, last: null };
    e.n += 1; e.last = new Date().toISOString();
    usage[id] = e;
    Store.set('usage', usage);
  }

  /* ---------------- الملف الشخصي ---------------- */
  function profile() {
    return Store.get('profile', { name: '', school: '', subject: '', year: '' }) || {};
  }

  /* ---------------- المظهر ---------------- */
  function applyTheme() {
    var th = Store.get('theme', 'light');
    document.documentElement.setAttribute('data-theme', th);
    var b = $('#btnTheme');
    if (b) { b.textContent = th === 'dark' ? '☀️' : '🌙'; b.setAttribute('aria-label', th === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'); }
  }
  function applyFont() {
    var size = Store.get('fs', 16);
    document.documentElement.style.fontSize = size + 'px';
  }

  /* ---------------- التنقل ---------------- */
  function navRender() {
    var html = '';
    GROUPS.forEach(function (g) {
      html += '<div class="nav-group">' + esc(g.t) + '</div>';
      MODULES.filter(function (m) { return m.g === g.id; }).forEach(function (m) {
        var st = STATUS[m.st];
        html += '<a class="nav-i" href="#/' + m.id + '" data-nav="' + m.id + '">' +
          '<span class="n-ic" aria-hidden="true">' + m.i + '</span>' +
          '<span class="n-t">' + esc(m.t) + '</span>' +
          '<span class="dot ' + st.d + '" title="' + esc(st.t) + '"></span></a>';
      });
    });
    $('#sideNav').innerHTML = html;
  }

  function navActive(id) {
    $$('#sideNav .nav-i').forEach(function (a) {
      var on = a.getAttribute('data-nav') === id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function openNav() { $('#sideNav').classList.add('open'); $('#scrim').hidden = false; $('#scrim').classList.add('on'); $('#navToggle').setAttribute('aria-expanded', 'true'); }
  function closeNav() { $('#sideNav').classList.remove('open'); $('#scrim').classList.remove('on'); $('#scrim').hidden = true; $('#navToggle').setAttribute('aria-expanded', 'false'); }

  /* ---------------- التوجيه ---------------- */
  var views = {};

  function currentId() {
    var h = location.hash || '#/home';
    h = h.replace(/^#\/?/, '');
    h = h.split('?')[0];
    return h || 'home';
  }

  function route() {
    var id = currentId();
    var m = findModule(id);
    if (!m) { location.replace('#/home'); return; }
    navActive(id);
    document.title = (id === 'home' ? '' : m.t + ' — ') + 'المعلم الليبي الرقمي';

    var main = $('#main');
    main.innerHTML = '';
    try {
      if (views[id]) views[id](main, m); else renderPlaceholder(main, m);
    } catch (e) {
      console.error('خطأ في عرض القسم:', id, e);
      main.innerHTML = '<div class="notice warn"><b>حدث خطأ غير متوقع أثناء عرض هذا القسم.</b><br>' +
        esc(e && e.message ? e.message : e) + '<br>أعيدي تحميل الصفحة، وإن تكرر الخطأ أبلغي لي حتى أصلحه.</div>';
    }
    logVisit(id);
    closeNav();
    window.scrollTo(0, 0);
  }

  /* ---------------- صفحة القسم غير المُنفَّذ ---------------- */
  function renderPlaceholder(main, m) {
    var st = STATUS[m.st];
    var feats = (m.f || []).map(function (x) {
      return '<div class="feat"><span class="f-c" aria-hidden="true">▸</span><span>' + esc(x) + '</span></div>';
    }).join('');

    var notice = m.st === 'server'
      ? '<div class="notice warn"><b>هذا القسم يحتاج خدمة خارجية (خادمًا أو قاعدة بيانات).</b><br>' +
        'سيظهر هنا واجهته كاملة، لكن لن يعمل إلا عند ربطه بخدمة. ' +
        '<b>لن يوضع زر زائف لا يعمل</b> — كما هو مبدأ المشروع.</div>'
      : '<div class="notice"><b>هذا القسم مُبرمج في ' + esc(st.t === 'جاهز الآن' ? 'المرحلة الأولى' : st.t) + ' ولم يُنفَّذ بعد.</b><br>' +
        'ما ترين أعلاه هو نطاق عمله المتوقع عند تنفيذه. أخبريني حين تريدين البدء به.</div>';

    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
        '<span class="mh-ic" aria-hidden="true">' + m.i + '</span>' +
        '<div style="flex:1;min-width:220px"><h2>' + esc(m.t) + '</h2><p>' + esc(m.d) + '</p></div>' +
        '<span class="badge ' + st.c + '">' + esc(st.t) + '</span>' +
      '</div></div>' +
      notice +
      '<section class="card"><h3>📌 نطاق هذا القسم عند تنفيذه</h3>' + feats + '</section>' +
      '<div class="btn-row">' +
        '<a class="btn btn-soft" href="#/home">← العودة إلى لوحة التحكم</a>' +
        '<a class="btn btn-navy" href="#/settings">الإعدادات</a>' +
      '</div>';
  }

  /* =========================================================
     لوحة التحكم
     ========================================================= */
  function renderHome(main) {
    var p = profile();
    var h = new Date().getHours();
    var greet = h < 12 ? 'صباح الخير' : (h < 17 ? 'مساء الخير' : 'مساء الخير');
    var pic = Store.get('profilePic', '');
    var preps = Store.get('preps', []) || [];
    var tasks = Store.get('tasks', []) || [];
    var openTasks = tasks.filter(function (t) { return !t.done; }).length;
    var readyCount = MODULES.filter(function (m) { return m.st === 'ready'; }).length;

    var avatar = pic ? '<img src="' + pic + '" alt="صورة المعلم">' : esc(initials(p.name));

    main.innerHTML =
      '<div class="hero">' +
        '<div class="avatar" id="heroAvatar">' + avatar + '</div>' +
        '<div class="hero-txt">' +
          '<h1>' + greet + (p.name ? '، ' + esc(p.name) : '') + ' 👋</h1>' +
          '<p>' + esc(p.school || 'لم تضيفي اسم المدرسة بعد') +
            (p.subject ? ' · ' + esc(p.subject) : '') +
            (p.year ? ' · ' + esc(p.year) : '') + '</p>' +
          '<p style="color:#E6C45B;margin-top:2px">نبدع رقميًا لنرتقي بتعليمنا</p>' +
        '</div>' +
        '<div class="hero-cta">' +
          '<button class="btn btn-gold" id="ctaNew">＋ أنشئ موردًا تعليميًا جديدًا</button>' +
          '<a class="btn btn-primary" href="#/ai">🤖 ابدأ مع المساعد الذكي</a>' +
        '</div>' +
      '</div>' +

      '<div class="grid g4" style="margin-bottom:18px">' +
        '<div class="stat"><b>' + preps.length + '</b><span>تحضير محفوظ</span></div>' +
        '<div class="stat"><b>' + openTasks + '</b><span>مهام مفتوحة</span></div>' +
        '<div class="stat"><b>' + readyCount + '</b><span>أقسام جاهزة الآن</span></div>' +
        '<div class="stat"><b style="font-size:19px">' + Store.usageText() + '</b><span>مساحة بياناتكِ</span></div>' +
      '</div>' +

      '<div class="grid g2">' +
        '<section class="card"><h3>⚡ اختصارات سريعة</h3><div class="grid g2" id="shortcuts"></div></section>' +
        '<section class="card"><h3>✅ مهامي والتذكيرات</h3>' +
          '<div class="btn-row" style="margin-bottom:10px">' +
            '<input type="text" id="taskIn" placeholder="اكتب مهمة جديدة ثم اضغطي Enter" aria-label="مهمة جديدة">' +
            '<button class="btn btn-primary btn-sm" id="taskAdd">إضافة</button>' +
          '</div>' +
          '<div id="taskList"></div>' +
        '</section>' +
        '<section class="card"><h3>🕒 آخر ما عملت عليه</h3><div id="recentBox"></div></section>' +
        '<section class="card"><h3>💡 اقتراحات ذكية</h3><div id="sugBox"></div></section>' +
      '</div>' +

      '<section class="card"><h3>📊 سجل استخدام المنصة</h3><div id="usageBox"></div></section>';

    /* الاختصارات */
    var shortcutIds = ['prep', 'exams', 'activities', 'curriculum', 'library', 'schedule', 'ai', 'settings'];
    $('#shortcuts').innerHTML = shortcutIds.map(function (id) {
      var m = findModule(id); if (!m) return '';
      var st = STATUS[m.st];
      return '<a class="sc" href="#/' + m.id + '">' +
        '<span class="sc-ic" aria-hidden="true">' + m.i + '</span>' +
        '<span><b>' + esc(m.t) + '</b><small class="badge ' + st.c + '" style="margin-top:4px;display:inline-block">' + esc(st.t) + '</small></span>' +
      '</a>';
    }).join('');

    /* زر إنشاء مورد */
    $('#ctaNew').onclick = function () {
      var items = ['prep', 'exams', 'activities', 'design', 'slides', 'video', 'library', 'curriculum'].map(function (id) {
        var m = findModule(id); var st = STATUS[m.st];
        return '<a class="sc" href="#/' + m.id + '" style="margin-bottom:9px" data-close>' +
          '<span class="sc-ic" aria-hidden="true">' + m.i + '</span>' +
          '<span><b>' + esc(m.t) + '</b><small class="badge ' + st.c + '" style="display:inline-block;margin-top:4px">' + esc(st.t) + '</small></span></a>';
      }).join('');
      openModal('أنشئ موردًا تعليميًا جديدًا',
        '<p class="mini" style="margin-top:0">اختاري الأداة التي تريدين العمل بها. الأدوات غير الجاهزة معلَّمة بوضوح.</p>' + items);
      $$('#modalBox [data-close]').forEach(function (a) { a.addEventListener('click', closeModal); });
    };

    /* المهام */
    function drawTasks() {
      var list = Store.get('tasks', []) || [];
      if (!list.length) {
        $('#taskList').innerHTML = '<div class="empty"><b>لا توجد مهام بعد</b>أضيفي أول مهمة تريدين تذكيرك بها.</div>';
        return;
      }
      $('#taskList').innerHTML = list.map(function (t) {
        return '<div class="task">' +
          '<input type="checkbox" id="tk_' + t.id + '" ' + (t.done ? 'checked' : '') + ' aria-label="إتمام المهمة">' +
          '<label class="t-x ' + (t.done ? 'done' : '') + '" for="tk_' + t.id + '">' +
            '<span>' + esc(t.text) + '</span>' +
            (t.due ? '<small>' + esc(fmtAr(t.due)) + '</small>' : '') +
          '</label>' +
          '<button class="t-del" data-del="' + t.id + '" title="حذف المهمة" aria-label="حذف المهمة">🗑</button>' +
        '</div>';
      }).join('');

      $$('#taskList input[type=checkbox]').forEach(function (cb) {
        cb.onchange = function () {
          var id = cb.id.replace('tk_', '');
          var l = Store.get('tasks', []) || [];
          l.forEach(function (t) { if (t.id === id) t.done = cb.checked; });
          Store.set('tasks', l); drawTasks();
        };
      });
      $$('#taskList [data-del]').forEach(function (b) {
        b.onclick = function () {
          UI.confirm('حذف هذه المهمة؟').then(function (ok) {
            if (!ok) return;
            var l = (Store.get('tasks', []) || []).filter(function (t) { return t.id !== b.getAttribute('data-del'); });
            Store.set('tasks', l); drawTasks(); notify('حُذفت المهمة');
          });
        };
      });
    }
    function addTask() {
      var v = $('#taskIn').value.trim();
      if (!v) { notify('اكتبي نص المهمة أولًا', 'err'); return; }
      var l = Store.get('tasks', []) || [];
      l.unshift({ id: Store.uid(), text: v, done: false, due: todayISO() });
      Store.set('tasks', l);
      $('#taskIn').value = '';
      drawTasks(); notify('أُضيفت المهمة ✓', 'ok');
    }
    $('#taskAdd').onclick = addTask;
    $('#taskIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') addTask(); });
    drawTasks();

    /* آخر ما عملت عليه */
    var recent = Store.get('recent', []) || [];
    $('#recentBox').innerHTML = recent.length
      ? recent.map(function (r) {
          return '<a class="log-item" href="#/' + r.id + '"><b>' + esc(r.t) + '</b><span>' + esc(ago(r.at)) + '</span></a>';
        }).join('')
      : '<div class="empty"><b>لم تفتحي أي قسم بعد</b>ستظهر هنا آخر ما عملت عليه لتعود إليه بسرعة.</div>';

    /* اقتراحات — مبنية على بياناتكِ فعلًا، لا نصوص ثابتة */
    var sugs = [];
    if (!p.name) sugs.push(['profile', 'أضيفي اسمكِ ومدرستكِ حتى تظهر في رأس المنصة وفي طباعة التحضيرات.', '#/settings']);
    if (!preps.length) sugs.push(['prep', 'ابدئي بتحضير درس واحد — ستحتاجينه لاحقًا في الطباعة والاختبارات.', '#/prep']);
    if (!tasks.length) sugs.push(['tasks', 'أضيفي مهام اليوم حتى لا تنسى موعد اختبار أو واجب.', '#/home']);
    var aiReady = AI.isReady();
    if (!aiReady) sugs.push(['ai', 'مركز الذكاء الاصطناعي جاهز بالواجهة، ويعمل عند ربط خدمة — تعلمي كيف.', '#/ai-settings']);
    sugs.push(['backup', 'صدّري نسخة احتياطية من بياناتكِ إلى ملف، حتى لا تضيع إن مسحْتِ المتصفح.', '#/settings']);
    if (preps.length && !(Store.get('recent', []) || []).filter(function (r) { return r.id === 'prep'; }).length)
      sugs.push(['return', 'لديكِ تحضيرات محفوظة — أعيدي فتح استوديو التحضير لمواصلة العمل.', '#/prep']);

    $('#sugBox').innerHTML = sugs.map(function (s) {
      var ic = { profile: '👤', prep: '📝', tasks: '✅', ai: '🤖', backup: '💾', return: '↩️' }[s[0]] || '💡';
      return '<div class="sug"><span class="s-i" aria-hidden="true">' + ic + '</span>' +
        '<span style="flex:1">' + esc(s[1]) + '</span><a class="btn btn-soft btn-sm" href="' + s[2] + '">الذهاب</a></div>';
    }).join('');

    /* سجل الاستخدام */
    var usage = Store.get('usage', {}) || {};
    var uKeys = Object.keys(usage);
    $('#usageBox').innerHTML = uKeys.length
      ? uKeys.sort(function (a, b) { return (usage[b].n || 0) - (usage[a].n || 0); }).slice(0, 10).map(function (id) {
          var m = findModule(id);
          return '<div class="log-item"><b>' + esc(m ? m.t : id) + '</b>' +
            '<span>' + usage[id].n + ' زيارة · آخرها ' + esc(ago(usage[id].last)) + '</span></div>';
        }).join('')
      : '<div class="empty"><b>لا يوجد استخدام مسجَّل بعد</b>ستظهر إحصائيات فتحكِ للأقسام هنا.</div>';
  }

  /* =========================================================
     الإعدادات والملف الشخصي
     ========================================================= */
  function renderSettings(main) {
    var p = profile();
    var pic = Store.get('profilePic', '');
    var th = Store.get('theme', 'light');
    var fs = Store.get('fs', 16);

    main.innerHTML =
      '<h1 class="page-h">الإعدادات والملف الشخصي</h1>' +
      '<p class="page-s">كل ما تغيّرينه هنا يُحفظ فورًا في متصفحكِ على هذا الجهاز.</p>' +

      '<section class="card"><h3>👤 ملفي الشخصي</h3>' +
        '<div class="row2">' +
          '<div class="field"><label for="pfName">اسم المعلم/المعلمة</label><input type="text" id="pfName" value="' + esc(p.name || '') + '" placeholder="مثال: أ. فاطمة علي"></div>' +
          '<div class="field"><label for="pfSchool">المدرسة</label><input type="text" id="pfSchool" value="' + esc(p.school || '') + '" placeholder="مثال: متوسطة الأندلس"></div>' +
          '<div class="field"><label for="pfSubject">المادة</label><input type="text" id="pfSubject" value="' + esc(p.subject || '') + '" placeholder="مثال: الرياضيات"></div>' +
          '<div class="field"><label for="pfYear">السنة الدراسية</label><input type="text" id="pfYear" value="' + esc(p.year || '') + '" placeholder="مثال: 2025 / 2026"></div>' +
        '</div>' +
        '<div class="field"><label for="pfPic">الصورة (اختيارية)</label>' +
          '<input type="file" id="pfPic" accept="image/*">' +
          '<div class="hint">تُصغَّر الصورة وتُحفظ محليًا. يمكنكِ حذفها في أي وقت.</div>' +
          (pic ? '<button class="btn btn-danger btn-sm" id="pfPicDel" style="margin-top:8px">حذف الصورة الحالية</button>' : '') +
        '</div>' +
        '<div class="btn-row"><button class="btn btn-primary" id="pfSave">💾 حفظ الملف الشخصي</button>' +
          '<span class="badge ok">يُحفظ تلقائيًا بعد الحفظ</span></div>' +
      '</section>' +

      '<section class="card"><h3>🎨 المظهر وإمكانية الوصول</h3>' +
        '<div class="row2">' +
          '<div class="field"><label>الوضع اللوني</label>' +
            '<div class="btn-row">' +
              '<button class="btn ' + (th === 'light' ? 'btn-navy' : 'btn-soft') + '" data-th="light">☀️ فاتح</button>' +
              '<button class="btn ' + (th === 'dark' ? 'btn-navy' : 'btn-soft') + '" data-th="dark">🌙 داكن</button>' +
            '</div></div>' +
          '<div class="field"><label for="pfFs">حجم الخط</label>' +
            '<select id="pfFs">' +
              '<option value="15"' + (fs == 15 ? ' selected' : '') + '>صغير (15px)</option>' +
              '<option value="16"' + (fs == 16 ? ' selected' : '') + '>عادي (16px)</option>' +
              '<option value="17.5"' + (fs == 17.5 ? ' selected' : '') + '>كبير (17.5px)</option>' +
              '<option value="19"' + (fs == 19 ? ' selected' : '') + '>أكبر (19px)</option>' +
            '</select></div>' +
        '</div>' +
        '<p class="mini">التنقل ممكن بلوحة المفاتيح (Tab + Enter)، والتصفّح يعمل على الهاتف والحاسوب والجهاز اللوحي. ' +
        'الحالة لا تُشرح باللون وحده — بل بنص واضح دائمًا.</p>' +
      '</section>' +

      '<section class="card"><h3>💾 النسخ الاحتياطي والبيانات</h3>' +
        '<div class="btn-row">' +
          '<button class="btn btn-navy" id="expBtn">⬇️ تصدير نسخة احتياطية (JSON)</button>' +
          '<button class="btn btn-soft" id="impBtn">⬆️ استيراد نسخة احتياطية</button>' +
          '<input type="file" id="impFile" accept="application/json,.json" hidden>' +
          '<button class="btn btn-soft" id="demoBtn">🧪 تحميل بيانات تجريبية</button>' +
        '</div>' +
        '<p class="mini" style="margin-bottom:6px">المساحة المستخدمة حاليًا: <b>' + Store.usageText() + '</b> — ' +
        'عدد المفاتيح المحفوظة: <b>' + Store.keys().length + '</b><br>' +
        '<span id="filesInfo">' + esc((global.Files ? Files.infoText() : '')) + '</span></p>' +
        '<div class="notice"><b>ملاحظة عن ملفات PDF والصور:</b> تُحفظ في متصفحكِ على هذا الجهاز فقط ' +
        'ولا تدخل داخل ملف النسخة الاحتياطية JSON. قبل تغيير الجهاز أو مسح بيانات المتصفّح، نزّليها منفردًا ' +
        'من المكتبة أو من بطاقة المورد.</div>' +
        '<button class="btn btn-danger btn-sm" id="wipeBtn">🗑 حذف كل بياناتي من هذا الجهاز</button>' +
      '</section>' +

      '<section class="card"><h3>🤖 الذكاء الاصطناعي</h3>' +
        '<p class="mini" style="margin-top:0">الحالة: <span class="badge ' + (AI.isReady() ? 'ok' : 'wait') + '">' +
          esc(AI.status().text) + '</span></p>' +
        '<div class="btn-row"><a class="btn btn-navy" href="#/ai-settings">إعداد ربط الخدمات الذكية</a>' +
        '<a class="btn btn-soft" href="#/ai">فتح مركز الذكاء</a></div>' +
      '</section>';

    /* --- ربط الأحداث --- */
    if (global.Files) {
      Files.init().then(function () {
        var el = $('#filesInfo'); if (el) el.textContent = Files.infoText();
      });
    }

    function saveProfile() {
      var r = Store.set('profile', {
        name: $('#pfName').value.trim(), school: $('#pfSchool').value.trim(),
        subject: $('#pfSubject').value.trim(), year: $('#pfYear').value.trim()
      });
      notify(r.ok ? 'حُفظ الملف الشخصي ✓' : r.error, r.ok ? 'ok' : 'err');
    }
    $('#pfSave').onclick = saveProfile;
    ['pfName', 'pfSchool', 'pfSubject', 'pfYear'].forEach(function (id) {
      $('#' + id).addEventListener('keydown', function (e) { if (e.key === 'Enter') saveProfile(); });
    });

    $('#pfPic').onchange = function () {
      var f = this.files && this.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { notify('الملف ليس صورة', 'err'); return; }
      var fr = new FileReader();
      fr.onload = function (ev) {
        var img = new Image();
        img.onload = function () {
          var c = document.createElement('canvas');
          c.width = c.height = 160;
          var ctx = c.getContext('2d');
          var s = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 160, 160);
          var r = Store.set('profilePic', c.toDataURL('image/jpeg', 0.82));
          notify(r.ok ? 'حُفظت الصورة ✓' : r.error, r.ok ? 'ok' : 'err');
          route();
        };
        img.onerror = function () { notify('تعذّرت قراءة الصورة', 'err'); };
        img.src = ev.target.result;
      };
      fr.readAsDataURL(f);
    };
    var picDel = $('#pfPicDel');
    if (picDel) picDel.onclick = function () {
      UI.confirm('حذف الصورة الشخصية؟').then(function (ok) {
        if (!ok) return;
        Store.remove('profilePic'); notify('حُذفت الصورة'); route();
      });
    };

    $$('[data-th]').forEach(function (b) {
      b.onclick = function () { Store.set('theme', b.getAttribute('data-th')); applyTheme(); route(); };
    });
    $('#pfFs').onchange = function () { Store.set('fs', parseFloat(this.value)); applyFont(); notify('تغيّر حجم الخط ✓'); };

    $('#expBtn').onclick = function () {
      var blob = new Blob([Store.exportJSON()], { type: 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'نسخة-احتياطية-المعلم-الليبي-' + todayISO() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      notify('تم تصدير النسخة الاحتياطية ✓', 'ok');
    };

    $('#impBtn').onclick = function () { $('#impFile').click(); };
    $('#impFile').onchange = function () {
      var f = this.files && this.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        var r = Store.importJSON(String(fr.result));
        notify(r.ok ? ('استُوردت ' + r.count + ' عنصرًا ✓') : 'ملف غير صالح — تأكدِي أنه نسخة مُصدَّرة من هذه المنصة',
               r.ok ? 'ok' : 'err');
        if (r.ok) route();
      };
      fr.readAsText(f, 'utf-8');
      this.value = '';
    };

    $('#demoBtn').onclick = function () {
      function seedIt() { Store.seedDemo(); notify('حُمِّلت بيانات تجريبية ✓', 'ok'); route(); }
      if (Store.get('profile', null) && Store.get('profile').name) {
        UI.confirm('سيُستبدل ملفكِ الشخصي الحالي وقائمة المهام ببيانات تجريبية. هل تتابعين؟')
          .then(function (ok) { if (ok) seedIt(); });
        return;
      }
      seedIt();
    };

    $('#wipeBtn').onclick = function () {
      UI.prompt('لحذف كل بياناتكِ من هذا الجهاز اكتبي كلمة: حذف', '', 'تأكيد الحذف الشامل')
        .then(function (v) {
          if (v === null) return;
          if (v.trim() !== 'حذف') { notify('لم تُكتب كلمة «حذف» — لم يُحذف شيء', 'err'); return; }
          Store.wipe();
          if (global.Files) Files.wipe();
          notify('حُذفت كل البيانات ✓'); applyTheme(); applyFont(); route();
        });
    };
  }

  /* =========================================================
     مركز الذكاء الاصطناعي
     ========================================================= */
  var AI_TOOLS = [
    { id: 'prep', i: '📝', t: 'مساعد تحضير الدروس', d: 'يقترح بنية درس وأهدافًا وأنشطة من بياناتكِ.' },
    { id: 'explain', i: '🧠', t: 'مساعد شرح المفاهيم الصعبة', d: 'شرح مبسّط لمفهوم معين بلغة تناسب عمر الطلاب.' },
    { id: 'activities', i: '🧩', t: 'مساعد الأنشطة الصفية', d: 'أنشطة تطبيقية وتعاونية مرتبطة بالهدف.' },
    { id: 'stories', i: '📖', t: 'مساعد القصص التعليمية', d: 'قصة قصيرة تخدم فكرة تعليمية محددة.' },
    { id: 'worksheets', i: '📄', t: 'مساعد أوراق العمل', d: 'ورقة عمل بأسئلة متدرجة مع مفتاح إجابة.' },
    { id: 'quiz', i: '❓', t: 'مساعد الأسئلة والاختبارات', d: 'بنك أسئلة بأنواع متعددة ومستويات صعوبة.' },
    { id: 'analyze', i: '📊', t: 'مساعد تحليل نتائج الطلاب', d: 'قراءة تحليلية لدرجات يُدخلها المعلم (لا تُرسل تلقائيًا).' },
    { id: 'reports', i: '📋', t: 'مساعد التقارير التربوية', d: 'صياغة تقرير مهني واضح ومقروء.' },
    { id: 'scenario', i: '🎬', t: 'مساعد سيناريوهات الفيديو', d: 'سيناريو مقسّم إلى مشاهد بزمن تقريبي.' },
    { id: 'simplify', i: '🪄', t: 'مساعد تبسيط المحتوى', d: 'إعادة صياغة نص لمستويات دراسية مختلفة.' },
    { id: 'review', i: '🔎', t: 'مساعد مراجعة الأخطاء', d: 'مراجعة لغوية وتربوية لنص المعلم قبل النشر.' },
    { id: 'adapt', i: '🤝', t: 'مساعد التكييف لل diferenات الفردية', d: 'تعديل النشاط لذوي الاحتياجات التعليمية المختلفة.' }
  ];
  AI_TOOLS[11].t = 'مساعد التكييف للفرق الفردية';

  function renderAI(main, m) {
    var st = AI.status();
    var ready = AI.isReady();
    var results = Store.get('aiResults', []) || [];

    main.innerHTML =
      '<div class="mod-hero"><div class="mh-top">' +
        '<span class="mh-ic" aria-hidden="true">' + m.i + '</span>' +
        '<div style="flex:1;min-width:220px"><h2>' + esc(m.t) + '</h2><p>' + esc(m.d) + '</p></div>' +
        '<span class="badge ' + (ready ? 'ok' : 'wait') + '">' + esc(st.text) + '</span>' +
      '</div></div>' +

      '<div class="notice ' + (ready ? 'ok' : 'warn') + '">' +
        (ready
          ? '<b>الخدمة مهيّأة.</b> عند الضغط على «إنشاء» سيُرسل طلب فعلي إلى الوسيط المُعرَّف. ' +
            'إن فشل الاتصال ستظهر رسالة خطأ صريحة — لن تُعرض نتيجة مُخترعة.'
          : '<b>مركز الذكاء معطّل حاليًا ولم يُربط بخدمة.</b> الواجهة كاملة وجاهزة، لكن ' +
            '<b>لن تظهر أي نتيجة وهمية</b>. لتفعيله: افتحي «ربط الخدمات الذكية» وحدّدي وسيطًا يدير المفتاح على الخادم. ' +
            '<a href="#/ai-settings">فتح الإعدادات ↗</a>') +
      '</div>' +

      '<section class="card"><h3>✍️ اسأليني بالعربية مباشرة</h3>' +
        '<div class="field"><label for="aiPrompt">ما الذي تريدين إنجازه؟</label>' +
        '<textarea id="aiPrompt" placeholder="مثال: اشرح لي درس الضرب في الكسور للصف الخامس بطريقة مبسطة مع مثال من الحياة اليومية"></textarea></div>' +
        '<div class="btn-row"><button class="btn btn-primary" id="aiRun">⚡ إنشاء</button>' +
        '<span class="mini">الحالة: ' + (ready ? 'جاهز' : 'غير مفعّل') + '</span></div>' +
      '</section>' +

      '<section class="card"><h3>🧰 الأدوات الاثنا عشر</h3>' +
        '<div class="grid g3">' + AI_TOOLS.map(function (t) {
          return '<button class="tool-card" data-tool="' + t.id + '">' +
            '<span class="tc-i" aria-hidden="true">' + t.i + '</span>' +
            '<b>' + esc(t.t) + '</b><small>' + esc(t.d) + '</small></button>';
        }).join('') + '</div>' +
      '</section>' +

      '<section class="card"><h3>📄 النتيجة</h3>' +
        '<div class="ai-out" id="aiOut">ستظهر النتيجة هنا بعد الضغط على «إنشاء».</div>' +
        '<div class="btn-row" style="margin-top:12px">' +
          '<button class="btn btn-soft" id="aiCopy" disabled>📋 نسخ</button>' +
          '<button class="btn btn-soft" id="aiSave" disabled>💾 حفظ في قائمة النتائج</button>' +
          '<button class="btn btn-ghost" id="aiRegen" disabled>🔁 إعادة التوليد</button>' +
          '<span id="aiState" class="mini"></span>' +
        '</div>' +
        '<div id="aiSaved" style="margin-top:14px"></div>' +
      '</section>';

    var lastTool = null, lastPrompt = '';

    function setState(txt, busy) {
      $('#aiState').textContent = txt || '';
      ['#aiCopy', '#aiSave', '#aiRegen'].forEach(function (s) { $(s).disabled = !!busy; });
    }

    function doRun(toolId, promptText) {
      lastTool = toolId; lastPrompt = promptText;
      var out = $('#aiOut');
      out.textContent = '… جارٍ الإرسال إلى خدمة الذكاء الاصطناعي';
      setState('', true);
      $('#aiRegen').disabled = true;

      AI.run({
        tool: toolId,
        prompt: promptText,
        inputs: { profile: profile() }
      }).then(function (text) {
        out.textContent = text;
        setState('اكتمل التوليد ✓');
        $('#aiCopy').disabled = false; $('#aiSave').disabled = false; $('#aiRegen').disabled = false;
      }).catch(function (e) {
        out.innerHTML = '<b style="color:#C6382F">تعذّر إنشاء المحتوى.</b>\n\n' + esc(e.message || 'خطأ غير معروف') +
          '\n\nهذا يعني أن الخدمة غير متاحة أو أن الإعدادات غير مكتملة — ولن نعرض نتيجة بديلة مُخترعة.';
        setState('فشل ✓ (رسالة صريحة)');
        $('#aiRegen').disabled = false;
        notify(e.message || 'فشل الإنشاء', 'err');
      });
    }

    $('#aiRun').onclick = function () {
      var p = $('#aiPrompt').value.trim();
      if (!p) { notify('اكتبي طلبكِ أولًا في الصندوق', 'err'); $('#aiPrompt').focus(); return; }
      doRun('general', p);
    };

    $$('[data-tool]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-tool');
        var tool = AI_TOOLS.filter(function (t) { return t.id === id; })[0];
        openModal(tool.t,
          '<p class="mini" style="margin-top:0">' + esc(tool.d) + '</p>' +
          '<div class="row2">' +
            '<div class="field"><label for="fSub">المادة</label><input type="text" id="fSub" value="' + esc(profile().subject || '') + '"></div>' +
            '<div class="field"><label for="fGr">الصف</label><input type="text" id="fGr" placeholder="مثال: الخامس الأساسي"></div>' +
          '</div>' +
          '<div class="field"><label for="fTopic">الدرس / الموضوع</label><input type="text" id="fTopic" placeholder="مثال: النسبة والتناسب"></div>' +
          '<div class="field"><label for="fExtra">تفاصيل إضافية</label>' +
            '<textarea id="fExtra" placeholder="زمن الحصة، عدد الطلاب، ما تريده تحديدًا…"></textarea></div>' +
          '<div class="btn-row"><button class="btn btn-primary" id="fGo">⚡ إنشاء</button>' +
          '<button class="btn btn-ghost" id="fCancel">إلغاء</button></div>');
        $('#fCancel').onclick = closeModal;
        $('#fGo').onclick = function () {
          var prompt = 'الأداة: ' + tool.t +
            '\nالمادة: ' + ($('#fSub').value.trim() || '—') +
            '\nالصف: ' + ($('#fGr').value.trim() || '—') +
            '\nالموضوع: ' + ($('#fTopic').value.trim() || '—') +
            '\nتفاصيل: ' + ($('#fExtra').value.trim() || '—');
          closeModal();
          $('#aiPrompt').value = prompt;
          doRun(id, prompt);
        };
      };
    });

    $('#aiCopy').onclick = function () {
      var txt = $('#aiOut').textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { notify('نُسخت النتيجة ✓', 'ok'); },
          function () { notify('تعذّر النسخ تلقائيًا — حدّدي النص وانسخيه يدويًا', 'err'); });
      } else { notify('المتصفح لا يدعم النسخ التلقائي — حدّدي النص يدويًا', 'err'); }
    };

    $('#aiSave').onclick = function () {
      var txt = $('#aiOut').textContent;
      if (!txt || $('#aiOut').textContent.indexOf('ستظهر النتيجة') === 0) return;
      var list = Store.get('aiResults', []) || [];
      list.unshift({ id: Store.uid(), tool: lastTool || 'general', text: txt, at: new Date().toISOString() });
      var r = Store.set('aiResults', list.slice(0, 20));
      notify(r.ok ? 'حُفظت النتيجة ✓' : r.error, r.ok ? 'ok' : 'err');
      drawSaved();
    };

    $('#aiRegen').onclick = function () {
      if (!lastPrompt) { notify('لا يوجد ما يُعاد إرساله', 'err'); return; }
      doRun(lastTool, lastPrompt);
    };

    function drawSaved() {
      var list = Store.get('aiResults', []) || [];
      $('#aiSaved').innerHTML = list.length
        ? '<h3 style="margin-top:0">📚 آخر النتائج المحفوظة</h3>' + list.map(function (r) {
            return '<div class="log-item"><div style="flex:1"><b>' + esc((r.text || '').slice(0, 70)) +
              ((r.text || '').length > 70 ? '…' : '') + '</b>' +
              '<div class="mini">' + esc(fmtAr(r.at.slice(0, 10))) + ' · ' + esc(ago(r.at)) + '</div></div>' +
              '<span class="btn-row">' +
              '<button class="btn btn-soft btn-sm" data-show="' + r.id + '">عرض</button>' +
              '<button class="btn btn-danger btn-sm" data-rdel="' + r.id + '">حذف</button></span></div>';
          }).join('')
        : '<div class="empty">لا توجد نتائج محفوظة.</div>';

      $$('[data-show]').forEach(function (b) {
        b.onclick = function () {
          var r = (Store.get('aiResults', []) || []).filter(function (x) { return x.id === b.getAttribute('data-show'); })[0];
          if (r) { $('#aiOut').textContent = r.text; $('#aiCopy').disabled = false; $('#aiSave').disabled = false; window.scrollTo(0, 9999); }
        };
      });
      $$('[data-rdel]').forEach(function (b) {
        b.onclick = function () {
          UI.confirm('حذف هذه النتيجة؟').then(function (ok) {
            if (!ok) return;
            Store.set('aiResults', (Store.get('aiResults', []) || []).filter(function (x) { return x.id !== b.getAttribute('data-rdel'); }));
            drawSaved(); notify('حُذفت');
          });
        };
      });
    }
    drawSaved();
    setState('الحالة: ' + (AI.isReady() ? 'جاهز' : 'غير مفعّل'), AI.isReady() ? false : true);
  }

  /* =========================================================
     ربط الخدمات الذكية
     ========================================================= */
  function renderAIConfig(main) {
    var c = AI.get();
    var u = AI.usage();

    main.innerHTML =
      '<h1 class="page-h">ربط الخدمات الذكية</h1>' +
      '<p class="page-s">هذه الشاشة تضبط «كيف» يصل المنصة إلى خدمة الذكاء الاصطناعي — دون وضع أي مفتاح سري هنا.</p>' +

      '<div class="notice warn"><b>قاعدة أمنية مُلزمة:</b> ' +
        'لا تُدخل أي مفتاح (API Key) في هذه الصفحة ولا في كود المنصة ولا في المستودع العام. ' +
        'المفاتيح تُدار على الخادم (وسيط خاص بكِ). هذه الصفحة تكتفي بعنوان الوسيط والنموذج والحدود.</div>' +

      '<section class="card"><h3>🔌 إعداد الاتصال</h3>' +
        '<div class="row2">' +
          '<div class="field"><label for="aiProv">المزود</label><select id="aiProv">' +
            Object.keys(AI.PROVIDERS).map(function (k) {
              return '<option value="' + k + '"' + (c.provider === k ? ' selected' : '') + '>' + esc(AI.PROVIDERS[k].name) + '</option>';
            }).join('') +
          '</select><div class="hint" id="provNote">' + esc(AI.PROVIDERS[c.provider].note) + '</div></div>' +
          '<div class="field"><label for="aiModel">اسم النموذج</label>' +
            '<input type="text" id="aiModel" value="' + esc(c.model || '') + '" placeholder="مثال: gpt-4o-mini أو نموذج وسيطكِ">' +
            '<div class="hint">يُرسل مع الطلب إلى الوسيط.</div></div>' +
        '</div>' +
        '<div class="field"><label for="aiEnd">عنوان الوسيط (Endpoint)</label>' +
          '<input type="url" id="aiEnd" dir="ltr" value="' + esc(c.endpoint || '') + '" placeholder="https://ai.example.com/v1/generate">' +
          '<div class="hint">عنوان خادمكِ الخاص الذي يُدير المفتاح ويستقبل طلب المنصة بصيغة JSON.</div></div>' +
        '<div class="row2">' +
          '<div class="field"><label for="aiQuota">حد الاستهلاك الشهري (طلب)</label>' +
            '<input type="number" id="aiQuota" min="0" value="' + (c.monthlyQuota || 0) + '"></div>' +
          '<div class="field"><label for="aiRem">الرصيد المتبقي (يُخصم تلقائيًا)</label>' +
            '<input type="number" id="aiRem" min="0" value="' + (c.remaining || 0) + '"></div>' +
        '</div>' +
        '<div class="field"><label class="check"><input type="checkbox" id="aiConsent" ' + (c.consent ? 'checked' : '') + '>' +
          '<span>أوافق على استخدام الخدمة بشرط: <b>عدم استخدام بيانات الطلاب أو تحضيراتي لتدريب النماذج</b>. ' +
          'ولن أرسل أي بيانات شخصية عن الطلاب إلا ما أكتبه بنفسي وعن قصد.</span></label></div>' +
        '<div class="btn-row"><button class="btn btn-primary" id="aiSave">💾 حفظ الإعدادات</button>' +
        '<button class="btn btn-soft" id="aiTest">🔍 اختبار الاتصال</button>' +
        '<button class="btn btn-danger btn-sm" id="aiReset">إعادة الضبط</button></div>' +
        '<p class="mini" style="margin-top:10px">عدد الطلبات المنفذة حتى الآن: <b>' + (u.count || 0) + '</b>' +
          (u.last ? ' · آخرها: ' + esc(fmtAr(u.last.slice(0, 10))) : '') + '</p>' +
      '</section>' +

      '<section class="card"><h3>🧭 ما الذي يحدث عند «اختبار الاتصال»؟</h3>' +
        '<p class="mini" style="margin-top:0">يُرسل طلبًا حقيقيًا بسيطًا إلى العنوان المُكتوب. النتائج الممكنة:</p>' +
        '<div class="feat"><span class="f-c">▸</span><span><b>نجاح</b> → ظهر ردّ فعلي من الخادم.</span></div>' +
        '<div class="feat"><span class="f-c">▸</span><span><b>رفض/خطأ HTTP</b> → العنوان موجود لكن الشكل غير صحيح أو الرصيد غير كافٍ.</span></div>' +
        '<div class="feat"><span class="f-c">▸</span><span><b>فشل شبكة/CORS</b> → الخادم يمنع المتصفح من الاتصال مباشرة؛ ' +
          'في هذه الحالة يجب على الوسيط أن يقبل طلبات المتصفح (CORS)، وهذا مذكور في توثيق الوسيط.</span></div>' +
        '<div class="feat"><span class="f-c">▸</span><span><b>معطّل</b> → لم يُكتب عنوان أو نموذج أو موافقة.</span></div>' +
        '<p class="mini"><b>ملاحظة صريحة:</b> هذا المسار <b>لم يُختبر بعد مع خدمة حقيقية</b> لأنه لا توجد خدمة مرتبطة حتى الآن. ' +
        'سيُختبر فعليًا أول مرة تربطين فيها وسيطًا.</p>' +
      '</section>';

    $('#aiProv').onchange = function () { $('#provNote').textContent = AI.PROVIDERS[this.value].note; };

    $('#aiSave').onclick = function () {
      var r = AI.save({
        provider: $('#aiProv').value,
        endpoint: $('#aiEnd').value.trim(),
        model: $('#aiModel').value.trim(),
        monthlyQuota: parseInt($('#aiQuota').value, 10) || 0,
        remaining: parseInt($('#aiRem').value, 10) || 0,
        consent: $('#aiConsent').checked
      });
      notify(r.ok ? 'حُفظت إعدادات الربط ✓' : r.error, r.ok ? 'ok' : 'err');
      route();
    };

    $('#aiTest').onclick = function () {
      var c2 = {
        endpoint: $('#aiEnd').value.trim(), model: $('#aiModel').value.trim(),
        consent: $('#aiConsent').checked
      };
      if (!c2.endpoint || !c2.model || !c2.consent) {
        notify('أكملي العنوان والنموذج والموافقة قبل الاختبار', 'err'); return;
      }
      notify('جارٍ اختبار الاتصال…');
      AI.run({ tool: 'connection-test', prompt: 'اختبار اتصال مختصر: أجب بكلمة واحدة.',
               inputs: { profile: {} } })
        .then(function (t) { notify('نجح الاتصال ووصل ردّ فعلي ✓ — الرد: ' + String(t).slice(0, 60), 'ok'); })
        .catch(function (e) { notify('فشل الاختبار: ' + e.message, 'err'); });
    };

    $('#aiReset').onclick = function () {
      UI.confirm('إعادة ضبط إعدادات الربط بالكامل؟').then(function (ok) {
        if (!ok) return;
        AI.reset(); notify('أُعيد الضبط إلى «معطّل»'); route();
      });
    };
  }

  /* =========================================================
     الخصوصية والأمان وإتاحة الوصول
     ========================================================= */
  function renderPrivacy(main) {
    main.innerHTML =
      '<h1 class="page-h">الخصوصية والأمان وإتاحة الوصول</h1>' +
      '<p class="page-s">صفحة مطلوبة ضمن مواصفات المنصة — مكتوبة بصراحة عن ما نفعله وما لا نفعله.</p>' +

      '<section class="card"><h3>🔐 أين تُحفظ بياناتكِ؟</h3>' +
        '<div class="feat"><span class="f-c">▸</span><span>كل ما تُدخلينه (التحضيرات، المهام، الإعدادات، الملف الشخصي) يُحفظ في <b>تخزين المتصفح على جهازكِ فقط</b> (localStorage).</span></div>' +
        '<div class="feat"><span class="f-c">▸</span><span><b>لا يوجد خادم</b> — يعني: لا رفع ولا نسخ إلى أي جهة، ويعني أيضًا أن بياناتكِ لا تظهر على جهاز آخر إلا عبر النسخ الاحتياطي اليدوي.</span></div>' +
        '<div class="feat"><span class="f-c">▸</span><span>يمكنكِ تصدير كل شيء إلى ملف JSON واستعادته لاحقًا أو على جهاز آخر.</span></div>' +
        '<div class="feat"><span class="f-c">▸</span><span>ويمكنكِ الحذف النهائي في أي لحظة من الإعدادات («حذف كل بياناتي»).</span></div>' +
      '</section>' +

      '<section class="card"><h3>🚫 ما الذي لا نفعله؟</h3>' +
        '<div class="feat"><span class="f-c">✕</span><span>لا نضع مفاتيح أو أسرار داخل الكود أو المستودع العام.</span></div>' +
        '<div class="feat"><span class="f-c">✕</span><span>لا نستخدم بيانات الطلاب لتدريب أي نموذج ذكاء اصطناعي.</span></div>' +
        '<div class="feat"><span class="f-c">✕</span><span>لا نعرض نتائج ذكاء اصطناعي وهمية عند تعذّر الاتصال — بل رسالة خطأ صريحة.</span></div>' +
        '<div class="feat"><span class="f-c">✕</span><span>لا ندّعي امتلاك شهادات معتمدة أو تكاملات غير منفذة ومختبرة.</span></div>' +
        '<div class="feat"><span class="f-c">✕</span><span>لا ننشر معلومات شخصية عن الطلاب — لا حقل لرفعها مفتوح للعلن.</span></div>' +
      '</section>' +

      '<section class="card"><h3>♿ إتاحة الوصول (تجربة الاستخدام)</h3>' +
        '<div class="feat"><span class="f-c">✓</span><span>دعم كامل للعربية واتجاه RTL على الهاتف والحاسوب والجهاز اللوحي.</span></div>' +
        '<div class="feat"><span class="f-c">✓</span><span>التنقل بلوحة المفاتيح: Tab للحركة، Enter للتفعيل، وحلقة تخطي في أول الصفحة.</span></div>' +
        '<div class="feat"><span class="f-c">✓</span><span>حجم خط قابل للتعديل من الإعدادات ومن زر «A+» في الترويسة.</span></div>' +
        '<div class="feat"><span class="f-c">✓</span><span>الحالة لا تُشرح باللون وحده — لكل حالة نص واضح (جاهز/مرحلة/يتطلب خدمة).</span></div>' +
        '<div class="feat"><span class="f-c">✓</span><span>وضع فاتح وداكن، وتباين لوني مناسب، مع احترام تفضيل تقليل الحركة في النظام.</span></div>' +
      '</section>' +

      '<section class="card"><h3>⚖️ حقوق الملكية الفكرية والمصادر</h3>' +
        '<p style="margin-top:0">المحتوى الذي تُنشئينه لكِ هو لكِ. أما المناهج والكتب الرسمية فهي ملك لجهاتها — ' +
        'ولن ننسب محتوى مُخترعًا إلى المنهج الليبي الرسمي. عند إضافة مصادر لاحقًا يُذكر مصدرها وإصدارها وصفحتها.</p>' +
      '</section>' +

      '<section class="card"><h3>🧪 حدود ما تم اختباره فعليًا</h3>' +
        '<div class="feat"><span class="f-c">✓</span><span>التنقل بين الأقسام، وRTL، والنماذج، والحفظ والاسترجاع — <b>مُختبَرة</b>.</span></div>' +
        '<div class="feat"><span class="f-c">✓</span><span>تصدير النسخة الاحتياطية واستيرادها — <b>مُختبَر</b>.</span></div>' +
        '<div class="feat"><span class="f-c">△</span><span>مسار اتصال خدمة الذكاء الاصطناعي — <b>غير مختبَر</b> لعدم وجود خدمة مرتبطة.</span></div>' +
        '<div class="feat"><span class="f-c">△</span><span>الأقسام المعلَّمة «مرحلة قادمة» أو «يتطلب خدمة» — <b>لم تُنفَّذ بعد</b>، وهذا مكتوب بوضوح في مكانها.</span></div>' +
      '</section>';
  }

  /* ---------------- البحث العام ---------------- */
  function initSearch() {
    var inp = $('#globalSearch'), box = $('#searchResults');

    function close() { box.hidden = true; box.innerHTML = ''; }
    function search() {
      var q = inp.value.trim().toLowerCase();
      if (q.length < 1) { close(); return; }
      var hits = MODULES.filter(function (m) {
        return (m.t + ' ' + m.d + ' ' + (m.f || []).join(' ')).toLowerCase().indexOf(q) !== -1;
      }).slice(0, 7);
      box.hidden = false;
      box.innerHTML = hits.length
        ? hits.map(function (m) {
            var st = STATUS[m.st];
            return '<button data-go="' + m.id + '"><span aria-hidden="true">' + m.i + '</span>' +
              '<span style="flex:1">' + esc(m.t) + '</span>' +
              '<span class="badge ' + st.c + '">' + esc(st.t) + '</span></button>';
          }).join('')
        : '<div class="empty-s">لا نتائج مطابقة لـ «' + esc(inp.value) + '»</div>';

      $$('#searchResults [data-go]').forEach(function (b) {
        b.onclick = function () { location.hash = '#/' + b.getAttribute('data-go'); inp.value = ''; close(); };
      });
    }

    inp.addEventListener('input', search);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { inp.value = ''; close(); inp.blur(); }
      if (e.key === 'Enter') {
        var first = box.querySelector('[data-go]');
        if (first) first.click();
      }
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.searchwrap')) close();
    });
  }

  /* ---------------- الإقلاع ---------------- */
  function init() {
    if (window.LOCKED) return; /* قفل المنصة: لا يعمل التطبيق قبل إدخال الرمز */
    applyTheme();
    applyFont();
    navRender();
    initSearch();

    window.App = App;

    $('#btnTheme').onclick = function () {
      Store.set('theme', Store.get('theme', 'light') === 'dark' ? 'light' : 'dark');
      applyTheme();
      notify(Store.get('theme') === 'dark' ? 'الوضع الداكن ✓' : 'الوضع الفاتح ✓');
    };
    $('#btnFont').onclick = function () {
      var sizes = [15, 16, 17.5, 19];
      var cur = Store.get('fs', 16);
      var next = sizes[(sizes.indexOf(cur) + 1) % sizes.length];
      Store.set('fs', next); applyFont();
      notify('حجم الخط: ' + next + 'px');
    };
    $('#navToggle').onclick = function () {
      $('#sideNav').classList.contains('open') ? closeNav() : openNav();
    };
    $('#scrim').onclick = closeNav;
    $('#modalWrap').onclick = function (e) { if (e.target === this) closeModal(); };
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeModal(); closeNav(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault(); $('#globalSearch').focus(); $('#globalSearch').select();
      }
    });

    window.addEventListener('hashchange', route);
    route();

    /* PWA: يُسجَّل العامل فقط عند التشغيل عبر HTTP/HTTPS (أي أثناء النشر) */
    if ('serviceWorker' in navigator &&
        (location.protocol === 'https:' || location.protocol === 'http:')) {
      navigator.serviceWorker.register('sw.js').catch(function (e) {
        console.log('تعذّر تسجيل عامل التخزين المؤقت:', e && e.message);
      });
    }
  }

  /* واجهة للوحدات الخارجية (مثل prep.js) */
  var App = {
    register: function (id, fn) { views[id] = fn; },
    modules: MODULES,
    status: STATUS,
    ui: { $: $, $$: $$, esc: esc, notify: notify, fmtAr: fmtAr, todayISO: todayISO,
          pad: pad, initials: initials, openModal: openModal, closeModal: closeModal, route: route }
  };
  global.App = App;

  /* تسجيل الأقسام الجاهزة في مُوجِّه الصفحات */
  views.home = renderHome;
  views.settings = renderSettings;
  views.ai = renderAI;
  views['ai-settings'] = renderAIConfig;
  views.privacy = renderPrivacy;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(window);
