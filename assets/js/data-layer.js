/* ==========================================
   جامع الروابط - data-layer.js
   طبقة Firebase + كاش + وضع عدم الاتصال
   تعمل بدون Firebase (الوضع المحلي)
   ========================================== */
(function () {
  "use strict";

  const CFG = APP_CONFIG;
  const ready = { firebase: false, db: null, auth: null };
  const authListeners = [];
  const linksCacheKey = "jr_public_links";

  /* ---------- تهيئة Firebase ---------- */
  function init() {
    const cfg = CFG.firebase;
    const placeholder =
      !cfg.apiKey ||
      cfg.apiKey.indexOf("ضع_") === 0 ||
      cfg.apiKey.indexOf("Dummy") !== -1 ||
      cfg.apiKey.length < 20;

    if (placeholder || typeof firebase === "undefined") {
      ready.firebase = false;
      return false;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      ready.auth = firebase.auth();
      ready.db = firebase.firestore();
      ready.firebase = true;
      return true;
    } catch (e) {
      console.warn("Firebase init failed:", e && e.message);
      ready.firebase = false;
      return false;
    }
  }

  /* ---------- الوضع المحلي ---------- */
  function readLocalList(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function writeLocalList(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list.slice(-200)));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- قراءة الروابط المعتمدة ---------- */
  function loadPublicLinks() {
    if (!ready.firebase) {
      return Promise.resolve(readLocalList(linksCacheKey));
    }
    return ready.db
      .collection("links")
      .where("status", "==", "approved")
      .limit(500)
      .get()
      .then((snap) => {
        const list = snap.docs.map((d) => Object.assign({ id: "f_" + d.id }, d.data()));
        try {
          localStorage.setItem(linksCacheKey, JSON.stringify({ at: Date.now(), links: list }));
        } catch (e) {}
        return list;
      })
      .catch((e) => {
        const cached = (() => {
          try {
            const raw = localStorage.getItem(linksCacheKey);
            const obj = raw ? JSON.parse(raw) : null;
            if (obj && Date.now() - obj.at < CFG.cache.ttlHours * 3600 * 1000) return obj.links;
          } catch (e) {}
          return readLocalList(linksCacheKey);
        })();
        return cached;
      });
  }

  /* ---------- مزامنة ملف المستخدم مع قواعد الأمان ---------- */
  /* قواعد Firestore تفصل بين:
     - الإنشاء: يُسمح email + displayName + photoURL + role + createdAt
     - التعديل: يُسمح displayName + photoURL + lastLoginAt فقط
     لذلك نقرأ أولاً ثم نكتب العملية المناسبة. */
  function syncUserProfile(u) {
    if (!ready.db) return Promise.resolve();
    const ref = ready.db.collection("users").doc(u.uid);
    const now = firebase.firestore.FieldValue.serverTimestamp();

    return ref
      .get()
      .then((snap) => {
        if (snap.exists) {
          return ref.update({
            displayName: u.displayName || "",
            photoURL: u.photoURL || "",
            lastLoginAt: now
          });
        }
        return ref.set({
          email: u.email || "",
          displayName: u.displayName || "",
          photoURL: u.photoURL || "",
          role: "user",
          createdAt: now
        });
      })
      .catch((e) => {
        console.warn("syncUserProfile:", e && e.message);
      });
  }

  /* ---------- إرسال رابط من زائر ---------- */
  function saveSubmission(payload) {
    if (!ready.firebase) return Promise.resolve(false);

    const uid = ready.auth && ready.auth.currentUser ? ready.auth.currentUser.uid : null;

    return ready.db
      .collection("submissions")
      .add({
        title: payload.title,
        url: payload.url,
        desc: payload.desc,
        category: (payload.cats && payload.cats[0]) || "",
        status: "pending",
        submittedBy: uid,
        submittedByEmail: uid && ready.auth.currentUser ? ready.auth.currentUser.email : "",
        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
        safetyCheck: "auto-passed"
      })
      .then(() => true)
      .catch((e) => {
        console.warn("submission failed:", e && e.message);
        return false;
      });
  }

  /* ---------- تسجيل الدخول بجوجل ---------- */
  function loginGoogle(msgEl) {
    if (!ready.firebase) {
      const msg = msgEl
        ? msgEl.innerHTML =
          '<div class="security-note danger">⚠️ Firebase غير مُهيّأ. أضف مفاتيح مشروعك في assets/js/config.js لتفعيل الدخول الحقيقي.</div>'
        : null;
      return Promise.resolve(null);
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("email");
    provider.setCustomParameters({ prompt: "select_account" });

    return ready.auth
      .signInWithPopup(provider)
      .then((res) => {
        const u = res.user;
        if (msgEl) msgEl.innerHTML = "";
        return syncUserProfile(u).then(() => u);
      })
      .catch((e) => {
        const code = (e && e.code) || "";
        let text = "تعذّر تسجيل الدخول.";
        if (code === "auth/popup-closed-by-user") text = "أغلقت نافذة الدخول. حاول مجدداً.";
        else if (code === "auth/popup-blocked") text = "المتصفح منع النافذة. اسمح بالنوافذ المنبثقة.";
        else if (code === "auth/network-request-failed") text = "فشل الاتصال بالإنترنت.";
        else if (code === "auth/unauthorized-domain") text = "النطاق غير مصرّح به في إعدادات مشروع Firebase.";
        if (msgEl) msgEl.innerHTML = '<div class="security-note danger">' + text + "</div>";
        return null;
      });
  }

  function logout() {
    if (!ready.firebase) return Promise.resolve();
    return ready.auth.signOut();
  }

  function onAuthChanged(cb) {
    authListeners.push(cb);
    if (ready.firebase) {
      ready.auth.onAuthStateChanged((u) => {
        authListeners.forEach((f) => f(u));
      });
    } else {
      const cached = (() => {
        try { return JSON.parse(localStorage.getItem("jr_cached_user") || "null"); }
        catch (e) { return null; }
      })();
      authListeners.forEach((f) => f(cached));
    }
  }

  function isAdmin(user) {
    if (!user) return false;
    return (CFG.site.adminUids || []).indexOf(user.uid) !== -1;
  }

  /* ---------- الأدوات ---------- */
  function exportUsersToCSV(users, filename) {
    const head = ["الاسم", "البريد", "تاريخ الانضمام", "عدد الروابط", "حالة المشرف"];
    const rows = users.map((u) => [
      u.displayName || "",
      u.email || "",
      u.createdAt ? new Date(u.createdAt).toISOString() : "",
      String(u.linkCount == null ? "" : u.linkCount),
      u.role === "admin" ? "مشرف" : "مستخدم"
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(","))
      .join("\r\n");
    downloadBlob(
      new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }),
      filename || "users.csv"
    );
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ---------- تشغيل ---------- */
  init();

  window.Data = {
    get isFirebaseReady() { return ready.firebase; },
    get auth() { return ready.auth; },
    get db() { return ready.db; },
    loadPublicLinks: loadPublicLinks,
    saveSubmission: saveSubmission,
    syncUserProfile: syncUserProfile,
    loginGoogle: loginGoogle,
    logout: logout,
    onAuthChanged: onAuthChanged,
    isAdmin: isAdmin,
    exportUsersToCSV: exportUsersToCSV,
    downloadBlob: downloadBlob
  };
})();
