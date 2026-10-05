/* ==========================================
   جامع الروابط - sw.js
   Service Worker: كاش + عمل بدون إنترنت
   ========================================== */
const VERSION = "jr-v1.4.5";
const CORE = "core-" + VERSION;
const RUNTIME = "runtime-" + VERSION;

/* ملاحظة: لا نحزّم admin.html في الكاش.
   لوحة التحكم تحتاج اتصالاً حيّاً بـ Firebase، Presence بلا فائدة، وتشريد ذاكرة الكاش. */
/* ملاحظة: نُدرج المسارات مع معامل الإصدار ?v=
   بما يطابق ما هو مكتوب في index.html، وإلا لن يجد الكاش
   طلبات index.html أثناء العمل بدون إنترنت. */
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/css/style.css?v=1.4.5",
  "./assets/js/config.js?v=1.4.5",
  "./assets/js/data.js?v=1.4.5",
  "./assets/js/data-layer.js?v=1.4.5",
  "./assets/js/app.js?v=1.4.5"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        /* نحذف كل كاش لا يخصّ هذه النسخة، بما فيها كاش
           HTML القديم من RUNTIME — وإلا لبقي قديمة على الهاتف */
        Promise.all(keys.filter((k) => k !== CORE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // لا نتدخل مع Firebase ولا مع الخطوط الخارجية إلا بالكاش
  if (url.hostname.endsWith("googleapis.com") ||
      url.hostname.endsWith("gstatic.com") ||
      url.hostname.includes("googleusercontent.com")) return;

  if (url.hostname.includes("firestore") || url.hostname.includes("firebase") ||
      url.hostname.includes("identitytoolkit") || url.hostname.includes("securetoken")) return;

  /* التنقل: الشبكة أولاً ثم الكاش.
     cache:"reload" مقصود: بدونه يمر الطلب عبر كاش المتصفح
     (GitHub يرسل max-age=600) فيبقى المستخدم على index.html
     قديمة حتى لو كان عامل الخدمة قد تحدّث. */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req, { cache: "reload" })
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match("./index.html"))
        )
    );
    return;
  }

  // الأصول: نقدّم القديم فوراً ونحدّث في الخلفية.
  // السبب: لو اكتفينا بالكاش أولاً، لا يصل أي تحديث لمن عنده الموقع مثبّت
  // إلا بعد رفع VERSION — فيبقى على كود قديم أسابيع.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fromNet = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fromNet;
    })
  );
});
