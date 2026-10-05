/* ============================================================
   خادم محلي بسيط للاختبار — بلا أي حزم خارجية
   ────────────────────────────────────────────────────────────
   الغرض: اختبار الموقع في المتصفح قبل النشر على GitHub Pages.
   لا يُنشر على الإنترنت إطلاقاً، ولا يفتح إلا على localhost.

   node serve.js [port]
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.argv[2] || 8088);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  /* منع الخروج من المجلد */
  const full = path.join(ROOT, urlPath);
  if (!full.startsWith(ROOT)) {
    res.writeHead(403); res.end("403"); return;
  }

  fs.readFile(full, (err, buf) => {
    if (err) {
      /* SPA fallback */
      fs.readFile(path.join(ROOT, "index.html"), (e2, idx) => {
        if (e2) { res.writeHead(404); res.end("404"); return; }
        res.writeHead(200, { "Content-Type": TYPES[".html"] });
        res.end(idx);
      });
      return;
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(full).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(buf);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("localhost:" + PORT + " — " + ROOT);
});