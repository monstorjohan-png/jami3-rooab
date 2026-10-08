/* ==========================================================
   i18n.js — نظام اللغتين: عربي / إنجليزي
   يُحمَّل في <head> بلا defer حتى يُضبط لغة واتجاه الصفحة
   قبل أول رسم (لا وميض RTL قبل اختيار المستخدم).

   يوفّر:
     JRT(key, …args)        — ترجمة مع بديل {0} {1} …
     JRI18N.setLang(l)      — تبديل اللغة وحفظه
     JRI18N.getLang()       — القراءة الحالية
     حدث "jr:langchange"    — تُعلن app.js لإعادة بناء الواجهة

   ملاحظة: لوحة التحكم (admin.html) تُجبر على العربية دائماً —
   لغة الزائر تنطبق على الموقع العام فقط.
   ========================================================== */
(function () {
  "use strict";

  var LANG_KEY = "jr_lang";

  var DICT = {
    ar: {
      /* --- الوثيقة والترويسة --- */
      docTitle: "جامع الروابط — كل المواقع المفيدة في مكان واحد",
      docDesc: "جامع الروابط: أكثر من 2000 موقعاً مفيداً في 25 قسماً — كورسات بشهادات معتمدة، توظيف موثوق، ذكاء اصطناعي، أدوات مجانية، عمل حر، كتب، وألعاب آمنة. مجاني 100%.",
      skipTo: "تخطَّ إلى المحتوى",
      brand: "جامع الروابط",
      logoLetter: "ر",
      tagline: "أكثر من ٢٠٠٠ موقعاً موثوقاً في ٢٥ قسماً — كورسات بشهادات، توظيف، ذكاء اصطناعي، أدوات، تسويق بالعمولة، عمل حر، كتب، وألعاب وبرامج آمنة. عربي وإنجليزي، مجاني ومدفوع.",
      statSitesLbl: "موقع موثوق",
      statSectionsLbl: "قسماً منظماً",
      statFreeLbl: "مجاني",

      /* --- التنقل والبحث --- */
      navAria: "التنقل الرئيسي",
      searchLabel: "ابحث في المواقع",
      searchPh: "ابحث: كورسات، ChatGPT، توظيف، تصميم…",
      resultsAria: "نتائج البحث",
      themeToggleAria: "تبديل الوضع الليلي",
      themeLight: "تفعيل الوضع الليلي",
      themeDark: "تفعيل الوضع النهاري",
      sectionsAria: "اختر قسماً",
      navSectionsAria: "أقسام الموقع",
      langBtnAria: "تبديل اللغة إلى الإنجليزية",

      /* --- مُنتقي الأقسام --- */
      pickerTitle: "📂 اختر القسم الذي تريد",
      pickerCloseAria: "إغلاق",
      pickerHint: "اضغط على أي قسم لعرض كل مواقعه. العدد بجانب كل قسم يوضح كم موقعاً بداخله.",
      pickerAll: "عرض كل المواقع",
      pickAll: "كل الأقسام",
      pickAllSub: "عرض كل المواقع دفعة واحدة",
      pickLangCount: "عربي: {0} · إنجليزي: {1}",

      /* --- شريط الأدوات --- */
      jumpLabel: "اختر القسم",
      jumpAllStatic: "— كل الأقسام —",
      jumpAll: "— كل الأقسام ({0}) —",
      sortAria: "ترتيب النتائج",
      sortPopular: "الأكثر رواجاً",
      sortNew: "الأحدث",
      sortAz: "أبجدياً",
      navAll: "الكل",
      chipAllLangs: "كل اللغات",
      chipAr: "عربي",
      chipAllTiers: "كل الأنواع",
      chipFree: "مجاني",
      chipPaid: "مدفوع",

      /* --- إخلاء بلا جافاسكربت --- */
      noscript: "هذا الموقع يحتاج تفعيل JavaScript في المتصفح لعرض الروابط والبحث.",

      /* --- أدوات عامة --- */
      hostFallback: "رابط",
      qmark: "؟",
      sepList: "، ",
      copiedToast: "تم النسخ",
      copyManually: "انسخ يدوياً من شريط العنوان",
      copied: "✅ نُسخ",
      updatedToast: "تم تحديث قائمة الروابط",
      adminPanel: "لوحة التحكم",

      /* --- فحص أمان الرابط --- */
      sfEmpty: "الرابط فارغ",
      sfTooLong: "الرابط طويل جداً (الحد 300 حرف)",
      sfBadProto: "بروتوكول خطير قد يؤدي لهجمات XSS",
      sfNoHttp: "روابط http غير مقبولة — الرابط يجب أن يبدأ بـ https",
      sfMustHttps: "يجب أن يبدأ الرابط بـ https://",
      sfBadFormat: "صيغة الرابط غير صحيحة",
      sfProtoNotAllowed: "البروتوكول غير مسموح (المسموح فقط http/https)",
      sfCreds: "روابط تحتوي بيانات دخول مرفوضة",
      sfBadHost: "اسم النطاق غير صالح",
      sfIp: "لا نقبل روابط بعناوين IP مباشرة",
      sfInternal: "لا نقبل عناوين الشبكة الداخلية",
      sfPuny: "نطاق بحروف مشبوهة — قد يُستخدم في انتحال هوية موقع آخر",
      sfTld: "نطاق مشبوه الانتهاء — مرتبط بالاحتيال أو التحميل غير الآمن",
      sfDeep: "بنية نطاق مفرطة العمق — علامة خطرة",
      sfShort: "روابط مختصرة غير موثوقة — استخدم الرابط الكامل",
      sfExe: "ملف تنفيذي — يُحظر رفعه",
      sfPhish: "الرابط يحوي عبارة احتيال شائعة — مرفوض",
      sfSpaces: "الرابط يحتوي مسافات",
      sfOk: "سليم",
      probeTimeout: "الموقع لا يستجيب خلال المهلة — رابط معطّل",
      probeFail: "تعذّر الوصول للموقع — نطاق غير موجود أو محجوب",

      /* --- مواقع الزائر --- */
      pruneToast: "حُذف {0} موقعاً من قائمتك — لم يعد آمناً",
      livenessToast: "حُذف موقع «{0}» — لم يعد يعمل",

      /* --- البطاقات --- */
      badgeAr: "عربي",
      badgeFree: "مجاني",
      badgePaid: "مدفوع",
      badgeVerify: "يحتاج تحقق",
      badgeNew: "جديد",
      visitSite: "زيارة الموقع ←",
      copyShort: "نسخ",

      /* --- العرض والترقيم --- */
      hSearch: "نتائج البحث",
      hAll: "كل المواقع",
      countSites: "({0} موقع)",
      noResults: "لا توجد نتائج مطابقة.",
      noResultsShort: "لا نتائج.",
      resetSearch: "إعادة ضبط البحث",
      pgFirst: "» الأولى",
      pgPrev: "→ السابق",
      pgNext: "التالي ←",
      pgLast: "الأخيرة «",
      pgInfo: "صفحة {0} من {1} · عرض {2}–{3} من {4}",
      pgJump: "اذهب إلى صفحة",
      pgJumpAria: "رقم الصفحة",
      pgGo: "انتقال",

      /* --- وسوم المشاركة --- */
      metaOg: "أكثر من {0} موقعاً موثوقاً في {1} قسماً. كورسات بشهادات، توظيف، ذكاء اصطناعي، أدوات، عمل حر، كتب، وألعاب آمنة. مجاني بالكامل وبدون إعلانات.",
      metaDesc: "جامع الروابط: {0} موقعاً مفيداً في {1} قسماً — كورسات بشهادات معتمدة، توظيف موثوق، ذكاء اصطناعي، أدوات مجانية، عمل حر، كتب، وألعاب آمنة. مجاني 100%.",

      /* --- أداة التحميل --- */
      toolsTitle: "🎬 أداة تحميل الفيديو والصوت",
      toolsLead: "الصق رابط الفيديو أو المقطع الصوتي، وسنتحقق منه ونوصلك بالخطوة الصحيحة.",
      dlUrlAria: "رابط الفيديو",
      pickWhat: "اختر ما تريد",
      qVideo: "🎥 فيديو",
      qAudio: "🎵 صوت (MP3)",
      checkLink: "تحقق من الرابط",
      copyLinkBtn: "📋 نسخ الرابط",
      svcNow: "حالة الخدمات الآن:",
      svcChecking: "جارٍ الفحص…",
      svcUp: "{0} من {1} تعمل الآن ✔",
      svcDown: "لا خدمة متاحة — تحقق من اتصالك بالإنترنت",
      truthQ: "❓ كيف تعمل هذه الأداة فعلاً؟",
      truthP1: "<b>هذه الأداة لا تحمّل من موقعك.</b> أي موقع ثابت (HTML/JS) لا يستطيع تنزيل ملف، لأن ذلك يحتاج خادماً يشغّل برنامجاً اسمه yt-dlp — والخوادم المكلفة غير متاحة مجاناً.",
      truthP2: "ما تفعله الأداة: تتحقق من أن الرابط سليم وأن منصته مدعومة، ثم تفتح لك <b>Cobalt</b> — أداة مجانية مفتوحة المصدر بلا إعلانات — وتخبرك بخطوات نسخ الرابط إليها. الملف يُنزَّل على جهازك أنت مباشرة، ولا يمرّ على أي خادم وسيط.",
      truthP3: "لماذا خيارات أخرى؟ إذا تعطّل Cobalt لأي سبب، البدائل المدرجة أدناه تعمل. ننصحك دائماً ببداية Cobalt (بلا إعلانات) لتجنّب الإعلانات المزعجة.",
      truthP4: "<b>تحذير أمني:</b> مواقع مثل loader.to تعرض أشرطة تحميل وهمية وتطلب تثبيت برامج. تجنّبها. الأدوات الموصى بها مفتوحة المصدر وخالية من هذه الأساليب.",
      svcNote_cobalt: "مفتوح المصدر وبلا إعلانات — الأفضل. فيديو وصوت.",
      svcNote_9convert: "يحتوي إعلانات. احتياطي إذا تعطّل Cobalt.",
      svcNote_tikmate: "يحتوي إعلانات. احتياطي.",
      svcNote_yt1s: "يحتوي إعلانات. احتياطي.",
      svcNote_self: "نسخة تشغّلها أنت — بلا حدود.",
      svcName_self: "نسختي الخاصة",
      pasteFirst: "الصق رابطاً أولاً.",
      unknownPlat: "⚠️ لم أتعرّف على المنصة.",
      platformsOnly: "الأدوات المجانية تدعم هذه المنصات فقط: ",
      audioNo: "⚠️ استخراج الصوت من {0} غير مدعوم. اختر 🎥 فيديو بدلاً من 🎵 صوت.",
      wantAudio: "صوت MP3",
      wantVideo: "فيديو",
      qLineAudio: "اختر <b>Audio</b> ثم <b>MP3</b>",
      qLineVideo: "اختر <b>Video</b> ثم الجودة المطلوبة",
      recommended: "موصى به",
      copyVideoLink: "📋 نسخ رابط الفيديو",
      openSvc: "افتح {0} ↗",
      linkOk: "✅ رابط سليم · المنصة: <b>{0}</b> · المطلوب: <b>{1}</b>",
      step1: "<span>١</span> اضغط <b>نسخ رابط الفيديو</b> بالأعلى",
      step2: "<span>٢</span> افتح الأداة (ستفتح في تبويب جديد)",
      step3: "<span>٣</span> الصق الرابط في خانتها ثم اضغط جلب",
      step4: "<span>٤</span> {0} ثم اضغط تحميل",
      dlWarn: "الملف يُنزَّل على جهازك مباشرة. لا ترفع أي ملف على هذه الأدوات.",

      /* --- إضافة موقع --- */
      submitTitle: "➕ أضف موقعك",
      submitLead: "فحص آلي فوري وبدون مراجعة: إن كان الرابط سليماً وأمناً ويعمل فعلاً يُضاف إلى قائمتك مباشرة، وإن كان ضاراً أو معطوباً يُرفض ويُحذف.",
      fName: "اسم الموقع",
      fNamePh: "مثال: منصتي التعليمية",
      fUrl: "الرابط",
      fCat: "القسم المناسب",
      fDesc: "وصف مختصر",
      fDescPh: "اشرح ماذا يقدّم الموقع في سطرين",
      submitBtn: "افحص وأضف الموقع",
      submitNote: "🛡️ يرفض الفحص الآلي: روابط بدون https، ملفات تنفيذية، مختصرات، عناوين IP، نطاقات منتحلة أو مشبوهة، وعبارات احتيال — ثم يفحص حياً أن الموقع يعمل فعلاً قبل الإضافة. المواقع المضافة تُعاد فحصها في كل زيارة؛ إن صارت غير آمنة أو ميتة تُحذف تلقائياً.",
      nameShort: "الاسم قصير جداً.",
      descShort: "اكتب وصفاً لا يقل عن 10 أحرف.",
      purgedSuffix: " — وحُذفت نسخة محفوظة سابقاً إن وُجدت.",
      notAddedSuffix: " — لم يُضف.",
      dupFound: "هذا الموقع موجود بالفعل",
      dupReview: " في طلبات المراجعة.",
      dupSite: " في الموقع.",
      dailyLimit: "⚠️ بلغت الحد اليومي ({0} مواقع في 24 ساعة) — حاول غداً.",
      checkingLive: " جاري الفحص الحي...",
      checkingNote: "🔎 نفحص أن الموقع يعمل فعلاً… لحظات.",
      checkOk: "✅ نجح الفحص الكامل (صيغة سليمة · https · الموقع يعمل فعلاً · لا علامات خطر): أُضيف الموقع إلى قائمتك فوراً بلا مراجعة.",
      addedToast: "أُضيف «{0}» إلى قائمتك",

      /* --- التبرع --- */
      donateTitle: "💚 ادعم الموقع",
      donateLead: "الموقع مجاني 100% ولا يعرض أي إعلانات. دعمك هو ما يبقيه يعمل.",
      donateNumTitle: "اضغط لنسخ الرقم",
      copyNumber: "📋 نسخ الرقم",
      callBtn: "📞 اتصال",
      vodafoneHint: "رقم فودافون كاش — اسم المحوّل: {0}",
      payFast: "الأسرع — كود مباشر من هاتفك",
      payNum1: "١",
      payNum2: "٢",
      payFastDesc: "اكتب المبلغ الذي تريد التبرع به، ثم انسخ الكود وارقمنه من هاتفك.",
      ussdLabel: "الكود الذي ستُرسله:",
      amountSlot: "المبلغ",
      amountPh: "اكتب المبلغ بالجنيه",
      amountAria: "مبلغ التبرع",
      currency: "جنيه",
      createCode: "إنشاء الكود",
      copyCode: "📋 نسخ الكود",
      payVia: "عبر تطبيق فودافون كاش أو الموقع",
      payStep1: "افتح تطبيق Vodafone Cash على هاتفك (أو موقع فودافون الإلكتروني).",
      payStep2: "اختر <b>تحويل الأموال</b> ثم <b>تحويل فودافون كاش</b>.",
      payStep3: "اكتب الرقم: <code>{0}</code>",
      payStep4: "اكتب المبلغ وأكّد العملية برمز سرّ محفظتك.",
      vodafoneSite: "الموقع الرسمي لفودافون ↗",
      payNote: "⚠️ الموقع لا يستقبل أموالاً ولا يعالج دفعات — أنتحوّل المبلغ مباشرة من محفظتك إلى الرقم أعلاه، بلا مرور بأي وسيط. تأكّد من الرقم قبل التأكيد. رسوم التحويل تخص فودافون، وليست جزءاً من المبلغ.",
      minNote: "كل 10 جنيه تساعدنا على إبقاء الموقع مجانياً",
      amountBad: "اكتب مبلغاً بين 1 و 100000 جنيه.",
      codeReady: "✅ الكود جاهز: انسخه وارقمنه من هاتفك.",
      enterAmount: "اكتب المبلغ أولاً.",

      /* --- المشاركة --- */
      shareWa: "📱 واتساب",
      shareTg: "✈️ تلغرام",
      shareFb: "📘 فيسبوك",
      shareX: "🐦 إكس",
      shareCopy: "🔗 نسخ الرابط",
      siteName: "جامع الروابط",
      siteTagline: "كل ما تحتاجه من مواقع مفيدة — عربي وإنجليزي",

      /* --- التذييل --- */
      footTop: "أعلى الصفحة",
      footTools: "الأدوات",
      footAdd: "أضف موقعك",
      footDonate: "تبرع",
      footFree: "{0} © {1} — مجاني بالكامل، بدون إعلانات.",
      footDisclaimer: "جميع الروابط تُفحص قبل النشر. لا نتحمل مسؤولية محتوى المواقع الخارجية. احترم حقوق الملكية الفكرية وحقوق المؤلف.",

      /* --- الدخول --- */
      authAria: "تسجيل الدخول",
      welcome: "مرحباً {0}",
      guest: "زائر",
      logout: "تسجيل الخروج",
      loginGoogle: "الدخول بحساب جوجل",
      fbNotConfigured: "⚠️ Firebase غير مُهيّأ. أضف مفاتيح مشروعك في assets/js/config.js لتفعيل الدخول الحقيقي.",
      loginFail: "تعذّر تسجيل الدخول.",
      loginClosed: "أغلقت نافذة الدخول. حاول مجدداً.",
      loginBlocked: "المتصفح منع النافذة. اسمح بالنوافذ المنبثقة.",
      loginNoNet: "فشل الاتصال بالإنترنت.",
      loginDomain: "النطاق غير مصرّح به في إعدادات مشروع Firebase.",

      /* --- أسماء الأقسام (من data.js — تظهر في الشريط والقوائم والنموذج) --- */
      "cat_courses-free-cert": "كورسات مجانية بشهادات معتمدة",
      "cat_courses-paid-cert": "كورسات مدفوعة بشهادات معتمدة",
      "cat_training-cert": "شهادات تدريبية مهنية",
      "cat_jobs-trusted": "مواقع توظيف موثوقة",
      "cat_tools-free": "أدوات مجانية",
      "cat_tools-paid": "أدوات مدفوعة",
      "cat_ai-free": "ذكاء اصطناعي مجاني",
      "cat_ai-paid": "ذكاء اصطناعي مدفوع",
      "cat_ai-tools": "أدوات ومجلدات الذكاء الاصطناعي",
      "cat_ecommerce-free": "بيع وطباعة عند الطلب مجاناً",
      "cat_ecommerce-paid": "متاجر ومنصات بيع",
      "cat_affiliate": "التسويق بالعمولة",
      "cat_freelance": "العمل الحر",
      "cat_books-free": "كتب مجانية",
      "cat_books-paid": "كتب وكورسات مدفوعة",
      "cat_games-programs": "ألعاب وبرامج آمنة",
      "cat_security-tools": "أمان وحماية وخصوصية",
      "cat_organize-tools": "تنظيم وإنتاجية",
      "cat_tech-news": "أخبار التقنية والعلوم",
      "cat_health-fitness": "الصحة واللياقة",
      "cat_travel": "السفر والسياحة",
      "cat_food-recipes": "الطبخ والوصفات",
      "cat_islamic": "المحتوى الإسلامي الموثوق",
      "cat_finance-basics": "الثقافة المالية",
      "cat_kids-education": "الأطفال والتعليم المبكر"
    },

    en: {
      /* --- Document & header --- */
      docTitle: "Link Collector — All Useful Sites in One Place",
      docDesc: "Link Collector: 2,000+ useful sites in 25 sections — certified courses, trusted jobs, AI, free tools, freelancing, books, and safe games. 100% free.",
      skipTo: "Skip to content",
      brand: "Link Collector",
      logoLetter: "L",
      tagline: "2,000+ trusted sites in 25 sections — certified courses, jobs, AI, tools, affiliate marketing, freelancing, books, and safe apps & games. Arabic & English, free and paid.",
      statSitesLbl: "trusted sites",
      statSectionsLbl: "organized sections",
      statFreeLbl: "free",

      /* --- Navigation & search --- */
      navAria: "Main navigation",
      searchLabel: "Search sites",
      searchPh: "Search: courses, ChatGPT, jobs, design…",
      resultsAria: "Search results",
      themeToggleAria: "Toggle dark mode",
      themeLight: "Enable dark mode",
      themeDark: "Enable light mode",
      sectionsAria: "Pick a section",
      navSectionsAria: "Site sections",
      langBtnAria: "تبديل اللغة إلى العربية",

      /* --- Section picker --- */
      pickerTitle: "📂 Choose the section you want",
      pickerCloseAria: "Close",
      pickerHint: "Click any section to see all its sites. The number next to each section shows how many sites it contains.",
      pickerAll: "Show all sites",
      pickAll: "All sections",
      pickAllSub: "Show every site at once",
      pickLangCount: "Arabic: {0} · English: {1}",

      /* --- Toolbar --- */
      jumpLabel: "Choose section",
      jumpAllStatic: "— All sections —",
      jumpAll: "— All sections ({0}) —",
      sortAria: "Sort results",
      sortPopular: "Most popular",
      sortNew: "Newest",
      sortAz: "A–Z",
      navAll: "All",
      chipAllLangs: "All languages",
      chipAr: "Arabic",
      chipAllTiers: "All types",
      chipFree: "Free",
      chipPaid: "Paid",

      /* --- No-JS notice --- */
      noscript: "This site needs JavaScript enabled to show the links and search.",

      /* --- General helpers --- */
      hostFallback: "link",
      qmark: "?",
      sepList: ", ",
      copiedToast: "Copied",
      copyManually: "Copy manually from the address bar",
      copied: "✅ Copied",
      updatedToast: "Link list updated",
      adminPanel: "Dashboard",

      /* --- Link safety check --- */
      sfEmpty: "The link is empty",
      sfTooLong: "Link is too long (300 characters max)",
      sfBadProto: "Dangerous protocol that can enable XSS attacks",
      sfNoHttp: "http links are not allowed — the link must start with https",
      sfMustHttps: "The link must start with https://",
      sfBadFormat: "Invalid link format",
      sfProtoNotAllowed: "Protocol not allowed (only http/https)",
      sfCreds: "Links containing credentials are rejected",
      sfBadHost: "Invalid domain name",
      sfIp: "Direct IP address links are not accepted",
      sfInternal: "Internal network addresses are not accepted",
      sfPuny: "Suspicious domain characters — may be used to impersonate another site",
      sfTld: "Suspicious domain ending — associated with fraud or unsafe downloads",
      sfDeep: "Overly deep subdomain structure — a danger sign",
      sfShort: "Untrusted short links — use the full URL",
      sfExe: "Executable file — uploading is forbidden",
      sfPhish: "The link contains a common phishing phrase — rejected",
      sfSpaces: "The link contains spaces",
      sfOk: "OK",
      probeTimeout: "The site does not respond in time — dead link",
      probeFail: "Cannot reach the site — domain missing or blocked",

      /* --- Visitor sites --- */
      pruneToast: "{0} sites removed from your list — no longer safe",
      livenessToast: "Removed site «{0}» — no longer working",

      /* --- Cards --- */
      badgeAr: "Arabic",
      badgeFree: "Free",
      badgePaid: "Paid",
      badgeVerify: "Needs check",
      badgeNew: "New",
      visitSite: "Visit site →",
      copyShort: "Copy",

      /* --- Rendering & pagination --- */
      hSearch: "Search results",
      hAll: "All sites",
      countSites: "({0} sites)",
      noResults: "No matching results.",
      noResultsShort: "No results.",
      resetSearch: "Reset search",
      pgFirst: "First «",
      pgPrev: "← Prev",
      pgNext: "Next →",
      pgLast: "Last »",
      pgInfo: "Page {0} of {1} · showing {2}–{3} of {4}",
      pgJump: "Go to page",
      pgJumpAria: "Page number",
      pgGo: "Go",

      /* --- Meta tags --- */
      metaOg: "More than {0} trusted sites in {1} sections. Certified courses, jobs, AI, tools, freelancing, books, and safe games. Completely free with no ads.",
      metaDesc: "Link Collector: {0} useful sites in {1} sections — certified courses, trusted jobs, AI, free tools, freelancing, books, and safe games. 100% free.",

      /* --- Download tool --- */
      toolsTitle: "🎬 Video & audio download tool",
      toolsLead: "Paste a video or audio link and we will verify it and guide you to the right step.",
      dlUrlAria: "Video link",
      pickWhat: "Choose what you want",
      qVideo: "🎥 Video",
      qAudio: "🎵 Audio (MP3)",
      checkLink: "Check link",
      copyLinkBtn: "📋 Copy link",
      svcNow: "Service status now:",
      svcChecking: "Checking…",
      svcUp: "{0} of {1} are working now ✔",
      svcDown: "No service available — check your internet connection",
      truthQ: "❓ How does this tool actually work?",
      truthP1: "<b>This tool does not download from our site.</b> Any static site (HTML/JS) cannot download a file — that needs a server running a program called yt-dlp, and such servers are not free.",
      truthP2: "What the tool does: it verifies your link and that your platform is supported, then opens <b>Cobalt</b> — a free open-source tool with no ads — and shows you the steps to paste your link there. The file downloads straight to your own device and passes through no middle server.",
      truthP3: "Why other options? If Cobalt ever fails for any reason, the alternatives listed below work. We always recommend starting with Cobalt (no ads) to avoid annoying ads.",
      truthP4: "<b>Security warning:</b> sites like loader.to show fake download bars and ask you to install software. Avoid them. The recommended tools are open source and free of such practices.",
      svcNote_cobalt: "Open source and ad-free — the best. Video and audio.",
      svcNote_9convert: "Contains ads. Backup if Cobalt fails.",
      svcNote_tikmate: "Contains ads. Backup.",
      svcNote_yt1s: "Contains ads. Backup.",
      svcNote_self: "Your own instance — no limits.",
      svcName_self: "My own instance",
      pasteFirst: "Paste a link first.",
      unknownPlat: "⚠️ Platform not recognized.",
      platformsOnly: "Free tools support only these platforms: ",
      audioNo: "⚠️ Audio extraction from {0} is not supported. Choose 🎥 Video instead of 🎵 Audio.",
      wantAudio: "MP3 audio",
      wantVideo: "Video",
      qLineAudio: "Choose <b>Audio</b> then <b>MP3</b>",
      qLineVideo: "Choose <b>Video</b> then the quality you want",
      recommended: "Recommended",
      copyVideoLink: "📋 Copy video link",
      openSvc: "Open {0} ↗",
      linkOk: "✅ Link OK · Platform: <b>{0}</b> · Needed: <b>{1}</b>",
      step1: "<span>1</span> Click <b>Copy video link</b> above",
      step2: "<span>2</span> Open the tool (it opens in a new tab)",
      step3: "<span>3</span> Paste the link in its box, then hit fetch",
      step4: "<span>4</span> {0} then hit download",
      dlWarn: "The file downloads straight to your device. Never upload files to these tools.",

      /* --- Add site --- */
      submitTitle: "➕ Add your site",
      submitLead: "Instant automatic check with no review: if the link is safe, secure, and actually working it is added to your list right away — if it is harmful or broken it is rejected and deleted.",
      fName: "Site name",
      fNamePh: "e.g. My learning platform",
      fUrl: "Link",
      fCat: "Suitable section",
      fDesc: "Short description",
      fDescPh: "Explain in two lines what the site offers",
      submitBtn: "Check and add site",
      submitNote: "🛡️ The automatic check rejects: non-https links, executables, shorteners, IP addresses, impersonating or suspicious domains, and phishing phrases — then it probes live that the site really works before adding. Added sites are re-checked on every visit; if they become unsafe or dead they are deleted automatically.",
      nameShort: "The name is too short.",
      descShort: "Write a description of at least 10 characters.",
      purgedSuffix: " — and any previously saved copy was deleted.",
      notAddedSuffix: " — not added.",
      dupFound: "This site already exists",
      dupReview: " in the pending requests.",
      dupSite: " on the site.",
      dailyLimit: "⚠️ You reached the daily limit ({0} sites in 24 hours) — try again tomorrow.",
      checkingLive: " Live checking…",
      checkingNote: "🔎 Checking that the site really works… one moment.",
      checkOk: "✅ Full check passed (valid format · https · site actually works · no danger signs): the site was added to your list instantly with no review.",
      addedToast: "Added «{0}» to your list",

      /* --- Donate --- */
      donateTitle: "💚 Support the site",
      donateLead: "The site is 100% free with no ads. Your support is what keeps it running.",
      donateNumTitle: "Click to copy the number",
      copyNumber: "📋 Copy number",
      callBtn: "📞 Call",
      vodafoneHint: "Vodafone Cash number — account holder: {0}",
      payFast: "Fastest — a direct code from your phone",
      payNum1: "1",
      payNum2: "2",
      payFastDesc: "Type the amount you want to donate, then copy the code and dial it from your phone.",
      ussdLabel: "The code you will send:",
      amountSlot: "Amount",
      amountPh: "Amount in EGP",
      amountAria: "Donation amount",
      currency: "EGP",
      createCode: "Create code",
      copyCode: "📋 Copy code",
      payVia: "Via the Vodafone Cash app or website",
      payStep1: "Open the Vodafone Cash app on your phone (or the Vodafone website).",
      payStep2: "Choose <b>Transfer money</b> then <b>Vodafone Cash transfer</b>.",
      payStep3: "Enter the number: <code>{0}</code>",
      payStep4: "Enter the amount and confirm with your wallet PIN.",
      vodafoneSite: "Vodafone official site ↗",
      payNote: "⚠️ The site receives no money and processes no payments — transfer the amount directly from your wallet to the number above, with no intermediary. Double-check the number before confirming. Transfer fees belong to Vodafone and are not part of the amount.",
      minNote: "Every 10 EGP helps us keep the site free",
      amountBad: "Enter an amount between 1 and 100000 EGP.",
      codeReady: "✅ Code ready: copy it and dial it from your phone.",
      enterAmount: "Enter the amount first.",

      /* --- Share --- */
      shareWa: "📱 WhatsApp",
      shareTg: "✈️ Telegram",
      shareFb: "📘 Facebook",
      shareX: "🐦 X",
      shareCopy: "🔗 Copy link",
      siteName: "Link Collector",
      siteTagline: "Everything you need from useful sites — Arabic and English",

      /* --- Footer --- */
      footTop: "Back to top",
      footTools: "Tools",
      footAdd: "Add your site",
      footDonate: "Donate",
      footFree: "{0} © {1} — completely free, no ads.",
      footDisclaimer: "All links are checked before publishing. We are not responsible for external sites content. Respect intellectual property and copyright.",

      /* --- Auth --- */
      authAria: "Sign in",
      welcome: "Hello {0}",
      guest: "Guest",
      logout: "Sign out",
      loginGoogle: "Sign in with Google",
      fbNotConfigured: "⚠️ Firebase is not configured. Add your project keys in assets/js/config.js to enable real sign-in.",
      loginFail: "Sign-in failed.",
      loginClosed: "You closed the sign-in window. Try again.",
      loginBlocked: "The browser blocked the popup. Allow pop-ups.",
      loginNoNet: "Internet connection failed.",
      loginDomain: "This domain is not authorized in your Firebase project settings.",

      /* --- Section names (from data.js — nav, dropdowns, submit form) --- */
      "cat_courses-free-cert": "Free Certified Courses",
      "cat_courses-paid-cert": "Paid Certified Courses",
      "cat_training-cert": "Professional Training Certificates",
      "cat_jobs-trusted": "Trusted Job Sites",
      "cat_tools-free": "Free Tools",
      "cat_tools-paid": "Paid Tools",
      "cat_ai-free": "Free AI",
      "cat_ai-paid": "Paid AI",
      "cat_ai-tools": "AI Tools & Directories",
      "cat_ecommerce-free": "Free Dropshipping & Print-on-Demand",
      "cat_ecommerce-paid": "Stores & Selling Platforms",
      "cat_affiliate": "Affiliate Marketing",
      "cat_freelance": "Freelancing",
      "cat_books-free": "Free Books",
      "cat_books-paid": "Paid Books & Courses",
      "cat_games-programs": "Safe Games & Programs",
      "cat_security-tools": "Security, Protection & Privacy",
      "cat_organize-tools": "Organization & Productivity",
      "cat_tech-news": "Tech & Science News",
      "cat_health-fitness": "Health & Fitness",
      "cat_travel": "Travel & Tourism",
      "cat_food-recipes": "Food & Recipes",
      "cat_islamic": "Trusted Islamic Content",
      "cat_finance-basics": "Financial Literacy",
      "cat_kids-education": "Kids & Early Education"
    }
  };

  var lang = "ar";

  function getLang() {
    try {
      /* لوحة التحكم تبقى عربية دائماً */
      if (/(^|\/)admin\.html/.test(location.pathname)) return "ar";
      return localStorage.getItem(LANG_KEY) === "en" ? "en" : "ar";
    } catch (e) { return "ar"; }
  }

  function t(key) {
    var bag = DICT[lang] || DICT.ar;
    var s = bag[key];
    if (s === undefined) s = DICT.ar[key];
    if (s === undefined) return key;
    var args = arguments;
    return String(s).replace(/\{(\d)\}/g, function (m, i) {
      var v = args[Number(i) + 1];
      return v === undefined || v === null ? m : String(v);
    });
  }

  function applyStatic() {
    var els, i;
    els = document.querySelectorAll("[data-i18n]");
    for (i = 0; i < els.length; i++) els[i].textContent = t(els[i].getAttribute("data-i18n"));
    els = document.querySelectorAll("[data-i18n-html]");
    for (i = 0; i < els.length; i++) els[i].innerHTML = t(els[i].getAttribute("data-i18n-html"));
    els = document.querySelectorAll("[data-i18n-ph]");
    for (i = 0; i < els.length; i++) els[i].placeholder = t(els[i].getAttribute("data-i18n-ph"));
    els = document.querySelectorAll("[data-i18n-aria]");
    for (i = 0; i < els.length; i++) els[i].setAttribute("aria-label", t(els[i].getAttribute("data-i18n-aria")));
  }

  function applyDocument() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = t("docTitle");
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", t("docDesc"));
    var ot = document.querySelector('meta[property="og:title"]');
    if (ot) ot.setAttribute("content", t("docTitle"));
    var ol = document.querySelector('meta[property="og:locale"]');
    if (ol) ol.setAttribute("content", lang === "ar" ? "ar_AR" : "en_US");
  }

  function syncLangBtn() {
    var lbl = document.getElementById("langLabel");
    if (lbl) lbl.textContent = lang === "ar" ? "EN" : "عربي";
    var btn = document.getElementById("langBtn");
    if (btn) btn.setAttribute("aria-label", t("langBtnAria"));
  }

  function setLang(next) {
    lang = next === "en" ? "en" : "ar";
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* وضع خاص */ }
    applyDocument();
    applyStatic();
    syncLangBtn();
    try {
      document.dispatchEvent(new CustomEvent("jr:langchange", { detail: { lang: lang } }));
    } catch (e) { /* متصفح قديم */ }
  }

  /* تهيئة مبكرة: قبل رسم أي جزء من الصفحة */
  lang = getLang();
  applyDocument();

  document.addEventListener("DOMContentLoaded", function () {
    applyStatic();
    syncLangBtn();
    var btn = document.getElementById("langBtn");
    if (btn) {
      btn.addEventListener("click", function () {
        setLang(lang === "ar" ? "en" : "ar");
      });
    }
  });

  window.JRT = t;
  window.JRI18N = { t: t, getLang: getLang, setLang: setLang, dict: DICT };
})();
