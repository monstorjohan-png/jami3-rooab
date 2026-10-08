/* ==========================================================
   security.js — الدرع الدائم لـ «جامع الروابط»
   طبقة حماية سلبية تعمل في كل تحميل للصفحة، لا في فحص مرة واحدة.

   ما يفعله هذا الملف (٧ طبقات):
   1) يمنع النقر على روابط بخطوط تخطيط خطرة (javascript و data وغيرها)
   2) يغلق rel=noopener على أي رابط يُفتح في تبويب جديد (منع تتبّع النوافذ)
   3) يمنع النماذج من الإرسال إلى وجهات خارجية غير موثوقة
   4) يعطّل document.write و document.open بعد اكتمال تحليل الصفحة
   5) يزيح الصفحة من داخل أي إطار يحاول تضمينها (منع الاحتيال بالنقر)
   6) يجمّد الإعدادات وقاعدة الروابط الأصلية ضد التعديل وقت التشغيل
   7) يراقب سلامة البيانات كل دقيقة ويُعيد التحميل مرة واحدة إن اختلّت
   ويقوّي window.open: يرفض الخطط الخطرة ويضيف إغلاق التتبّع.

   لا يعتمد على أي مكتبة خارجية — ملف واحد قائم بذاته.
   فشله أبداً لا يُعطل الصفحة: كل طبقة داخل try وحدها.
   ========================================================== */
(function () {
  "use strict";

  /* علامة تفعيل الدرع — تُستخدم في الاختبارات للتأكد أنه يعمل */
  window.__SHIELD__ = "active";

  var SCHEME = /^([a-z][a-z0-9+.\-]*):/i;
  var SAFE_SCHEMES = ["https", "http", "mailto", "tel"];

  /* ---------- الطبقة 1+2: اعتراض النقر ---------- */
  document.addEventListener("click", function (e) {
    try {
      if (!e.target || !e.target.closest) return;
      var a = e.target.closest("a[href]");
      if (!a) return;

      var href = String(a.getAttribute("href") || "").trim();
      var m = href.match(SCHEME);
      /* الروابط النسبية بلا خط تخطيط تمر — المشبوه فقط يُحجب */
      if (m && SAFE_SCHEMES.indexOf(m[1].toLowerCase()) === -1) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      /* أي تبويب جديد بلا rel يُغلق ضد تتبّع النوافذ (tabnabbing) */
      if (a.target === "_blank" && !(/\bnoopener\b/i.test(a.rel) || /\bnoreferrer\b/i.test(a.rel))) {
        a.rel = (a.rel + " noopener noreferrer").trim();
      }
    } catch (err) { /* الدرع لا يُعطل الصفحة أبداً */ }
  }, true);

  /* ---------- الطبقة 3: النماذج لا تُرسل لوجهات خارجية ---------- */
  document.addEventListener("submit", function (e) {
    try {
      var f = e.target;
      if (!f || !f.getAttribute) return;
      var action = String(f.getAttribute("action") || "").trim();
      if (action) {
        var u = new URL(action, location.href);
        if (u.origin !== location.origin) e.preventDefault();
      }
    } catch (err) { e.preventDefault(); }
  }, true);

  /* ---------- الطبقة 4: منع إعادة كتابة المستند ---------- */
  /* بعد اكتمال التحليل لا يوجد استعمال شرعي لـ write أو open —
     أي استعمال هو محاولة حقن إعادة كتابة الصفحة كلها. */
  function blockedWrite() { return undefined; }
  try {
    document.write = blockedWrite;
    document.writeln = blockedWrite;
    document.open = blockedWrite;
  } catch (err) { /* متصفح يرفض التتبّع — نتجاوز */ }

  /* ---------- الطبقة 5: منع التضمين الاحتيالي ---------- */
  try {
    if (window.top !== window.self) {
      window.top.location.replace(location.href);
    }
  } catch (err) { /* الإطار محجوب أصلاً بموجب سياسة الأمان — هذا أفضل */ }

  /* ---------- الطبقة 6: تجميد المصفوفات والإعدادات ---------- */
  /* أي سكربت محقون يحاول تعديل APP_CONFIG أو قاعدة الروابط أثناء
     التشغيل يصطدم بجمود المصفوفة ولا ينفّذ. يستثني لوحة التحكم
     حيث ميزة «حذف من الذاكرة» تحتاج splice على LINKS. */
  function deepFreeze(obj, depth) {
    try {
      Object.freeze(obj);
      if (depth <= 0) return;
      Object.getOwnPropertyNames(obj).forEach(function (k) {
        var v;
        try { v = obj[k]; } catch (e2) { return; }
        if (v && typeof v === "object" && !Object.isFrozen(v)) deepFreeze(v, depth - 1);
      });
    } catch (err) { /* تجميد غير ممكن — نتجاوز */ }
  }
  try {
    var onAdmin = /(^|\/)admin\.html/.test(location.pathname);
    if (typeof APP_CONFIG === "object" && APP_CONFIG) deepFreeze(APP_CONFIG, 4);
    if (typeof RAW === "object" && RAW) deepFreeze(RAW, 2);
    if (typeof CATEGORIES === "object" && CATEGORIES) deepFreeze(CATEGORIES, 2);
    if (!onAdmin && typeof LINKS === "object" && LINKS) deepFreeze(LINKS, 3);
  } catch (err) { /* بيانات لم تُحمَّل بعد — تُجمَّد في تحميل لاحق */ }

  /* ---------- الطبقة 7: مراقبة سلامة البيانات وقت التشغيل ---------- */
  /* إن استُبدلت أو حُذفت بنية البيانات بسكربت محقون — نكتشفها خلال
     دقيقة ونعيد التحميل مرة واحدة فقط عبر علامة في sessionStorage
     حتى لا ندخل حلقة إعادة تحميل لا نهائية. */
  function intact() {
    try {
      if (typeof APP_CONFIG !== "object" || !APP_CONFIG || !APP_CONFIG.cache) return false;
      if (typeof CATEGORIES !== "object" || !Array.isArray(CATEGORIES) || !CATEGORIES.length) return false;
      var onAdmin = /(^|\/)admin\.html/.test(location.pathname);
      if (onAdmin) return true; /* اللوحة تعدّل الذاكرة عمداً — لا مراقبة */
      if (typeof LINKS !== "object" || !Array.isArray(LINKS)) return false;
      if (LINKS.length !== APP_CONFIG.cache.expectedLinks) return false;
      if (LINKS.length && (typeof LINKS[0].url !== "string" || typeof LINKS[0].title !== "string")) return false;
      return true;
    } catch (err) { return false; }
  }
  var GUARD = "jr-shield-reload";
  function react() {
    try {
      if (sessionStorage.getItem(GUARD) === "1") return; /* محاولة واحدة لكل جلسة */
      sessionStorage.setItem(GUARD, "1");
      location.reload();
    } catch (err) { /* تجميد sessionStorage — نتوقف */ }
  }
  setInterval(function () {
    try {
      if (intact()) { sessionStorage.removeItem(GUARD); return; }
      react();
    } catch (err) { /* لا شيء */ }
  }, 60000);

  /* ---------- تقوية window.open ---------- */
  try {
    var rawOpen = window.open;
    window.open = function (url, name, feats) {
      if (typeof url === "string") {
        var m = url.trim().match(SCHEME);
        if (m && m[1].toLowerCase() !== "https" && m[1].toLowerCase() !== "http") return null;
      }
      var f = feats || "";
      if (f && !/noopener/i.test(f)) f += ",noopener";
      return rawOpen.call(window, url, name, f);
    };
  } catch (err) { /* لا شيء */ }
})();
