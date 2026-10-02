/* ==========================================
   جامع الروابط - sw.js
   Service Worker: كاش + عمل بدون إنترنت
   ========================================== */
const VERSION = "jr-v1.3.0";
const CORE = "core-" + VERSION;
const RUNTIME = "runtime-" + VERSION;

/* ملاحظة: لا نحزّم admin.html في الكاش.
   لوحة التحكم تحتاج اتصالاً حيّاً بـ Firebase، Presence بلا فائدة، وتشريد ذاكرة الكاش. */
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/css/style.css",
  "./assets/js/config.js",
  "./assets/js/data.js",
  "./assets/js/data-layer.js",
  "./assets/js/app.js"
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
        Promise.all(keys.filter((k) => k !== CORE && k !== RUNTIME).map((k) => caches.delete(k)))
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

  // التنقل: الشبكة أولاً ثم الكاش (أحدث نسخة)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // الأصول: الكاش أولاً
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
