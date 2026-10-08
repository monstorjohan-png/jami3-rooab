(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  let currentUser = null;
  let linksCache = [];

  const localSubs = () => { try { return JSON.parse(localStorage.getItem("jr_submissions_local") || "[]"); } catch (e) { return []; } };
  const saveLocalSubs = (l) => { try { localStorage.setItem("jr_submissions_local", JSON.stringify(l)); } catch (e) {} };

  function fillSelects() {
    $("#aCat").innerHTML = CATEGORIES.map(c => '<option value="' + c.id + '">' + esc(c.label) + "</option>").join("");
    $("#manageFilter").innerHTML = '<option value="all">كل الأقسام</option>' + CATEGORIES.map(c => '<option value="' + c.id + '">' + esc(c.label) + "</option>").join("");
  }

  function bindTabs() {
    document.querySelectorAll(".tab").forEach(t => {
      t.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
        document.querySelectorAll(".tabpane").forEach(x => x.style.display = "none");
        t.classList.add("active");
        $("#tab-" + t.dataset.tab).style.display = "block";
      });
    });
  }

  function renderPending() {
    const subs = localSubs();
    const box = $("#pendingList");
    if (!subs.length) { box.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>لا توجد طلبات جديدة.</p></div>'; updateStats(); return; }
    box.innerHTML = '<div class="table-wrap"><table><thead><tr><th>الاسم</th><th>الرابط</th><th>القسم</th><th>الوصف</th><th>الإجراء</th></tr></thead><tbody>' +
      subs.map((s, i) =>
        '<tr><td><b>' + esc(s.title) + "</b></td>" +
        '<td><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" dir="ltr">' + esc(s.url.slice(0, 42)) + "</a></td>" +
        "<td>" + esc(s.cat || "—") + "</td>" +
        '<td style="max-width:220px">' + esc((s.desc || "").slice(0, 70)) + "</td>" +
        '<td><div class="row-actions">' +
          '<button class="btn btn-ghost btn-sm" data-approve="' + i + '">اعتماد</button>' +
          '<button class="btn btn-danger btn-sm" data-reject="' + i + '">رفض</button>' +
        "</div></td></tr>").join("") + "</tbody></table></div>";

    box.querySelectorAll("[data-approve]").forEach(b => b.addEventListener("click", () => approve(+b.dataset.approve)));
    box.querySelectorAll("[data-reject]").forEach(b => b.addEventListener("click", () => {
      const arr = localSubs(); arr.splice(+b.dataset.reject, 1); saveLocalSubs(arr);
      renderPending();
    }));
  }

  function approve(index) {
    const arr = localSubs();
    const s = arr[index];
    if (!s) return;
    const link = {
      title: s.title, url: s.url, desc: s.desc,
      cats: [s.cat || CATEGORIES[0].id], lang: /[؀-ۿ]/.test(s.title + s.desc) ? "ar" : "en",
      tier: "free", votes: 50, safe: true, status: "approved", isNew: true, addedAt: Date.now()
    };
    if (Data.db) {
      Data.db.collection("links").add(link).then(() => {
        arr.splice(index, 1); saveLocalSubs(arr);
        renderPending(); renderManage(); updateStats();
        window.JRApp ? null : null;
        toast("تم النشر بنجاح", "ok");
      }).catch(e => toast("فشل النشر: " + e.message, "err"));
    } else {
      const cur = JSON.parse(localStorage.getItem("jr_public_links") || '{"at":0,"links":[]}');
      cur.links = (cur.links || []).concat([link]);
      cur.at = Date.now();
      localStorage.setItem("jr_public_links", JSON.stringify(cur));
      arr.splice(index, 1); saveLocalSubs(arr);
      renderPending(); updateStats();
      toast("تم الاعتماد محلياً (اربط Firebase للنشر للعامة)", "warn");
    }
  }

  function renderManage() {
    const q = ($("#manageSearch").value || "").toLowerCase();
    const f = $("#manageFilter").value;
    let list = linksCache.slice();
    if (f !== "all") list = list.filter(l => (l.cats || []).includes(f));
    if (q) list = list.filter(l => (l.title || "").toLowerCase().includes(q) || (l.url || "").toLowerCase().includes(q));

    const box = $("#manageTable");
    if (!list.length) { box.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted)">لا نتائج.</div>'; return; }
    box.innerHTML = '<table><thead><tr><th>الاسم</th><th>الرابط</th><th>القسم</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>' +
      list.slice(0, 200).map(l => {
        const id = String(l.id);
        const st = l.status === "approved" ? '<span class="badge-ok">معتمد</span>' : l.status === "pending" ? '<span class="badge-pending">معلق</span>' : '<span class="badge-no">مرفوض</span>';
        return "<tr><td><b>" + esc(l.title) + "</b></td>" +
          '<td><a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer" dir="ltr">' + esc(String(l.url).slice(0, 36)) + "</a></td>" +
          "<td>" + esc((l.cats || [])[0] || "—") + "</td><td>" + (l.status ? st : '<span class="badge-ok">مدمج</span>') + "</td>" +
          '<td><div class="row-actions"><button class="btn btn-danger btn-sm" data-del="' + esc(id) + '">حذف</button></div></td></tr>';
      }).join("") + "</tbody></table>";

    box.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.del;
      if (id.indexOf("f_") === 0) {
        if (Data.db) Data.db.collection("links").doc(id.slice(2)).delete().then(() => { loadLinks(); toast("تم الحذف", "ok"); });
        else toast("يلزم Firebase للحذف السحابي", "warn");
      } else {
        const idx = LINKS.findIndex(x => String(x.id) === id);
        if (idx >= 0) { LINKS.splice(idx, 1); toast("تم الحذف من الذاكرة — أعد تحميل البيانات للتثبيت", "warn"); }
      }
      loadLinks();
    }));
  }

    function renderUsers() {
    const box = $("#usersTable");
    if (!Data.db) { box.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted)">يتطلب Firebase لعرض المستخدمين.</div>'; return; }
    Data.db.collection("users").limit(200).get().then(snap => {
      const users = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
      $("#sUsers").textContent = users.length;
      if (!users.length) { box.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted)">لا مستخدمين بعد.</div>'; return; }
      box.innerHTML = '<table><thead><tr><th>الاسم</th><th>البريد</th><th>الدخول</th><th>الدور</th></tr></thead><tbody>' +
        users.map(u => "<tr><td>" + esc(u.displayName || "—") + "</td><td dir='ltr' style='text-align:right'>" + esc(u.email || "—") + "</td><td>" +
          (u.lastLoginAt ? new Date(u.lastLoginAt.toDate ? u.lastLoginAt.toDate() : u.lastLoginAt).toLocaleDateString("ar-EG") : "—") +
          "</td><td>" + (u.role === "admin" ? "مشرف" : "مستخدم") + "</td></tr>").join("") + "</tbody></table>";
      window.__users = users;
    }).catch(e => { box.innerHTML = '<div style="padding:2rem;color:var(--danger)">خطأ: ' + esc(e.message) + "</div>"; });
  }

  function updateStats() {
    $("#sTotal").textContent = LINKS.length + linksCache.length;
    $("#sPending").textContent = localSubs().length;
  }

  function loadLinks() {
    linksCache = [];
    if (Data.db) {
      Data.db.collection("links").limit(500).get().then(snap => {
        linksCache = snap.docs.map(d => Object.assign({ id: "f_" + d.id }, d.data()));
        renderManage(); updateStats();
      }).catch(() => renderManage());
    } else renderManage();
  }

  function bindAdd() {
    $("#addBtn").addEventListener("click", () => {
      const title = $("#aTitle").value.trim();
      const url = $("#aUrl").value.trim();
      const desc = $("#aDesc").value.trim();
      const check = window.JRApp ? window.JRApp.checkUrlSafety(url) : { ok: url.startsWith("https://"), reason: "رابط غير صالح" };
      const msg = $("#addMsg");
      if (title.length < 2) { msg.innerHTML = '<div class="security-note danger">اسم غير صالح.</div>'; return; }
      if (!check.ok) { msg.innerHTML = '<div class="security-note danger">⛔ ' + esc(check.reason) + "</div>"; return; }
      if (desc.length < 10) { msg.innerHTML = '<div class="security-note danger">الوصف قصير.</div>'; return; }

      const link = {
        title, url, desc, cats: [$("#aCat").value], lang: $("#aLang").value,
        tier: $("#aTier").value, votes: +$("#aVotes").value || 0,
        safe: true, status: "approved", addedAt: Date.now()
      };
      if (Data.db) {
        Data.db.collection("links").add(link).then(() => {
          msg.innerHTML = '<div class="security-note">✅ نُشر الرابط. سيظهر للزوار بعد التحديث.</div>';
          $("#aTitle").value = ""; $("#aUrl").value = ""; $("#aDesc").value = "";
          loadLinks();
        }).catch(e => msg.innerHTML = '<div class="security-note danger">خطأ: ' + esc(e.message) + "</div>");
      } else {
        const cur = JSON.parse(localStorage.getItem("jr_public_links") || '{"at":0,"links":[]}');
        cur.links = (cur.links || []).concat([link]); cur.at = Date.now();
        localStorage.setItem("jr_public_links", JSON.stringify(cur));
        msg.innerHTML = '<div class="security-note">✅ حُفظ محلياً. اربط Firebase للنشر لجميع الزوار.</div>';
        loadLinks();
      }
    });
  }

  function bindSearch() {
    $("#manageSearch").addEventListener("input", renderManage);
    $("#manageFilter").addEventListener("change", renderManage);
  }

  function gate(user) {
    currentUser = user;
    if (user && Data.isAdmin(user)) {
      $("#lockBox").style.display = "none";
      $("#adminArea").style.display = "block";
      $("#welcome").textContent = "أهلاً " + (user.displayName || "مشرف");
      $("#adminEmail").textContent = user.email || "";
      renderPending(); loadLinks(); renderUsers(); updateStats();
    } else {
      $("#lockBox").style.display = "block";
      $("#adminArea").style.display = "none";
      if (user) $("#lockMsg").innerHTML = '<div class="security-note danger">هذا الحساب ليس مشرفاً. أضف الـ UID في config.js.</div>';
    }
  }

  function boot() {
    fillSelects(); bindTabs(); bindAdd(); bindSearch();

    $("#lockLogin").addEventListener("click", () => Data.loginGoogle($("#lockMsg")));
    $("#logoutBtn").addEventListener("click", () => Data.logout().then(() => location.reload()));
    $("#exportBtn").addEventListener("click", () => {
      const users = window.__users || [];
      if (!users.length) { alert("لا توجد بيانات. اربط Firebase أولاً."); return; }
      Data.exportUsersToCSV(users, "jam3-users.csv");
    });

    Data.onAuthChanged(gate);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
