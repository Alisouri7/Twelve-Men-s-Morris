"use strict";
/* ============================================================
   i18n.js — bilingual UI layer (English / فارسی)
   - window.I18N.t(key, params)  -> translated string
   - window.I18N.setLang('en'|'fa') / getLang()
   - Applies dir="rtl", lang, Persian digits and a Persian font.
   Must be loaded before game.js (game.js calls I18N on boot).
   ============================================================ */

(function () {
  const DICT = {
    /* ================= English ================= */
    en: {
      "app.title": "Twelve Men's Morris",
      "app.subtitle": "Merels on the great diagonal board — form mills, capture cows, drive your rival from the field.",

      "start.playVsComputer": "Play vs Computer",
      "start.playVsComputer.sub": "Choose your strength",
      "start.playVsHuman": "Play vs Person",
      "start.playVsHuman.sub": "Two players, one board",
      "start.chooseDifficulty": "Choose difficulty",
      "diff.easy": "Easy",
      "diff.medium": "Medium",
      "diff.hard": "Hard",
      "start.easy": "Easy",
      "start.easy.sub": "Fresh to the field",
      "start.medium": "Medium",
      "start.medium.sub": "A seasoned player",
      "start.hard": "Hard",
      "start.hard.sub": "A cunning master",
      "start.pickerHint": "You play the ivory pieces and move first.",
      "start.howToPlay": "How to play",

      "resume.title": "Unfinished game",
      "resume.resume": "Resume",
      "resume.discard": "Discard",
      "resume.vsComputer": "vs Computer ({difficulty})",
      "resume.twoPlayers": "Two players",
      "resume.move": "move {n}",
      "resume.capturePending": "capture pending",

      "header.rules": "Rules",
      "header.newGame": "New game",
      "header.menu": "Menu",
      "header.muteTitle": "Mute sounds (M)",
      "header.unmuteTitle": "Unmute sounds (M)",
      "header.toggleSound": "Toggle sound",

      "board.ariaLabel": "Twelve Men's Morris board",
      "board.reviewing": "Reviewing…",
      "modal.close": "Close",

      "end.playAgain": "Play again",
      "end.menu": "Menu",

      "player.white": "White",
      "player.black": "Black",
      "player.youWhite": "You (White)",
      "player.computer": "Computer ({difficulty})",

      "stat.inHand": "in hand",
      "stat.onBoard": "on board",
      "stat.lost": "lost",

      "status.placeTurn": "{name} to place a piece.",
      "status.pickPiece": "{name}: pick a piece to move",
      "status.pickDest": "{name}: pick a highlighted point",
      "status.millRemove": "{name} formed a mill — remove an enemy piece",
      "status.computerThinking": "Computer is thinking…",
      "status.computerPlaces": "Computer places at {point}…",
      "status.computerMoves": "Computer moves {from} → {to}…",
      "status.reviewing": "Reviewing move {n} of {total} — click ⏭ to return to the game",

      "phase.placing": "Placing phase — {n} pieces to place",
      "phase.moving": "Moving phase",
      "phase.gameOver": "Game over",
      "phase.reviewing": "Reviewing move {n} / {total}",

      "nav.undo": "↩ Undo",
      "nav.undoTitle": "Undo the last move (U)",
      "nav.firstTitle": "First move (review)",
      "nav.prevTitle": "Previous move (←)",
      "nav.nextTitle": "Next move (→)",
      "nav.lastTitle": "Back to the live position (Esc)",

      "history.whitePlacesAt": "{name} places at {point}",
      "history.whiteMoves": "{name} moves {from} → {to}",
      "history.removesAt": "{name} removes at {point}",
      "history.whiteFormsMill": "{name} forms a mill!",

      "end.whiteWins": "{name} wins",
      "end.draw": "Draw",
      "end.drawDetail": "The board filled up with no capture ever made.",
      "end.blockedDetail": "The opponent has no legal move.",
      "end.piecesDetail": "The opponent was reduced to two pieces.",
      "end.wellPlayed": " Well played!",
      "end.betterLuck": " Better luck next time!",

      "rules.title": "How to play",
      "rules.board": "The board",
      "rules.boardText": " has 24 points: three concentric squares joined by cross-lines, plus four diagonals. Each player commands 12 pieces.",
      "rules.placing": "Placing",
      "rules.placingText": " — take turns putting one piece on any empty point until all 24 are placed.",
      "rules.moving": "Moving",
      "rules.movingText": " — then slide one of your pieces along a line to an adjacent empty point.",
      "rules.flying": "Flying",
      "rules.flyingText": " — when reduced to exactly 3 pieces you may move to <em>any</em> empty point.",
      "rules.mills": "Mills:",
      "rules.millsText": " three of your pieces on one marked line (including the diagonals) form a mill. Completing a mill lets you remove one enemy piece — but pieces inside an enemy mill are safe unless every enemy piece is in a mill. Breaking a mill and re-forming it later captures again.",
      "log.newVsComputer": "New game — vs computer ({difficulty})",
      "log.newVsHuman": "New game — two players",

      "rules.winning": "Winning:",
      "rules.winningText": " reduce your opponent to 2 pieces, or leave them with no legal move. If all 24 pieces are placed and no capture was ever made, the game is a draw.",

      "lang.button": "فارسی",
      "lang.ariaLabel": "Change language to Persian",
      "lang.htmlLang": "en"
    },

    /* ================= Persian ================= */
    fa: {
      "app.title": "دوز دوازده مهره ای",
      "app.subtitle": "آسیاب بسازید، مهره حذف کنید و حریف را از میدان به در کنید.",

      "start.playVsComputer": "بازی با کامپیوتر",
      "start.playVsComputer.sub": "قدرت حریف را انتخاب کنید",
      "start.playVsHuman": "بازی با شخص دیگر",
      "start.playVsHuman.sub": "دو بازیکن، یک تخته",
      "start.chooseDifficulty": "سطح دشواری را انتخاب کنید",
      "diff.easy": "آسان",
      "diff.medium": "متوسط",
      "diff.hard": "سخت",
      "start.easy": "آسان",
      "start.easy.sub": "تازه‌کار در میدان",
      "start.medium": "متوسط",
      "start.medium.sub": "بازیکنی باتجربه",
      "start.hard": "سخت",
      "start.hard.sub": "استادیِ حیله‌گر",
      "start.pickerHint": "شما با مهره‌های روشن بازی می‌کنید و شروع‌کننده هستید.",
      "start.howToPlay": "راهنمای بازی",

      "resume.title": "بازی نیمه‌تمام",
      "resume.resume": "ادامه",
      "resume.discard": "حذف",
      "resume.vsComputer": "مقابل کامپیوتر ({difficulty})",
      "resume.twoPlayers": "دو نفره",
      "resume.move": "حرکت {n}",
      "resume.capturePending": "در انتظار گرفتن مهره",

      "header.rules": "قوانین",
      "header.newGame": "بازی جدید",
      "header.menu": "منو",
      "header.muteTitle": "بی‌صدا کردن صداها (M)",
      "header.unmuteTitle": "وصل کردن صداها (M)",
      "header.toggleSound": "روشن/خاموش صدا",

      "board.ariaLabel": "تخته دوز دوازده مهره ای",
      "board.reviewing": "در حال مرور…",
      "modal.close": "بستن",
      "modal.close": "بستن",

      "end.playAgain": "بازی دوباره",
      "end.menu": "منو",

      "player.white": "سفید",
      "player.black": "سیاه",
      "player.youWhite": "شما (سفید)",
      "player.computer": "کامپیوتر ({difficulty})",

      "stat.inHand": "در دست",
      "stat.onBoard": "روی تخته",
      "stat.lost": "حذف شده",

      "status.placeTurn": "{name} باید مهره بگذارد.",
      "status.pickPiece": "{name}: مهره‌ای را برای حرکت انتخاب کنید",
      "status.pickDest": "{name}: یکی از نقطه‌های مشخص‌شده را انتخاب کنید",
      "status.millRemove": "{name} آسیاب ساخت — یکی از مهره‌های حریف را بردارید",
      "status.computerThinking": "کامپیوتر در حال فکر کردن…",
      "status.computerPlaces": "کامپیوتر در {point} می‌گذارد…",
      "status.computerMoves": "کامپیوتر {from} ← {to} حرکت می‌کند…",
      "status.reviewing": "مرور حرکت {n} از {total} — برای بازگشت به بازی ⏭ را بزنید",

      "phase.placing": "مرحله‌ی چیدن — {n} مهره برای گذاشتن",
      "phase.moving": "مرحله‌ی حرکت",
      "phase.gameOver": "بازی تمام شد",
      "phase.reviewing": "مرور حرکت {n} / {total}",

      "nav.undo": "↩ واگرد",
      "nav.undoTitle": "واگرداندن آخرین حرکت (U)",
      "nav.firstTitle": "اولین حرکت (مرور)",
      "nav.prevTitle": "حرکت قبلی (←)",
      "nav.nextTitle": "حرکت بعدی (→)",
      "nav.lastTitle": "بازگشت به وضعیت زنده (Esc)",

      "history.whitePlacesAt": "{name} در {point} می‌گذارد",
      "history.whiteMoves": "{name} {from} ← {to} حرکت کرد",
      "history.removesAt": "{name} در {point} مهره برمی‌دارد",
      "history.whiteFormsMill": "{name} آسیاب ساخت!",

      "end.whiteWins": "{name} برنده شد",
      "end.draw": "مساوی",
      "end.drawDetail": "تخته پر شد و هیچ گرفتی انجام نشد.",
      "end.blockedDetail": "حریف حرکت قانونی نداشت.",
      "end.piecesDetail": "مهره‌های حریف به دو عدد رسید.",
      "end.wellPlayed": " عالی بازی کردید!",
      "end.betterLuck": " دفعه‌ی بعد بهتر!",

      "rules.title": "راهنمای بازی",
      "rules.board": "تخته",
      "rules.boardText": " ۲۴ نقطه دارد: سه مربع هم‌مرکز که با خط‌های عرضی به هم وصل شده‌اند، به‌همراه چهار قطر مورب. هر بازیکن ۱۲ مهره دارد.",
      "rules.placing": "چیدن",
      "rules.placingText": " — به نوبت هر بار یک مهره روی هر نقطه‌ی خالی می‌گذارید تا هر ۲۴ مهره چیده شود.",
      "rules.moving": "حرکت دادن",
      "rules.movingText": " — سپس یکی از مهره‌های خود را در امتداد خطوط به نقطه‌ی خالی مجاور می‌لغزانید.",
      "rules.flying": "پرواز",
      "rules.flyingText": " — اگر تعداد مهره‌های شما دقیقاً به ۳ برسد، می‌توانید به <em>هر</em> نقطه‌ی خالی بپرید.",
      "rules.mills": "آسیاب‌ها:",
      "rules.millsText": " سه مهره‌ی هم‌رنگ روی یک خطِ علامت‌گذاری‌شده (شامل قطرها) یک آسیاب می‌سازد. با ساختن هر آسیاب می‌توانید یکی از مهره‌های حریف را بردارید — اما مهره‌های داخل آسیابِ حریف امن‌اند، مگر اینکه همه‌ی مهره‌هایش داخل آسیاب باشند. شکستن یک آسیاب و ساختن دوباره‌ی آن، حق گرفتن را دوباره فعال می‌کند.",
      "log.newVsComputer": "بازی جدید — مقابل کامپیوتر ({difficulty})",
      "log.newVsHuman": "بازی جدید — دو نفره",

      "rules.winning": "برد:",
      "rules.winningText": " حریف را به ۲ مهره برسانید یا کاری کنید که حرکت قانونی نداشته باشد. اگر هر ۲۴ مهره چیده شود و هیچ گرفتی رخ ندهد، بازی مساوی است.",

      "lang.button": "English",
      "lang.ariaLabel": "تغییر زبان به انگلیسی",
      "lang.htmlLang": "fa"
    }
  };

  const STORAGE_KEY = "tmm.lang";
  let lang = "en";

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "fa" || saved === "en") lang = saved;
  } catch (_) { /* private mode */ }

  function faDigits(s) {
    const west = "0123456789";
    const persian = "۰۱۲۳۴۵۶۷۸۹";
    let out = "";
    for (const ch of String(s)) {
      const i = west.indexOf(ch);
      out += i >= 0 ? persian[i] : ch;
    }
    return out;
  }

  function interpolate(template, params) {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (m, name) =>
      params[name] !== undefined ? String(params[name]) : m
    );
  }

  /** Translate a key with optional {placeholder} params. Falls back to English. */
  function t(key, params) {
    const entry = DICT[lang] && DICT[lang][key] !== undefined ? DICT[lang][key]
      : (DICT.en[key] !== undefined ? DICT.en[key] : key);
    let s = interpolate(entry, params);
    if (lang === "fa") s = faDigits(s);
    return s;
  }

  /** Returns the raw localized string without digit conversion (for HTML). */
  function raw(key, params) {
    const entry = DICT[lang] && DICT[lang][key] !== undefined ? DICT[lang][key]
      : (DICT.en[key] !== undefined ? DICT.en[key] : key);
    return interpolate(entry, params);
  }

  /** Translate every element carrying data-i18n / data-i18n-html / data-i18n-title / data-i18n-aria. */
  function applyStatic() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
      el.innerHTML = raw(el.getAttribute("data-i18n-html"));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      el.title = t(el.getAttribute("data-i18n-title"));
      if (el.getAttribute("aria-label")) el.setAttribute("aria-label", el.title);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(el => {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
  }

  /** Apply direction, lang attribute and the Persian font. Call on any language change. */
  function applyDocumentSettings() {
    const fa = lang === "fa";
    document.documentElement.setAttribute("dir", fa ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", lang);
    document.body.classList.toggle("lang-fa", fa);
    document.title = t("app.title");
    const board = document.getElementById("board");
    if (board) board.setAttribute("aria-label", t("board.ariaLabel"));
  }

  function setLang(next) {
    if (next !== "fa" && next !== "en") return;
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) { /* ignore */ }
    applyDocumentSettings();
    applyStatic();
    if (typeof document !== "undefined" && document.dispatchEvent) {
      document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
    }
  }

  window.I18N = {
    t,
    raw,
    getLang: () => lang,
    setLang,
    applyStatic,
    applyDocumentSettings,
    faDigits,
    isRTL: () => lang === "fa",
    available: Object.keys(DICT)
  };
})();
