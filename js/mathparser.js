/* =========================================================
   mathparser.js — مُحلّل تعبيرات رياضية بسيط ومحكم
   يبني دالة f(x) من نصّ المستخدم، أو يرمي خطأ واضحًا.
   لا يعتمد على eval — تحليل بمعادلة انتقالية (shunting-yard).
   يعمل محليًا داخل المتصفح بلا أي خدمة خارجية.
   متوافق مع الأجهزة القديمة (بلا مكتبات).
   ========================================================= */
(function (global) {
  'use strict';

  var FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
    round: Math.round, floor: Math.floor, ceil: Math.ceil,
    ln: Math.log,
    log: function (v) { return Math.log(v) / Math.LN10; } /* لوغاريتم عشري */
  };

  /* تحويل الأرقام العربية/الفارسية والرموز إلى ما يفهمه المحلّل */
  function normDigits(s) {
    var ar = '٠١٢٣٤٥٦٧٨٩', fa = '۰۱۲۳۴۵۶۷۸۹', out = '', i, c, j;
    for (i = 0; i < s.length; i++) {
      c = s.charAt(i);
      j = ar.indexOf(c); if (j >= 0) { out += j; continue; }
      j = fa.indexOf(c); if (j >= 0) { out += j; continue; }
      out += c;
    }
    return out;
  }
  function normalize(s) {
    s = normDigits(String(s));
    s = s.replace(/\u00D7/g, '*').replace(/\u00F7/g, '/').replace(/\u2212/g, '-');
    s = s.replace(/\u221A/g, 'sqrt');
    s = s.replace(/\s+/g, '');
    return s;
  }

  function tokenize(src) {
    var i = 0, tokens = [], n = src.length, c;
    while (i < n) {
      c = src.charAt(i);
      if (c >= '0' && c <= '9' || c === '.') {
        var j = i, dot = false, num = '', d;
        while (j < n) {
          d = src.charAt(j);
          if (d >= '0' && d <= '9') { num += d; j++; continue; }
          if (d === '.' && !dot) { dot = true; num += d; j++; continue; }
          break;
        }
        if (num === '.') throw new Error('رقم غير صحيح قرب: "' + src.substring(i, i + 4) + '"');
        tokens.push({ t: 'num', v: parseFloat(num) });
        i = j; continue;
      }
      if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
        var k = i, name = '';
        while (k < n) {
          var ch = src.charAt(k);
          if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) { name += ch; k++; continue; }
          break;
        }
        var low = name.toLowerCase();
        if (low === 'x') tokens.push({ t: 'var' });
        else if (low === 'pi') tokens.push({ t: 'const', v: Math.PI });
        else if (low === 'e') tokens.push({ t: 'const', v: Math.E });
        else if (FUNCS[low]) tokens.push({ t: 'fn', v: low });
        else throw new Error('رمز غير معروف: "' + name + '"');
        i = k; continue;
      }
      if (c === '\u03C0') { tokens.push({ t: 'const', v: Math.PI }); i++; continue; } /* π */
      if ('+-*/^(),'.indexOf(c) >= 0) {
        if (c === '(') tokens.push({ t: 'lp' });
        else if (c === ')') tokens.push({ t: 'rp' });
        else if (c === ',') tokens.push({ t: 'comma' });
        else tokens.push({ t: 'op', v: c });
        i++; continue;
      }
      throw new Error('رمز غير مسموح به: "' + c + '"');
    }
    return tokens;
  }

  /* إدراج الضرب الضمني: 2x · 3(4) · 2sqrt(9) · x(1-y) */
  function insertImplied(tokens) {
    var res = [], i, prev = null, tk, a, b;
    for (i = 0; i < tokens.length; i++) {
      tk = tokens[i];
      if (prev) {
        a = prev.t; b = tk.t;
        var endsOperand = (a === 'num' || a === 'var' || a === 'const' || a === 'rp');
        var startsOperand = (b === 'num' || b === 'var' || b === 'const' || b === 'lp' || b === 'fn');
        if (endsOperand && startsOperand) res.push({ t: 'op', v: '*' });
      }
      res.push(tk);
      prev = tk;
    }
    return res;
  }

  var PREC = { '+': 2, '-': 2, '*': 3, '/': 3, '^': 4, 'u-': 3.5 };
  var RIGHT = { '^': true };

  function toRPN(tokens) {
    var out = [], stack = [], i, tk, top, isUnary, op;
    for (i = 0; i < tokens.length; i++) {
      tk = tokens[i];
      if (tk.t === 'num' || tk.t === 'var' || tk.t === 'const') { out.push(tk); continue; }
      if (tk.t === 'fn') { stack.push(tk); continue; }
      if (tk.t === 'comma') {
        while (stack.length && stack[stack.length - 1].t !== 'lp') out.push(stack.pop());
        if (!stack.length) throw new Error('فاصلة خارج الأقواس');
        continue;
      }
      if (tk.t === 'op') {
        isUnary = (tk.v === '-' || tk.v === '+') &&
          (i === 0 || tokens[i - 1].t === 'op' || tokens[i - 1].t === 'lp' ||
           tokens[i - 1].t === 'fn' || tokens[i - 1].t === 'comma');
        if (isUnary && tk.v === '+') continue; /* الجمع الإيجابي متجاهل */
        op = isUnary ? { t: 'op', v: 'u-' } : tk;
        while (stack.length) {
          top = stack[stack.length - 1];
          if (top.t === 'op' &&
              ((RIGHT[op.v] && PREC[op.v] < PREC[top.v]) ||
               (!RIGHT[op.v] && PREC[op.v] <= PREC[top.v]))) {
            out.push(stack.pop());
          } else break;
        }
        stack.push(op);
        continue;
      }
      if (tk.t === 'lp') { stack.push(tk); continue; }
      if (tk.t === 'rp') {
        while (stack.length && stack[stack.length - 1].t !== 'lp') out.push(stack.pop());
        if (!stack.length) throw new Error('قوس إغلاق بلا افتتاح: ")"');
        stack.pop();
        if (stack.length && stack[stack.length - 1].t === 'fn') out.push(stack.pop());
        continue;
      }
    }
    while (stack.length) {
      top = stack.pop();
      if (top.t === 'lp') throw new Error('قوس افتتاح بلا إغلاق: "("');
      out.push(top);
    }
    return out;
  }

  function evalRPN(rpn, x) {
    var st = [], i, tk, a, b, r;
    for (i = 0; i < rpn.length; i++) {
      tk = rpn[i];
      if (tk.t === 'num' || tk.t === 'const') { st.push(tk.v); continue; }
      if (tk.t === 'var') { st.push(x); continue; }
      if (tk.t === 'fn') {
        a = st.pop();
        if (a === undefined) throw new Error('قيمة ناقصة للدالة ' + tk.v);
        st.push(FUNCS[tk.v](a));
        continue;
      }
      if (tk.t === 'op') {
        if (tk.v === 'u-') {
          a = st.pop();
          if (a === undefined) throw new Error('قيمة ناقصة للإشارة السالبة');
          st.push(-a);
          continue;
        }
        b = st.pop(); a = st.pop();
        if (a === undefined || b === undefined) throw new Error('قيم ناقصة في العملية الحسابية');
        if (tk.v === '+') r = a + b;
        else if (tk.v === '-') r = a - b;
        else if (tk.v === '*') r = a * b;
        else if (tk.v === '/') r = a / b;
        else if (tk.v === '^') r = Math.pow(a, b);
        else throw new Error('عملية غير معروفة');
        st.push(r);
      }
    }
    if (st.length !== 1) throw new Error('الصيغة غير مكتملة');
    return st[0];
  }

  /* الواجهة: يبني دالة جاهزة أو يرمي خطأ واضحًا */
  function compile(expr) {
    var src = normalize(expr);
    if (!src) throw new Error('الحقل فارغ');
    var tokens = toRPN(insertImplied(tokenize(src)));
    var hasVar = false, i;
    for (i = 0; i < tokens.length; i++) if (tokens[i].t === 'var') hasVar = true;
    var f = function (x) { return evalRPN(tokens, x); };
    f(hasVar ? 1 : 0); /* تجربة فورية: أي خطأ يظهر الآن لا عند الرسم */
    return { fn: f, hasVar: hasVar };
  }

  global.LabMath = { compile: compile, normalize: normalize };
})(typeof window !== 'undefined' ? window : this);
