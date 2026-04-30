// Tiny client-side i18n — no dependencies, no build step. Auto-detects
// the browser language on first load (German if `navigator.language`
// starts with `de`, English otherwise), persists explicit user choice
// in `localStorage`, applies translations by walking `[data-i18n*]`
// attributes on the document.
//
// Conventions:
//   <h2 data-i18n="wizard.title">Tell me about your idea</h2>
//   <input data-i18n-placeholder="step2.placeholder" placeholder="..." />
//   <button data-i18n-aria-label="...">...</button>
//   <p data-i18n-html="some.key">fallback HTML</p>
//
// The English fallback in the HTML is kept verbatim so that axe-core
// (which doesn't run i18n.js) and any non-JS rendering see real content
// rather than translation keys.

const STRINGS = {
  en: {
    "header.skip": "Skip to main content",
    "header.title": "Claude Code Public Builder Kit",
    "header.tagline": "Turn a one-line project idea into a clean, structured planning foundation: vision, roadmap, acceptance criteria, architecture, prompts.",

    "wizard.title": "Tell me about your idea",
    "wizard.subtitle": "Four short questions. We turn your answers into a complete project plan in 12 files.",

    "wizard.step.what": "What",
    "wizard.step.who": "Who",
    "wizard.step.why": "Why",
    "wizard.step.generate": "Generate",

    "step1.question": "What kind of thing do you want to build?",
    "step1.help": "Pick the one that fits best. You can change your mind later.",
    "step1.app.title": "An app",
    "step1.app.sub": "For phone or tablet",
    "step1.website.title": "A website",
    "step1.website.sub": "Pages people visit",
    "step1.webapp.title": "A web app",
    "step1.webapp.sub": "Tool that runs in the browser",
    "step1.dashboard.title": "A dashboard",
    "step1.dashboard.sub": "Charts, metrics, data views",
    "step1.tool.title": "A tool",
    "step1.tool.sub": "Solves one specific job",
    "step1.ai.title": "An AI assistant",
    "step1.ai.sub": "Chatbot or copilot",
    "step1.service.title": "A service",
    "step1.service.sub": "A repeated offering for customers",
    "step1.api.title": "An API or backend",
    "step1.api.sub": "For other apps to talk to",
    "step1.platform.title": "A platform",
    "step1.platform.sub": "Connects different groups of users",
    "step1.marketplace.title": "A marketplace",
    "step1.marketplace.sub": "Buyers and sellers in one place",
    "step1.community.title": "A community",
    "step1.community.sub": "Forum, group, or social space",
    "step1.game.title": "A game",
    "step1.game.sub": "Video game or playful experience",
    "step1.other.title": "Something else",
    "step1.other.sub": "Describe in your own words",
    "step1.other.label": "Describe what you want to build:",
    "step1.other.placeholder": "e.g. a Slack bot, a browser extension, a CLI tool, a newsletter, a podcast",

    "step2.question": "Who is it for?",
    "step2.help": "In your own words. The clearer you are about the audience, the more useful the kit will be.",
    "step2.placeholder": "e.g. parents of small children, busy restaurant owners, music teachers",
    "step2.nudge.title": "A bit more specific would help.",
    "step2.nudge.body": "Try: \"<em>parents of kindergarten children</em>\", \"<em>working parents with toddlers</em>\", or \"<em>single parents with school-age kids</em>\". The kit can do a lot more for a sharper audience.",
    "step2.pill.smb": "small business owners",
    "step2.pill.parents": "parents and families",
    "step2.pill.students": "students and learners",
    "step2.pill.freelancers": "freelancers and consultants",
    "step2.pill.nonprofit": "non-profit teams",
    "step2.pill.health": "health-conscious adults",

    "step3.question": "What problem should it solve, or what should it do better?",
    "step3.optional": "(optional)",
    "step3.help": "A short phrase is enough. Skip if you're not sure yet.",
    "step3.placeholder": "e.g. helps them organise daily routines, saves time on bookkeeping",
    "step3.nudge.title": "A specific outcome makes a sharper plan.",
    "step3.nudge.body": "Try: \"<em>saves them an hour per week on planning</em>\", \"<em>removes paper notebooks from the kitchen</em>\", or \"<em>turns 10 spreadsheets into one screen</em>\". Or skip — it's optional.",
    "step3.pill.time": "saves them time",
    "step3.pill.simpler": "is simpler than alternatives",
    "step3.pill.cheaper": "costs less than alternatives",
    "step3.pill.no-curve": "works without a learning curve",

    "step4.question": "Here's your idea — does this look right?",
    "step4.help": "If anything is off, go back and edit. Otherwise, generate your kit.",
    "step4.persist": "Save a copy on my computer (local only)",

    "nav.back": "← Back",
    "nav.next": "Next →",
    "nav.generate": "Generate my kit",
    "wizard.skip-prompt": "Already know what to type?",
    "wizard.skip-link": "Switch to direct input",
    "wizard.back-to-wizard": "← Back to guided steps",

    "direct.label": "Your project idea",
    "direct.placeholder": "e.g. I want to build an app for small restaurants",
    "direct.hint.html": "One sentence is enough. The kit infers product type, audience, and domain — you sharpen the rest in <code>MASTERPLAN.md</code>.",
    "direct.persist": "Save a copy on my computer",
    "direct.submit": "Generate kit",

    "result.use.heading": "Use your kit in 3 steps",
    "result.use.subtitle": "No terminal, no install. You only need a free claude.ai account.",
    "result.step1.title": "Download your kit",
    "result.step1.body": "A ZIP file with 12 markdown documents — your project plan, ready to share.",
    "result.step1.btn": "Download ZIP",
    "result.step2.title": "Open Claude",
    "result.step2.body": "Free, no install. Sign in with email or Google.",
    "result.step2.aside": "(ChatGPT works too — same steps.)",
    "result.step2.btn": "Open claude.ai",
    "result.step3.title": "Attach MASTERPLAN.md and paste this prompt",
    "result.step3.body.html": "In Claude, click the paperclip <span class=\"ico-clip\" aria-hidden=\"true\">📎</span> below the chat, attach <code>MASTERPLAN.md</code> from the ZIP, then paste this:",
    "result.step3.copy": "Copy prompt",
    "result.step3.copied": "Copied!",
    "result.step3.copy-failed": "Copy failed",

    "files.summary": "Browse the 12 files (optional)",
    "files.summary-hint": "Open the ZIP for the real thing — this is just a peek.",
    "file-view.copy": "Copy",
    "file-view.copied": "Copied",
    "file-view.copy-failed": "Copy failed",

    "gallery.heading": "Example gallery",
    "gallery.subtitle": "Real kits produced by the same generator. Preview the files, or load an idea into the form to start your own.",
    "gallery.loading": "Loading examples…",
    "gallery.empty": "No examples available.",
    "gallery.error": "Could not load examples: {error}",
    "card.generate-now": "Generate now",
    "card.preview-example": "Preview example",
    "card.use-this-idea": "Use this idea",
    "card.loading": "Loading…",
    "card.generating": "Generating…",
    "card.aria.generate-now": "Generate kit from idea: {idea}",
    "card.aria.preview": "Preview example: {title}",
    "card.aria.use-idea": "Use this idea as input: {idea}",
    "card.meta": "{count} files · slug: {slug}",
    "result.meta": "{type} · for {audience} · in {domain} · slug: {slug}",

    "footer.text.html": "MIT licensed. Generated docs are yours — edit them freely. See <code>CLAUDE.md</code> for how to drive subsequent Claude Code sessions inside a generated kit.",
    "footer.imprint": "Imprint",
    "footer.privacy": "Privacy notice",

    "status.empty": "Enter an idea first.",
    "status.generating": "Generating your kit…",
    "status.generated": "Generated {n} files. Scroll the file list to explore, or download as ZIP.",
    "status.loading-example": "Loading example…",
    "status.loaded-example": "Loaded example: {title}.",
    "status.idea-loaded": "Idea loaded into the form. Click Generate kit to continue.",
    "status.network-error": "Network error.",
    "status.zip-failed": "ZIP download failed.",
    "status.zip-building": "Building ZIP…",
    "status.zip-downloaded": "Downloaded",
    "status.zip-failed-short": "Failed",
    "status.failed-example": "Failed to load example.",
    "status.failed-examples-load": "Failed to load examples.",
    "status.generation-failed": "Generation failed.",

    "label.detected": "Detected: ",
    "label.written-to": "Written to: {path}",
    "label.note": "Note: {message}",
    "label.example-badge": "Example",
    "label.detected.value": "{type} · for {audience} · in {domain}",

    "lang.switcher.aria": "Language",
    "prompt.starter": "I just created a project plan for \"{name}\". Please read the attached MASTERPLAN.md, summarise it back to me in your own words, then walk me through Phase 1 — Step 1 in plain language. Ask me one question at a time if you need more from me before we start."
  },

  de: {
    "header.skip": "Zum Hauptinhalt springen",
    "header.title": "Claude Code Public Builder Kit",
    "header.tagline": "Verwandle eine einzeilige Projektidee in eine saubere, strukturierte Planungsbasis: Vision, Roadmap, Akzeptanzkriterien, Architektur, Prompts.",

    "wizard.title": "Erzähl mir von deiner Idee",
    "wizard.subtitle": "Vier kurze Fragen. Wir machen daraus einen vollständigen Projektplan in 12 Dateien.",

    "wizard.step.what": "Was",
    "wizard.step.who": "Für wen",
    "wizard.step.why": "Wofür",
    "wizard.step.generate": "Erzeugen",

    "step1.question": "Was möchtest du bauen?",
    "step1.help": "Wähl, was am besten passt. Du kannst es später noch ändern.",
    "step1.app.title": "Eine App",
    "step1.app.sub": "Für Handy oder Tablet",
    "step1.website.title": "Eine Website",
    "step1.website.sub": "Seiten, die Leute besuchen",
    "step1.webapp.title": "Eine Web-Anwendung",
    "step1.webapp.sub": "Werkzeug, das im Browser läuft",
    "step1.dashboard.title": "Ein Dashboard",
    "step1.dashboard.sub": "Diagramme, Kennzahlen, Datenansichten",
    "step1.tool.title": "Ein Werkzeug",
    "step1.tool.sub": "Löst eine bestimmte Aufgabe",
    "step1.ai.title": "Ein KI-Assistent",
    "step1.ai.sub": "Chatbot oder Copilot",
    "step1.service.title": "Ein Service",
    "step1.service.sub": "Ein wiederkehrendes Angebot für Kunden",
    "step1.api.title": "Eine API oder Backend",
    "step1.api.sub": "Damit andere Apps damit reden können",
    "step1.platform.title": "Eine Plattform",
    "step1.platform.sub": "Verbindet verschiedene Nutzergruppen",
    "step1.marketplace.title": "Ein Marktplatz",
    "step1.marketplace.sub": "Käufer und Verkäufer an einem Ort",
    "step1.community.title": "Eine Community",
    "step1.community.sub": "Forum, Gruppe oder sozialer Raum",
    "step1.game.title": "Ein Spiel",
    "step1.game.sub": "Videospiel oder spielerische Erfahrung",
    "step1.other.title": "Etwas anderes",
    "step1.other.sub": "In eigenen Worten beschreiben",
    "step1.other.label": "Beschreib, was du bauen möchtest:",
    "step1.other.placeholder": "z.B. ein Slack-Bot, ein Browser-Plugin, ein CLI-Tool, ein Newsletter, ein Podcast",

    "step2.question": "Für wen ist es?",
    "step2.help": "In deinen eigenen Worten. Je klarer die Zielgruppe, desto nützlicher wird das Kit.",
    "step2.placeholder": "z.B. Eltern kleiner Kinder, gestresste Restaurant-Besitzer, Musiklehrerinnen",
    "step2.nudge.title": "Etwas konkreter wäre hilfreich.",
    "step2.nudge.body": "Versuch's mal mit: „<em>Eltern von Kindergartenkindern</em>”, „<em>berufstätige Eltern mit Kleinkindern</em>” oder „<em>Alleinerziehende mit Schulkindern</em>”. Je schärfer die Zielgruppe, desto mehr kann das Kit damit anfangen.",
    "step2.pill.smb": "kleine Unternehmer",
    "step2.pill.parents": "Eltern und Familien",
    "step2.pill.students": "Schüler und Lernende",
    "step2.pill.freelancers": "Freiberufler und Berater",
    "step2.pill.nonprofit": "Vereine und gemeinnützige Teams",
    "step2.pill.health": "gesundheitsbewusste Erwachsene",

    "step3.question": "Welches Problem soll es lösen, oder was soll es besser machen?",
    "step3.optional": "(optional)",
    "step3.help": "Ein kurzer Satz reicht. Lass es leer, wenn du noch unsicher bist.",
    "step3.placeholder": "z.B. hilft beim Organisieren der Tagesabläufe, spart Zeit bei der Buchhaltung",
    "step3.nudge.title": "Ein konkretes Ergebnis macht den Plan schärfer.",
    "step3.nudge.body": "Versuch's mit: „<em>spart eine Stunde pro Woche bei der Planung</em>”, „<em>ersetzt das Notizbuch in der Küche</em>” oder „<em>macht aus 10 Excel-Listen einen Bildschirm</em>”. Oder lass es leer — ist optional.",
    "step3.pill.time": "spart ihnen Zeit",
    "step3.pill.simpler": "ist einfacher als andere Lösungen",
    "step3.pill.cheaper": "ist günstiger als die Konkurrenz",
    "step3.pill.no-curve": "funktioniert ohne lange Einarbeitung",

    "step4.question": "Hier ist deine Idee — passt das so?",
    "step4.help": "Wenn etwas nicht stimmt, geh zurück und ändere es. Sonst los: Kit erzeugen.",
    "step4.persist": "Eine Kopie auf meinem Computer speichern (nur lokal)",

    "nav.back": "← Zurück",
    "nav.next": "Weiter →",
    "nav.generate": "Mein Kit erzeugen",
    "wizard.skip-prompt": "Schon eine konkrete Idee?",
    "wizard.skip-link": "Direkt eingeben",
    "wizard.back-to-wizard": "← Zurück zum Wizard",

    "direct.label": "Deine Projektidee",
    "direct.placeholder": "z.B. Ich möchte eine App für kleine Restaurants bauen",
    "direct.hint.html": "Ein Satz reicht. Das Kit erkennt Produkttyp, Zielgruppe und Bereich — den Rest schärfst du in <code>MASTERPLAN.md</code>.",
    "direct.persist": "Eine Kopie auf meinem Computer speichern",
    "direct.submit": "Kit erzeugen",

    "result.use.heading": "Dein Kit in 3 Schritten nutzen",
    "result.use.subtitle": "Kein Terminal, keine Installation. Du brauchst nur einen kostenlosen claude.ai-Account.",
    "result.step1.title": "Lade dein Kit herunter",
    "result.step1.body": "Eine ZIP-Datei mit 12 Markdown-Dokumenten — dein Projektplan, fertig zum Teilen.",
    "result.step1.btn": "ZIP herunterladen",
    "result.step2.title": "Öffne Claude",
    "result.step2.body": "Kostenlos, keine Installation. Mit E-Mail oder Google anmelden.",
    "result.step2.aside": "(ChatGPT funktioniert genauso — gleiche Schritte.)",
    "result.step2.btn": "claude.ai öffnen",
    "result.step3.title": "MASTERPLAN.md anhängen und diesen Text einfügen",
    "result.step3.body.html": "In Claude unten links auf das Büroklammer-Symbol <span class=\"ico-clip\" aria-hidden=\"true\">📎</span> klicken, <code>MASTERPLAN.md</code> aus dem ZIP auswählen, dann diesen Text einfügen:",
    "result.step3.copy": "Text kopieren",
    "result.step3.copied": "Kopiert!",
    "result.step3.copy-failed": "Kopieren fehlgeschlagen",

    "files.summary": "Die 12 Dateien durchblättern (optional)",
    "files.summary-hint": "Für den echten Inhalt das ZIP öffnen — hier ist nur ein Vorgeschmack.",
    "file-view.copy": "Kopieren",
    "file-view.copied": "Kopiert",
    "file-view.copy-failed": "Fehlgeschlagen",

    "gallery.heading": "Beispiel-Galerie",
    "gallery.subtitle": "Echte Kits, vom selben Generator erzeugt. Vorschau anschauen oder eine Idee in das Formular laden.",
    "gallery.loading": "Lade Beispiele…",
    "gallery.empty": "Keine Beispiele verfügbar.",
    "gallery.error": "Beispiele konnten nicht geladen werden: {error}",
    "card.generate-now": "Jetzt erzeugen",
    "card.preview-example": "Vorschau",
    "card.use-this-idea": "Diese Idee benutzen",
    "card.loading": "Lade…",
    "card.generating": "Erzeuge…",
    "card.aria.generate-now": "Kit aus dieser Idee erzeugen: {idea}",
    "card.aria.preview": "Beispiel-Vorschau: {title}",
    "card.aria.use-idea": "Diese Idee als Eingabe verwenden: {idea}",
    "card.meta": "{count} Dateien · Slug: {slug}",
    "result.meta": "{type} · für {audience} · im Bereich {domain} · Slug: {slug}",

    "footer.text.html": "MIT-lizenziert. Die erzeugten Dokumente gehören dir — ändere sie nach Belieben. <code>CLAUDE.md</code> erklärt, wie du folgende Claude-Code-Sessions in einem erzeugten Kit steuerst.",
    "footer.imprint": "Impressum",
    "footer.privacy": "Datenschutz",

    "status.empty": "Bitte zuerst eine Idee eingeben.",
    "status.generating": "Erzeuge dein Kit…",
    "status.generated": "{n} Dateien erzeugt. Scrolle durch die Liste oder lade als ZIP herunter.",
    "status.loading-example": "Lade Beispiel…",
    "status.loaded-example": "Beispiel geladen: {title}.",
    "status.idea-loaded": "Idee in das Feld geladen. Auf Kit erzeugen klicken, um fortzufahren.",
    "status.network-error": "Netzwerkfehler.",
    "status.zip-failed": "ZIP-Download fehlgeschlagen.",
    "status.zip-building": "Erstelle ZIP…",
    "status.zip-downloaded": "Heruntergeladen",
    "status.zip-failed-short": "Fehlgeschlagen",
    "status.failed-example": "Beispiel konnte nicht geladen werden.",
    "status.failed-examples-load": "Beispiele konnten nicht geladen werden.",
    "status.generation-failed": "Erzeugung fehlgeschlagen.",

    "label.detected": "Erkannt: ",
    "label.written-to": "Geschrieben nach: {path}",
    "label.note": "Hinweis: {message}",
    "label.example-badge": "Beispiel",
    "label.detected.value": "{type} · für {audience} · im Bereich {domain}",

    "lang.switcher.aria": "Sprache",
    "prompt.starter": "Ich habe gerade einen Projektplan für \"{name}\" erstellt. Bitte lies die angehängte MASTERPLAN.md, fasse sie in deinen eigenen Worten zusammen, und führe mich dann Schritt für Schritt durch Phase 1 — Schritt 1 in einfacher Sprache. Stell mir bitte eine Frage nach der anderen, falls du noch Informationen von mir brauchst, bevor wir starten."
  }
};

const STORAGE_KEY = "bk-lang";

function detectLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "de") return stored;
  } catch { /* SSR / privacy mode — fall through */ }
  const nav = (typeof navigator !== "undefined" && navigator.language ? navigator.language : "en").toLowerCase();
  return nav.startsWith("de") ? "de" : "en";
}

let currentLocale = detectLocale();

export function getLocale() {
  return currentLocale;
}

export function t(key, vars) {
  const dict = STRINGS[currentLocale] ?? STRINGS.en;
  let s = dict[key] ?? STRINGS.en[key] ?? key;
  if (vars && typeof s === "string") {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

export function setLocale(lang) {
  if (lang !== "en" && lang !== "de") return;
  currentLocale = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  applyTranslations();
  notifySubscribers();
}

const subscribers = new Set();
export function onLocaleChange(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
function notifySubscribers() {
  for (const fn of subscribers) {
    try { fn(currentLocale); } catch { /* ignore subscriber errors */ }
  }
}

export function applyTranslations(root = document) {
  // Update <html lang="...">
  if (root.documentElement) root.documentElement.lang = currentLocale;
  // textContent
  for (const el of root.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.getAttribute("data-i18n"));
  }
  // innerHTML (for keys carrying inline tags)
  for (const el of root.querySelectorAll("[data-i18n-html]")) {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  }
  // Common attribute targets
  for (const attr of ["placeholder", "aria-label", "title", "value"]) {
    const dataAttr = `data-i18n-${attr}`;
    for (const el of root.querySelectorAll(`[${dataAttr}]`)) {
      el.setAttribute(attr, t(el.getAttribute(dataAttr)));
    }
  }
  // Switcher buttons reflect active state
  for (const btn of root.querySelectorAll("[data-lang-set]")) {
    const lang = btn.getAttribute("data-lang-set");
    btn.setAttribute("aria-pressed", lang === currentLocale ? "true" : "false");
  }
}

// Hook the switcher buttons globally so HTML doesn't need its own JS.
// Apply translations as soon as the DOM is ready — defending against any
// caller that forgets to call applyTranslations() on its own. Idempotent.
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.("[data-lang-set]");
    if (btn) {
      e.preventDefault();
      setLocale(btn.getAttribute("data-lang-set"));
    }
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => applyTranslations());
  } else {
    applyTranslations();
  }
}
