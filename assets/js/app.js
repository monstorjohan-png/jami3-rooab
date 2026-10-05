/* ==========================================
   جامع الروابط - app.js
   المنطق الرئيسي للواجهة
   ========================================== */
(function () {
  "use strict";

  /* ---------- حالة التطبيق ---------- */
  const state = {
    links: [],
    categories: [],
    filter: "all",
    query: "",
    lang: "all",
    tier: "all",
    sort: "popular",
    user: null,
    isAdmin: false,
    remoteLinks: [],
    perPage: 12,
    page: 1,
    /* عدد بلاغات الروابط حسب الرابط المُبلَّغ عنه — صفر أو واحد في الغالب.
       تُقرأ من التخزين المحلي مرة واحدة قبل أول عرض، حتى لا يظهر الزر
       على بطاقة بلَّغ عنها الزائر نفسه قبل دقائق كأنه لم يُبلَّغ بعد. */
    reportCounts: {}
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- أدوات مساعدة ---------- */
  const esc = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const host = (url) => {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch (e) { return "رابط"; }
  };

  const initial = (title) => (title || "؟").trim().charAt(0).toUpperCase();

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    del(key) { try { localStorage.removeItem(key); } catch (e) {} }
  };

  /* ---------- إشعارات ---------- */
  function toast(message, type) {
    let wrap = $(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      wrap.setAttribute("role", "status");
      wrap.setAttribute("aria-live", "polite");
      document.body.appendChild(wrap);
    }
    const icons = { ok: "✅", err: "⛔", warn: "⚠️", info: "ℹ️" };
    const el = document.createElement("div");
    el.className = "toast " + (type || "info");
    el.textContent = (icons[type] || "") + " " + message;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity .3s";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 320);
    }, 3800);
  }

  /* ---------- فحص أمان الرابط ---------- */
  /* ملاحظة: الامتدادات الخطرة تُفحص على مسار الملف فقط (بعد آخر / أو ?)
     وليس على النطاق، حتى لا نرفض نطاقات شرعية مثل example.com */
  const BAD_EXT = [
    ".exe", ".scr", ".bat", ".cmd", ".com", ".pif", ".jar", ".msi",
    ".vbs", ".js.", ".php", ".apk", ".dll", ".hta", ".ps1"
  ];
  const SHORTENERS = [
    "bit.ly", "tinyurl.com", "shorturl.at", "adf.ly", "sh.st",
    "cutt.ly", "rb.gy", "ow.ly", "is.gd", "rebrand.ly"
  ];
  const BAD_PROTOCOLS = ["javascript:", "data:", "vbscript:", "file:", "about:", "blob:"];

  function checkUrlSafety(rawUrl) {
    const L = APP_CONFIG.limits;
    const url = String(rawUrl || "").trim();

    if (!url) return { ok: false, reason: "الرابط فارغ" };
    if (url.length > L.maxUrlLength) return { ok: false, reason: "الرابط طويل جداً (الحد 300 حرف)" };

    const lower = url.toLowerCase();

    for (let i = 0; i < BAD_PROTOCOLS.length; i++) {
      if (lower.indexOf(BAD_PROTOCOLS[i]) === 0) {
        return { ok: false, reason: "بروتوكول خطير قد يؤدي لهجمات XSS" };
      }
    }
    if (!/^https?:\/\//i.test(url)) {
      return { ok: false, reason: "يجب أن يبدأ الرابط بـ https:// أو http://" };
    }

    let parsed;
    try { parsed = new URL(url); } catch (e) {
      return { ok: false, reason: "صيغة الرابط غير صحيحة" };
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, reason: "البروتوكول غير مسموح (المسموح فقط http/https)" };
    }
    if (parsed.username || parsed.password) {
      return { ok: false, reason: "روابط تحتوي بيانات دخول مرفوضة" };
    }
    const hostOnly = parsed.hostname.toLowerCase();
    if (hostOnly.indexOf(".") === -1) {
      return { ok: false, reason: "اسم النطاق غير صالح" };
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostOnly) || hostOnly === "[::1]") {
      return { ok: false, reason: "لا نقبل روابط بعناوين IP مباشرة" };
    }
    if (hostOnly === "localhost" || hostOnly.indexOf(".local") !== -1) {
      return { ok: false, reason: "لا نقبل عناوين الشبكة الداخلية" };
    }

    for (let i = 0; i < SHORTENERS.length; i++) {
      if (hostOnly === SHORTENERS[i] || hostOnly.endsWith("." + SHORTENERS[i])) {
        return { ok: false, reason: "روابط مختصرة غير موثوقة — استخدم الرابط الكامل" };
      }
    }

    // فحص الامتداد على المسار فقط
    const pathOnly = (parsed.pathname || "").toLowerCase();
    const fileName = pathOnly.split("/").pop() || "";
    for (let i = 0; i < BAD_EXT.length; i++) {
      if (fileName.endsWith(BAD_EXT[i])) {
        return { ok: false, reason: "ملف تنفيذي — يُحظر رفعه" };
      }
    }

    if (/\s/.test(url)) return { ok: false, reason: "الرابط يحتوي مسافات" };
    return { ok: true, reason: "سليم" };
  }

  /* ---------- تحميل البيانات ---------- */
  function loadData() {
    state.categories = CATEGORIES.slice();
    const local = LINKS.slice();

    const cached = store.get(APP_CONFIG.cache.linksKey, null);
    const fresh = cached && Date.now() - (cached.at || 0) < APP_CONFIG.cache.ttlHours * 3600 * 1000;

    /* الخريطة المخزَّنة تُهمل إن اختلف إصدار التطبيق.
       بدون هذا الشرط يبقى المستخدم على قائمة قديمة أياماً
       رغم تحديث الكود، فيظنّ أن الموقع لا يتغيّر أو أنه معطوب.
       ملاحظة مهمة: يجب المقارنة بـ cache.version لا version —
       الأخيرة غير موجودة فتصبح المقارنة undefined === undefined
       فيمرّ الكاش القديم بلا فحص. */
    const sameVersion = cached && cached.ver === APP_CONFIG.cache.version;

    if (fresh && sameVersion && Array.isArray(cached.links) && cached.links.length) {
      state.links = cached.links;
    } else {
      state.links = local;
      /* نُحدّث النسخة المخزَّنة إن كانت أقدم — بلا firebase */
      try {
        store.set(APP_CONFIG.cache.linksKey, {
          at: Date.now(),
          ver: APP_CONFIG.cache.version,
          count: local.length,
          links: local
        });
      } catch (e) { /* الوضع الخاص أو تجاوز الحصة — الموقع يعمل */ }
    }

    // دمج الروابط القادمة من Firestore (تحديث يدوي من لوحة التحكم)
    state.links = state.links.concat(state.remoteLinks);

    // إزالة التكرار حسب الرابط
    const seen = {};
    state.links = state.links.filter(function (l) {
      const k = String(l.url).replace(/\/$/, "");
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  /* لا بدّ من كتابة ver مع كل حفظ. نسخة بلا ver تُرفض لاحقاً
     (فحص الإصدار يفشل) فتُهمل وتُعاد قراءتها من data.js — وهو
     ما حدث فعلاً فبقيت قائمة 525 رابطاً لأيام. */
  function persistCache() {
    try {
      store.set(APP_CONFIG.cache.linksKey, {
        at: Date.now(),
        ver: APP_CONFIG.cache.version,
        count: state.links.length,
        links: state.links
      });
    } catch (e) { /* تجاوز الحصة — الموقع يعمل بلا كاش */ }
  }

  /* ---------- الفلترة والفرز ---------- */
  function getVisible() {
    let list = state.links.slice();

    if (state.filter !== "all") {
      list = list.filter((l) => (l.cats || []).indexOf(state.filter) !== -1);
    }
    if (state.lang !== "all") {
      list = list.filter((l) => l.lang === state.lang);
    }
    if (state.tier !== "all") {
      list = list.filter((l) => l.tier === state.tier);
    }
    if (state.query) {
      const q = state.query.toLowerCase();
      list = list.filter((l) =>
        (l.title || "").toLowerCase().indexOf(q) !== -1 ||
        (l.desc || "").toLowerCase().indexOf(q) !== -1 ||
        host(l.url).toLowerCase().indexOf(q) !== -1
      );
    }

    if (state.sort === "popular") {
      list.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    } else if (state.sort === "az") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || "", "ar"));
    } else if (state.sort === "new") {
      list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    }
    return list;
  }

  /* ---------- بناء بطاقة ---------- */
  function cardHtml(l) {
    const badges = [];
    if (l.lang === "ar") badges.push('<span class="badge ar">عربي</span>');
    else badges.push('<span class="badge en">English</span>');
    badges.push('<span class="badge ' + (l.tier === "paid" ? "paid" : "free") + '">' +
      (l.tier === "paid" ? "مدفوع" : "مجاني") + "</span>");
    if (l.safe === false) badges.push('<span class="badge paid">يحتاج تحقق</span>');
    if (l.isNew) badges.push('<span class="badge new">جديد</span>');

    return (
      '<article class="card">' +
        '<div class="card-head">' +
          '<div class="card-favicon" aria-hidden="true">' + esc(initial(l.title)) + "</div>" +
          "<div>" +
            "<h3>" + esc(l.title) + "</h3>" +
            '<div class="card-host">' + esc(host(l.url)) + "</div>" +
          "</div>" +
        "</div>" +
        '<p class="card-desc">' + esc(l.desc) + "</p>" +
        '<div class="card-meta">' + badges.join("") + "</div>" +
        (l.warn ? '<div class="security-note danger">⚠️ ' + esc(l.warn) + "</div>" : "") +
        '<div class="card-foot">' +
          '<a class="btn btn-primary" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">زيارة الموقع ←</a>' +
          '<button class="btn btn-ghost btn-sm" data-copy="' + esc(l.url) + '">نسخ</button>' +
        "</div>" +
        /* صف مستقل عن card-foot حتى لا يزاحم زر الزيارة وزر النسخ
           على شاشة الهاتف ضيقة */
        '<button class="btn btn-ghost btn-sm card-report" type="button" data-report="' +
          esc(l.url) + '" data-report-title="' + esc(l.title) +
          '" aria-label="أبلغ عن رابط لا يعمل">' +
          (state.reportCounts[normUrl(l.url)] ? "✔ بُلِّغ" : "🚨 أبلغ عن رابط مكسور") +
        "</button>" +
      "</article>"
    );
  }

  /* ---------- العرض ---------- */
  function render() {
    const all = getVisible();
    const main = $("#mainContent");
    if (!main) return;

    /* الترقيم: نرسم صفحة واحدة فقط حتى لا يثقل الـ DOM على الجوال */
    const perPage = APP_CONFIG.limits.perPage || 24;
    const totalPages = Math.max(1, Math.ceil(all.length / perPage));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
    const start = (state.page - 1) * perPage;
    const list = all.slice(start, start + perPage);

    const from = all.length ? start + 1 : 0;
    const to = Math.min(start + perPage, all.length);

    const head =
      '<section class="section">' +
        '<h2 class="section-title">🔗 ' +
          (state.query ? "نتائج البحث" : state.filter === "all" ? "كل المواقع" : esc(categoryLabel(state.filter))) +
        ' <span class="count">(' + all.length + " موقع)</span></h2>" +
        (all.length === 0
          ? '<div class="empty-state"><div class="icon">🔍</div><p>لا توجد نتائج مطابقة.</p>' +
            '<button class="btn btn-ghost" id="resetFilters">إعادة ضبط البحث</button></div>'
          : '<div class="grid">' + list.map(cardHtml).join("") + "</div>" +
            '<div class="pager">' +
              '<button class="pg-btn" id="pgFirst"' + (state.page === 1 ? " disabled" : "") + '>» الأولى</button>' +
              '<button class="pg-btn" id="pgPrev"' + (state.page === 1 ? " disabled" : "") + '>→ السابق</button>' +
              '<span class="pg-info">صفحة ' + state.page + " من " + totalPages +
                " · عرض " + from + "–" + to + " من " + all.length + "</span>" +
              '<button class="pg-btn" id="pgNext"' + (state.page === totalPages ? " disabled" : "") + '>التالي ←</button>' +
              '<button class="pg-btn" id="pgLast"' + (state.page === totalPages ? " disabled" : "") + '>الأخيرة «</button>' +
            "</div>" +
            (totalPages > 1
              ? '<div class="pg-jump">' +
                  '<label for="pgInput">اذهب إلى صفحة</label>' +
                  '<input class="input pg-num" id="pgInput" type="number" min="1" max="' + totalPages +
                    '" value="' + state.page + '" aria-label="رقم الصفحة" />' +
                  '<button class="btn btn-ghost btn-sm" id="pgGo">انتقال</button>' +
                "</div>"
              : "")) +
      "</section>";

    const extras =
      renderTools() + renderSubmit() + renderDonate() + renderShare() + renderFooter();

    main.innerHTML = head + extras;

    const reset = $("#resetFilters");
    if (reset) reset.addEventListener("click", resetFilters);

    /* أحداث الترقيم — ربط مباشر لأنها عناصر تُبنى مرة واحدة في هذه الدالة */
    const pFirst = $("#pgFirst"), pPrev = $("#pgPrev"),
          pNext = $("#pgNext"), pLast = $("#pgLast"),
          pGo = $("#pgGo"), pIn = $("#pgInput");
    if (pFirst) pFirst.addEventListener("click", () => gotoPage(1));
    if (pPrev) pPrev.addEventListener("click", () => gotoPage(state.page - 1));
    if (pNext) pNext.addEventListener("click", () => gotoPage(state.page + 1));
    if (pLast) pLast.addEventListener("click", () => gotoPage(totalPages));
    if (pGo) pGo.addEventListener("click", () => {
      const n = parseInt((pIn.value || "1"), 10);
      gotoPage(n);
    });
    if (pIn) pIn.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        gotoPage(parseInt((pIn.value || "1"), 10));
      }
    });

    updateNavActive();
    checkServiceHealth();
  }

  function gotoPage(n) {
    const all = getVisible();
    const perPage = APP_CONFIG.limits.perPage || 24;
    const totalPages = Math.max(1, Math.ceil(all.length / perPage));
    let p = parseInt(n, 10);
    if (isNaN(p) || p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    if (p === state.page) return;
    state.page = p;
    render();
    const main = $("#mainContent");
    if (main) main.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function categoryLabel(id) {
    const c = state.categories.filter((x) => x.id === id)[0];
    return c ? c.label : id;
  }

  /* ---------- إحصاءات الترويسة ---------- */
  function updateHeaderStats() {
    const n = state.links.length;
    const secs = state.categories.length;
    const el = $("#statSites");
    if (el) el.textContent = n.toLocaleString("en-US") + "+";
    const sEl = $("#statSections");
    if (sEl) sEl.textContent = String(secs);

    /* نحدّث وسوم المشاركة لتطابق العدد الفعلي ولا تتقادم.
       ملاحظة: زواحف الشبكات الاجتماعية لا تنفّذ JavaScript،
       لذا القيمة الثابتة في index.html هي التي تظهر عند المشاركة،
       وهذه تعمل للمعاينات داخل المتصفح. */
    const og = $('meta[property="og:description"]');
    if (og) og.setAttribute("content", "أكثر من " + n + " موقعاً موثوقاً في " +
      secs + " قسماً. كورسات بشهادات، توظيف، ذكاء اصطناعي، أدوات، عمل حر، كتب، وألعاب آمنة. مجاني بالكامل وبدون إعلانات.");
    const md = $('meta[name="description"]');
    if (md) md.setAttribute("content", "جامع الروابط: " + n + " موقعاً مفيداً في " + secs +
      " قسماً — كورسات بشهادات معتمدة، توظيف موثوق، ذكاء اصطناعي، أدوات مجانية، عمل حر، كتب، وألعاب آمنة. مجاني 100%.");
  }

  /* ---------- عدّادات الأقسام ---------- */
  function catCounts() {
    const m = {};
    state.links.forEach((l) => {
      (l.cats || []).forEach((c) => { m[c] = (m[c] || 0) + 1; });
    });
    return m;
  }

  /* ---------- الانتقال لقسم ---------- */
  function selectCategory(id, opts) {
    const o = opts || {};
    state.filter = id || "all";
    state.page = 1;
    const jump = $("#jumpSelect");
    if (jump) jump.value = state.filter;
    renderNav();
    render();
    if (!o.silent) {
      try { history.replaceState(null, "", "#" + state.filter); } catch (e) {}
    }
    if (!o.noScroll) {
      const main = $("#mainContent");
      if (main) main.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ---------- مُنتقي الأقسام ---------- */
  function renderPicker() {
    const grid = $("#pickerGrid");
    if (!grid) return;
    const counts = catCounts();

    const cards = state.categories.map((c) => {
      const n = counts[c.id] || 0;
      return (
        '<button class="pick-card' + (state.filter === c.id ? " active" : "") + '" data-pick="' + c.id + '">' +
          '<span class="pick-icon" aria-hidden="true">' + esc(c.icon) + "</span>" +
          '<span class="pick-body">' +
            '<b class="pick-title">' + esc(c.label) + "</b>" +
            '<small class="pick-sub">عربي: ' + (langCount(c.id, "ar")) +
              " · إنجليزي: " + (langCount(c.id, "en")) + "</small>" +
          "</span>" +
          '<span class="pick-count">' + n + "</span>" +
        "</button>"
      );
    });

    grid.innerHTML =
      '<button class="pick-card pick-all' + (state.filter === "all" ? " active" : "") + '" data-pick="all">' +
        '<span class="pick-icon" aria-hidden="true">🗂️</span>' +
        '<span class="pick-body"><b class="pick-title">كل الأقسام</b>' +
        '<small class="pick-sub">عرض كل المواقع دفعة واحدة</small></span>' +
        '<span class="pick-count">' + state.links.length + "</span>" +
      "</button>" + cards.join("");
  }

  function langCount(catId, lang) {
    return state.links.filter((l) => l.lang === lang && (l.cats || []).indexOf(catId) !== -1).length;
  }

  function openPicker() {
    const p = $("#picker"), o = $("#pickerOverlay");
    if (!p) return;
    renderPicker();
    p.hidden = false;
    if (o) o.hidden = false;
    document.body.classList.add("modal-open");
    const btn = $("#sectionsBtn");
    if (btn) btn.setAttribute("aria-expanded", "true");
    const first = $(".pick-card", p);
    if (first) first.focus();
  }

  function closePicker() {
    const p = $("#picker"), o = $("#pickerOverlay");
    if (!p) return;
    p.hidden = true;
    if (o) o.hidden = true;
    document.body.classList.remove("modal-open");
    const btn = $("#sectionsBtn");
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    }
  }

  /* ---------- القائمة المنسدلة ---------- */
  function renderJumpSelect() {
    const sel = $("#jumpSelect");
    if (!sel) return;
    const counts = catCounts();
    sel.innerHTML =
      '<option value="all">— كل الأقسام (' + state.links.length + ") —</option>" +
      state.categories.map((c) =>
        '<option value="' + c.id + '">' + esc(c.icon) + " " + esc(c.label) +
        " (" + (counts[c.id] || 0) + ")</option>"
      ).join("");
    sel.value = state.filter;
  }

  /* ---------- شريط التنقل والأقسام ---------- */
  function renderNav() {
    const nav = $("#navLinks");
    if (!nav) return;
    let html = '<button class="nav-btn active" data-cat="all">الكل</button>';
    html += state.categories
      .map(
        (c) =>
          '<button class="nav-btn" data-cat="' + c.id + '">' + esc(c.icon) + " " + esc(c.label) + "</button>"
      )
      .join("");
    nav.innerHTML = html;

    $$(".nav-btn", nav).forEach((b) => {
      b.addEventListener("click", () => {
        state.filter = b.dataset.cat;
        state.page = 1;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  function updateNavActive() {
    $$(".nav-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.cat === state.filter);
    });
  }

  function renderChips() {
    const box = $("#filterChips");
    if (!box) return;

    const langs = [
      { v: "all", label: "كل اللغات" },
      { v: "ar", label: "عربي" },
      { v: "en", label: "English" }
    ];
    const tiers = [
      { v: "all", label: "كل الأنواع" },
      { v: "free", label: "مجاني" },
      { v: "paid", label: "مدفوع" }
    ];

    const chipHtml = (g, items, active) =>
      items.map((x) =>
        '<span class="chip' + (x.v === active ? " active" : "") + '" data-g="' + g + '" data-v="' + x.v + '">' + x.label + "</span>"
      ).join("");

    box.innerHTML =
      chipHtml("lang", langs, state.lang) + chipHtml("tier", tiers, state.tier);

    $$(".chip", box).forEach((c) => {
      c.addEventListener("click", () => {
        if (c.dataset.g === "lang") state.lang = c.dataset.v;
        else state.tier = c.dataset.v;
        renderChips();
        render();
      });
    });
  }

  /* ---------- الأدوات ---------- */
  function renderTools() {
    const dl = APP_CONFIG.download;
    const svcChips = dl.services
      .map(
        (s) =>
          '<span class="svc-chip" data-svc="' + esc(s.id) + '">' +
          (s.trusted ? "★ " : "") + esc(s.name) +
          '<i class="svc-dot" id="dot-' + esc(s.id) + '"></i>' +
          "</span>"
      )
      .join("");

    return (
      '<section class="panel" id="tools">' +
        '<h2 class="panel-title">🎬 أداة تحميل الفيديو والصوت</h2>' +
        '<p class="panel-lead">الصق رابط الفيديو أو المقطع الصوتي، وسنتحقق منه ونوصلك بالخطوة الصحيحة.</p>' +

        '<div class="dl-row">' +
          '<input class="input" id="dlUrl" type="url" inputmode="url" ' +
            'placeholder="https://www.youtube.com/watch?v=..." aria-label="رابط الفيديو" ' +
            'autocomplete="off" spellcheck="false" />' +
          '<span class="dl-detect" id="dlDetect"></span>' +
        "</div>" +

        '<div class="quality-grid" role="group" aria-label="اختر ما تريد">' +
          ["video", "audio"].map((k, i) =>
            '<button class="q-btn' + (i === 0 ? " active" : "") + '" data-q="' + k + '" type="button">' +
            (k === "video" ? "🎥 فيديو" : "🎵 صوت (MP3)") +
            "</button>"
          ).join("") +
        "</div>" +

        '<div class="dl-actions">' +
          '<button class="btn btn-primary" id="dlGo" type="button">تحقق من الرابط</button>' +
          '<button class="btn btn-ghost btn-sm" id="dlCopy" type="button">📋 نسخ الرابط</button>' +
        "</div>" +

        '<div class="dl-result" id="dlResult" aria-live="polite"></div>' +

        '<div class="svc-status">' +
          '<div class="svc-head">حالة الخدمات الآن: <span id="svcSummary">جارٍ الفحص…</span></div>' +
          '<div class="svc-list">' + svcChips + "</div>" +
        "</div>" +

        '<details class="dl-truth">' +
          "<summary>❓ كيف تعمل هذه الأداة فعلاً؟</summary>" +
          "<div>" +
            "<p><b>هذه الأداة لا تحمّل من موقعك.</b> أي موقع ثابت (HTML/JS) لا يستطيع تنزيل ملف، " +
              "لأن ذلك يحتاج خادماً يشغّل برنامجاً اسمه yt-dlp — والخوادم المكلفة غير متاحة مجاناً.</p>" +
            "<p>ما تفعله الأداة: تتحقق من أن الرابط سليم وأن منصته مدعومة، ثم تفتح لك " +
              "<b>Cobalt</b> — أداة مجانية مفتوحة المصدر بلا إعلانات — وتخبرك بخطوات نسخ الرابط إليها. " +
              "الملف يُنزَّل على جهازك أنت مباشرة، ولا يمرّ على أي خادم وسيط.</p>" +
            "<p>لماذا خيارات أخرى؟ إذا تعطّل Cobalt لأي سبب، البدائل المدرجة أدناه تعمل. " +
              "ننصحك دائماً ببداية Cobalt (بلا إعلانات) لتجنّب الإعلانات المزعجة.</p>" +
            "<p><b>تحذير أمني:</b> مواقع مثل loader.to تعرض أشرطة تحميل وهمية وتطلب تثبيت برامج. " +
              "تجنّبها. الأدوات الموصى بها مفتوحة المصدر وخالية من هذه الأساليب.</p>" +
          "</div>" +
        "</details>" +
      "</section>"
    );
  }

  /* فحص حيّ لحالة كل خدمة تحميل */
  function checkServiceHealth() {
    const dl = APP_CONFIG.download;
    const summary = $("#svcSummary");
    if (!summary) return;

    const jobs = dl.services.map((s) =>
      new Promise((resolve) => {
        let done = false;
        const finish = (state) => {
          if (done) return;
          done = true;
          const dot = $("#dot-" + s.id);
          if (dot) dot.className = "svc-dot " + state;
          resolve(state);
        };
        let timer = null;
        try {
          fetch(s.url, { mode: "no-cors", cache: "no-store" })
            .then(() => finish("up"))
            .catch(() => finish("down"));
        } catch (e) {
          finish("down");
        }
        timer = setTimeout(() => finish("down"), dl.healthTimeout || 6000);
      })
    );

    Promise.all(jobs).then((states) => {
      const up = states.filter((x) => x === "up").length;
      summary.textContent = up
        ? up + " من " + dl.services.length + " تعمل الآن ✔"
        : "لاخدمة متاحة — تحقق من اتصالك بالإنترنت";
      summary.className = up ? "ok" : "bad";
    });
  }

  /* كشف المنصة من الرابط */
  function detectPlatform(url) {
    const dl = APP_CONFIG.download;
    for (const p of dl.platforms) {
      try {
        if (p.test.test(new URL(url).hostname)) return p;
      } catch (e) { /* رابط غير صالح */ }
    }
    return null;
  }

  /* بناء روابط الأدوات مع تفضيل instance خاصة إن وُجدت */
  function downloadServices() {
    const dl = APP_CONFIG.download;
    const list = dl.services.slice();
    if (dl.selfHosted && /^https:\/\/.+/.test(dl.selfHosted)) {
      list.unshift({ id: "self", name: "نسختي الخاصة", url: dl.selfHosted, trusted: true,
        note: "نسخة تشغّلها أنت — بلا حدود." });
    }
    return list;
  }

  function startDownload() {
    const input = $("#dlUrl");
    const out = $("#dlResult");
    if (!input || !out) return;
    const url = input.value.trim();
    const q = ($(".q-btn.active") || {}).dataset || {};
    const wantAudio = q.q === "audio";

    if (!url) {
      out.innerHTML = '<div class="security-note warn">الصق رابطاً أولاً.</div>';
      return;
    }

    /* 1) فحص الأمان — نفس القائمة المستخدمة في إرسال المواقع */
    const check = checkUrlSafety(url);
    if (!check.ok) {
      out.innerHTML = '<div class="security-note danger">⛔ ' + esc(check.reason) + "</div>";
      return;
    }

    /* 2) كشف المنصة */
    const plat = detectPlatform(url);
    if (!plat) {
      const supported = APP_CONFIG.download.platforms.map((p) => p.name).join("، ");
      out.innerHTML =
        '<div class="security-note danger">⚠️ لم أتعرّف على المنصة.</div>' +
        "<p style=\"color:var(--muted);font-size:.88rem\">الأدوات المجانية تدعم هذه المنصات فقط: " +
        esc(supported) + ".</p>";
      return;
    }

    /* 3) تنبيه دقيق: صوت غير متاح على بعض المنصات */
    if (wantAudio && !plat.audio) {
      out.innerHTML =
        '<div class="security-note warn">⚠️ استخراج الصوت من ' + esc(plat.name) +
        " غير مدعوم. اختر 🎥 فيديو بدلاً من 🎵 صوت.</div>";
      return;
    }

    /* 4) بناء النتيجة بخطوات حقيقية */
    const services = downloadServices();
    const want = wantAudio ? "صوت MP3" : "فيديو";
    const qLine = wantAudio
      ? "اختر <b>Audio</b> ثم <b>MP3</b>"
      : "اختر <b>Video</b> ثم الجودة المطلوبة";

    const cards = services
      .map((s, i) =>
        '<div class="svc-card">' +
          '<div class="svc-card-head">' +
            '<span class="svc-idx">' + (i + 1) + "</span>" +
            '<b>' + (s.trusted ? "★ " : "") + esc(s.name) + "</b>" +
            (i === 0 ? '<span class="badge-rec">موصى به</span>' : "") +
          "</div>" +
          '<div class="svc-note">' + esc(s.note) + "</div>" +
          '<div class="svc-card-actions">' +
            '<button class="btn btn-ghost btn-sm" data-dlcopy="1" type="button">📋 نسخ رابط الفيديو</button>' +
            '<a class="btn btn-primary btn-sm" href="' + esc(s.url) +
              '" target="_blank" rel="noopener noreferrer nofollow">افتح ' + esc(s.name) + " ↗</a>" +
          "</div>" +
        "</div>"
      )
      .join("");

    out.innerHTML =
      '<div class="security-note ok">✅ رابط سليم · المنصة: <b>' + esc(plat.name) +
        "</b> · المطلوب: <b>" + esc(want) + "</b></div>" +
      '<div class="dl-steps">' +
        "<div class=\"step\"><span>١</span> اضغط <b>نسخ رابط الفيديو</b> بالأعلى</div>" +
        "<div class=\"step\"><span>٢</span> افتح الأداة (ستفتح في تبويب جديد)</div>" +
        "<div class=\"step\"><span>٣</span> الصق الرابط في خانتها ثم اضغط جلب</div>" +
        "<div class=\"step\"><span>٤</span> " + qLine + " ثم اضغط تحميل</div>" +
      "</div>" +
      '<p class="dl-warn">الملف يُنزَّل على جهازك مباشرة. لا ترفع أي ملف على هذه الأدوات.</p>' +
      '<div class="svc-cards">' + cards + "</div>";

    /* ربط أزرار النسخ داخل النتيجة */
    $$('[data-dlcopy]', out).forEach((b) =>
      b.addEventListener("click", () => {
        copyText(url);
        b.textContent = "✅ نُسخ";
        setTimeout(() => (b.textContent = "📋 نسخ رابط الفيديو"), 1600);
      })
    );

    const log = store.get(APP_CONFIG.cache.logKey, []);
    log.push({ url: url, platform: plat.id, kind: want, at: Date.now() });
    store.set(APP_CONFIG.cache.logKey, log.slice(-100));
  }

  /* ---------- إرسال موقع ---------- */
  function renderSubmit() {
    return (
      '<section class="panel" id="submit">' +
        '<h2 class="panel-title">➕ أضف موقعك</h2>' +
        "<p>بعد إرسال الموقع يقوم المشرف بفحصه يدوياً. الموقع الآمن فقط يُضاف للصفحة.</p>" +
        '<div class="form-row two" style="margin-top:1rem">' +
          '<div><label class="field-label" for="sTitle">اسم الموقع</label>' +
          '<input class="input" id="sTitle" maxlength="120" placeholder="مثال: منصتي التعليمية" /></div>' +
          '<div><label class="field-label" for="sUrl">الرابط</label>' +
          '<input class="input" id="sUrl" type="url" placeholder="https://example.com" dir="ltr" /></div>' +
        "</div>" +
        '<div style="margin-top:.75rem"><label class="field-label" for="sCat">القسم المناسب</label>' +
        '<select class="select" id="sCat">' +
          state.categories.map((c) => '<option value="' + c.id + '">' + esc(c.label) + "</option>").join("") +
        "</select></div>" +
        '<div style="margin-top:.75rem"><label class="field-label" for="sDesc">وصف مختصر</label>' +
        '<textarea class="textarea" id="sDesc" maxlength="400" placeholder="اشرح ماذا يقدّم الموقع في سطرين"></textarea></div>' +
        '<div style="margin-top:1rem"><button type="button" class="btn btn-primary btn-block" id="sSubmit">إرسال للمراجعة</button></div>' +
        '<div id="sMsg" style="margin-top:.75rem"></div>' +
        '<div class="security-note">🛡️ فحصنا الآلي يرفض: الروابط بدون https، ملفات التنفيذ، مختصرات الروابط، وعناوين IP. ' +
          "ثم يراجعه المشرف يدوياً قبل النشر.</div>" +
      "</section>"
    );
  }

  /* ملاحظة مهمة: نستخدم تفويض الأحداث (delegation) على level المستند،
     لأن render() يعيد بناء عناصر النماذج عند كل تغيير في الحالة،
     والربط المباشر (addEventListener على عنصر) يضيع بعد إعادة البناء. */
  function bindDelegated() {
    document.addEventListener("click", function (e) {
      const t = e.target;

      if (t.closest && t.closest("#sSubmit")) { e.preventDefault(); handleSubmit(); return; }

      /* الإبلاغ عن رابط لا يعمل — أزرار البطاقات والنافذة */
      const reportBtn = t.closest && t.closest("[data-report]");
      if (reportBtn) {
        e.preventDefault();
        openReport(reportBtn.dataset.report, reportBtn.dataset.reportTitle);
        return;
      }
      if (t.closest && t.closest("#reportSend")) { e.preventDefault(); handleReport(); return; }
      if (t.closest && t.closest("#reportClose")) { closeReport(); return; }
      if (t.closest && t.closest("#reportCancel")) { closeReport(); return; }
      /* الخلفية فقط: النقر داخل النافذة يجب ألّا يغللقها */
      if (t.id === "reportOverlay") { closeReport(); return; }

      if (t.closest && t.closest("#donateCopy")) { copyText(APP_CONFIG.donation.phoneCash); return; }

      /* التبرع — أزرار مبالغ سريعة */
      const amt = t.closest && t.closest("[data-amt]");
      if (amt) {
        const inp = $("#payAmount");
        if (inp) {
          inp.value = amt.dataset.amt;
          buildUssd();
          inp.focus();
        }
        return;
      }

      /* إنشاء الكود */
      if (t.closest && t.closest("#payBuild")) {
        e.preventDefault();
        const code = buildUssd();
        const msg = $("#payMsg");
        if (code) {
          if (msg) msg.innerHTML = "✅ الكود جاهز: انسخه وارقمنه من هاتفك.";
          const cp = $("#payCopy");
          if (cp) cp.focus();
        } else if (msg && !msg.textContent) {
          msg.innerHTML = '<span class="bad">اكتب المبلغ أولاً.</span>';
        }
        return;
      }

      /* نسخ الكود */
      if (t.closest && t.closest("#payCopy")) {
        e.preventDefault();
        const code = buildUssd();
        if (!code) return;
        copyText(code);
        const b = t.closest("#payCopy");
        const old = b.textContent;
        b.textContent = "✅ نُسخ";
        setTimeout(() => (b.textContent = old), 1800);
        return;
      }

      /* الضغط على الرقم نفسه ينسخه */
      if (t.closest && t.closest("#donateNum")) {
        copyText(APP_CONFIG.donation.phoneCash);
        return;
      }
      if (t.closest && t.closest("#dlGo")) { e.preventDefault(); startDownload(); return; }
      if (t.closest && t.closest("#dlCopy")) {
        e.preventDefault();
        const inp = $("#dlUrl");
        if (!inp || !inp.value.trim()) { startDownload(); return; }
        copyText(inp.value.trim());
        const b = t.closest("#dlCopy");
        b.textContent = "✅ نُسخ";
        setTimeout(() => (b.textContent = "📋 نسخ الرابط"), 1600);
        return;
      }

      const q = t.closest && t.closest(".q-btn");
      if (q) {
        $$(".q-btn").forEach((x) => x.classList.remove("active"));
        q.classList.add("active");
        return;
      }

      const social = t.closest && t.closest("[data-s]");
      if (social) {
        const s = social.dataset.s;
        if (s === "copy") { copyText(location.href); return; }
        const url = encodeURIComponent(location.href);
        const txt = encodeURIComponent(APP_CONFIG.site.name + " — " + APP_CONFIG.site.tagline);
        const map = {
          whatsapp: "https://api.whatsapp.com/send?text=" + txt + "%20" + url,
          telegram: "https://t.me/share/url?url=" + url + "&text=" + txt,
          facebook: "https://www.facebook.com/sharer/sharer.php?u=" + url,
          twitter: "https://twitter.com/intent/tweet?text=" + txt + "&url=" + url
        };
        if (map[s]) window.open(map[s], "_blank", "width=620,height=520,noopener");
        return;
      }

      const copyBtn = t.closest && t.closest("[data-copy]");
      if (copyBtn) { copyText(copyBtn.dataset.copy); return; }

      const navBtn = t.closest && t.closest(".nav-btn");
      if (navBtn) {
        selectCategory(navBtn.dataset.cat);
        return;
      }

      /* مُنتقي الأقسام */
      const pick = t.closest && t.closest("[data-pick]");
      if (pick) {
        selectCategory(pick.dataset.pick);
        closePicker();
        return;
      }
      if (t.closest && t.closest("#sectionsBtn")) { openPicker(); return; }
      if (t.closest && t.closest("#pickerClose")) { closePicker(); return; }
      if (t.closest && t.closest("#pickerAll")) { selectCategory("all"); closePicker(); return; }
      if (t.closest && t.closest("#pickerOverlay")) { closePicker(); return; }

      const chip = t.closest && t.closest(".chip");
      if (chip) {
        if (chip.dataset.g === "lang") state.lang = chip.dataset.v;
        else state.tier = chip.dataset.v;
        state.page = 1;
        renderChips();
        render();
        return;
      }

      if (t.closest && t.closest("#resetFilters")) { resetFilters(); }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target && e.target.id === "dlUrl") {
        e.preventDefault();
        startDownload();
      }
    });

    /* كشف المنصة مباشرة أثناء الكتابة */
    document.addEventListener("input", function (e) {
      /* تحديث كود التبرع فور الكتابة */
      if (e.target && e.target.id === "payAmount") { buildUssd(); return; }

      if (!e.target || e.target.id !== "dlUrl") return;
      const badge = $("#dlDetect");
      if (!badge) return;
      const v = e.target.value.trim();
      if (!v) { badge.textContent = ""; badge.className = "dl-detect"; return; }
      const p = detectPlatform(v);
      if (p) {
        badge.textContent = "✓ " + p.name;
        badge.className = "dl-detect ok";
      } else {
        badge.textContent = "…";
        badge.className = "dl-detect";
      }
    });

    document.addEventListener("change", function (e) {
      if (e.target && e.target.id === "sortSelect") {
        state.sort = e.target.value;
        state.page = 1;
        render();
        return;
      }
      if (e.target && e.target.id === "jumpSelect") {
        selectCategory(e.target.value);
        return;
      }
    });

    /* Escape يغلق مُنتقي الأقسام */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        const p = $("#picker");
        if (p && !p.hidden) { closePicker(); return; }
      }
      /* "/" يركّز البحث */
      if (e.key === "/" && document.activeElement !== $("#searchInput")) {
        const sb = $("#searchInput");
        if (sb) { e.preventDefault(); sb.focus(); }
      }
    });
  }

  function handleSubmit() {
    const titleEl = $("#sTitle");
    const urlEl = $("#sUrl");
    const descEl = $("#sDesc");
    const catEl = $("#sCat");
    const msg = $("#sMsg");
    const btn = $("#sSubmit");
    if (!titleEl || !urlEl || !descEl || !msg) return;

    const title = titleEl.value.trim();
    const url = urlEl.value.trim();
    const cat = catEl ? catEl.value : state.categories[0].id;
    const desc = descEl.value.trim();
    const L = APP_CONFIG.limits;

    if (title.length < 2) {
      msg.innerHTML = '<div class="security-note danger">الاسم قصير جداً.</div>';
      return;
    }
    if (desc.length < 10) {
      msg.innerHTML = '<div class="security-note danger">اكتب وصفاً لا يقل عن 10 أحرف.</div>';
      return;
    }

    const check = checkUrlSafety(url);
    if (!check.ok) {
      msg.innerHTML = '<div class="security-note danger">⛔ ' + esc(check.reason) + "</div>";
      return;
    }

    const hostOf = (u) => {
      try {
        const h = new URL(String(u).trim()).hostname.toLowerCase().replace(/^www\./, "");
        // النطاقات العليا العامة تُقارن على مستوى الجذر لتغطية النطاقات الفرعية
        const parts = h.split(".");
        if (parts.length > 2) return parts.slice(-2).join(".");
        return h;
      } catch (e) { return String(u).trim().toLowerCase(); }
    };

    const targetHost = hostOf(url);

    // فحص التكرار: نقارن على مستوى النطاق الجذري حتى نلتقط النطاقات الفرعية
    const inList = (arr) => arr.some((x) => hostOf(x.url || "") === targetHost);

    const published = inList(state.links);
    const pending = inList(store.get(APP_CONFIG.cache.submissionsKey, []));

    if (published || pending) {
      msg.innerHTML = '<div class="security-note danger">هذا الموقع موجود بالفعل' +
        (pending ? " في طلبات المراجعة." : " في الموقع.") + "</div>";
      return;
    }

    const payload = {
      title: title.slice(0, L.maxTitleLength),
      url: url.slice(0, L.maxUrlLength),
      desc: desc.slice(0, L.maxDescLength),
      cats: [cat],
      lang: /[؀-ۿ]/.test(title + desc) ? "ar" : "en",
      tier: "free",
      votes: 0,
      safe: true,
      status: "pending",
      at: Date.now()
    };

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> جاري الإرسال...';
    }

    const done = (remoteOk) => {
      const localList = store.get(APP_CONFIG.cache.submissionsKey, []);
      localList.push(payload);
      store.set(APP_CONFIG.cache.submissionsKey, localList.slice(-50));

      if (btn) {
        btn.disabled = false;
        btn.textContent = "إرسال للمراجعة";
      }
      msg.innerHTML = remoteOk
        ? '<div class="security-note">✅ تم الإرسال بنجاح. سيراجعه المشرف ويظهر الموقع بعد الموافقة.</div>'
        : '<div class="security-note">✅ تم الحفظ محلياً في انتظار المزامنة. يعمل الموقع حتى بدون إنترنت.</div>';

      titleEl.value = "";
      urlEl.value = "";
      descEl.value = "";
    };

    if (Data && Data.saveSubmission) {
      Data.saveSubmission(payload).then(done).catch(() => done(false));
    } else {
      done(false);
    }
  }

  /* ==========================================================
     الإبلاغ عن رابط لا يعمل
     نمط النسخة مقيس على handleSubmit أعلاه: نفس التخزين المحلي
     ونفس فحص أمان الرابط ونفس بنية (payload + done + catch).
     ========================================================== */

  /* أسباب البلاغ — قيمها تُرسَل إلى القاعدة بأسماء ثابتة (إنجليزية)
     حتى تُقارَن بقائمة بيضاء في firestore.rules، والعرض بالعربية. */
  const REPORT_REASONS = [
    { v: "dead", label: "رابط لا يفتح" },
    { v: "changed", label: "الرابط يعمل لكن محتواه تغيّر" },
    { v: "misleading", label: "محتوى مخالف أو مضلّل" },
    { v: "login", label: "يحتاج تسجيل دخول" },
    { v: "other", label: "أخرى" }
  ];

  const reasonLabel = (code) => {
    const hit = REPORT_REASONS.filter((r) => r.v === code)[0];
    return hit ? hit.label : "أخرى";
  };

  /* توحيد شكل الرابط قبل المقارنة — يُهمل الشرطة الأخيرة مثل loadData */
  const normUrl = (u) => String(u || "").trim().replace(/\/+$/, "");

  const reportId = () =>
    "r" + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);

  function loadReportCounts() {
    state.reportCounts = {};
    const list = store.get(APP_CONFIG.cache.reportsKey, []);
    if (!Array.isArray(list)) return;
    list.forEach((r) => {
      const k = normUrl(r && r.url);
      if (k) state.reportCounts[k] = (state.reportCounts[k] || 0) + 1;
    });
  }

  /* ---------- بناء النافذة مرة واحدة ---------- */
  let reportEl = null;
  let reportPrevFocus = null;
  let reportLastOpen = 0;
  let reportLastUrl = "";
  let reportBusy = false;

  function buildReportModal() {
    if (reportEl) return reportEl;

    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.id = "reportOverlay";
    wrap.hidden = true;

    wrap.innerHTML =
      '<div class="modal report-modal" id="reportModal" role="dialog" aria-modal="true" ' +
        'aria-labelledby="reportTitle">' +
        '<div class="report-head">' +
          '<h3 id="reportTitle">🚨 أبلغ عن رابط لا يعمل</h3>' +
          '<button class="modal-close" type="button" id="reportClose" aria-label="إغلاق">✕</button>' +
        "</div>" +

        '<div class="report-target">' +
          "<b id=\"reportName\"></b>" +
          '<code id="reportUrl" dir="ltr"></code>' +
        "</div>" +

        '<div class="report-reasons" role="radiogroup" aria-labelledby="reportReasonLbl">' +
          '<span class="field-label" id="reportReasonLbl">سبب البلاغ</span>' +
          REPORT_REASONS.map((r, i) =>
            '<label class="reason-item">' +
              '<input type="radio" name="reportReason" value="' + esc(r.v) + '"' +
                (i === 0 ? " checked" : "") + " />" +
              "<span>" + esc(r.label) + "</span>" +
            "</label>"
          ).join("") +
        "</div>" +

        '<div class="report-field">' +
          '<label class="field-label" for="reportNote">ملاحظة (اختياري)</label>' +
          '<textarea class="textarea" id="reportNote" maxlength="300" ' +
            'placeholder="اكتب ما حدث بالاختصار"></textarea>' +
        "</div>" +

        '<div id="reportMsg" role="status" aria-live="polite"></div>' +

        '<div class="report-actions">' +
          '<button class="btn btn-primary" type="button" id="reportSend">إرسال البلاغ</button>' +
          '<button class="btn btn-ghost" type="button" id="reportCancel">إلغاء</button>' +
        "</div>" +
      "</div>";

    document.body.appendChild(wrap);
    reportEl = wrap;
    return wrap;
  }

  const reportFocusables = () => {
    if (!reportEl || reportEl.hidden) return [];
    return $$("button, input, textarea, select, a[href]", reportEl).filter(
      (n) => !n.disabled && n.type !== "hidden"
    );
  };

  /* حبس التركيز داخل النافذة + الإغلاق بمفتاح Escape */
  function bindReportKeys() {
    document.addEventListener("keydown", function (e) {
      if (!reportEl || reportEl.hidden) return;

      if (e.key === "Escape") {
        e.preventDefault();
        closeReport();
        return;
      }
      if (e.key !== "Tab") return;

      const f = reportFocusables();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* ---------- فتح النافذة ---------- */
  /* سبب يمنع الإرسال — نفس النص المستخدم في handleReport.
     يعيد {msg, kind, label} أو null إن كان الإرسال ممكناً. */
  const blockReason = (url) => {
    const list = store.get(APP_CONFIG.cache.reportsKey, []);
    const arr = Array.isArray(list) ? list : [];

    if (arr.some((r) => normUrl(r && r.url) === normUrl(url))) {
      return {
        msg: "أرسلتَ بلاغاً عن هذا الرابط من متصفحك سابقاً.",
        kind: "warn",
        label: "تم الإبلاغ مسبقاً"
      };
    }
    const cap = APP_CONFIG.limits.maxReportsPerUser || 20;
    if (arr.length >= cap) {
      return {
        msg: "بلغت الحد الأقصى " + cap +
          " بلاغ من هذا المتصفح. جرّب متصفحاً آخر أو امسح بيانات الموقع.",
        kind: "danger",
        label: "بلغت الحد الأقصى"
      };
    }
    return null;
  };

  function openReport(url, title) {
    const target = String(url || "").trim();
    if (!target) return;

    /* debounce: نقر مزدوج على الزر نفسه لا يعيد بناء النافذة */
    const now = Date.now();
    if (reportEl && !reportEl.hidden && reportLastUrl === target && now - reportLastOpen < 700) {
      return;
    }
    reportLastOpen = now;
    reportLastUrl = target;

    /* نفس فحص handleSubmit — الرابط المُبلَّغ عنه يجب أن يمرّ منه */
    const check = checkUrlSafety(target);
    if (!check.ok) {
      toast(check.reason, "err");
      return;
    }

    const el = buildReportModal();
    const msg = $("#reportMsg", el);
    const btn = $("#reportSend", el);
    const firstRadio = $('input[name="reportReason"]', el);

    $("#reportName", el).textContent = String(title || "رابط بلا اسم");
    $("#reportUrl", el).textContent = target;
    $("#reportNote", el).value = "";
    msg.innerHTML = "";

    const blocked = blockReason(target);
    if (blocked) {
      msg.innerHTML = '<div class="security-note ' + blocked.kind + '">' +
        esc(blocked.msg) + "</div>";
      btn.disabled = true;
      btn.textContent = blocked.label;
    } else {
      btn.disabled = false;
      btn.textContent = "إرسال البلاغ";
    }

    if (firstRadio) firstRadio.checked = true;

    reportPrevFocus = document.activeElement;
    el.hidden = false;
    el.style.display = "";
    document.body.classList.add("modal-open");
    (blocked ? btn : firstRadio || btn).focus();
  }

  function closeReport() {
    if (!reportEl || reportEl.hidden) return;
    reportEl.hidden = true;
    reportEl.style.display = "none";

    /* لا نزيل قفل التمرير إن كان مُنتقي الأقسام مفتوحاً في الوقت نفسه */
    const picker = $("#picker");
    if (!(picker && !picker.hidden)) document.body.classList.remove("modal-open");

    if (reportPrevFocus && typeof reportPrevFocus.focus === "function") {
      try { reportPrevFocus.focus(); } catch (e) {}
    }
    reportPrevFocus = null;
  }

  /* ---------- إرسال البلاغ ---------- */
  function handleReport() {
    const el = reportEl;
    if (!el || el.hidden) return;
    if (reportBusy) return;

    const nameEl = $("#reportName", el);
    const urlEl = $("#reportUrl", el);
    const noteEl = $("#reportNote", el);
    const msg = $("#reportMsg", el);
    const btn = $("#reportSend", el);
    if (!urlEl || !msg || !btn) return;

    const url = urlEl.textContent.trim();
    const title = nameEl ? nameEl.textContent.trim() : "";
    const note = noteEl ? noteEl.value.trim() : "";
    const picked = $('input[name="reportReason"]:checked', el);
    const reason = picked ? picked.value : "";
    const key = APP_CONFIG.cache.reportsKey;
    const L = APP_CONFIG.limits;

    const check = checkUrlSafety(url);
    if (!check.ok) {
      msg.innerHTML = '<div class="security-note danger">⛔ ' + esc(check.reason) + "</div>";
      return;
    }
    if (!reason) {
      msg.innerHTML = '<div class="security-note danger">اختر سبب البلاغ.</div>';
      return;
    }

    const k = normUrl(url);

    /* فحص التكرار والسقف: نفس الرابط لا مرتين من المتصفح نفسه */
    const blocked = blockReason(url);
    if (blocked) {
      msg.innerHTML = '<div class="security-note ' + blocked.kind + '">' +
        esc(blocked.msg) + "</div>";
      btn.disabled = true;
      btn.textContent = blocked.label;
      return;
    }

    const payload = {
      id: reportId(),
      title: title.slice(0, L.maxTitleLength || 120),
      url: url.slice(0, L.maxUrlLength || 300),
      reason: reason,
      reasonText: reasonLabel(reason),
      note: note.slice(0, L.maxReportNoteLength || 300),
      status: "open",
      at: Date.now()
    };

    reportBusy = true;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> جاري الإرسال...';
    msg.innerHTML = "";

    const done = (remoteOk) => {
      reportBusy = false;

      const cur = store.get(key, []);
      cur.push(payload);
      store.set(key, cur.slice(-50));

      state.reportCounts[k] = (state.reportCounts[k] || 0) + 1;
      paintReportButtons();

      btn.disabled = true;
      btn.textContent = "✔ بُلِّغ";
      msg.innerHTML = remoteOk
        ? '<div class="security-note">✅ تم إرسال بلاغك. شكراً لك — سيتحقق المشرف من الرابط.</div>'
        : '<div class="security-note">✅ تم حفظ بلاغك محلياً في انتظار المزامنة. يعمل الموقع حتى بدون إنترنت.</div>';
      toast(remoteOk ? "تم إرسال البلاغ" : "حُفظ البلاغ محلياً", "ok");
    };

    if (Data && Data.saveReport) {
      Data.saveReport(payload).then(done).catch(() => done(false));
    } else {
      done(false);
    }
  }

  /* زر الإبلاغ داخل كل بطاقة — يُحدَّث فوراً بعد الإرسال بلا إعادة بناء */
  function paintReportButtons() {
    $$("[data-report]").forEach((b) => {
      const doneAlready = state.reportCounts[normUrl(b.dataset.report)];
      if (doneAlready) {
        b.textContent = "✔ بُلِّغ";
        b.disabled = true;
        b.classList.add("done");
        b.setAttribute("aria-label", "تم الإبلاغ عن هذا الرابط");
      } else {
        b.textContent = "🚨 أبلغ عن رابط مكسور";
        b.disabled = false;
        b.classList.remove("done");
        b.setAttribute(
          "aria-label",
          "أبلغ عن رابط لا يعمل: " + (b.dataset.reportTitle || "")
        );
      }
    });
  }

  /* ---------- تبرع ---------- */
  function renderDonate() {
    const d = APP_CONFIG.donation;
    const phone = d.phoneCash;
    /* صيغة USSD الرسمية لتحويل فودافون كاش:
       ‎*9*7*رقم الموبايل*المبلغ#
       المصدر الرسمي: web.vodafone.com.eg/ar/money-transfer */
    const pattern = "*9*7*" + phone + "*";

    return (
      '<section class="panel donate-panel" id="donate">' +
        '<h2 class="panel-title">💚 ادعم الموقع</h2>' +
        "<p>الموقع مجاني 100% ولا يعرض أي إعلانات. دعمك هو ما يبقيه يعمل.</p>" +

        /* الرقم */
        '<div class="donate-number" id="donateNum" title="اضغط لنسخ الرقم">' + esc(phone) + "</div>" +
        '<div class="donate-copy-row">' +
          '<button class="btn btn-gold btn-sm" id="donateCopy" type="button">📋 نسخ الرقم</button>' +
          '<a class="btn btn-ghost btn-sm" id="donateCall" href="tel:' + esc(phone) +
            '" rel="nofollow">📞 اتصال</a>' +
        "</div>" +
        '<p class="donate-hint">رقم فودافون كاش — اسم المحوّل: ' + esc(d.name) + "</p>" +

        /* --- الطريقة الأولى: كود USSD مباشر --- */
        '<div class="pay-card" id="payCard">' +
          '<div class="pay-card-head"><span class="pay-num">١</span><b>الأسرع — كود مباشر من هاتفك</b></div>' +
          '<p class="pay-desc">اكتب المبلغ الذي تريد التبرع به، ثم انسخ الكود وارقمنه من هاتفك.</p>' +
          '<div class="pay-ussd-label">الكود الذي ستُرسله:</div>' +
          '<code class="pay-ussd" id="payUssd">' + esc(pattern) + '<span class="pay-slot" id="paySlot">المبلغ</span>#</code>' +
          '<div class="pay-row">' +
            '<input class="input" id="payAmount" type="number" inputmode="numeric" ' +
              'min="1" max="100000" step="1" placeholder="اكتب المبلغ بالجنيه" aria-label="مبلغ التبرع" />' +
            '<span class="pay-cur">جنيه</span>' +
          "</div>" +
          '<div class="pay-quick" id="payQuick">' +
            [10, 20, 50, 100, 200].map((v) =>
              '<button class="pay-chip" data-amt="' + v + '" type="button">' + v + "</button>"
            ).join("") +
          "</div>" +
          '<div class="pay-actions">' +
            '<button class="btn btn-primary" id="payBuild" type="button">إنشاء الكود</button>' +
            '<button class="btn btn-gold" id="payCopy" type="button" disabled>📋 نسخ الكود</button>' +
          "</div>" +
          '<p class="pay-msg" id="payMsg" aria-live="polite"></p>' +
        "</div>" +

        /* --- الطريقة الثانية: تطبيق أو موقع فودافون --- */
        '<div class="pay-card">' +
          '<div class="pay-card-head"><span class="pay-num">٢</span><b>عبر تطبيق فودافون كاش أو الموقع</b></div>' +
          '<ol class="pay-steps">' +
            "<li>افتح تطبيق Vodafone Cash على هاتفك (أو موقع فودافون الإلكتروني).</li>" +
            "<li>اختر <b>تحويل الأموال</b> ثم <b>تحويل فودافون كاش</b>.</li>" +
            "<li>اكتب الرقم: <code>" + esc(phone) + "</code></li>" +
            "<li>اكتب المبلغ وأكّد العملية برمز سرّ محفظتك.</li>" +
          "</ol>" +
          '<div class="pay-links">' +
            '<a class="btn btn-ghost btn-sm" href="https://web.vodafone.com.eg/ar/money-transfer" ' +
              'target="_blank" rel="noopener noreferrer nofollow">الموقع الرسمي لفودافون ↗</a>' +
          "</div>" +
        "</div>" +

        /* --- إخلاء المسؤولية --- */
        '<div class="pay-note">' +
          "⚠️ الموقع لا يستقبل أموالاً ولا يعالج دفعات — أنتحوّل المبلغ مباشرة من محفظتك " +
          "إلى الرقم أعلاه، بلا مرور بأي وسيط. تأكّد من الرقم قبل التأكيد. " +
          "رسوم التحويل تخص فودافون، وليست جزءاً من المبلغ." +
        "</div>" +

        '<p class="donate-foot">' + esc(d.minimumNote) + "</p>" +
      "</section>"
    );
  }

  /* ---------- بناء كود USSD من المبلغ ---------- */
  function buildUssd() {
    const d = APP_CONFIG.donation;
    const amountEl = $("#payAmount");
    const slotEl = $("#paySlot");
    const msgEl = $("#payMsg");
    const copyBtn = $("#payCopy");
    if (!amountEl || !slotEl) return;

    const raw = String(amountEl.value || "").replace(/[^\d]/g, "");
    const valid = raw !== "" && Number(raw) >= 1 && Number(raw) <= 100000;

    if (!raw) {
      slotEl.textContent = "المبلغ";
      slotEl.className = "pay-slot";
      copyBtn.disabled = true;
      copyBtn.textContent = "📋 نسخ الكود";
      if (msgEl) msgEl.textContent = "";
      return null;
    }
    if (!valid) {
      slotEl.textContent = "؟";
      slotEl.className = "pay-slot bad";
      copyBtn.disabled = true;
      copyBtn.textContent = "📋 نسخ الكود";
      if (msgEl) msgEl.textContent = "اكتب مبلغاً بين 1 و 100000 جنيه.";
      return null;
    }

    slotEl.textContent = raw;
    slotEl.className = "pay-slot filled";
    copyBtn.disabled = false;
    copyBtn.textContent = "📋 نسخ الكود";
    if (msgEl) msgEl.textContent = "";
    return "*9*7*" + d.phoneCash + "*" + raw + "#";
  }

  /* ---------- مشاركة ---------- */
  function renderShare() {
    return (
      '<div class="social-row" id="shareRow">' +
        '<button class="wa" data-s="whatsapp">📱 واتساب</button>' +
        '<button class="tg" data-s="telegram">✈️ تلغرام</button>' +
        '<button class="fb" data-s="facebook">📘 فيسبوك</button>' +
        '<button class="tw" data-s="twitter">🐦 إكس</button>' +
        '<button class="btn btn-ghost btn-sm" data-s="copy">🔗 نسخ الرابط</button>' +
        (state.isAdmin ? '<a class="btn btn-gold btn-sm" href="admin.html">⚙️ لوحة التحكم</a>' : "") +
      "</div>"
    );
  }

  function copyText(text) {
    const done = () => toast("تم النسخ", "ok");
    if (navigator.clipboard && location.protocol !== "file:") {
      navigator.clipboard.writeText(text).then(done).catch(() => fallback());
    } else fallback();
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); }
      catch (e) { toast("انسخ يدوياً من شريط العنوان", "warn"); }
      ta.remove();
    }
  }

  /* ---------- تذييل ---------- */
  function renderFooter() {
    return (
      '<footer class="site-footer">' +
        '<div class="footer-links">' +
          '<a href="#mainContent">أعلى الصفحة</a>' +
          '<a href="#tools">الأدوات</a>' +
          '<a href="#submit">أضف موقعك</a>' +
          '<a href="#donate">تبرع</a>' +
        "</div>" +
        "<p>" + esc(APP_CONFIG.site.name) + " © " + APP_CONFIG.footerYear + " — مجاني بالكامل، بدون إعلانات.</p>" +
        "<p>جميع الروابط تُفحص قبل النشر. لا نتحمل مسؤولية محتوى المواقع الخارجية. احترم حقوق الملكية الفكرية وحقوق المؤلف.</p>" +
      "</footer>"
    );
  }

  /* ---------- بحث فوري ---------- */
  function bindSearch() {
    const box = $("#searchInput");
    const out = $("#searchResults");
    if (!box || !out) return;

    let timer;
    box.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const q = box.value.trim().toLowerCase();
        if (q.length < 2) { out.innerHTML = ""; return; }
        const res = state.links
          .filter((l) =>
            (l.title || "").toLowerCase().indexOf(q) !== -1 ||
            (l.desc || "").toLowerCase().indexOf(q) !== -1 ||
            host(l.url).toLowerCase().indexOf(q) !== -1
          )
          .slice(0, 8);
        out.innerHTML = res
          .map(
            (l) =>
              '<a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' +
                esc(l.title) + ' <small style="color:var(--muted)">— ' + esc(host(l.url)) + "</small></a>"
          )
          .join("") || '<div style="padding:.6rem;color:var(--muted);font-size:.88rem">لا نتائج.</div>';
      }, 220);
    });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        state.query = box.value.trim();
        state.page = 1;
        out.innerHTML = "";
        render();
        $("#mainContent").scrollIntoView({ behavior: "smooth" });
      }
    });

    document.addEventListener("click", (e) => {
      if (!out.contains(e.target) && e.target !== box) out.innerHTML = "";
    });
  }

  function resetFilters() {
    state.query = ""; state.filter = "all"; state.lang = "all"; state.tier = "all";
    const si = $("#searchInput");
    if (si) si.value = "";
    const jump = $("#jumpSelect");
    if (jump) jump.value = "all";
    try { history.replaceState(null, "", location.pathname); } catch (e) {}
    render();
  }

  /* ---------- قراءة القسم من الرابط (#section-id) ---------- */
  /* مراسي الأقسام التي تظهر في اختصارات تطبيق الويب — ليست أقسام تصنيف */
  const HASH_ANCHORS = {
    tools: "#tools",
    submit: "#submit",
    donate: "#donate",
    share: "#shareRow"
  };

  function scrollToHash(sel) {
    if (!sel) return;
    const el = $(sel);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function filterFromHash() {
    const h = (location.hash || "").replace(/^#/, "");
    if (!h) return false;

    /* #all صراحةً: تصفير كامل — مهم لأن المستخدم قد يشارك #all أو يعود إليه */
    if (h === "all") {
      if (state.filter === "all" && !state.query) return false;
      state.filter = "all";
      state.page = 1;
      return true;
    }

    /* مرساة إلى قسم أداة (مثل #submit من اختصارات التطبيق) */
    if (HASH_ANCHORS[h]) {
      /* نؤجّل التمرير إطاراً واحداً: عند الإقلاع يُستدعى هذا قبل render() */
      setTimeout(() => scrollToHash(HASH_ANCHORS[h]), 60);
      return false;
    }

    const known = state.categories.some((c) => c.id === h);
    if (!known) return false;
    state.filter = h;
    state.page = 1;
    return true;
  }

  /* ---------- الوضع الليلي ---------- */
  function bindTheme() {
    const btn = $("#themeBtn");
    if (!btn) return;
    const saved = store.get("jr_theme", "dark");
    if (saved === "light") document.body.classList.add("theme-light");
    const sync = () => {
      const light = document.body.classList.contains("theme-light");
      btn.textContent = light ? "🌙" : "☀️";
      btn.setAttribute("aria-label", light ? "تفعيل الوضع الليلي" : "تفعيل الوضع النهاري");
    };
    sync();
    btn.addEventListener("click", () => {
      document.body.classList.toggle("theme-light");
      const now = document.body.classList.contains("theme-light") ? "light" : "dark";
      store.set("jr_theme", now);
      sync();
    });
  }

  /* ---------- حالة الدخول ---------- */
  function renderAuth() {
    const box = $("#authBox");
    if (!box) return;
    if (state.user) {
      const u = state.user;
      const pic = u.photoURL
        ? '<img src="' + esc(u.photoURL) + '" alt="" referrerpolicy="no-referrer" />'
        : '<span aria-hidden="true">👤</span>';
      box.innerHTML =
        '<div class="user-chip">' + pic + "<span>مرحباً " + esc(u.displayName || "زائر") + "</span></div>" +
        '<div style="margin-top:.75rem"><button class="btn btn-ghost btn-sm" id="logoutBtn">تسجيل الخروج</button></div>' +
        (state.isAdmin ? '<div style="margin-top:.5rem"><a class="btn btn-gold btn-sm" href="admin.html">لوحة التحكم</a></div>' : "");
      const lo = $("#logoutBtn");
      if (lo) lo.addEventListener("click", () => Data.logout());
    } else {
      box.innerHTML =
        '<button class="google-btn" id="googleBtn">' +
          '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.7l7.8 6.1C12.3 13.3 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.6c-.5 2.6-2.1 4.9-4.4 6.4l6.7 6.7c3.9-3.6 6.6-9 6.6-17.4z"/><path fill="#FBBC05" d="M10.4 28.2c-.5-1.4-.8-2.9-.8-4.4s.3-3 .8-4.4l-7.8-6.1C.9 16.2 0 19.9 0 23.8s.9 7.6 2.6 10.5l7.8-6.1z"/><path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.3-5.5l-6.7-6.7c-1.8 1.2-4.2 2-7.6 2-5.9 0-10.9-3.9-12.7-9.3l-7.8 6.1C10.3 42.9 17.2 47.5 24 47.5z"/></svg>' +
          "الدخول بحساب جوجل</button>" +
        '<div id="authMsg" style="margin-top:.6rem"></div>';
      const gb = $("#googleBtn");
      if (gb) gb.addEventListener("click", () => Data.loginGoogle($("#authMsg")));
    }
  }

  /* ---------- حارس سلامة البيانات ----------
     المشكلة التي عالجها: عامل الخدمة قد يقدّم data.js قديمة تحت
     اسم ملف مطابق لرقم إصدار حديث. عندها يبدو كل شيء سليماً —
     أرقام الإصدار متطابقة — بينما القائمة ناقصة أو فيها روابط
     محذوفة. لا رقم إصدار ولا فحص داخلي يكشف ذلك، لأن الكاذب
     والصحيح متساويان في كل ما يراه المتصفح.

     الحل: رقم عدد الروابط المتوقع موجود في config.js (خادم).
     إن اختلف عمّا استُلم، نسأل الشبكة مباشرةً (باستعلام عشوائي
     حتى لا يخدمه الكاش)، فإن أعطت العدد الصحيح فالكاش كاذب:
     نزيل عامل الخدمة والكاش ثم نعيد التحميل — مرة واحدة فقط
     عبر sessionStorage كي لا ندخل حلقة إعادة تحميل لا نهائية. */
  function countEntries(txt) {
    const m = txt.match(/^\s*\[\s*"/gm);
    return m ? m.length : 0;
  }

  function guardDataIntegrity() {
    const want = APP_CONFIG.cache.expectedLinks;
    if (!want || LINKS.length === want) return;

    const flag = "jr_data_guard";
    let done = false;
    try { done = !!sessionStorage.getItem(flag); } catch (e) { return; }
    if (done) return;
    try { sessionStorage.setItem(flag, "1"); } catch (e) { return; }

    fetch("assets/js/data.js?probe=" + Date.now(), { cache: "no-store" })
      .then(function (res) { return res.ok ? res.text() : ""; })
      .then(function (txt) {
        const live = countEntries(txt);
        if (live !== want) return;          /* الشبكة نفسها قديمة — لا نفعل شيئاً */
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          navigator.serviceWorker.getRegistrations().then(function (regs) {
            return Promise.all(regs.map(function (r) { return r.unregister(); }));
          }).catch(function () {}).then(clearAllCaches);
        } else {
          clearAllCaches();
        }
      })
      .catch(function () {});
  }

  function clearAllCaches() {
    if (!window.caches) { location.reload(); return; }
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .catch(function () {})
      .then(function () { location.reload(); });
  }

  /* ---------- تهيئة ---------- */
  function boot() {
    loadData();
    /* قبل أول render حتى تظهر البطاقة المُبلَّغ عنها على حالها */
    loadReportCounts();
    guardDataIntegrity();
    filterFromHash();
    renderNav();
    renderJumpSelect();
    renderChips();
    render();
    buildReportModal();
    bindReportKeys();
    bindDelegated();
    bindSearch();
    bindTheme();
    renderAuth();
    updateHeaderStats();
    persistCache();

    /* إعادة الفتح عند تغيير قسم عبر رابط مباشر */
    window.addEventListener("hashchange", function () {
      if (filterFromHash()) { renderNav(); renderJumpSelect(); render(); }
    });

    /* فتح مُنتقي الأقسام بلوحة المفاتيح */
    const sb = $("#sectionsBtn");
    if (sb) sb.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPicker(); }
    });

    /* تحميل روابط Firestore (تحديث يدوي من لوحة التحكم) بدون تعطيل الواجهة */
    Data.loadPublicLinks()
      .then((list) => {
        if (list && list.length) {
          state.remoteLinks = list;
          loadData();
          render();
          renderJumpSelect();
          updateHeaderStats();
          persistCache();
          toast("تم تحديث قائمة الروابط", "ok");
        }
      })
      .catch(() => {});

    // تسجيل حالة الدخول
    Data.onAuthChanged(function (user) {
      state.user = user;
      state.isAdmin = Data.isAdmin(user);
      renderAuth();
      render();
    });

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.JRApp = {
    state: state,
    toast: toast,
    checkUrlSafety: checkUrlSafety,
    openReport: openReport,
    resetFilters: resetFilters,
    reload: function () { loadData(); render(); }
  };
})();
