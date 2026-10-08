/* ==========================================================
   إصلاح ذاتي للكاش — يمنع تجمّد الهاتف على نسخة قديمة
   (مُنقل من index.html إلى ملف خارجي حتى يعمل مع
    Content-Security-Policy صارمة بلا سكربتات مضمّنة)

   المشكلة الحقيقية:
     المتصفح لا يفحص عامل الخدمة إلا مرة كل ٢٤ ساعة كحد أقصى.
     فإذا ثبّت الهاتف نسخة قديمة، قد تبقى عالقة عليها أيام بلا أي سبب ظاهر.
     فيظهر للمستخدم «الموقع توقف» وهو يعمل تماماً.

   الحل:
     نطبع رقم الإصدار على كل تحميل. إن اختلف عن المحفوظ، فالمتصفح
     ينسخ الكاش ويلغي عامل الخدمة ويعيد التحميل مرة واحدة فقط.
     المتغيّر في sessionStorage يمنع أي حلقة إعادة تحميل.
   ========================================================== */
(function () {
  var V = "1.4.23";
  var KEY = "jr_ver";
  var GUARD = "jr_reset";
  try {
    var seen = null;
    try { seen = localStorage.getItem(KEY); } catch (e) {}

    /* الإصدار مطابق أو هذه أول زيارة — لا حاجة لأي إجراء */
    if (seen === null || seen === V) {
      if (seen === null) { try { localStorage.setItem(KEY, V); } catch (e) {} }
      return;
    }

    /* العلامة تحمل رقم الإصدار لا مجرد «١».
       لو كانت تحمل رقماً قديماً فلا تحجب الإصلاح الحالي —
       لهذا نتحقق من التطابق لا من وجودها فقط. */
    if (sessionStorage.getItem(GUARD) === V) return;

    /* نضع العلامة قبل العمل لا بعده: إن ألغى المستخدم التحديث
       (أغلق الصفحة) تبقى العلامة، فيُعاد الإصلاح في الزيارة التالية.
       وحملها رقم الإصدار يمنعها من تعطيل نسخة لاحقة. */
    try { sessionStorage.setItem(GUARD, V); } catch (e) {}

    var clean = function () {
      try { localStorage.setItem(KEY, V); } catch (e) {}
      try { sessionStorage.removeItem(GUARD); } catch (e) {}
      location.reload();
    };

    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(function (rs) {
        return Promise.all(rs.map(function (r) { return r.unregister(); }));
      }).catch(function () {});
    }

    if (window.caches) {
      caches.keys().then(function (ks) {
        return Promise.all(ks.map(function (k) { return caches.delete(k); }));
      }).then(clean, clean);
    } else {
      clean();
    }
  } catch (e) { /* الوضع الخاص أو القيود — الموقع يعمل بدون هذا */
  }
})();
