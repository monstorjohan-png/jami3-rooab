/* ==========================================
   جامع الروابط - config.js
   ملف الإعدادات الوحيد الذي تحتاج لتعديله
   ========================================== */

const APP_CONFIG = {
  /* ------------------------------------------------------------
   1) FIREBASE — انسخ إعدادات مشروعك من
     console.firebase.google.com > Project Settings > General > SDK setup
     ⚠️ لا تستخدم مفتاح من مشروعي أنا — أنشئ مشروعك الخاص المجاني
     ------------------------------------------------------------ */
  firebase: {
    apiKey: "ضع_مفتاح_API_هنا",
    authDomain: "jami3-rooab.firebaseapp.com",
    projectId: "jami3-rooab",
    storageBucket: "jami3-rooab.appspot.com",
    messagingSenderId: "ضع_الرقم_هنا",
    appId: "ضع_المعرف_هنا"
  },

  /* ------------------------------------------------------------
   2) معلومات الموقع
     ------------------------------------------------------------ */
  site: {
    name: "جامع الروابط",
    tagline: "كل ما تحتاجه من مواقع مفيدة — عربي وإنجليزي",
    email: "jami3rooab@gmail.com",
    // ضع UID الخاص بك بعد أول تسجيل دخول (Firebase Console > Authentication)
    adminUids: ["ضع_UID_المشرف_هنا"]
  },

  /* ------------------------------------------------------------
   3) بيانات التبرع
     ------------------------------------------------------------ */
  donation: {
    phoneCash: "01070409655",
    name: "جامع الروابط",
    minimumNote: "كل 10 جنيه تساعدنا على إبقاء الموقع مجانياً"
  },

  /* ------------------------------------------------------------
   4) حدود مجانية Firestore (خطة Spark المجانية)
     - الحد الآمن: لا تتجاوز 40 ألف قراءة/يوم
     - reseller فقط عند تجاوزها
     ------------------------------------------------------------ */
  limits: {
    maxReadsPerDay: 40000,        // لا نقرأ بدون كاش محلي
    maxWritesPerDay: 20000,
    maxSubmissionsPerUser: 5,     // كحد أقصى يومياً لكل مستخدم
    maxTitleLength: 120,
    maxDescLength: 400,
    maxUrlLength: 300,
    perPage: 24                   // عدد البطاقات في الصفحة الواحدة
  },

  /* ------------------------------------------------------------
   5) التخزين المحلي (كاش + تتبّع)
     ------------------------------------------------------------ */
  cache: {
    /* رقم واحد يحكم الكاش كله. أي تغيير هنا يُبطل النسخ القديمة
       تلقائياً — بما فيها قائمة الروابط المخزّنة في المتصفح.
       يُرفع عبر: node tools/sync-version.js --bump
       ملاحظة: هذا الحقل يُقرأ عند المقارنة فقط. */
    version: "1.4.11",
    /* عدد الروابط في data.js. يحرسه guardDataIntegrity في app.js:
       إن استُلم عدد مختلف، يُقاس الملف من الشبكة ويُصحَّح الكاش.
       يُحدَّث آلياً عبر: node tools/sync-version.js --bump */
    expectedLinks: 886,
    linksKey: "jr_links_cache",
    usersKey: "jr_users_local",
    submissionsKey: "jr_submissions_local",
    logKey: "jr_download_log",
    searchKey: "jr_search_history",
    ttlHours: 24                  // مدة صلاحية الكاش
  },

  /* ------------------------------------------------------------
   6) أداة تحميل الفيديو والصوت
   ⚠️ موقع ثابت لا يستطيع تحميل ملف بنفسه — التحميل الحقيقي
      يحتاج خادماً يشغّل yt-dlp (مكلف). الأداة "موجّهة": تتحقق
      من الرابط ثم توصلك لأداة موثوقة يعمل التحميل منها على جهازك.
      الفحص الحيّ 2026-10-02: cobalt.tools 200 (بلا إعلانات، موصى به) |
      9convert 200 | tikmate 200 | yt1s 200 | loader.to إعلانات مضلِّلة (حُذف).
     ------------------------------------------------------------ */
  download: {
    /* مرتّبة حسب الثقة: trusted = نثق به وننصح به */
    services: [
      {
        id: "cobalt",
        name: "Cobalt",
        url: "https://cobalt.tools/",
        trusted: true,
        note: "مفتوح المصدر وبلا إعلانات — الأفضل. فيديو وصوت."
      },
      {
        id: "9convert",
        name: "9Convert",
        url: "https://9convert.com/",
        trusted: false,
        note: "يحتوي إعلانات. احتياطي إذا تعطّل Cobalt."
      },
      {
        id: "tikmate",
        name: "TikMate",
        url: "https://tikmate.app/",
        trusted: false,
        note: "يحتوي إعلانات. احتياطي."
      },
      {
        id: "yt1s",
        name: "YT1s",
        url: "https://yt1s.com/",
        trusted: false,
        note: "يحتوي إعلانات. احتياطي."
      }
    ],

    /* ضع رابط نسخة Cobalt خاصة بك هنا لتظهر أولاً (اختياري) */
    selfHosted: "",

    /* المنصات المدعومة — نُظهر رسالة دقيقة حسب المنصة */
    platforms: [
      { id: "youtube",    name: "YouTube",    test: /(^|\.)(youtube\.com|youtu\.be)/i,          audio: true },
      { id: "tiktok",     name: "TikTok",     test: /(^|\.)(tiktok\.com|vm\.tiktok\.com)/i,    audio: true },
      { id: "twitter",    name: "X / Twitter",test: /(^|\.)(twitter\.com|x\.com)/i,              audio: true },
      { id: "soundcloud", name: "SoundCloud", test: /(^|\.)(soundcloud\.com)/i,                  audio: true },
      { id: "facebook",   name: "Facebook",   test: /(^|\.)(facebook\.com|fb\.watch|fb\.com)/i,  audio: false },
      { id: "instagram",  name: "Instagram",  test: /(^|\.)(instagram\.com)/i,                   audio: false }
    ],

    /* مهلة فحص صحة الخدمة (مللي ثانية) */
    healthTimeout: 6000
  },

  /* ------------------------------------------------------------
   7) إعدادات المشاركة
     ------------------------------------------------------------ */
  share: {
    whatsapp: true,
    telegram: true,
    facebook: true,
    twitter: true,
    telegramChannel: ""   // ضع رابط قناتك لاحقاً
  },

  /* ------------------------------------------------------------
   8) أرقام المحل/tagline لصفحة donation
     ------------------------------------------------------------ */
  footerYear: new Date().getFullYear()
};
