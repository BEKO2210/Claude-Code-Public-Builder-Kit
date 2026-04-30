// Tiny i18n for the GitHub Pages landing page. No external dependencies,
// no build step, no required-JS regression: the HTML ships with English
// content as the default, this script enhances it to German when the
// browser language is `de*` or the user clicks the DE switcher.

(function () {
  "use strict";

  var STRINGS = {
    en: {
      "title": "Builder Kit — turn one sentence into a complete project plan",
      "nav.flow": "How it works",
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

      "flow.kicker": "How it works",
      "flow.h2": "From one word to a working project.",
      "flow.subtitle": "The wizard is just the entry door. Here is what actually happens between \"I have an idea\" and \"Claude is shipping code for me\".",
      "flow.s1.title": "One word in.",
      "flow.s1.body": "You type something short — even a single phrase like <em>\"Training Plan App\"</em>. No essay required, no forms to fill out, no jargon expected.",
      "flow.s1.demo": "Training Plan App",
      "flow.s2.title": "The wizard sharpens it.",
      "flow.s2.body": "Three short follow-up questions: who's it for, what should it do better, and is anything sparse — then a one-glance summary before generating. If you only typed one word, the wizard nudges you to add a little more.",
      "flow.s2.pill1": "📱 An app",
      "flow.s2.pill2": "For busy parents",
      "flow.s2.pill3": "Saves time on planning",
      "flow.s3.title": "12 documents are generated.",
      "flow.s3.body": "Vision, roadmap, risks, architecture, marketing brief, prompts — all consistent with each other, all immediately useful. No <code>TODO</code> stubs, no placeholder paragraphs.",
      "flow.s3.more": "+ 8 more",
      "flow.s4.title": "You sharpen the plan with Claude Code.",
      "flow.s4.body": "Use Claude Code — in your browser via your GitHub repo, or in your terminal in the unzipped folder. Claude Code reads every file in the kit and can edit them directly. Each session iterates on one piece of the plan — Phase 1 / Step 1, then Step 2, then a risk you want to dig into. The plan stops being a stub and becomes the spec your project actually runs on.",
      "flow.s4.msg1": "📂 12 files loaded from your repo",
      "flow.s4.msg2": "Read MASTERPLAN.md and CLAUDE.md, walk me through Phase 1 / Step 1.",
      "flow.s4.msg3": "Got it. First decision: are users tracking the same plan or each their own?",
      "flow.s4.msg4": "Each their own. Add that to the masterplan.",
      "flow.s5.title": "Claude builds autonomously.",
      "flow.s5.body": "Once the plan is sharp, Claude executes against it — writes the code, runs the tests, reports back. You stay in the loop only on decisions, not on every line. The masterplan is the contract; Claude works it down phase by phase.",
      "flow.s5.code1": "Reading MASTERPLAN.md…",
      "flow.s5.code2": "Implementing Phase 1 / Step 2: data model.",
      "flow.s5.code3": "User entity + tests added (12 passing).",
      "flow.s5.code4": "Committed: feat(data) — user entity",
      "flow.cta": "Start with one word",

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
      "footer.imprint": "Imprint",
      "footer.privacy": "Privacy notice",

      "skip-link": "Skip to main content",
      "lang.aria": "Language"
    },

    de: {
      "title": "Builder Kit — aus einem Satz wird ein kompletter Projektplan",
      "nav.flow": "So geht's",
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

      "flow.kicker": "So geht's",
      "flow.h2": "Von einem Wort bis zum laufenden Projekt.",
      "flow.subtitle": "Der Wizard ist nur die Eingangstür. Hier ist, was wirklich zwischen „Ich hab eine Idee” und „Claude liefert für mich Code” passiert.",
      "flow.s1.title": "Ein Wort rein.",
      "flow.s1.body": "Du tippst etwas Kurzes — auch nur einen Begriff wie <em>„Training Plan App”</em>. Kein Aufsatz nötig, keine Formulare, kein Fachjargon erwartet.",
      "flow.s1.demo": "Training Plan App",
      "flow.s2.title": "Der Wizard schärft die Idee.",
      "flow.s2.body": "Drei kurze Folge-Fragen: für wen, was soll es besser machen, und falls etwas zu knapp war — dann eine kurze Zusammenfassung. Hast du nur ein Wort getippt, fragt der Wizard kurz nach.",
      "flow.s2.pill1": "📱 Eine App",
      "flow.s2.pill2": "Für berufstätige Eltern",
      "flow.s2.pill3": "Spart Zeit beim Planen",
      "flow.s3.title": "12 Dokumente werden erzeugt.",
      "flow.s3.body": "Vision, Roadmap, Risiken, Architektur, Marketing-Brief, Prompts — alles aufeinander abgestimmt, alles sofort nutzbar. Keine <code>TODO</code>-Platzhalter, keine Lücken.",
      "flow.s3.more": "+ 8 weitere",
      "flow.s4.title": "Du schärfst den Plan mit Claude Code.",
      "flow.s4.body": "Benutz Claude Code — im Browser über dein GitHub-Repo oder im Terminal im entpackten Ordner. Claude Code liest jede Datei im Kit und kann sie direkt bearbeiten. Jede Session bearbeitet einen Teil des Plans — Phase 1 / Schritt 1, dann Schritt 2, dann ein Risiko, das du vertiefen willst. Aus dem Stub wird die echte Spec, mit der dein Projekt läuft.",
      "flow.s4.msg1": "📂 12 Dateien aus deinem Repo geladen",
      "flow.s4.msg2": "Lies MASTERPLAN.md und CLAUDE.md, führ mich durch Phase 1 / Schritt 1.",
      "flow.s4.msg3": "Erste Entscheidung: Verfolgen alle Nutzer den gleichen Plan oder jeder seinen eigenen?",
      "flow.s4.msg4": "Jeder seinen eigenen. Trag das in den Masterplan ein.",
      "flow.s5.title": "Claude baut autonom weiter.",
      "flow.s5.body": "Sobald der Plan steht, arbeitet Claude den Plan ab — schreibt Code, lässt Tests laufen, meldet zurück. Du entscheidest nur noch — nicht mehr Zeile für Zeile. Der Masterplan ist der Vertrag; Claude arbeitet ihn Phase für Phase ab.",
      "flow.s5.code1": "Lese MASTERPLAN.md…",
      "flow.s5.code2": "Implementiere Phase 1 / Schritt 2: Datenmodell.",
      "flow.s5.code3": "User-Entity + Tests hinzugefügt (12 grün).",
      "flow.s5.code4": "Commit: feat(data) — User-Entity",
      "flow.cta": "Starte mit einem Wort",

      "ex.kicker": "Echte Ausgabe",
      "ex.h2": "Das hier kriegst du vom Kit.",
      "ex.subtitle.html": "Ein Auszug aus einer echten <code>MASTERPLAN.md</code> für die Idee <em>„A SaaS dashboard for small business accountants”</em>. Den vollen 12-Datei-Output gibt's auf GitHub.",
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
      "footer.imprint": "Impressum",
      "footer.privacy": "Datenschutz",

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

  // Scroll-reveal for the deep-flow stages. IntersectionObserver-based,
  // adds .is-visible to a stage when it enters the viewport so its
  // animations fire. Idempotent — once a stage is visible, we stop
  // observing it. No-op if there are no stages on the page.
  //
  // Robustness: a 1.5 s fallback timer reveals all stages unconditionally
  // if IO never fires (Samsung Browser edge cases, content-blockers,
  // viewport math glitches on long mobile pages). The user should never
  // see permanently-hidden stages because of a JS hiccup.
  function initFlowReveal() {
    var stages = document.querySelectorAll(".deep-stage");
    if (!stages.length) return;

    function revealAll() {
      for (var i = 0; i < stages.length; i++) stages[i].classList.add("is-visible");
    }

    // Manual initial-viewport check — IntersectionObserver implementations
    // sometimes don't fire their first callback reliably (Samsung Browser,
    // long mobile pages). Reveal anything already visible immediately.
    function isInViewport(el) {
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      return r.bottom > 0 && r.top < vh;
    }
    var alreadyShownCount = 0;
    for (var i = 0; i < stages.length; i++) {
      if (isInViewport(stages[i])) {
        stages[i].classList.add("is-visible");
        alreadyShownCount++;
      }
    }

    // Belt-and-suspenders fallback: if nothing has shown after 1.2s, just
    // reveal everything. Better a non-animated visible page than an
    // invisible one.
    var fallback = setTimeout(revealAll, 1200);

    if (typeof IntersectionObserver === "undefined") {
      clearTimeout(fallback);
      revealAll();
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      var anyHit = false;
      for (var k = 0; k < entries.length; k++) {
        if (entries[k].isIntersecting) {
          entries[k].target.classList.add("is-visible");
          io.unobserve(entries[k].target);
          anyHit = true;
        }
      }
      if (anyHit) clearTimeout(fallback);
    }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });

    for (var j = 0; j < stages.length; j++) {
      // Skip already-revealed stages — no need to observe them.
      if (!stages[j].classList.contains("is-visible")) io.observe(stages[j]);
    }

    // If we already showed some on init, the fallback isn't needed.
    if (alreadyShownCount > 0) clearTimeout(fallback);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFlowReveal);
  } else {
    initFlowReveal();
  }
})();
