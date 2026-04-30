// Tiny i18n for the GitHub Pages landing page. No external dependencies,
// no build step, no required-JS regression: the HTML ships with English
// content as the default, this script enhances it to German when the
// browser language is `de*` or the user clicks the DE switcher.

(function () {
  "use strict";

  var STRINGS = {
    en: {
      "title": "Builder Kit — turn one sentence into a complete project plan",
      "nav.how": "How it works",
      "nav.example": "Example",
      "nav.what": "What you get",
      "nav.github": "GitHub",

      "hero.eyebrow": "Free · No install · 30 seconds",
      "hero.h1.html": "From one&nbsp;sentence to a&nbsp;complete <span class=\"accent\">project&nbsp;plan</span>.",
      "hero.lede": "Tell us your idea in plain language. Get back twelve ready-to-use planning documents — vision, roadmap, risks, architecture, and a starter prompt for Claude or ChatGPT. No terminal, no setup, no cloud account.",
      "hero.cta.primary": "Launch the tool",
      "hero.cta.secondary": "See how it works",
      "hero.trust.1": "✓ MIT-licensed open source",
      "hero.trust.2": "✓ Works without a Claude account",
      "hero.trust.3": "✓ Built by humans, runs without an LLM",

      "hero.card.label": "Your idea",
      "hero.card.idea": "An app for parents of small children that helps them organise daily routines.",
      "hero.card.more": "+ 9 more",

      "how.kicker": "How it works",
      "how.h2": "Three steps. No technical background needed.",
      "how.subtitle": "The tool runs in your browser. The output drops straight into Claude or ChatGPT — they take it from there.",
      "how.s1.title": "Describe your idea",
      "how.s1.body": "A guided wizard asks four short questions: what you want to build, who it's for, what it should do, and that's it. Plain language, no jargon.",
      "how.s1.tile1": "An app",
      "how.s1.tile2": "A website",
      "how.s1.tile3": "A tool",
      "how.s2.title": "Get 12 documents",
      "how.s2.body": "Vision, roadmap, risks, architecture, marketing brief, and a starter prompt for Claude. Substantial content, no placeholder text.",
      "how.s3.title": "Continue in Claude",
      "how.s3.body.html": "Drop <code>MASTERPLAN.md</code> into a free claude.ai chat with the prepared prompt. Claude walks you through Step&nbsp;1 in plain language, one question at a time.",
      "how.s3.chat-msg": "📎 MASTERPLAN.md",
      "how.s3.chat-reply": "Sure! Let's start with…",
      "how.cta.primary": "Try it now",
      "how.cta.note": "Free. Works in any modern browser.",

      "ex.kicker": "Real output",
      "ex.h2": "This is what the kit gives you.",
      "ex.subtitle.html": "One snippet from a real generated <code>MASTERPLAN.md</code> for the idea <em>\"A SaaS dashboard for small business accountants\"</em>. Browse the full 12-file output on GitHub.",
      "ex.tag": "MASTERPLAN.md",
      "ex.meta": "~280 lines · 1 of 12 files",
      "ex.foot.browse": "Browse the full 12 files →",
      "ex.foot.generate": "Generate your own →",

      "wyg.kicker": "Inside every kit",
      "wyg.h2": "Twelve files, every time.",
      "wyg.subtitle.html": "Substantial content; no orphan <code>TODO</code> stubs (the test suite enforces that).",

      "dev.kicker": "For developers",
      "dev.h2": "Or run it locally.",
      "dev.subtitle": "Same tool, your machine. Two runtime dependencies (Express + archiver), no build step, MIT licensed.",
      "dev.api-hint": "Or hit the API directly:",

      "footer.line1.html": "MIT licensed · <a href=\"https://github.com/BEKO2210/Claude-Code-Public-Builder-Kit\" rel=\"noopener\">Source on GitHub</a> · <a href=\"https://github.com/BEKO2210/Claude-Code-Public-Builder-Kit/blob/main/LICENSE\" rel=\"noopener\">LICENSE</a>",
      "footer.line2.html": "Static site published from <code>/docs</code> via GitHub Pages. No tracking. No JavaScript required.",

      "skip-link": "Skip to main content",
      "lang.aria": "Language"
    },

    de: {
      "title": "Builder Kit — aus einem Satz wird ein kompletter Projektplan",
      "nav.how": "So geht's",
      "nav.example": "Beispiel",
      "nav.what": "Was du bekommst",
      "nav.github": "GitHub",

      "hero.eyebrow": "Kostenlos · Keine Installation · 30 Sekunden",
      "hero.h1.html": "Aus einem&nbsp;Satz wird ein&nbsp;kompletter <span class=\"accent\">Projektplan</span>.",
      "hero.lede": "Erzähl uns deine Idee in einfachen Worten. Du bekommst zwölf fertig nutzbare Planungsdokumente zurück — Vision, Roadmap, Risiken, Architektur und einen Starter-Text für Claude oder ChatGPT. Kein Terminal, keine Einrichtung, kein Cloud-Konto.",
      "hero.cta.primary": "Tool starten",
      "hero.cta.secondary": "So funktioniert's",
      "hero.trust.1": "✓ Open Source unter MIT-Lizenz",
      "hero.trust.2": "✓ Funktioniert auch ohne Claude-Account",
      "hero.trust.3": "✓ Von Menschen gebaut, läuft ohne LLM",

      "hero.card.label": "Deine Idee",
      "hero.card.idea": "Eine App für Eltern kleiner Kinder, die ihnen hilft, ihren Tagesablauf zu organisieren.",
      "hero.card.more": "+ 9 weitere",

      "how.kicker": "So geht's",
      "how.h2": "Drei Schritte. Kein technisches Vorwissen nötig.",
      "how.subtitle": "Das Tool läuft im Browser. Die Ausgabe geht direkt in Claude oder ChatGPT — die übernehmen ab da.",
      "how.s1.title": "Beschreib deine Idee",
      "how.s1.body": "Ein geführter Wizard stellt vier kurze Fragen: was du bauen willst, für wen, was es leisten soll — fertig. Einfache Sprache, kein Fachjargon.",
      "how.s1.tile1": "Eine App",
      "how.s1.tile2": "Eine Website",
      "how.s1.tile3": "Ein Tool",
      "how.s2.title": "Bekomm 12 Dokumente",
      "how.s2.body": "Vision, Roadmap, Risiken, Architektur, Marketing-Brief und ein Starter-Prompt für Claude. Echter Inhalt, keine Platzhalter.",
      "how.s3.title": "In Claude weitermachen",
      "how.s3.body.html": "Lade <code>MASTERPLAN.md</code> in einen kostenlosen claude.ai-Chat hoch und füge den vorbereiteten Text ein. Claude führt dich durch Schritt&nbsp;1 in einfacher Sprache — eine Frage nach der anderen.",
      "how.s3.chat-msg": "📎 MASTERPLAN.md",
      "how.s3.chat-reply": "Klar! Fangen wir an mit…",
      "how.cta.primary": "Jetzt ausprobieren",
      "how.cta.note": "Kostenlos. Läuft in jedem modernen Browser.",

      "ex.kicker": "Echte Ausgabe",
      "ex.h2": "Das hier kriegst du vom Kit.",
      "ex.subtitle.html": "Ein Auszug aus einer echten <code>MASTERPLAN.md</code> für die Idee <em>„A SaaS dashboard for small business accountants\"</em>. Den vollen 12-Datei-Output gibt's auf GitHub.",
      "ex.tag": "MASTERPLAN.md",
      "ex.meta": "~280 Zeilen · 1 von 12 Dateien",
      "ex.foot.browse": "Alle 12 Dateien anschauen →",
      "ex.foot.generate": "Eigenes Kit erzeugen →",

      "wyg.kicker": "In jedem Kit drin",
      "wyg.h2": "Zwölf Dateien. Jedes Mal.",
      "wyg.subtitle.html": "Echter Inhalt; keine leeren <code>TODO</code>-Platzhalter (die Tests erzwingen das).",

      "dev.kicker": "Für Entwickler",
      "dev.h2": "Oder lokal laufen lassen.",
      "dev.subtitle": "Gleiches Tool, deine Maschine. Zwei Runtime-Dependencies (Express + archiver), kein Build-Step, MIT-Lizenz.",
      "dev.api-hint": "Oder direkt die API benutzen:",

      "footer.line1.html": "MIT-lizenziert · <a href=\"https://github.com/BEKO2210/Claude-Code-Public-Builder-Kit\" rel=\"noopener\">Quellcode auf GitHub</a> · <a href=\"https://github.com/BEKO2210/Claude-Code-Public-Builder-Kit/blob/main/LICENSE\" rel=\"noopener\">LIZENZ</a>",
      "footer.line2.html": "Statische Seite via GitHub Pages aus <code>/docs</code> veröffentlicht. Kein Tracking. Kein JavaScript nötig.",

      "skip-link": "Zum Hauptinhalt springen",
      "lang.aria": "Sprache"
    }
  };

  var STORAGE_KEY = "bk-lang-docs";

  function detect() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "de") return stored;
    } catch (e) { /* ignore */ }
    var nav = (navigator.language || "en").toLowerCase();
    return nav.indexOf("de") === 0 ? "de" : "en";
  }

  var current = detect();

  function t(key) {
    var dict = STRINGS[current] || STRINGS.en;
    return dict[key] || STRINGS.en[key] || key;
  }

  function apply() {
    document.documentElement.lang = current;
    if (STRINGS[current].title) document.title = STRINGS[current].title;
    var els = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = t(els[i].getAttribute("data-i18n"));
    }
    var hels = document.querySelectorAll("[data-i18n-html]");
    for (var j = 0; j < hels.length; j++) {
      hels[j].innerHTML = t(hels[j].getAttribute("data-i18n-html"));
    }
    var attrs = ["aria-label", "title"];
    for (var a = 0; a < attrs.length; a++) {
      var sel = "[data-i18n-" + attrs[a] + "]";
      var aels = document.querySelectorAll(sel);
      for (var k = 0; k < aels.length; k++) {
        aels[k].setAttribute(attrs[a], t(aels[k].getAttribute("data-i18n-" + attrs[a])));
      }
    }
    var btns = document.querySelectorAll("[data-lang-set]");
    for (var b = 0; b < btns.length; b++) {
      btns[b].setAttribute("aria-pressed", btns[b].getAttribute("data-lang-set") === current ? "true" : "false");
    }
  }

  function setLocale(lang) {
    if (lang !== "en" && lang !== "de") return;
    current = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
    apply();
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-lang-set]");
    if (btn) {
      e.preventDefault();
      setLocale(btn.getAttribute("data-lang-set"));
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
