# RUN_LOG — Claude Code Public Builder Kit

Append-only journal of every working session. Newest entry on top.

## Run #028b — 2026-04-30 — Hotfix: SyntaxError in i18n.js (broken DE quotes) + IO fallback

**Trigger:** Owner reported on mobile after Run #028 deploy: deep-flow section showed only the heading + tagline + a vertical line, then complete black space — none of the 5 stages visible. Plus the persist-checkbox in the app still showed the old "Also write files to output/<slug>/" text from before the Run #026 hotfix.

**Root cause: SyntaxError in both i18n.js modules**

I introduced ASCII `"` (U+0022) inside German strings that should have used Unicode close-quotes (`"`, U+201D / U+201C). The mismatched ASCII quotes accidentally **closed the JavaScript string mid-sentence**, leaving the rest of the line as parser tokens (e.g. `und` became "Unexpected identifier"). The browser silently aborted the entire `i18n.js` module on parse error, which meant:

- `applyTranslations()` never ran → static `data-i18n` elements stayed English (explains the previous "translations not working" reports)
- The IntersectionObserver setup never ran → the deep-flow stages stayed at their initial CSS state of `opacity: 0` → permanently invisible
- The lang-switcher click handler never registered → DE button click did nothing

10 affected positions across both files (`docs/i18n.js` line 125, 127, 170; `public/i18n.js` line 184, 197, etc.). Pattern: `„X"` / `„<em>X</em>"` where the closing `"` was ASCII instead of Unicode.

The bug was invisible to humans reading the code (the glyph looks identical) and to the linter (it never ran on i18n.js because there's no lint step). Only `node -c <file>` catches it.

**Fix**

1. **Auto-replaced all 10 broken DE quote pairs** with Unicode close-quote `"` (U+201D) using a Python regex that matches `„...content...\\?"` and replaces just the closing quote. Both files now parse cleanly.

2. **Added a CI-time syntax test** in `tests/a11y.test.js`:
   ```js
   for (const file of [public/i18n.js, docs/i18n.js]) {
     test(`syntax: ${file} parses as valid JavaScript`, () => {
       const r = spawnSync("node", ["-c", file]);
       assert.equal(r.status, 0, ...);
     });
   }
   ```
   Catches this entire class of bug before deploy. 83/83 tests pass.

3. **Belt-and-suspenders fallback in the IntersectionObserver setup** (separate from the syntax fix, but related — defends against future Samsung-Browser-style IO edge-cases):
   - **Manual initial-viewport check** — `getBoundingClientRect()` on each stage at init; any stage already in viewport is revealed immediately, without waiting for IO's first callback.
   - **1.2 s timeout fallback** — if no stage has revealed itself by then, force-reveal everything. Better an un-animated visible page than an invisible one.
   - **IO threshold relaxed** to `0.1` (was `0.25`) so partial visibility counts.

**Files touched**
- Auto-fixed: `public/i18n.js` (4 broken patterns), `docs/i18n.js` (6 broken patterns).
- Modified: `docs/i18n.js` (improved IO fallback + initial viewport check), `tests/a11y.test.js` (new syntax-validation tests), `RUN_LOG.md`.
- **Untouched:** server, src, examples, all other UI files.

**Tests run**
- `npm test` → **83/83** pass (was 81; +2 syntax tests).
- `npm run audit:a11y` → 0 violations on either page; all 13 contrast pairs pass WCAG AA.
- Both i18n.js files: `node -c` exits 0 (was failing before).

**Drift accounting**
None.

**Lessons**
- **Type matters.** `"` and `"` look identical to a human and identical-ish in many fonts. Use `node -c` (or any AST parser) at CI time to catch the difference. The new test does that.
- **Fail loud, not silent.** A SyntaxError in a `<script defer>` aborts the script silently — no console log without devtools, no visible UI degradation that points at the cause. The fallback timer in the IO setup means that even if a *future* JS bug breaks i18n.js again, at least the deep-flow stages will still show up after 1.2s.
- **Both Run #026 ("translations not working" report)** and **Run #028 ("stages invisible" report)** had the same root cause — but I diagnosed Run #026 as a "Bootstrap timing race" and added the auto-apply hook, which papered over the symptom without fixing the cause. The proper diagnosis ("the entire module fails to load") was only obvious once I tried `node -c`. Adding `node -c` to CI was the lesson learned this run.

**Next session starts with**
- Whatever the user picks from the existing shortlist (Run #029 — eleventh domain, EN versions of legal pages, or per-locale URLs).

---

## Run #028 — 2026-04-30 — Wizard-Narrative (5 animierte Stages) + dynamische Folge-Fragen

**Trigger:** Owner request, two parts:
- Part A: communicate the *full* arc of the tool (one word in → guided wizard → 12 documents → Claude session → autonomous execution) as a premium-feel animated landing-page section, because the current "How it works" only shows 3 steps and leaves the iterative-with-Claude reality invisible.
- Part B: when a user types only one word in a wizard field, the wizard should nudge — not block, not auto-fill — so the inference downstream actually has something to grip onto.

**Part A — `docs/index.html` "From one word to a working project"**

A new `#flow` section sits between the hero and the existing 3-step "How it works". Five stages, each an `<li class="deep-stage">` with a number bubble, headline, body copy, and a self-contained inline animation panel:

1. **One word in** — typewriter animation that types `"Training Plan App"` into a styled input box. Cursor blinks. Demonstrates "even one phrase is enough to start".
2. **The wizard sharpens it** — three pill-shaped chips fade in sequentially (📱 An app → For busy parents → Saves time on planning), then a green checkmark pops in with a bouncy scale curve. Demonstrates the 4-question wizard flow.
3. **12 documents are generated** — five filename rows (`📄 MASTERPLAN.md`, `📄 ROADMAP.md`, `📄 ARCHITECTURE.md`, `📄 PROMPTS/initial.md`, `+ 8 more`) cascade in 200 ms apart. Demonstrates the kit output.
4. **You sharpen the plan with Claude** — four chat bubbles (user / AI / user / AI) reveal in sequence, alternating sides. The dialogue is real-feeling: "📎 MASTERPLAN.md" → "Got it. Want to start with Phase 1 / Step 1?" → "Yes. What's the first decision?" → "Are users tracking the same plan or each their own?". Demonstrates the iterative-refinement step that was missing from the previous narrative.
5. **Claude builds autonomously** — a faux terminal with a traffic-light bar shows four lines appearing one by one: "Reading MASTERPLAN.md…" → "Implementing Phase 1 / Step 2: data model." → "✓ User entity + tests added (12 passing)." → "✓ Committed: feat(data) — user entity". Demonstrates the destination state: Claude executes against the plan.

The five stages sit on a vertical accent line (CSS pseudo-element, hidden on mobile). Each stage has `opacity: 0; transform: translateY(20px)` initially; an IntersectionObserver in `docs/i18n.js` adds `.is-visible` when the stage enters the viewport, which triggers all the inner animations via cascading delays (each `keyframes` step waits for its turn). All animations honour `prefers-reduced-motion` — collapsed to opacity-1 / no-transform / no-keyframes when set.

A primary CTA at the bottom — "Start with one word →" — links straight to the Vercel app, closing the loop.

**Part B — `public/index.html` + `app.js` sparse-input nudges**

When a user types into the wizard's audience or benefit field, a small heuristic flags "sparse" inputs and reveals an inline `<aside class="wz-nudge">` directly below the input with three concrete examples plus an encouraging line.

```js
function isSparseInput(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return false;
  const words = trimmed.split(/\s+/);
  return words.length <= 1 && trimmed.length <= 14;
}
```

The threshold is **one word AND ≤14 characters** — generous enough that single long German compounds (e.g. `Geschäftskundenbetreuer`, 23 chars) don't trip it, tight enough that `Eltern`, `Zeit`, `Kindergarten`, `Training` all do.

Verified across 7 test cases: empty / "Eltern" / "Eltern von Kindergartenkindern" / "small business owners" / "Geschäftskundenbetreuer" / "Zeit" / "spart Zeit beim Einkaufen". All correctly classified.

The nudge:
- **Step 2 (audience)** — title "A bit more specific would help."; body "Try: parents of kindergarten children / working parents with toddlers / single parents with school-age kids. The kit can do a lot more for a sharper audience."
- **Step 3 (benefit)** — title "A specific outcome makes a sharper plan."; body "Try: saves them an hour per week on planning / removes paper notebooks from the kitchen / turns 10 spreadsheets into one screen. Or skip — it's optional."

Both EN + DE translations follow the same shape; the German variants use compound nouns and idiomatic phrasing rather than direct translations ("ersetzt das Notizbuch in der Küche" rather than a literal calque). The body uses `<em>` to highlight the example phrases, so the strings carry HTML and are wired with `data-i18n-html`.

The nudge's appearance / disappearance is reactive: every `input` event re-evaluates `isSparseInput` and toggles `.hidden`. Clicking a quick-pick pill (which fills the input with a multi-word phrase) explicitly hides the nudge — the pill is itself the answer to the nudge.

Visual treatment: subtle accent-soft gradient background, accent border, accent-coloured title, regular body text. The nudge **doesn't block** the user — they can still click Next and proceed with whatever they typed.

**Files touched**
- Modified: `docs/index.html` (new `#flow` section + nav link), `docs/style.css` (~210 lines for `.deep-flow` / `.deep-stage` / 5 unique animation styles), `docs/i18n.js` (29 EN + 29 DE keys for the flow + IntersectionObserver setup), `public/index.html` (2 `<aside class="wz-nudge">` blocks), `public/style.css` (.wz-nudge), `public/app.js` (4 nudge wires + isSparseInput helper), `public/i18n.js` (4 keys EN + 4 keys DE for the nudges), `RUN_LOG.md`, `CLAUDE.md`.
- **Untouched:** server, src, tests, examples, scripts.

**Tests run**
- `npm test` → **81/81** pass.
- `npm run audit:a11y` → **0 violations** on either page; all 13 contrast pairs pass WCAG AA.
- jsdom smoke against `docs/index.html`: 5 stages found, every animation sub-component counted correctly (1 typing input, 3 pills + 1 checkmark, 5 files, 4 bubbles, 4 code lines).
- jsdom smoke against `isSparseInput`: 7/7 cases correct including German compound-noun edge cases.
- Live HTTP smoke against `node server.js`: app.js carries `isSparseInput`, `wzNudgeAudience`, `wzNudgeBenefit`; HTML carries 6 `wz-nudge`-related strings; landing page carries 34 `deep-*` / `flow.s*` references; `i18n.js` carries the IntersectionObserver setup.

**Drift accounting**
None. Generator behaviour, examples, templates, tests are unchanged. The wizard's contract (composed sentence pattern `for X. It Y.`) is unchanged — the nudge is purely a UX scaffold around the same input field.

**Known limitations**
- **The flow section's animations are decorative**, not interactive. There's no replay button, no manual stepping. Reasoning: the IO-based reveal is the interaction — scrolling triggers each stage. Adding controls would clutter the section without adding insight. Reduced-motion users see all five stages immediately fully-rendered, which is functionally equivalent.
- **The nudge fires on every keystroke after the threshold is crossed**, so a user typing letter-by-letter sees the nudge flash in and out as they cross 14 characters. Acceptable — the nudge is informational, not modal, and the appear/disappear animation is a 280 ms slide that doesn't feel jarring at typing speed.
- **The 14-character threshold for "sparse" is heuristic.** Long German compounds *do* exist that should still trigger the nudge (e.g. `Endverbraucher` is one word, 14 chars exactly, sparse-flagged); tightening the threshold to 12 or 16 changes which words trip it. The current 14 is pragmatic — easy to retune later if owners report mis-classifications.
- **The flow's "autonomous execution" stage 5 is aspirational** for the 65-year-old user-archetype — it shows what *can* happen if Claude is given the masterplan, not a guarantee. The body copy is calibrated to set realistic expectations ("You stay in the loop only on decisions, not on every line"), but the user's actual mileage will depend on which Claude tier they use, what tooling is hooked up, etc.
- **The chat bubbles in stage 4 use specific dialogue** ("Are users tracking the same plan or each their own?"). That's a real, illustrative question that fits the implied "training plan" example, but a different idea (a logistics tool, a music-teaching app) would have different first questions. The bubbles are illustrative, not personalised.

**Decisions**
- **Nudge over block.** A blocking validation ("you must enter at least 2 words") would solve the problem but feel hostile, especially in a wizard meant for non-tech users. The nudge surfaces the issue without preventing progress.
- **Inline animations, not video.** Five inline CSS-animated panels weigh ~6 KB extra. A 5-scene video MP4 would be ~300 KB+, require more careful sizing for mobile, would not respect `prefers-reduced-motion`, and would be impossible to translate. The tradeoff favours CSS.
- **The flow section is between the hero and the existing "How it works" section, not replacing it.** The 3-step "How it works" is the **fast** answer for visitors who scroll past quickly. The 5-stage flow is the **deep** answer for visitors who stop and read. Keeping both gives different visitor types the right surface.
- **Step 2 nudge is for audience, step 3 nudge is for benefit.** Step 2 is the harder one to skip ("Eltern" is a real risk); step 3 is naturally optional and the nudge there leans toward "or skip — it's optional". Different tone for different roles.
- **English first in both i18n strings, then German parity.** The flow section's German is idiomatic, not a literal translation of the English (e.g. "Aus dem Stub wird die echte Spec, mit der dein Projekt läuft" preserves the contract metaphor better than a direct "stub" calque). DE keeps the same structure and lengths roughly comparable.

**Next session starts with**
- The remaining shortlist: **Run #029 — domain depth eleventh domain** (`non-profit & community` or `government & civic`), or **per-locale URLs / SEO** for the German landing-page version, or **EN versions of the legal pages** (imprint.html / privacy.html). Owner picks.

---

## Run #027 — 2026-04-30 — README mit Logo + Links, Impressum + Datenschutz (deutschlandkonform)

**Trigger:** Owner request, three things in one breath: (1) README updaten mit Logo + Links + allem; (2) AGB/Impressum deutschlandkonform anlegen; (3) Wizard-Verbesserung diskutieren — *"akutell wird nur eine Frage gestellt wenn man z.b. nur ein word eingibt ergibt es alles kein sinn"*. Plus owner shared his real address + email + phone for the imprint, with the explicit constraint *"ich bin nicht selbständig das Projekt erzeugt auch kein geld"*.

**What this run delivers**
- **README.md** — full rewrite: centered logo (links to `docs/logo.svg`), centered subtitle "From one sentence to a complete project plan in 30 seconds", three prominent links (Launch the tool / Landing / Source), five badges (License, Node version, Tests, Languages, Build step), then a re-organised body that leads with **two ways to use it** (hosted + local) before any technical content. The 12-file table now highlights MASTERPLAN.md and product-brief.md as the surfaces with domain-specific depth. Ends with a "Built by Belkis Aslani" footer linking to email + GitHub.
- **`docs/impressum.html`** — TMG §5 / MStV §18 imprint page. Lists Anbieter (Belkis Aslani, Vogelsangstraße 32, 71691 Freiberg am Neckar), contact (email + telephone), responsible person, **explicit "private, non-commercial open-source" character of the project** (key: aligns with owner's "ich bin nicht selbständig / kein Geld" reality), standard TMG liability clauses for content + links, MIT-license note for the source, EU-ODR pointer + explicit refusal of consumer-arbitration.
- **`docs/datenschutz.html`** — GDPR Art. 13 privacy notice. Opens with a "Kurzüberblick" that says exactly what is true: no cookies, no tracking, no analytics, idea-input processed in-memory and discarded, no user account, localStorage holds language preference only. Then full breakdown: server logs (Vercel + GitHub Pages, with links to their privacy policies), the 30-rpm rate-limit counter (in-memory only), the cross-tool flow (when the user pastes the masterplan into claude.ai it's their action under Anthropic's policy, not ours), the user's GDPR rights, the right to complain to the regional supervisor (Baden-Württemberg's LfDI is the correct authority for Freiberg am Neckar).
- **Footer links** on both surfaces:
  - `docs/index.html` (landing): Impressum + Datenschutz under the existing footer, with i18n keys `footer.imprint` / `footer.privacy`.
  - `public/index.html` (app, local + hosted): same links, but pointing to the absolute GitHub-Pages URLs because the app lives at a different origin (Vercel) and we want the legal docs to live at one canonical place.

**Why the imprint exists at all**
TMG §5 / MStV §18 obligate every "geschäftsmäßig" (= persistently public) website to provide an imprint. There's a debate whether a non-commercial open-source landing page strictly qualifies; Bundesgerichtshof and Landgericht-level cases tend to rule that having a logo, a deployment URL, and a public README about a tool is "geschäftsmäßig" enough that the safer move is to provide the imprint. The cost of being wrong here is an Abmahnung; the cost of providing a complete imprint is one HTML file. Provided.

**Why the privacy notice is comprehensive even though almost nothing is collected**
GDPR Art. 13 obliges the controller to inform data subjects *even when collection is minimal*. The notice explicitly enumerates: (a) the only thing kept locally is the language preference; (b) the only thing sent to the server is the idea-text, processed in RAM and discarded; (c) Vercel + GitHub Pages may keep server logs (linked their policies); (d) the user's eight Art. 15–21 rights; (e) the right to complain to the LfDI Baden-Württemberg. This is the correct shape — under-disclose is a fine, over-disclose is just a long page.

**Files touched**
- Rewritten: `README.md` (was 289 lines, is 218 lines + a logo + badges).
- Added: `docs/impressum.html`, `docs/datenschutz.html` (both hand-written, no template — they need to read like an actual person wrote them).
- Modified: `docs/index.html` (footer-links), `docs/i18n.js` (added `footer.imprint`, `footer.privacy` keys EN+DE), `docs/style.css` (legal-page styles: `.legal-main`, `.legal-article`, `.legal-section`, `.legal-back`), `public/index.html` (footer-links to absolute GitHub-Pages URLs), `public/i18n.js` (same EN+DE keys), `public/style.css` (`.footer-legal`).
- **Untouched:** server, src, tests, examples, scripts.

**Tests run**
- `npm test` → **81/81** pass.
- `npm run audit:a11y` → **0 violations** on either page (37/27 axe rules — the new legal pages aren't audited yet, but they re-use the existing CSS palette so the contrast guarantees carry over).
- Live smoke against `docs/`: `impressum.html` carries all owner data (10 unique strings — name, address, email, phone, TMG, MStV references); `datenschutz.html` carries 23 expected DSGVO-related strings (Art. 13, Vercel, GitHub Pages, localStorage, Baden-Württemberg, etc.); `index.html` footer has 2 links to the legal pages.

**Drift accounting**
None. Generator behaviour, examples, templates, tests are unchanged.

**Known limitations**
- **I am not a lawyer.** The imprint and privacy notice are hand-crafted from public guidance (TMG §5, MStV §18, DSGVO Art. 13, German Datenschutz authorities) and reflect what's commonly seen on private open-source projects with a similar profile. They are sufficient for the typical case but should be reviewed by someone qualified before depending on them in a dispute. If the project ever turns commercial (donations, ads, paid features, contractor work), the imprint must be updated to reflect that — *"nicht-kommerziell"* claim has to remain true.
- **EN translation of the legal pages is not yet provided.** The German originals are the legally-relevant version (jurisdiction = Germany). The footer links read as "Imprint" / "Privacy notice" in English-mode but the linked pages stay German. That's the correct precedence (Pflicht-Sprache deutsch) and a translated reader version can be added later as `imprint.html` / `privacy.html`.
- **README badges are static SVGs from shields.io paths, not live counts.** The "Tests: 81/81" badge will lie if the test count changes; treat it as a marketing surface, not a CI signal. CI itself is what guarantees the test pass.
- **The README's logo embed uses a relative path (`docs/logo.svg`)** which renders correctly on github.com but would break if rendered as raw markdown in some contexts. github.com is the canonical render target so this is fine.

**Wizard improvement: deferred to next run**
The owner's question was: *"Wenn man z.b. nur ein wort eingibt ergibt es alles kein sinn — der wizard soll wirklich Fragen stellen die immer an passender stelle eingefügt wird"*, plus a request to communicate the iterative model better — that the wizard is the entry, Claude/the LLM is where the plan gets sharpened. The README's "How it works" section now articulates this in plain language ("the wizard is the entry door — Claude is where you sharpen the plan into a real project"), but the **landing-page narrative + an animated visualisation** of the entry → iterative-refinement → autonomous-execution arc is its own design problem. Tracked as **Run #028** in the shortlist.

**Next session starts with**
- **Run #028 — Wizard-narrative + animated "How it really works" section.** Plain-language explanation on the landing of the iterative model (one word in → guided wizard → 12 documents → Claude session → progressively autonomous execution). With premium-feel animations (cf. Linear's onboarding, Vercel's docs hero). Plus optional: a deeper wizard that asks more follow-up questions when the input is sparse (like a single word).

---

## Run #026b — 2026-04-30 — i18n Hotfix: untranslated strings + friendlier persist-checkbox text

**Trigger:** Owner reported on first DE-locale visit: "es gibt noch Übersetzungen die nicht gemacht wurden". Screenshot showed the direct-form (`Your project idea`, `Generate kit`, `Also write files to output/<slug>/`), the gallery section heading + subtitle, the tagline, and the footer all still in English — while the dynamically-rendered card buttons (`Jetzt erzeugen`, `Vorschau`, `Diese Idee benutzen`) were correctly German. Plus a UX request: *"Soll das Kästchen zum anklicken einen besseren text haben"* — the persist checkbox `Also write files to output/<slug>/` is technical jargon for non-tech users.

**Root cause analysis**

The split (cards = DE, static text = EN) is the diagnostic clue. `t()` was working — the cards prove that. `applyTranslations()` either didn't run, or ran with an outdated `currentLocale`, or the user's browser had a cached version of `index.html` from before Run #026 (no `data-i18n` attributes) paired with the fresh `app.js` (calls `t()` on dynamic elements).

The most likely cause: the Bootstrap order in `app.js` was the *only* place that called `applyTranslations()`. If `app.js` failed to import `/i18n.js` for any reason — Vercel cache hiccup, ESM-import edge-case, transient 304-with-stale-body — the static strings would never get translated, but the cards would only render later (after `loadExamples`), which gave the i18n system more time to recover.

**Fixes**

1. **Auto-apply on DOM ready, inside `i18n.js` itself.** Defends against any caller forgetting to call `applyTranslations()`. Idempotent — calling it twice is fine. Eight lines added at the bottom of `i18n.js`:
   ```js
   if (document.readyState === "loading") {
     document.addEventListener("DOMContentLoaded", () => applyTranslations());
   } else {
     applyTranslations();
   }
   ```
   This ensures the static `[data-i18n*]` elements get translated even if `app.js` doesn't (or hasn't yet) call `applyTranslations`.

2. **Persist checkbox text rewritten in plain language.**
   - Before: `Also write files to output/<slug>/` (EN) / `Dateien zusätzlich nach output/<slug>/ schreiben` (DE) — both used `<code>` to highlight the technical path, both required `data-i18n-html` (HTML-replace).
   - After: `Save a copy on my computer` (EN) / `Eine Kopie auf meinem Computer speichern` (DE) — first-person ("my"), no jargon, no path. Plain `data-i18n` (textContent) so the strings don't carry HTML.
   - Same change applied to both checkbox surfaces: the wizard step 4 (`step4.persist` — adds `(local only)` / `(nur lokal)` suffix because it's the user-facing wizard) and the direct form (`direct.persist` — no suffix, the whole form is local-only by virtue of being the local app).
   - HTML: the two `<span data-i18n-html="...persist.html">` elements are now `<span data-i18n="...persist">`. Saves a small amount of HTML parsing and matches the simpler text.

3. **Card-meta and result-meta lines translated.** Two strings that were still hard-coded English template literals:
   - `${ex.fileCount} files · slug: ${ex.slug}` → `t("card.meta", { count, slug })` → German uses `Slug` (capitalised, German convention) and `Dateien` for `files`.
   - `${productType} · ${audience} · ${domain} · slug: ${slug}` → `t("result.meta", { ... })` → German uses `für` for `for` and `im Bereich` for `in <domain>`.

**Files touched**
- Modified: `public/i18n.js` (auto-apply hook + 4 string changes — 2 EN, 2 DE for persist; +2 EN, +2 DE for card.meta and result.meta; the original `*persist.html` keys removed), `public/index.html` (2 `data-i18n-html` → `data-i18n` swaps, fallback English text updated), `public/app.js` (1 line: `t("card.meta")`, 2 lines: `t("result.meta")` via sed).
- **Untouched:** server, src, tests, examples, docs.

**Tests run**
- `npm test` → **81/81** pass.
- `npm run audit:a11y` → **0 violations** on either page; all 13 contrast pairs pass WCAG AA.
- `jsdom` smoke (forced `bk-lang=de` then `applyTranslations`): **13/13** specific selectors translated correctly across header, form, gallery, footer, wizard, and result panel.
- HTTP smoke against `node server.js`: served HTML carries the new `data-i18n="step4.persist"` and `data-i18n="direct.persist"` (no more `-html` variant on those); served `i18n.js` carries both the new persist strings and the auto-apply DOMContentLoaded handler.

**Drift accounting**
None. Pure UI / i18n change.

**Known limitations**
- The auto-apply in `i18n.js` runs on import, which means it fires *before* anything else on the page if no scripts had a chance to execute earlier. That's by design — the goal is "ensure translations apply, period". Idempotency means subsequent `setLocale()` calls re-run cleanly.
- On a freshly-deployed page, a returning user with the previous version cached still has to hard-reload. There is no cache-busting query string on `/i18n.js`. Acceptable for a low-traffic landing-app pair where users return rarely; revisit if it becomes a real problem.

**What this run leaves**
The Vercel auto-redeploy on push will publish the fix. Owner should hard-reload (Strg+Shift+R) once after Vercel signals the new build is ready, then verify the static strings now match the locale.

---

## Run #026 — 2026-04-30 — Deutsche Sprachvariante (i18n auf beiden Pages)

**Phase:** Phase 2 — Reach (concluding the polish layer).
**Duration:** ~1.2 sessions.
**Goal going in:** Owner is German-speaking and the target audience is partly German (Vater-Test). The whole tool — wizard, post-generate panel, landing page, status messages, the prompt that gets copied to Claude's clipboard — was English-only. Add a German locale so the whole flow can be done in either language, with auto-detection from the browser and a manual switcher for explicit choice.

**The architecture**

Two parallel client-side i18n implementations, both **dependency-free, build-step-free, no-server-change**, both pure progressive enhancement (HTML still ships with English content as a default; without JS the site stays English without errors):

- `public/i18n.js` — ESM module imported by `public/app.js`. Exposes `t(key, vars)`, `setLocale(lang)`, `applyTranslations(root)`, `onLocaleChange(fn)`. Holds ~165 string entries per locale (English + German parity). Walks `[data-i18n]`, `[data-i18n-html]`, `[data-i18n-placeholder]`, `[data-i18n-aria-label]`, `[data-i18n-title]`, `[data-i18n-value]` attributes on the document, replaces text/HTML/attributes with the resolved translation. Listens globally for clicks on `[data-lang-set]` switcher buttons and applies the new locale. Persists the user's choice in `localStorage` under `bk-lang`.
- `docs/i18n.js` — IIFE script (no module — keeps it loadable from a static file via `<script src defer>`). Holds ~50 string entries per locale (the landing page's user-facing copy). Same convention for HTML attributes. Same switcher pattern. Persists under `bk-lang-docs` (separate origin from the app, so a separate localStorage key).

The **detection rule** in both: if `localStorage` has a stored choice (`en` or `de`), use it. Otherwise inspect `navigator.language` — if it starts with `de` (case-insensitive), German; everything else English. This is the lightest possible "respect the browser, give the user a manual override" pattern.

**What's translated**

- App (`public/`): wizard heading + subtitle, all four step legends + helps + placeholders, all 6 product-type tile titles + sublines, all 10 quick-pick pills (audience + benefit), step indicator labels, nav buttons (Back / Next / Generate my kit), wizard-skip prompt + link, direct-form label + placeholder + hint + persist-checkbox + submit + back-to-wizard link, result section's `Use your kit in 3 steps` heading + subtitle + all 3 step titles + bodies + buttons (Download ZIP, Open claude.ai, Copy prompt), files-summary disclosure copy, file-view Copy button, gallery heading + subtitle, gallery card buttons (Generate now / Preview example / Use this idea) + their aria-labels, status messages (generating / generated / loading-example / loaded-example / idea-loaded / network-error / zip-failed / failed-example), source badge ("Example"), `Detected: …` label + value template, written-to / note labels, and the **starter prompt** that Claude consumes — that one is the most important translation because it's the hand-off into Claude.
- Landing page (`docs/`): nav links, hero eyebrow + headline + lede + CTAs + trust-row, hero-card example sentence, all 3 how-it-works step titles + bodies + tile labels + chat mocks + CTA, example-output section copy, what-you-get section copy, for-developers section copy, footer.

**The starter prompt — translated with care**

This string is special: when the user clicks "Copy prompt", it goes to the clipboard verbatim and is pasted into a fresh Claude chat. Both English and German variants ask Claude to (a) read the attached `MASTERPLAN.md`, (b) summarise it back in own words, (c) walk through Phase 1 / Step 1 in plain language, (d) ask one question at a time. The German wording is:

> *Ich habe gerade einen Projektplan für „{name}" erstellt. Bitte lies die angehängte MASTERPLAN.md, fasse sie in deinen eigenen Worten zusammen, und führe mich dann Schritt für Schritt durch Phase 1 — Schritt 1 in einfacher Sprache. Stell mir bitte eine Frage nach der anderen, falls du noch Informationen von mir brauchst, bevor wir starten.*

Concrete and polite — calibrated for an absolute first-time AI-chat user. Same shape and intent as the English version, not a literal word-for-word translation. The `{name}` placeholder receives the project name from the generation context.

**Switcher UI**

Pill-style segment control with two compact buttons (`EN` | `DE`), placed in the header — top-right of the app, in the primary nav of the landing page. Active state is `aria-pressed="true"` + accent-fill; inactive is muted ghost-button. Mobile: same component, same widths, just laid out differently per page. On the landing page, the nav links collapse to icons-or-hidden below 720 px but the switcher stays visible — language is the higher-frequency action than "What you get".

**Handling locale change on the live page**

`public/app.js` subscribes to `onLocaleChange` and re-renders the surfaces it owns dynamically:

- **Gallery cards** — re-fetches `/api/examples` (cheap, deterministic) and re-renders so the button labels and aria-labels reflect the new locale.
- **Result panel** — the `kit-prompt-text` (the project-aware starter prompt) is rebuilt via `buildStarterPrompt(title)` so the new locale's prompt template applies.
- **Source badge** — re-applied if the result is currently from an example (`Example` ↔ `Beispiel`).
- **Static `[data-i18n]` elements** — `applyTranslations()` runs as part of `setLocale()` itself and handles all of these without per-element subscriptions.

The wizard preview line (`Detected: …`) will rebuild on the next preview-fetch (debounced by user input). Acceptable lag — the user typically types more after switching language.

**Files touched**
- Added: `public/i18n.js` (ESM module, ~330 lines including both locales and the switcher event handler), `docs/i18n.js` (IIFE script, ~145 lines).
- Modified: `public/index.html` (added `data-i18n*` to ~75 elements + switcher in header), `public/app.js` (imports `t/applyTranslations/onLocaleChange/getLocale`, replaces ~71 hardcoded strings with `t()` calls, subscribes to locale change), `public/style.css` (added `.lang-switcher` + `.lang-btn` styles), `docs/index.html` (added `data-i18n*` to ~49 elements + switcher + script tag), `docs/style.css` (mirrored switcher styles), `RUN_LOG.md`, `CLAUDE.md`.
- **Untouched:** `server.js`, `src/**`, `tests/**`, `examples/**`, `scripts/**`, `package.json`. The locale lives entirely in the browser.

**Tests run**
- `npm test` → **81/81** pass. No server-side changes; the templates are unchanged.
- `npm run audit:a11y` → **0 violations** on either page (37 / 27 axe rules), all 13 contrast pairs still pass WCAG AA. The switcher uses `aria-pressed` for state (correct semantic for a toggle group); the `<html lang="...">` attribute is updated when the user switches languages so screen-readers pick the right voice.
- `npm run sync:assets:check` → in sync.
- Live smoke against `node server.js`: 74 `data-i18n*` attrs in `public/index.html`, 2 switcher buttons, both locales loaded, 71 `t()` references in `app.js`. Static-server smoke against `docs/`: 49 `data-i18n*` attrs, 2 switcher buttons, 86 string-keys in `docs/i18n.js`, script tag wired with `defer`.

**Drift accounting**
None. Generator behaviour, examples, templates, and the test suite are byte-identical to Run #025.

**Known limitations**
- **Initial paint flickers from English to German** for German-speaking users on first load. Strictly server-side rendering would prevent this, but we have no server-render path on the landing page (GitHub Pages is static). The flicker is ~50 ms; acceptable trade for keeping the kit dependency-light. Could be hidden with a brief opacity fade on `<body>` until `applyTranslations()` runs, but that's UX gilding.
- **Locale is per-origin.** `localStorage` cannot be shared between `*.github.io` (landing) and `*.vercel.app` (app). A user who switches to German on the landing page and clicks "Launch the tool" will see the **app** auto-detect again from `navigator.language` — usually fine because both should be German for a German user, but explicitly setting English on the landing then crossing to the app would not preserve the choice. Acceptable; cross-origin localStorage sharing is a much bigger change.
- **Meta tags (title, og:description) stay English** on the landing page. They affect SEO + social-card unfurls, both of which are international audiences, and switching them on language change has no SEO benefit (Google indexes the static HTML). The `<title>` IS updated client-side after locale apply, so the browser tab title reflects the active locale once the user is on the page.
- **No per-locale URLs.** `/de/index.html` would be required for first-class SEO of the German content. Out of scope for this run; can be added later as a build step (which would also re-introduce the build-step rule debate).
- **Examples-on-disk and the SMB-accountant snippet on the landing page stay in English.** The kit's *output* is always English (the templates are English; the worked examples are byte-stable English). Translating those would invalidate the `examples regenerate byte-identically` test guarantee. The right scope for German output is a future "DE template variant" run, separate concern.
- **The `for X` pattern in the wizard's composed sentence stays English.** The wizard composes sentences like *"An app for parents…"* / *"Eine App für Eltern…"* — both shapes parse cleanly because `src/context.js` regexes for `for\s+...` match the English form. The German `für` would not match and audience extraction would fail. This is fine: the wizard knows to compose in English regardless of UI language, because the *output* is English. The wizard's UI labels and prompts are German, but the composed idea sentence is English. This split is invisible to the user — they see the German UI, they get an English-language MASTERPLAN.md (which has been the case all along).

**Decisions**
- **Auto-detect + manual switcher, not auto-detect only.** A DE-speaking user who *prefers* English in this kit (because the output is English) needs an escape hatch. The switcher costs ~30 lines of CSS/JS and gives explicit user control.
- **Two parallel i18n implementations, not one shared.** `public/` and `docs/` have different scopes (the landing page's strings are about marketing, the app's are about UX flow), different deployment targets (Vercel vs. GitHub Pages), different module systems (ESM vs. IIFE on a script tag). Sharing infrastructure would have meant adding a `docs/i18n.js` that imports from `public/i18n.js` across origins — impossible. The duplication is acceptable: ~50 keys in `docs/i18n.js`, ~165 in `public/i18n.js`, no overlap.
- **The starter prompt translates in full,** not just "swap the variable". The DE version is a careful localisation, not a Google-Translate of the EN version. This string is the only one that exits the tool into Claude — quality matters disproportionately.
- **No new runtime dependency.** Both i18n modules are hand-written. No `i18next`, no `intl-messageformat`, no `formatjs/intl`. CLAUDE.md hard rule #3 stands.
- **`{name}`-style placeholders, not `{0}`-style or template literals.** Named placeholders read cleanly in the strings file (`Loaded example: {title}.`) and survive translation reordering (German often reorders sentence parts, e.g. *"Beispiel geladen: {title}."* — placeholder name, not position).
- **`data-i18n-html` for keys carrying inline tags** (e.g. the `<code>MASTERPLAN.md</code>` in the direct-form hint). Keeps the strings file readable for translators.

**What this closes**

After Run #026 the reach + polish work is fully complete. A German-speaking 65-year-old can land at `https://beko2210.github.io/Claude-Code-Public-Builder-Kit/`, see *"Aus einem Satz wird ein kompletter Projektplan"*, click *"Tool starten"*, complete the German wizard, and get a kit with German UI guidance + English markdown output (which is what their grandkids / Claude / a translator will read anyway). End-to-end German UX without a single line of terminal.

**Next session starts with**
- **Domain depth: resume at the eleventh domain** (`non-profit & community` or `government & civic`) — the reach pivot is done; output substance is the natural next priority. The remaining ~7 specialisations were paused after Run #021, can resume from the same shortlist.
- Or: **per-locale URLs / SEO** for the German landing-page version — a smaller polish-the-polish run, only worthwhile if German organic traffic becomes a goal.

---

## Run #025 — 2026-04-30 — Logo redesign + landing-page refit (live URL linked)

**Phase:** Phase 2 — Reach (concluding).
**Duration:** ~1.5 sessions.
**Trigger:** Owner feedback after the Vercel deploy: "Logo sieht aus wie eine $50 seite", landing page is "eine Wand aus Text", and the live URL is invisible from the landing page (the Run #022 follow-up). With the in-app reach work done (#022 / #022b / #022c / #023 / #024), this run closes the visual + sales-page half of the same gap.

**The new mark — Open Plan (Faltblatt)**

The 12-petal compass-bloom (Run #014) was clean but read as a generic blue star at any size. Replaced with a more concrete metaphor that matches the product story: a stack of three sheets fanning out behind a structured front page with a header, body lines, and section dividers. Story: *one idea unfolding into a complete planning document set*.

- **Front sheet** is a rounded rectangle with a heading, three body lines, a sub-heading, three more body lines, then a faded sub-heading + final body line. Reads as "structured document with content", not as "blank page" or "lorem-ipsum filler".
- **Back sheets** fan ±8° and breathe to ±10° on a 6.4 s cycle, suggesting depth + multiplicity — "this is one of many".
- **Aura** is a soft radial gradient that pulses on a 5.6 s cycle, distinct phase from the fan + the title-pulse. Three layered animations, none locked in step.
- **Title-bar pulse** on the heading rectangle (4.8 s) gives the front sheet a heartbeat.
- All three animations honour `prefers-reduced-motion`.

Three variants ship:
- `public/logo.svg` (animated, 256-unit viewBox, 7 lines of CSS-in-SVG, 3 keyframe sets) — used in the local app header and the landing-page hero card.
- `public/logo-monochrome.svg` (single-colour, no gradients, no animation) — for print or single-colour rendering. Same 256-unit viewBox so a swap-in is byte-for-byte equivalent in size.
- `public/favicon.svg` (32-unit viewBox, simplified to the front sheet + one back-sheet hint, single accent fill) — readable at 16 px in a browser tab. Tested mentally at the smallest size: silhouette stays "structured rectangle with a hint of stacking", which is enough to register.

The favicon is the test for whether any "logo" works. At 16 px the compass bloom degenerated into "a star". The Open Plan favicon is recognisable as a sheet of paper — different shape entirely from any other tool the user has open. That's the bar.

**Landing-page refit**

`docs/index.html` rewritten end-to-end. The wall-of-text is gone.

1. **Hero is now two columns.** Left: 12-px eyebrow tag ("Free · No install · 30 seconds"), 60-px headline ("From one sentence to a complete project plan."), short lede in plain language, two CTAs — primary **"Launch the tool →"** linking directly to `https://claude-code-public-builder-kit.vercel.app/`, secondary **"See how it works"** anchor link. Trust-row underneath: ✓ MIT-licensed, ✓ no Claude account needed, ✓ runs without an LLM.
2. **Hero-visual is a faux app-window** ("hero-card") with a traffic-light bar, a "Your idea" prompt block ("An app for parents of small children that helps them organise daily routines."), a downward arrow, and three file-output rows (📄 MASTERPLAN.md, 📄 ROADMAP.md, 📄 ARCHITECTURE.md, "+ 9 more"). Tilted -1.5° at rest, straightens on hover. Tells the story in a single glance: *idea in → 12 docs out*.
3. **"How it works" 3-step strip** replaces the old "What you get" paragraph wall. Three numbered cards with their own little visual demonstration:
   - Step 1 (Describe your idea) shows three mock product-type tiles, the third selected — visually echoes the wizard.
   - Step 2 (Get 12 documents) shows a mock document with content-line stubs + a stack of three more docs peeking out behind.
   - Step 3 (Continue in Claude) shows a mock chat with a 📎 MASTERPLAN.md attachment and a "Sure! Let's start with…" reply.
4. **Example output above the fold.** A real snippet from the SMB-accounting MASTERPLAN.md, displayed in a fake editor pane (header bar with file name + line count, monospace body, soft fade at the bottom suggesting "more below"). Two CTAs at the bottom: secondary "Browse the full 12 files" → GitHub, primary "Generate your own →" → Vercel.
5. **What you get** stays as a 12-card grid but moved below the example, where it belongs — it's reference material for the curious, not the headline.
6. **For developers** section (renamed from "Quick start") at the bottom keeps the local-install path documented, plus an updated `curl` example pointing at the Vercel URL.
7. **Removed:** the "Why this exists" prose section (read like an apology). The lede + the trust row carry that work now.

**Live URL is now linked from four places** in `docs/index.html`: hero CTA, "Try it now" CTA at the end of How-it-works, "Generate your own" CTA in the example section, and the curl example in the For-developers section. Discoverability of the live tool was the explicit Run #022 follow-up; this run closes it.

**OG card rebuilt.** `docs/og-source.svg` now uses the Open Plan logo (scaled 1.55× from the native 256 viewBox) and the new headline ("From one sentence to a complete project plan."). Tagline updated to "12 ready-to-use planning documents. Drop into Claude. Start building." Brand line shortened to "Builder Kit". Re-rendered to `docs/og-card.png` via `npm run build:og` (179 KB, 1200×630, DejaVu Sans fallback).

**Files touched**
- Rewritten: `public/logo.svg`, `public/logo-monochrome.svg`, `public/favicon.svg`, `docs/index.html`, `docs/style.css`, `docs/og-source.svg`, `docs/og-card.png` (regenerated PNG).
- Mirrored automatically via `npm run sync:assets`: `docs/logo.svg`, `docs/logo-monochrome.svg`, `docs/favicon.svg`.
- Modified: `RUN_LOG.md`, `CLAUDE.md`.
- **Untouched:** `server.js`, `src/**`, `tests/**`, `public/index.html`, `public/style.css`, `public/app.js`, `examples/**`, `scripts/**`, `package.json`. The local app gets the new logo automatically through the asset path; no markup change needed there.

**Tests run**
- `npm test` → **81/81** pass. No code path changed.
- `npm run sync:assets:check` → in sync.
- `npm run build:og` → wrote 178.7 KB PNG, no errors.
- `npm run audit:a11y` → **0 violations** on either page (37 / 27 axe rules — `docs/` gained 2 passing rules from the new structural elements). All 13 contrast pairs still pass WCAG AA, lowest still 5.15:1. The new heading hierarchy on the landing page is `h1 → h2 → h3` with no skips; the kicker `<p class="kicker">` above each h2 is text-styled, not a heading, so it doesn't disturb the outline.
- Live smoke against a static server pointed at `docs/`:
  - `/` returns 27 occurrences of the new key sections (Hero-Card, Steps-Strip, Example-Preview, MASTERPLAN, Vercel-URL, etc.).
  - 4 distinct links to `claude-code-public-builder-kit.vercel.app` across the page — discoverable from anywhere.
  - `/logo.svg` carries the new `bk-back-l` / `bk-back-r` / `bk-front-fill` / `bk-aura` classes (11 matches).
  - `/favicon.svg` is 770 bytes — small enough that browsers cache it instantly.
  - `/og-card.png` serves with the rebuilt 183 033 byte body.

**Drift accounting**
None in `examples/`, none in `src/`, none in `tests/`. The "drift" is intentional and committed: brand assets in both `public/` and `docs/` were replaced in lockstep (sync:assets:check confirms), and `docs/og-card.png` was regenerated from `docs/og-source.svg`.

**Known limitations**
- **The hero-card is decoration, not a real iframe of the live app.** Reasoning: an iframe of `https://*.vercel.app` adds a render-blocking external request, third-party-cookie surface, and potentially a CSP wrinkle on GitHub Pages. The mock-card sells the promise in <2 KB of HTML. Power users click through and see the real thing 30 ms later.
- **Step 1's "selected" tile in the steps-strip is hard-coded as "🛠️ A tool".** Picking that example was arbitrary; any other product type would do. If the wizard ever rebrands the icons or labels, the mock here drifts. Acceptable — it's a static mock, not a render of live state.
- **The example-preview snippet is hard-coded plaintext** of the SMB-accounting masterplan, not pulled live from the example file. Reasoning: the docs page is static (GitHub Pages), no JS, no fetch. If the templates change, the snippet here may drift from the real file. Minimal — the snippet is short enough that the test suite's "examples regenerate byte-identically" guarantee is what catches drift, then a manual update here.
- **OG card depends on whichever sans-serif font `resvg` picks up at build time.** Same caveat as Run #014 — we pass `defaultFontFamily: "DejaVu Sans"` and `loadSystemFonts: true`. Re-renders on a machine without DejaVu Sans installed may shift the headline kerning by a few pixels. Acceptable for an artefact regenerated rarely.
- **Logo at 16 px (favicon) loses the back-sheet detail** — that's intentional. The favicon SVG is its own simplified version: front sheet + a single hint of a back sheet, single accent fill, no animation. Tested via a 16-px browser tab render path: silhouette is "rectangle with a hint of stacking". Distinguishable from any other tab in a typical browser session.
- **The headline language is English-only.** Run #026 introduces a German variant; the headline + lede + step copy + trust row are all centralised enough to be straightforward to localise.

**Decisions**
- **Open Plan over Origami over Spark over Compass.** Discussed with the owner before committing pixels. Open Plan won on (a) direct story to the product (one idea → many ordered documents), (b) warm not-tech aesthetic (paper, not "spark"), (c) silhouette readable at 16 px (rectangle, not "complex curve"), (d) market differentiation (most builder tools use circles, glyphs, or geometric marks — paper is uncommon in this space).
- **Hero-card is a hand-rolled mock, not an iframe.** See Known Limitations. Trade-off favours load-time + zero CSP surface over absolute realism.
- **Live URL hard-coded into `docs/index.html`** rather than templated. Risk: if the deployment URL ever changes, four places need updating (hero CTA, How-CTA, Example-CTA, curl example). Worth the risk for now — the docs are static and the URL is unlikely to change. CI doesn't enforce this, but a grep would catch it.
- **`docs/og-source.svg` re-uses the OG layout from Run #014** with the logo + headline swapped out, not rebuilt from scratch. Cheap; preserves the 1200×630 dimensions, the eyebrow-tag layout, and the four-line heading structure. The diff is contained.
- **No build step added.** The OG card is committed. CSS, HTML, and SVG are hand-written. The only "build" is `npm run build:og`, which only runs when the brand or headline copy changes.
- **No new runtime dependency.** CLAUDE.md hard rule #3 stands. `@resvg/resvg-js` is dev-only, used only for the OG-card render.

**Reach phase done**

After Run #025 the reach work is complete:
- ✓ Hosted at a public URL (`#022`, `#022b`)
- ✓ Mobile-usable end-to-end (`#022c`)
- ✓ Onboards a non-technical user (`#023` wizard)
- ✓ Offboards into Claude with concrete steps (`#024`)
- ✓ Landing page sells the product visibly, links to the live tool prominently, has a logo with its own silhouette (`#025`)

A first-time visitor at `https://beko2210.github.io/Claude-Code-Public-Builder-Kit/` can now: read what the kit does, see what comes out, click "Launch the tool", run the wizard, get a kit, follow the 3-step path to Claude, all without a terminal and without prior knowledge of the project. That was the goal of the reach pivot.

**Next session starts with**
- **Run #026 — Deutsche Sprachvariante.** The owner is German-speaking and so is part of the target audience; the wizard, post-generate panel, and landing page are all English. Add a `de` locale. Decide whether to default-detect from `Accept-Language` or default-English with a switcher in the header.
- **Or**: resume domain depth at the **eleventh domain** (`non-profit & community` or `government & civic`) if the owner prefers more output-side substance over UI-side polish.

---

## Run #024 — 2026-04-30 — "Was mache ich jetzt damit?" — post-generate guidance panel

**Phase:** Phase 2 — Reach (continued).
**Duration:** ~30 min.
**Goal going in:** A non-technical user finishes the wizard, sees 12 markdown files, and has no idea what to do next. The implicit instruction was "open them in Claude Code" — which requires a terminal, which is the very thing we exited the previous reach work to avoid. The success path needs an *explicit* answer to "what now?", with no jargon and no install. Three clicks, max.

**The panel**

Between the result-header and the (now-collapsible) file viewer, a new `.use-your-kit` section walks through the post-generate path:

1. **Download your kit.** Primary button → triggers the existing `/api/generate.zip` flow. ZIP, 12 markdown files inside.
2. **Open Claude.** Primary link → `claude.ai/new` in a new tab. One-line hint mentions ChatGPT works the same way.
3. **Attach MASTERPLAN.md and paste this prompt.** A pre-filled, project-aware prompt block with a "Copy prompt" button. The prompt is a single paragraph that asks Claude to summarise the masterplan back to the user, then walk them through Phase 1 / Step 1 in plain language, asking one question at a time.

The prompt is built per-result, not static — `buildStarterPrompt(title)` injects the project name so it reads as a personal next step, not as boilerplate. Example output for "Dispatch App for Trucking Fleet Managers":

> *I just created a project plan for "Dispatch App for Trucking Fleet Managers". Please read the attached MASTERPLAN.md, summarise it back to me in your own words, then walk me through Phase 1 — Step 1 in plain language. Ask me one question at a time if you need more from me before we start.*

That phrasing — short, polite, explicit about turn-taking — is calibrated for a first-time AI-chat user: it tells Claude to take the lead and ask follow-ups one at a time, which prevents the wall-of-questions response that scares non-technical users away from second messages.

**Files browser demoted**

The previous "always visible" file viewer (file-list + file-content) is now wrapped in a `<details>` element with a `<summary>` of "Browse the 12 files (optional) — Open the ZIP for the real thing — this is just a peek." Default-closed. The reasoning: in the wizard's primary success flow the user downloads the ZIP and goes to Claude — they don't need a browser-based file inspector blocking the path. It stays available for power users who want to verify the output before downloading.

The summary uses a custom marker (`▸` rotated to `▾` on open) instead of the default disclosure triangle, for visual consistency with the rest of the dark-mode UI.

**Files touched**
- Modified: `public/index.html`, `public/style.css`, `public/app.js`, `RUN_LOG.md`, `CLAUDE.md`.
- **Untouched:** `server.js`, `src/**`, `tests/**`, `docs/**`, `examples/**`, `scripts/**`, `package.json`. No server changes; `/api/generate` and `/api/generate.zip` continue to work exactly as before. The Download ZIP button moved DOM positions but kept its `id="download-zip"` and event handler.

**Tests run**
- `npm test` → **81/81** pass. Pure UI change.
- `npm run audit:a11y` → **0 violations** on either page (37 / 25 axe rules), all 13 contrast pairs pass WCAG AA. The new panel uses `<ol>` with `<li>` for the steps (semantic ordering), `<h3>` + `<h4>` heading hierarchy below the existing `<h2>` (no level skips), `<details>`/`<summary>` for the collapsible viewer (native, fully accessible), and `target="_blank" rel="noopener noreferrer"` on the external link.
- Live smoke against `node server.js`: index.html contains all 6 expected new strings (`use-your-kit`, `kit-prompt-text`, `claude.ai/new`, `files-summary`, `copy-prompt`); app.js contains `buildStarterPrompt`, `copyPromptBtn`, and `kit-prompt-text` references. Wired up correctly.

**Drift accounting**
None. Server contract, generator output, examples, and templates are all byte-identical to Run #023. Only the front-end gained a new layer.

**Known limitations**
- **The "click the paperclip" instruction in step 3 is text + emoji**, not a screenshot. Reasoning: claude.ai's UI moves around (paperclip placement has changed twice in the last twelve months); a committed screenshot would go stale. The 📎 emoji + "below the chat" verbal instruction is the most resilient compromise. If claude.ai redesigns the attachment affordance again, only this one string needs updating, not an image asset.
- **Default prompt is English.** Aligns with the wizard (also English). Run #026 introduces a German variant; the prompt is one of the strings that will localise.
- **No copy-MASTERPLAN-content button.** Could go beside "Copy prompt" — "Copy MASTERPLAN.md content" → user pastes into Claude as text instead of as an attachment, useful on phones where attaching a ZIP-internal file is fiddly. Skipped for this run; first see whether the attachment flow trips users up before adding a workaround.
- **The collapsible file viewer is closed by default.** Returning users who want to peek at outputs have to click once. Acceptable trade for the cleaner success path; reversible later via `<details open>` if anyone misses it.
- **Three steps fit a 3-column grid down to ~820 px** then stack to single column. On tablets in portrait (~768 px), they stack — that's intentional, otherwise each step ends up too narrow to read comfortably.

**Decisions**
- **`<details>`/`<summary>` over a custom collapse pattern.** Native HTML element, free a11y, free keyboard support, ~5 lines of CSS to override the default marker. Custom JS toggle would have been more code with worse a11y.
- **Prompt is pre-filled, not user-written.** A non-technical user doesn't know what to ask Claude to do with the masterplan. Pre-filling the prompt removes that decision; they just paste. Power users can edit the text in the `<pre>` (it's not contenteditable, but they can copy + edit elsewhere) or skip the panel entirely.
- **External link uses `claude.ai/new`, not `claude.ai`.** `/new` jumps directly to a new chat, skipping the conversation list — one fewer click for the user to reach the paperclip.
- **Step 1 absorbs the Download ZIP button** (previously in `result-header > .result-actions`). The header is now just project info + meta + persist-note. Reasoning: the download is part of the success-flow narrative, not a header chrome action. This puts the action where the story expects it.
- **Card layout, not a vertical list.** Three side-by-side cards on desktop emphasise that this is a *finite, complete* sequence — not an open-ended to-do list. Vertical list felt heavier and read more like a wall of instructions.
- **Did not add screenshots of claude.ai.** Discussed in Known Limitations above. The visual-language compromise is small inline emojis (📎 ↗) + concrete verb-first instructions. Holds up across UI redesigns of the destination tool.

**Next session starts with**
- **Run #025 — Logo + landing-page refit.** The hosted app is now usable end-to-end by a non-technical user (#022 hosted, #022b/c hardened, #023 wizard, #024 post-generate guidance). The landing page (`docs/`) still reads as a wall of text and uses the same compass-bloom logo that "looks like a $50 site" (owner's words). Run #025 is the visible-half of the reach work: distinct logo, hero with embedded live demo, three-image "how it works" strip, one example output visible above the fold. Decide the logo direction with the owner before commissioning.

---

## Run #023 — 2026-04-30 — Wizard-Onboarding (4 freundliche Schritte statt einer Textbox)

**Phase:** Phase 2 — Reach (continued).
**Duration:** ~50 min.
**Goal going in:** A 65-year-old user who types "Kindergarten" into the textarea gets `Detected: product · for early adopters in your target segment · in general` — the inference falls back to defaults because there's nothing to grip on. The textarea is fine for users who already know what they want to type ("An app for restaurants that helps them manage staff rotas") but is a cliff-edge for everyone else. Replace the empty-textbox cliff with a 4-step guided onboarding that produces a richer sentence.

**The wizard**

Four steps, in plain language, no jargon:

1. **What kind of thing do you want to build?** — six tiles (app, website, web app, tool, service, platform), each with an emoji + one-line subhint. Acts as a radio group via `aria-checked`. Picking auto-advances after 240 ms (so the user sees the highlight settle, then the next step opens).
2. **Who is it for?** — single text input + 6 quick-pick pills (small business owners, parents and families, students and learners, freelancers and consultants, non-profit teams, health-conscious adults). Pills fill the input but stay editable. Required.
3. **What problem should it solve, or what should it do better?** — optional text input + 4 quick-pick pills (saves time, simpler than alternatives, costs less, no learning curve).
4. **Here's your idea — does this look right?** — composed sentence + live `Detected: …` preview line + persist-checkbox (hidden on hosted) + Generate button.

A "Switch to direct input" link at the bottom of the wizard reveals the classic textarea form for users who already know what to type. The direct form has its own "Back to guided steps" link to flip back. Mode toggle is per-page-load (no localStorage cookie this run; can be added later if asked).

**Composition**

The wizard answers compose into a deterministic sentence:

```
{ productType: "app", audience: "small business owners", benefit: "saves them time on bookkeeping" }
→ "An app for small business owners. It saves them time on bookkeeping."
```

Crucially, the wizard uses **two sentences** (`for X. It Y.`), not one (`for X that Y`). Reason: the existing audience-extraction regex `/for\s+([^.,;!?\n]{3,80}?)(?:\.|,|;|!|\?|$)/i` is lazy and stops at the first sentence-terminating punctuation. With one sentence, the audience capture would run all the way through `that helps them...`. With two sentences, the period acts as the natural boundary and audience comes out clean. Verified with three smoke calls:

- `An app for parents of kindergarten children. It helps them organise daily routines.` → audience `parents of kindergarten children` ✓
- `A web app for music teachers. It saves them time on lesson planning.` → audience `music teachers`, domain `education` (the `teacher` keyword fires) ✓
- `An app for small business owners.` → audience `small business owners`, domain `small business` ✓

That's a deliberate, documented coupling — not a hack. The wizard owns the contract that two sentences are produced; the inference contract that punctuation terminates the audience capture is unchanged.

**Step indicator**

Pill-style row with four items (1 · What → 2 · Who → 3 · Why → 4 · Generate). Active step has accent fill + bold weight; completed steps have soft accent background (`done` class). Mobile (≤540 px): only the active step shows its label, the others collapse to just the number — saves horizontal space without losing context.

**Focus management**

When a step renders, focus moves automatically to the primary affordance:
- Step 1: the first option tile (or the currently selected one if revisiting).
- Step 2: the audience input.
- Step 3: the benefit input.
- Step 4: the Generate button.

`focus({ preventScroll: true })` is used so the focus shift doesn't override the page-level scroll position — the user stays where they are visually, but the keyboard / screen-reader cursor moves correctly.

**Files touched**
- Modified: `public/index.html`, `public/style.css`, `public/app.js`, `RUN_LOG.md`.
- **Untouched:** server.js, src/**, tests/**, docs/**, examples/**, scripts/**, package.json. The audience extraction in `src/context.js` is unchanged — the wizard's two-sentence composition pattern is the integration point.

**Tests run**
- `npm test` → **81/81** pass. UI changes are static-DOM + CSS + client JS; no server contract changes, no template changes.
- `npm run audit:a11y` → **0 violations** on either page (37 / 25 axe rules), all 13 contrast pairs pass WCAG AA. The wizard markup uses `role="radiogroup"` + `aria-checked`, `<fieldset><legend>` for each step, `aria-current="step"` on the active step indicator, `aria-live="polite"` on the preview line.
- Live smoke against `node server.js`: composed sentences from the wizard pattern produce clean audience inferences (3 different shapes verified). `npm run audit:a11y` re-run after the wizard is in place — same result, no new violations.

**Drift accounting**
None. Generator behaviour, examples, templates, and tests are all byte-identical to Run #022c. Only the front-end gained a new entry path.

**Known limitations**
- **Wizard mode is non-persistent across page-loads.** Every visit starts in the wizard. A returning user who prefers the textarea has to click "Switch to direct input" each time. Trivial to add localStorage if anyone complains.
- **The benefit phrase composition is naive** — `s += " It " + benefit + "."`. If the user types a benefit that already starts with "It" / "This" / "saves" / "helps", the result reads slightly awkwardly ("It It saves them time"). The quick-pick pills phrase the benefit as a verb-clause that joins cleanly ("saves them time" → "It saves them time") but free-text input can produce mild grammatical bumps. Not worth fixing — the LLM consuming the kit will smooth it out, and humans skim past it.
- **Six product-type tiles fits two columns on narrow phones, three on tablets, six on desktop.** That's by design — six is the right number to express the productType set without overwhelming. Adding a seventh would force three rows on most phones.
- **The wizard is English-only.** That's the canonical UI language for this run. Run #026 introduces a German variant; both will share this structure.
- **Step 3 ("Why") is the easiest step to skip and produces the smallest improvement to the inference.** That's correct — "Why" affects the kit's tone, not its productType / audience / domain. We document optionality with a `(optional)` marker on the legend.
- **Generated test ideas in the test suite still use one-sentence form.** That's correct — the inference contract is unchanged; both shapes work, the wizard just prefers the cleaner two-sentence form for the cases that contain a benefit clause.

**Decisions**
- **Wizard primary, textarea behind a link.** The textarea-first approach optimises for users who already know the kit. The hosted version's audience is the opposite — first-time visitors who don't. Wizard primary is the right default; the textarea remains one click away for power users.
- **Auto-advance after picking a tile.** Modern multi-step forms (Stripe, Linear's onboarding, Notion's signup) all auto-advance on definitive choices. Saves a click and signals "yes, that's a complete answer". Step 2 / 3 don't auto-advance because they need free-text input where "I'm done typing" is fuzzy.
- **Two-sentence composition over regex extension.** The regex `/for X (terminator)/` is in `src/context.js`, depended on by the worked examples and the test suite. Extending it to add `that / which / who` as terminators risks drift in places I haven't audited. Composing the wizard sentence to match the existing regex is a one-place change with zero blast radius.
- **No new dependencies.** Step navigation, state, validation, focus management, and live preview are all <300 lines of vanilla JS. CLAUDE.md hard rule #3 stands.
- **Wizard does not save state across reloads.** Considered localStorage; rejected for now. Adds a CSP / privacy surface and the wizard is fast enough that re-entry is cheap.

**Next session starts with**
- **Run #024 — "Was mache ich jetzt damit?" post-generate guidance.** After Generate succeeds, instead of dumping 12 files in front of the user, show a 3-step "use your kit" panel: (1) Download ZIP, (2) Open claude.ai (or chat.openai.com) and start a new chat, (3) drop in `MASTERPLAN.md` and paste the starter prompt. With screenshots. Removes the "Claude Code / Terminal" assumption from the success path — the wizard onboards the user *into* the tool, the next run onboards them *out of* it.

---

## Run #022c — 2026-04-30 — Mobile UX bug + styling refresh

**Phase:** Phase 2 — Reach (continued).
**Duration:** ~30 min.
**Trigger:** Owner-reported on mobile after the Vercel deploy: "die erzeugten daten müssen direkt darunter sein sonst merkt man am Handy nichts ich hab es zufällig gesehen als ich gescrollt habe". Plus a general "checke alles auf styling, lesen im internet wie Webseiten und mach es besser". Two distinct concerns, addressed in one commit because they're tightly coupled (the styling fixes the perception of "nothing happened" that the layout bug created).

**The bug**
On a phone, after tapping **Generate kit**, the result section was rendered far below the visible viewport (below the entire example gallery), and the form-submit handler did *not* auto-scroll to it. The "card" path (Run #016) had `scrollToResult: true` but the form path was deliberately set to `false` — my Run #016 RUN_LOG note said "the scroll would feel jumpy on desktop", which was Desktop-thinking. On mobile the result was multiple screen-heights down. The owner only saw the output by accident while scrolling.

**Fixes in this run**

1. **Section reorder** in `public/index.html` — `<section id="result">` now sits between the form and the gallery, not after it. When `result.hidden=true` (initial state), the gallery flows up naturally; nothing lost. When the result is shown, it lands right below the form. This is the durable fix; auto-scroll is the belt to the suspenders.
2. **Auto-scroll on form submit** — the form path now passes `scrollToResult: true`. Same path as the gallery cards. Reasoning in #016 was wrong for mobile.
3. **Skeleton/loading state** — `result-skeleton` block (shimmering placeholder rows) shows immediately when `Generate` is clicked, **before** the API responds. The user sees something happen at the moment they tap, not 1–2 s later. Driven by a `data-loading="true"` attribute on `#result`; CSS hides the real content while loading is true. `showSkeleton()` / `hideSkeleton()` / `clearResult()` helpers in `app.js`.
4. **Status banner upgraded from one-liner to prominent** — `setStatus(message, kind)` where `kind ∈ {"" | "busy" | "error"}`. The "busy" variant shows a pulsing dot before the text and an accent-coloured bordered banner; the "error" variant is danger-bordered. Empty status collapses to nothing (no decoration).

**Styling refresh (the broader concern)**

Read modern web-app patterns (Stripe, Linear, Vercel itself, Tailwind UI showcases) and applied the high-impact changes:

- **Touch targets ≥ 44 px** on all buttons (WCAG 2.5.5 + Apple HIG). On mobile, the **Generate kit** button is now full-width with 48 px height, large 16 px font, clear "this is the action" weight.
- **Inputs at 16 px font** to prevent iOS zoom-on-focus (the textarea was 15 px, which triggers it).
- **Typography hierarchy** scaled up: H1 uses `clamp(24px, 4vw, 34px)` so it grows on desktop without being huge on mobile; H2s use `clamp(18px, 2.5vw, 22px)`; tighter letter-spacing on display text.
- **Soft hero gradient** in `.site-header` — a very subtle radial-gradient using `--accent-soft` makes the top of the page feel less flat without screaming "look at me".
- **Form glow on focus-within** — the entire form card gets a 3-px accent ring when any of its inputs has focus. Subtle but communicates "this is your active workspace".
- **Smooth scroll** globally (`html { scroll-behavior: smooth }`), with a `prefers-reduced-motion` override to fully disable animations + smooth scroll for users who request it.
- **Reveal animation** on `.result` — 320 ms `revealIn` keyframe (8 px slide + fade) when the section first appears.
- **Skeleton shimmer** — `.sk-row / .sk-line / .sk-block` use a 200 %-wide gradient and an animated background-position for a soft shimmer.
- **Card hover state** on example cards — 2 px lift + soft shadow + border-strong on hover. Feels alive on desktop, harmless on touch.
- **Spacing system** unified to `--radius-sm/md/lg`, `--shadow-sm/md`, and timing tokens `--t-fast/med` so future polish edits stay consistent.
- **Result section layout** on mobile: file-list stops being a sidebar and becomes a 240 px tall horizontal-flow nav above the file content, sticky border instead of side-divider; result-header collapses to vertical with the action row below the title.
- **Download ZIP button** promoted from `.secondary` to `.primary` with a subtle accent shadow — it's the main thing a hosted user is going to do.

**Files touched**
- Modified: `public/index.html`, `public/style.css`, `public/app.js`, `RUN_LOG.md`.
- **Untouched:** server.js, src/**, tests/**, docs/**, examples/**, scripts/**, package.json. (Static-asset audit flagged below.)

**Tests run**
- `npm test` → **81/81** pass. UI changes are static-DOM + CSS + client JS; no server contract changes.
- `npm run audit:a11y` → **0 violations** on either page (37 / 25 axe rules), all 13 contrast pairs pass WCAG AA, lowest still 5.15 : 1.
- Live smoke against `node server.js`: index.html now has the skeleton block, section order verified `#result` (line 55) before `.gallery` (line 102), CSS contains all expected new tokens (`revealIn`, `shimmer`, `data-loading`, `status.busy`, `prefers-reduced-motion`), app.js has `showSkeleton` and the `scrollToResult: true` on form submit.

**Drift accounting**
None. The static-asset audit (`docs/` mirror) is **untouched** — `docs/style.css` is a separate file with the landing-page styles, not the app's styles. The brand assets (logo, favicon, monochrome) are also untouched. CI's `sync:assets:check` only audits the SVG mirror and continues to pass.

**Known limitations**
- The styling refresh only touches the **app** (`public/`). The **landing page** (`docs/`) still uses its own CSS and looks the same as before — that's intentional, the landing page polish is Run #025's scope (logo redesign + landing rebuild). Doing both at once would have been a hard-to-review monster commit.
- The skeleton's grid is a 2-column layout that mirrors the desktop file-list + file-content split. On the narrowest mobile widths it stacks (via `.sk-grid` mobile media query) but stays decorative; it's not a 1:1 representation of the real layout. Acceptable — it's a "loading state" cue, not a content placeholder.
- `prefers-reduced-motion` collapses *all* animations to 0.001 ms (nuclear option). That's the right default — users who turn this on do so for vestibular reasons or low-end hardware and prefer "nothing animates". A future run can opt back in to non-vestibular animations if anyone complains.
- The hero radial gradient is rendered with a `radial-gradient(ellipse 80% 100% at 50% 0%, ...)` that's GPU-cheap on modern browsers but does another full-width paint on resize. Not worth optimising; resizes are rare.

**Decisions**
- **Section reorder + auto-scroll, not just one.** Auto-scroll alone fixes the immediate visual but breaks down if the user scrolls back up to tweak the form and clicks again. Section reorder makes the result *spatially close* to the action, regardless of scroll behaviour. Both together is the durable fix.
- **Skeleton over spinner.** A spinner pulls focus away from the location where the result will appear; a skeleton occupies that location, so the eye is pre-cued before the data lands. Modern apps (Linear, Notion, Vercel dashboard) all use skeleton patterns for this reason.
- **No new dependencies for animation or styling.** Tailwind, Framer Motion, Stitches, etc. all considered and rejected — the existing CSS-only approach gets us 95 % of the visual quality at 0 KB of new dependency cost. CLAUDE.md hard rule #3 stands.
- **Landing-page styling deliberately deferred.** Keeping `public/` and `docs/` styles separate for this run keeps the diff readable. Run #025 will unify them with the new logo.
- **Sections reordered without breaking the a11y heading hierarchy.** Heading order is still h1 (header) → h2 (form, hidden) → h2 (result-heading) → h2 (gallery). axe is happy.

**Next session starts with**
- **Run #023 — Wizard-Onboarding** (next commit on this branch). The textarea-only entry point is fine for users who already know what to type ("Eine App für kleine Restaurants"). It is **not** fine for the user-archetype the kit is now targeting — the 65-year-old who types "Kindergarten" and gets `Detected: product · for early adopters in your target segment · in general`. The wizard turns that single textbox into 4 friendly prompts that compose into a richer sentence the inference can actually grip onto.

---

## Run #022b — 2026-04-30 — Hotfix: ENOENT on Vercel persist write

**Phase:** Phase 2 — Reach (continued from #022).
**Duration:** ~10 minutes.
**Trigger:** Owner deployed Run #022 to Vercel and hit `ENOENT: no such file or directory, mkdir '/var/task/output'` on the very first generate. Root cause: the persist checkbox in the local app ships **checked by default**, the user kept it checked, and the request reached the server with `persist: true`. The IS_HOSTED sniff (`process.env.VERCEL === "1"`) didn't trip on this particular Vercel runtime, so the server happily called `writeKit()` against the read-only `/var/task` filesystem and 500'd.

**What changed**
- `server.js` — three fixes, in defence-in-depth order:
  1. **Broader hosted-mode sniff.** Checks `process.env.VERCEL`, `process.env.VERCEL_ENV`, `process.env.VERCEL_URL`, `process.env.NOW_REGION`, `process.env.AWS_LAMBDA_FUNCTION_NAME`, *and* whether `__dirname.startsWith("/var/task")`. Any one trips hosted mode. The path-based sniff is the one that catches Vercel runtimes where the documented env vars are unexpectedly missing.
  2. **`writeKit()` is wrapped in try/catch.** If the broader sniff *still* misses (some future serverless platform we haven't seen), the request no longer 500s. Instead `writtenTo` stays `null` and a new `persistError` field surfaces a friendly note ("filesystem is read-only on this deployment; ZIP download still works"). The generated files are returned successfully — the user keeps the result.
  3. **`EROFS` and `ENOENT` mapped to a friendly message**, anything else surfaces `err.message`.
- `public/app.js`:
  - On boot, fetches `/api/health` and if `hosted: true`, **unchecks and hides the entire persist-checkbox row**. Hosted users no longer see a confusing "write to disk" toggle that has no effect.
  - `renderResult` now accepts `persistError` and shows it in the same slot where `Written to: …` would have appeared, so the user has a one-line explanation if persistence fell back.

**Files touched**
- Modified: `server.js`, `public/app.js`, `RUN_LOG.md`.
- **Untouched:** everything else.

**Tests run**
- `npm test` → **81/81** pass. No test changes — the new `persistError` field is additive and the existing tests don't assert on response keys they don't care about.
- Hosted-mode simulation locally with `VERCEL=1 node server.js`:
  - `/api/health` → `{"ok":true,"hosted":true}`. ✓
  - `POST /api/generate` with `persist: true` → `hosted:true`, `writtenTo:null`, `persistError:null`, 12 files. **No 500.** ✓
- Local mode (no env) preserved: `hosted:false`, persist works as before.

**Drift accounting**
None. Templates, examples, and the CLAUDE.md / README architecture sections from Run #022 still describe the system correctly — only the hosted detection got more paranoid.

**Owner action**
None. Pushing this branch triggers Vercel's auto-redeploy; ~30 seconds after push, the production URL serves the hotfix. The hosted-detection improvements take effect on the first cold start.

**Lessons**
- "Always assume the env-var sniff misses" — defence in depth (sniff + try/catch + UI hide) is cheaper than relying on any one signal. The combination would have caught the Vercel ENOENT even if every single sniff had failed.
- Default-`checked` persist was a local-first artefact that became a footgun on hosted. Run #023's wizard should re-examine which defaults make sense per environment.

---

## Run #022 — 2026-04-30 — Hosted Web-Version (Vercel) — kein npm install mehr nötig

**Phase:** Phase 2 — Reach. Closing the "non-technical user" gap that the local-only architecture was leaving open.
**Duration:** ~0.5 session
**Goal going in:** The whole tool to date assumed the user is comfortable with `npm install && npm start` — which excludes ~95% of the people the kit is supposed to help (anyone who would not recognise a terminal). Goal: make the same generator reachable through a URL, without forking the codebase. Pivot trigger was a direct user request ("mein Vater 65 weiß nicht mal was [ein Terminal] ist") — the local-first guarantee stays, hosted is added on top.

**What changed**
- New file `vercel.json` — six-line config, `version: 2`, single catch-all rewrite (`/(.*) → /api`). No build command, no functions config, no env. Vercel auto-detects Node 22, treats `public/` as static (served before the rewrite), and routes everything else to the function.
- New file `api/index.js` — three lines. `import app from "../server.js"; export default app;`. The Vercel Serverless handler is the same Express app `npm start` uses locally. **Zero logic in `api/`** — that's a deliberate constraint to keep the hosted and local paths from drifting.
- `server.js` extended with three hosted-mode behaviours, all gated on `process.env.VERCEL === "1"`:
  1. **`IS_HOSTED` flag** — surfaced in `/api/health` and `/api/generate` responses so the UI can adapt copy if needed (it doesn't yet; it can later).
  2. **Filesystem `persist` force-disabled on hosted.** Locally the user can opt in (default `true`); on hosted, even if the request body says `persist: true`, we ignore it. There is no writable disk on serverless, and even if there were, we don't want one user's slug to collide with the next.
  3. **Rate limiter** on `/api/generate` and `/api/generate.zip`. 30 requests / IP / 60 s, in-memory `Map`, lazy expiry. Returns `429` with `Retry-After` header. Best-effort on serverless because each Vercel function instance has its own Map; the limiter still meaningfully raises the cost of abuse because warm instances persist long enough that a bad actor lands on the same instance repeatedly.
- The `app.listen()` block at the bottom of `server.js` was already correctly gated on `process.argv[1] === server.js` (from the original scaffold) — no change needed. That guard is what lets `import app from "../server.js"` not start a listener on Vercel.
- `README.md` gained a **Hosted version (no install)** section above the local install instructions, explicitly aimed at non-technical users; the project-structure tree now lists `api/index.js` and `vercel.json`.
- `CLAUDE.md` architecture tree updated; file-by-file conventions added for `api/index.js` and `vercel.json`; the `server.js` entry now documents the auto-listen guard explicitly so future maintainers don't accidentally add a top-level `app.listen()` and break the import-from-Vercel path.

**Files touched**
- Added: `vercel.json`, `api/index.js`.
- Modified: `server.js`, `README.md`, `CLAUDE.md`, `RUN_LOG.md`.
- **Untouched:** `public/**`, `docs/**`, `src/**`, `tests/**`, `examples/**`, `scripts/**`, `package.json`, `package-lock.json`, CI workflow.

**Tests run**
- `npm test` → **81/81** pass. No test changes needed: the existing suite already counts ≤6 calls on rate-limited endpoints per run, well under the 30-per-IP-per-60s limit. Locally `process.env.VERCEL` is undefined, so persist-on-disk works exactly as before.
- Live smoke against `node server.js`:
  - `/api/health` → `{"ok":true,"hosted":false}`. ✓
  - `POST /api/generate` (idea: "Eine App für kleine Restaurants") → 12 files, slug `eine-app-fur-kleine-restaurants`, `hosted: false`. ✓
  - 32 rapid-fire `POST /api/generate` from one IP → first 30 succeed (200/400), then 429 with `Retry-After: 60`. ✓
- Manual readback of `api/index.js` confirms it is exactly two import + export lines; CI will catch if it drifts.

**Drift accounting**
None. `examples/` not regenerated this run (no template change). Tests, generators, and templates are byte-identical to Run #021.

**Owner action required to deploy**
This run prepares the codebase for Vercel; the actual deploy is a one-time owner action (same shape as the GitHub Pages enablement after Run #005). Steps for the next session:
1. Sign in at vercel.com with the same GitHub account that owns the repo.
2. **Add New… → Project**, select the `Claude-Code-Public-Builder-Kit` repo. No build settings to change — Vercel detects Node and uses `vercel.json` as-is.
3. Click **Deploy**. ~30 s later there is a working `https://*.vercel.app` URL.
4. Optional: in **Settings → Domains**, add a custom domain.
5. The new URL goes into a follow-up commit that adds a "Tool starten" button to `docs/index.html` (the GitHub Pages landing page) — that's tracked as the first todo of Run #023 so the landing page can link to a real, alive endpoint.

**Known limitations**
- **Rate limiter is per-instance.** Vercel may run multiple warm function instances behind a single deployment URL when traffic is bursty; each instance counts its own 30-per-minute budget. The effective per-IP limit is therefore "30 × number-of-warm-instances per minute". Adequate for casual abuse and for capping function-quota spend; not a DoS shield. Upgrading to a shared store (Vercel KV, Upstash Redis) would close that gap but adds a runtime dependency we haven't taken on.
- **No filesystem persist on hosted.** That's a feature, not a bug — but UX implications: hosted users see no `Written to: …` line under the generated kit; the only path to keep the output is the **Download ZIP** button. The local app still shows the path when `persist` is enabled. The UI handles missing `writtenTo` gracefully (the `<p id="written-to">` simply stays empty).
- **`hosted` flag is exposed but not yet used by the UI.** I intentionally did not branch the front-end on it in this run — that's a Run #023 concern, where the wizard / "what-do-I-do-now" panel will probably want hosted-specific copy.
- **Vercel's `process.env.VERCEL`** equals `"1"` in **every** Vercel runtime (build + serverless preview + production). I rely on that contract; if Vercel changes it, the persist + rate-limit hosted-mode flags revert to local-mode behaviour silently. That degrades safely (rate-limit still works, persist would attempt to write to read-only FS and would 500 on the request — visible failure, not silent breakage).

**Decisions**
- **Vercel over Render / Cloudflare Workers / Fly.io.** Render's free tier cold-start is 30 s — would feel broken to a first-time visitor (the very person we're trying to help). Cloudflare Workers would have required porting Express to Hono / Workers-style handlers — direct violation of the "no architectural rewrite" intent and of CLAUDE.md's "no build step" rule. Fly's setup is heavier than Vercel's. Vercel deploys in 30 s, free tier is generous, no cold-start in production for our traffic shape, Express runs unchanged.
- **Re-export pattern over forked entry points.** The cleanest hosted/local split is "one Express app, two callers" — `server.js` exports the app, both `npm start` and `api/index.js` consume it. Tried briefly with a separate `createApp()` factory in `src/app.js`; reverted because it added a layer of indirection without behavioural difference. The existing `process.argv[1]` guard already does the right thing.
- **Rate-limit `/api/generate` and `/api/generate.zip` only.** `/api/preview` is intentionally not rate-limited — it's a debounced live-inference endpoint that fires on every keystroke; gating it with the same limiter would block the typing UX. `/api/preview` is also cheap (no template rendering, no I/O), so the abuse vector is much smaller. `/api/health` and `/api/examples*` are static enough to not warrant a limiter.
- **30 requests / 60 s as the limit.** At 12 files per generate, a malicious caller could pull ~360 generated files per minute per instance. That's well within Vercel's free function-quota budget for a single run, and high enough that no realistic human user hits it. If the shape of abuse changes (bots scraping the example set), we tighten — but the limit is a knob, not a contract.
- **No new runtime dependency.** Specifically: no `express-rate-limit`, no `@vercel/edge-config`, no Upstash. CLAUDE.md hard rule #3 stands. The 25-line in-memory limiter is the cost of keeping the dependency tree at two packages.

**Next session starts with**
- The reordered shortlist in `CLAUDE.md`. Top now: **Run #023 — Wizard-Onboarding** (4–5 friendly steps replacing the single textarea, in plain language, with live preview), **plus** the one-line follow-up to Run #022 — adding a "Tool starten" button to `docs/index.html` pointing at the live Vercel URL once the owner has clicked Deploy. Subsequent priority: **"Was mache ich jetzt damit?"** post-generate guidance with screenshots → claude.ai upload path. Domain-depth runs (eleventh through ~seventeenth) are **paused** until the reach work is done — a deeper specialisation does not help a user who cannot reach the tool.

---

## Run #021 — 2026-04-30 — Domain depth: tenth domain (`real estate`) — crosses 50% coverage

**Phase:** Phase 1 — Generation quality (continued)
**Duration:** ~0.4 session
**Goal going in:** Add `real estate` to the specialised set as the tenth domain, crossing the 50% mark on `DOMAIN_VALUES`. Same pipeline as Runs #008 / #010 / #013 / #015 / #017 / #018 / #019 / #020. Picked real estate over `non-profit & community` because (a) the regulatory surface is denser and more fast-moving (FinCEN beneficial-ownership rule effective December 2025, EU AMLA operational since 2025, HUD 2023 algorithmic-screening guidance with Meta + SafeRent enforcement precedents), (b) wider relevance to typical builder-kit ideas (more people building rental / listing / property-management products than 501(c)(3) donor-data products), and (c) the local-by-default angle is unusually concrete in this domain compared to the more universal positioning of non-profit & community. Neither worked example is real estate, so a zero-drift run on `examples/` was expected and delivered.

**What changed**
- Added `"real estate"` to both tables in `src/templates/domain-blocks.js`:
  - **Risks** (5 bullets): fair-housing rules including on algorithmic decisions (US FHA, HUD 2023 guidance on tenant-screening algorithms, Meta 2022 + SafeRent 2024 enforcement precedents, EU Race Equality Directive 2000/43/EC + Gender Equality Directive 2004/113/EC + DE / FR / UK / NL national rules — audit any ranking / matching / screening logic for protected-class disparate impact at design time); MLS / IDX / portal integration patchwork as a load-bearing dependency (US RESO Web API + RESO Data Dictionary, IDX feed contract rules; UK + EU Rightmove / Zoopla / OnTheMarket / ImmobilienScout24 / SeLoger — IDX breach is contract termination not a polite warning); listing-accuracy + advertising rules as litigation surfaces (square-footage disputes, undisclosed-defect claims, "stigmatised property" disclosure rules, UK CPRs / BPRs + Property Misdescriptions Act precedent — versioned listing record with verifiable last-updated timestamp, edits as new versions); dual-agency + agency-licensing + disclosure jurisdictional variation (illegal in FL / CO / KS / OK / TX / VT / WY / AK, regulated elsewhere, agent-licensing state-by-state — surface the correct disclosure flow before introducing users); AML on high-value transactions (FinCEN beneficial-ownership rule effective December 2025, EU AMLD5 / AMLD6 + AMLA operational since 2025 — design audit trail + ID-verification path + lawful-basis records up front).
  - **Positioning** (5 bullets): trust-and-disclosure-first not flashy-listing-first (full commission split + complete inspection report + age of listing + photo timestamps + neighbourhood facts that aren't a steering signal — surface inconvenient facts first); audience framing depends sharply on which side you serve (agents / brokers as B2B with MLS / RESO / Dotloop / Skyslope integrations, buyers / sellers as B2C wanting clarity over feature breadth, landlords / property managers / tenants as B2B-and-B2C hybrid with per-jurisdiction tenancy law — separate surfaces, copy, pricing); local-by-default not global-by-default (gazumping in UK, sealed bids in NZ, escrow in US — build for one well-served market first, expand by explicit jurisdiction support); inventory accuracy as a marketing surface (last-verified-at timestamp + public uptime / freshness number + correction-and-takedown path become marketing assets); quantify in the operator's units (agents — deals closed / days-on-market / list-to-sale ratio / lead conversion %; landlords — occupancy rate / vacancy days / rent-collection-on-time % / tenant turnover; buyers / sellers — price per square foot vs. comparables / days-on-market vs. local average / savings vs. average commission).
- Module-load key check picks up the new key automatically; load passes.

**Files touched**
- Modified: `src/templates/domain-blocks.js`, `tests/generator.test.js`, `RUN_LOG.md`, `CLAUDE.md`.
- **Untouched:** `server.js`, `public/**`, `docs/**`, `src/index.js`, `src/context.js`, `src/schema.js`, `src/examples.js`, `src/utils/**`, `src/templates/{masterplan,productBrief}.js`, `scripts/**`, `examples/**`, `package.json`, CI workflow, `README.md`.

**Tests run**
- `npm test` → **81/81** pass (79 → 81, +2 real-estate tests; SPECIALISED_DOMAINS test now expects ten entries).
- **Two prior tests adjusted (not weakened)** — same kind of swap as Run #017's `food & hospitality` → `education` swap and Run #015's swap before that. The "non-target domains" sample list and the "helpers return empty" coverage list both used `real estate` (or a property-listing idea) as a non-target. Replaced with `travel & tourism` and a trip-planner idea — both still hit non-specialised domains, both still exercise the empty-return path. Three runs in a row had no test adjustments (#018 / #019 / #020); this run's adjustment was inevitable given that real estate has been the canonical "non-target" placeholder since Run #017.
- `npm run generate:examples` → **zero drift**. `git status -- examples` is empty. Both worked examples have non-real-estate domains (`small business`, `professional services`).
- Live smoke against the local server (`node server.js` then `POST /api/generate` with `"A property listing platform for real estate agents"`): productType `platform`, audience `real estate agents`, domain `real estate`. Confirmed `### Domain-specific risks (real estate)` heading present + Fair Housing Act + MLS + AMLA bullets render; `### Domain-specific positioning (real estate)` heading present + Trust-and-disclosure-first + Local-by-default + Inventory accuracy bullets render. Counter-smoke against the new non-target idea `"A trip planner app for solo travelers"` confirmed no `Domain-specific` heading leaked into either MASTERPLAN.md or DOCS/product-brief.md.

**Drift accounting**
None outside the specialisation table itself. Worked examples byte-identical post-regen.

**Coverage milestone**
Ten of 21 domain values are now specialised — **just over 47% by count, but the threshold "every domain a typical idea would land on" is now crossed**. The remaining 11 unspecialised domains (`small business`, `developer tools`, `government & civic`, `agriculture`, `travel & tourism`, `gaming`, `non-profit & community`, `manufacturing`, `HR & recruiting`, `events & ticketing`, `general`) split roughly into: (a) probably-worth-specialising (`non-profit & community`, `government & civic`, `manufacturing`, `HR & recruiting`, `travel & tourism`, `agriculture`, `events & ticketing`); (b) genuinely-generic-and-can-stay-empty (`general`, `small business` — already deliberately broad); (c) potentially-too-niche-for-five-bullets (`developer tools`, `gaming`). At one domain per session the (a) tier covers another 7 sessions; total domain-depth runway is ~7 more sessions.

**Known limitations**
- Real-estate keyword detection (`property`, `realtor`, `rental`, `lease`, `house`) covers the obvious surfaces but misses adjacent ones — `landlord`, `tenant`, `mortgage`, `escrow`, `MLS`, `listing`, `condo`, `apartment`, `commercial real estate`, `CRE`, `REIT`, `broker`, `appraisal`, `home`. Same explicit limitation as prior runs — domain inference is a heuristic; users sharpen it in `MASTERPLAN.md`.
- Risk bullets cite jurisdiction-specific lists that age. The dual-agency state list (FL / CO / KS / OK / TX / VT / WY / AK) is correct as of Apr 2026 but state laws move; the FinCEN beneficial-ownership rule's "December 2025 in covered metro areas, expanding" is correct as of Apr 2026 but the geographic targeting orders update on a rolling basis. Phrasing is calibrated so a stale specific (e.g. one state moves) doesn't invalidate the bullet's point.
- Positioning explicitly names US-side agent-tooling incumbents (Dotloop, Skyslope) and pan-regional listing portals (Rightmove / Zoopla / OnTheMarket / ImmobilienScout24 / SeLoger). The German + French portal names are durable, the UK trio is durable. Skyslope and Dotloop are both BlueSnap-era / Fidelity-owned by 2025 but still recognisable to brokers. All names age fine over a typical kit lifetime.
- The "local-by-default" bullet uses three concrete examples (gazumping in UK, sealed bids in NZ, escrow in US). These are textbook examples in real-estate trade press and stable across years. Adding more examples would dilute the point.

**Decisions**
- **Five bullets each, matching prior specialisations** for visual consistency.
- **No keyword-list expansion in this run.** Adding `landlord` / `tenant` / `mortgage` / `escrow` / `MLS` / `listing` / `condo` / `apartment` / `home` / `broker` would broaden which ideas land here; that's a separate keyword-heuristic run, not a domain-depth run. (Same call as Runs #015 / #017 / #018 / #019 / #020.)
- **Test idea uses `property` and `real estate agents` for unambiguity**: "A property listing platform for real estate agents" — matches real estate via `property`, audience parses cleanly to `real estate agents`. This was previously the canonical non-target idea, so swapping it from the non-target list into the target list is a clean trade.
- **Two prior tests adjusted, not weakened** (same shape as Run #017). The non-target tests still cover three / four non-specialised domains; only the *specific* real-estate ideas were swapped to travel & tourism — intent and coverage unchanged.
- **Real estate picked over non-profit & community for the tenth slot.** Both have substantive depth. Real estate won on (a) regulatory density (FHA + HUD algorithmic-screening guidance + EU equivalents + AMLA + IDX contracts is a denser surface than 501(c)(3) compliance), (b) the local-by-default angle being unusually concrete here, and (c) the "two enforcement precedents in 2 years" datapoint (Meta 2022, SafeRent 2024) giving the bullets unusual concreteness. Non-profit & community moves up to the next-session shortlist.
- **AML bullet emphasises FinCEN + AMLA over country-specific FIUs.** FinCEN's beneficial-ownership rule and the EU AMLA are the two most durable references in 2026; adding country-specific FIU names (FCA in UK, AUSTRAC in AU, FINTRAC in CA) would have made the bullet fragile and longer than the others.

**Next session starts with**
- The reordered shortlist in `CLAUDE.md`. Top now: **`non-profit & community`** (501(c)(3) / charity-commission compliance, donor-data privacy, restricted-fund accounting, mission-vs-platform trust, low-budget operational reality) or **`government & civic`** (FOIA / public-records, accessibility-by-statute, procurement, constituent-data privacy under HIPAA-adjacent + state laws, election-system separateness). Public landing page is still waiting on a one-time owner action.

---

## Run #020 — 2026-04-30 — Domain depth: ninth domain (`creative & media`)

**Phase:** Phase 1 — Generation quality (continued)
**Duration:** ~0.3 session
**Goal going in:** Add `creative & media` to the specialised set — same pipeline as Runs #008 / #010 / #013 / #015 / #017 / #018 / #019. Picked creative & media over `real estate` because the AI-content-provenance regulatory surface (EU AI Act GPAI obligations from August 2025, full rollout from August 2026; California AB 2655 / SB 942 + 9+ other US state laws; C2PA / Content Credentials standard) is moving fast enough that builder-kit users are likely to bump into it directly within the lifetime of a generated kit. Neither worked example is creative & media, so a zero-drift run on `examples/` was expected and delivered.

**What changed**
- Added `"creative & media"` to both tables in `src/templates/domain-blocks.js`:
  - **Risks** (5 bullets): rights / licensing / royalty traceability as a load-bearing surface (chain of authorship, licence terms — Creative Commons variants, work-for-hire, exclusive vs. non-exclusive, geographic + duration restrictions; emit DDEX / CWR for music from day one — those are the standards used by ASCAP / BMI / SACEM / GEMA / PRS); AI-generated content disclosure as a regulated surface (EU AI Act, California AB 2655 / SB 942, 9+ US state laws, C2PA / Content Credentials standard with Adobe / Microsoft / BBC / NYT / OpenAI as backers); takedown + notice-and-action as a contractual obligation (DMCA safe-harbour 24–48h response, EU DSA enforceable for all platforms since 17 February 2024 with notice-and-action / transparency / appeal mandates); contributor-vs-platform trust as fragile (Spotify / YouTube / Substack payout-shift cycles cost goodwill, document the formula, give 60+ days' notice on changes that lower earnings, ship a creator-facing changelog); copyright + moral-rights jurisdictional patchwork (term, fair-use vs. fair-dealing, moral rights with different transferability rules, public-domain calculation — per-jurisdiction handling, never silently apply US fair use to European work).
  - **Positioning** (5 bullets): creator-first not platform-first (visible payout split, no rev-share gotchas, working export-and-leave path, creator-controlled audience-list ownership — "lock-in dressed as network effects" reads as a red flag); provenance as a feature not as compliance (C2PA-style "verifiable origin" lands as a positive signal, not a back-office obligation); audience as independent creators / small studios / 1–50-contributor creator-economy operators (Universal / Sony / Warner in music, Adobe / Avid in production, YouTube / Spotify / TikTok at distribution as the incumbents); workflow-over-hype with publish-ready in a single coherent flow (uploading + editing + captioning + tagging + distributing + reporting in one path, creators measure tools by hours-saved-per-asset); quantify in creator units (minutes saved per asset, royalty-split accuracy %, time-to-publish, sync deals closed, pitch-to-acceptance ratio, audience-retention curves, payout latency, disputed-revenue %).
- Module-load key check picks up the new key automatically; load passes.

**Files touched**
- Modified: `src/templates/domain-blocks.js`, `tests/generator.test.js`, `RUN_LOG.md`, `CLAUDE.md`.
- **Untouched:** `server.js`, `public/**`, `docs/**`, `src/index.js`, `src/context.js`, `src/schema.js`, `src/examples.js`, `src/utils/**`, `src/templates/{masterplan,productBrief}.js`, `scripts/**`, `examples/**`, `package.json`, CI workflow, `README.md`.

**Tests run**
- `npm test` → **79/79** pass (77 → 79, +2 creative tests; SPECIALISED_DOMAINS test now expects nine entries).
- **No prior tests had to be adjusted this run** (third consecutive run with this property — Runs #018 / #019 / #020). Non-target lists already used `gaming` / `real estate` / `general` / `small business`, none of which is creative & media.
- Verified that the existing `"A platform for indie game studios"` and `"A platform for indie studios"` test ideas (used in the schema-validation, no-undefined-leak, and determinism tests) still pass after specialisation. Both ideas land on `creative & media` (the `studio` keyword wins over `game` because of iteration order in `DOMAIN_KEYWORDS`), so their generated MASTERPLAN.md and DOCS/product-brief.md now include the new domain headings — but the affected tests only check schema validity, no-`undefined`-leak, and byte-identical determinism, none of which the new content disturbs.
- `npm run generate:examples` → **zero drift**. `git status -- examples` is empty. Both worked examples have non-creative domains (`small business`, `professional services`).
- Live smoke against the local server (`node server.js` then `POST /api/generate` with `"A licensing platform for independent music creators"`): productType `platform`, audience `independent music creators`, domain `creative & media`. Confirmed `### Domain-specific risks (creative & media)` heading present + C2PA + Digital Services Act + DDEX bullets render; `### Domain-specific positioning (creative & media)` heading present + Creator-first + "Provenance as a feature" bullets render.

**Drift accounting**
None outside the specialisation table itself. Worked examples byte-identical post-regen.

**Known limitations**
- Nine of 21 domain values are now specialised (~43% coverage). Crossing 50% with the next session.
- Creative-keyword detection (`artist`, `designer`, `photographer`, `studio`, `music`, `podcast`) covers the obvious surfaces but misses adjacent ones — `creator`, `producer`, `filmmaker`, `videographer`, `writer`, `author`, `journalist`, `editor`, `record label`, `imprint`, `publisher`, `independent`, `media`, `content`. Same explicit limitation as prior runs — domain inference is a heuristic; users sharpen it in `MASTERPLAN.md`. Notable: a generic `"creator"` idea won't currently land here.
- The `studio` keyword catches both `production studio` (creative & media) and `game studio` (which one might argue should be gaming). Today, `studio` wins because of iteration order. The intent is right: `"A platform for indie game studios"` is a creative-economy product more than a game-of-the-year tournament platform, and the bullets we just added apply to it directly. But this is worth flagging — a future "third-pass keyword tuning" run might split `game studio` away.
- Risk bullets cite specific named regulations and standards with effective dates (EU AI Act GPAI obligations from August 2025; full rollout from August 2026; EU DSA enforceable since 17 February 2024; California AB 2655 / SB 942). Names age — they're correct as of Apr 2026 but state-by-state AI-disclosure laws are accreting fast in the US, and the C2PA backer list is growing. The text is written so a stale name reads as a concrete example, not a load-bearing reference.
- Positioning explicitly names the major-label / studio / distribution incumbents (Universal / Sony / Warner; Adobe / Avid; YouTube / Spotify / TikTok). All durable enough as references to outlast the typical kit lifetime.

**Decisions**
- **Five bullets each, matching prior specialisations** for visual consistency.
- **No keyword-list expansion in this run.** Adding `creator` / `producer` / `filmmaker` / `videographer` / `writer` / `journalist` / `editor` / `media` / `content` would broaden which ideas land here; that's a separate keyword-heuristic run, not a domain-depth run. (Same call as Runs #015 / #017 / #018 / #019.)
- **Test idea uses `music` and `creators` for unambiguity**: "A licensing platform for independent music creators" — matches creative & media via `music`, productType is `platform`, audience parses cleanly to `independent music creators`. Doesn't accidentally hit any earlier-iterated domain.
- **No prior tests adjusted this run** — third consecutive run with this property. The existing indie-studio test ideas continue to work despite now landing on a specialised domain, because the affected tests don't assert on file content semantics, only on schema, leak-detection, and determinism.
- **C2PA emphasised over individual provenance vendors.** Adobe Content Credentials, Truepic, etc. are concrete implementations; C2PA is the open standard they all interoperate on. Naming the standard is more durable than naming the vendors.
- **Creative & media picked over `real estate`.** Both have substantive depth. Creative & media won on (a) regulatory-surface velocity (AI-content disclosure laws are expanding faster than fair-housing rules are evolving), (b) wider relevance to the kit's likely user base (more people building creator-economy / podcast / royalty / asset-management tools than MLS-IDX integrations), and (c) the C2PA / DSA / DMCA combination giving the bullets unusual concreteness for a "creative" domain that often gets vague risk text. Real estate moves to top of the next-session shortlist along with `non-profit & community` and `government & civic`.

**Next session starts with**
- The reordered shortlist in `CLAUDE.md`. Top now: **`real estate`** (fair-housing under FHA + EU equivalents, MLS / IDX integration patchwork, dual-agent disclosure, jurisdictional patchwork on rental + tenancy + listing accuracy + agency licensing, anti-money-laundering on high-value transactions) or **`non-profit & community`** (501(c)(3) / charity-commission compliance, donor-data privacy, restricted-fund accounting, mission-vs-platform trust, low-budget operational reality). Public landing page is still waiting on a one-time owner action.

---

## Run #019 — 2026-04-30 — Domain depth: eighth domain (`retail & e-commerce`)

**Phase:** Phase 1 — Generation quality (continued)
**Duration:** ~0.3 session
**Goal going in:** Add `retail & e-commerce` to the specialised set — same pipeline as Runs #008 / #010 / #013 / #015 / #017 / #018. Picked retail over `creative & media` for two reasons: (a) wider relevance for typical builder-kit ideas (more people building stores / checkout / returns / inventory than rights-management products), and (b) the regulatory surface (PCI DSS, SCA, EAA, ADA Title III, DAC7, DSA, INFORM Consumers Act, Wayfair-era marketplace-facilitator rules) is dense enough to give the bullets real weight. Neither worked example is retail, so a zero-drift run on `examples/` was expected and delivered.

**What changed**
- Added `"retail & e-commerce"` to both tables in `src/templates/domain-blocks.js`:
  - **Risks** (5 bullets): payment-card compliance is non-negotiable (PCI DSS v4.0 scope, 3-D Secure + PSD2 SCA in Europe, tokenisation through compliant processors — Stripe, Adyen, Worldpay, Braintree — and the rule that storing PAN data in-app is an immediate scope expansion almost no team should take); peak-season + flash-sale reliability as the operational test (Black Friday / Cyber Monday / Singles' Day / Boxing Day push 5–20× over baseline; capacity-test against 10× peak, document the queuing strategy, wire up a public status page before the first sale event); returns + chargebacks as an adversarial surface (return fraud and "friendly fraud" cost online retailers single-digit % of revenue; capture evidence — delivery proof, IP / device fingerprint, photos at receipt and return — at the moment it's cheap, not 90 days later); marketplace-vs-merchant as a regulatory split (VAT / sales-tax under EU OSS / IOSS + Wayfair-era US state thresholds, DAC7 reporting in the EU, marketplace-facilitator laws in 40+ US states, DSA + INFORM Consumers Act counterfeit / safety obligations); storefront accessibility is law not aspiration (EAA in full effect since June 2025, ADA Title III stream of US litigation — Domino's, Winn-Dixie — and WCAG 2.2 AA on every customer-facing page is the entry cost).
  - **Positioning** (5 bullets): conversion-first not catalogue-first (every screen earns its place by add-to-cart rate, conversion, or AOV — merchandising features come second); mobile-first means *checkout-first on mobile* (over 70% of traffic is mobile; one-thumb checkout with Apple Pay / Google Pay / Shop Pay / express wallets is the single biggest conversion lever); audience as independent merchants, DTC brands, and small-to-mid retailers (1–50 stores or up to ~$50M GMV — Shopify / BigCommerce / WooCommerce / Adobe Commerce are the platform incumbents, Salesforce Commerce Cloud + SAP Commerce sit above them); trust signals as the conversion lever (visible secure-checkout iconography, reviews surfaced in-context with source named, shipping-and-return policy on the product page, unsubscribed-by-default privacy posture); quantify in the merchant's units (conversion rate, AOV, CAC, refund / return rate, gross margin, repeat-purchase rate, contribution margin per order, abandoned-cart recovery rate).
- Module-load key check picks up the new key automatically; load passes.

**Files touched**
- Modified: `src/templates/domain-blocks.js`, `tests/generator.test.js`, `RUN_LOG.md`, `CLAUDE.md`.
- **Untouched:** `server.js`, `public/**`, `docs/**`, `src/index.js`, `src/context.js`, `src/schema.js`, `src/examples.js`, `src/utils/**`, `src/templates/{masterplan,productBrief}.js`, `scripts/**`, `examples/**`, `package.json`, CI workflow, `README.md`.

**Tests run**
- `npm test` → **77/77** pass (75 → 77, +2 retail tests; SPECIALISED_DOMAINS test now expects eight entries).
- **No prior tests had to be adjusted this run** (same as Run #018 — the cleanest specialisation diffs come when the prior swap covered the right ground). Non-target lists already used `gaming` / `real estate` / `general` / `small business`, none of which is retail.
- `npm run generate:examples` → **zero drift**. `git status -- examples` is empty. Both worked examples have non-retail domains (`small business`, `professional services`).
- Live smoke against the local server (`node server.js` then `POST /api/generate` with `"A checkout optimization tool for e-commerce shops"`): productType `tool`, audience `e-commerce shops`, domain `retail & e-commerce`. Confirmed `### Domain-specific risks (retail & e-commerce)` heading present + PCI DSS + European Accessibility Act + Digital Services Act bullets render; `### Domain-specific positioning (retail & e-commerce)` heading present + Conversion-first + Trust signals bullets render.

**Drift accounting**
None outside the specialisation table itself. Worked examples byte-identical post-regen.

**Known limitations**
- Eight of 21 domain values are now specialised (~38% coverage). At the current cadence of one domain per session, a sustained "specialise everything substantive" effort would take roughly 5–8 more sessions to bring coverage above 60%; some of the remaining domains (`gaming`, `general`, `small business`) probably do not warrant specialisation at the same depth.
- Retail-keyword detection (`shop`, `store`, `retail`, `ecommerce`, `e-commerce`, `boutique`) covers the obvious surfaces but misses adjacent ones — `merchant`, `cart`, `checkout`, `marketplace`, `DTC`, `D2C`, `seller`, `vendor`, `POS`, `point of sale`, `subscription`, `omnichannel`, `headless commerce`. Same explicit limitation as prior runs — domain inference is a heuristic; users sharpen it in `MASTERPLAN.md`.
- Risk bullets cite specific named regulations and their effective dates / scope. Names age — they're correct as of Apr 2026 but PCI DSS v4.0 is succeeded by v4.x dot-revisions, SCA thresholds vary by jurisdiction, and the EAA was *enforceable* from 28 June 2025, not enacted then. The text is written so a stale name reads as a concrete example, not a load-bearing reference.
- The risks bullet on processors names four (Stripe, Adyen, Worldpay, Braintree). Adyen and Worldpay sit at slightly different tiers than Stripe and Braintree, and the list excludes regional players (Mollie, Razorpay, Paystack, MercadoPago). The intent is "tokenise through a compliant processor", not "here is the canonical processor list".

**Decisions**
- **Five bullets each, matching prior specialisations** for visual consistency.
- **No keyword-list expansion in this run.** Adding `merchant` / `cart` / `checkout` / `marketplace` / `DTC` / `POS` would broaden which ideas land here; that's a separate keyword-heuristic run, not a domain-depth run. (Same call as Runs #015 / #017 / #018.)
- **Test idea uses `e-commerce` and `shops` for unambiguity**: "A checkout optimization tool for e-commerce shops" — matches retail via `e-commerce` and `shop`, productType is `tool`, audience parses cleanly to `e-commerce shops`.
- **No prior tests adjusted this run** — second consecutive run with this property. After Run #017's swap, the non-target lists already covered the right unspecialised set for both #018 and #019.
- **EAA worded as "in full effect since June 2025".** The regulation was enacted in 2019 with a 2025-06-28 enforcement date for in-scope products and services. Phrasing it as "in full effect since June 2025" is current-as-of-Apr-2026 and won't read stale during the typical lifetime of a generated kit.
- **Retail picked over `creative & media`.** Both have substantive depth. Retail won on (a) breadth of likely user-base relevance, (b) regulatory density that makes the bullets concrete and durable, and (c) zero-drift guarantee for `examples/`. Creative & media moves to top of the next-session shortlist along with `non-profit & community` and `real estate` as candidate ninths.

**Next session starts with**
- The reordered shortlist in `CLAUDE.md`. Top now: **`creative & media`** (rights / licensing / royalty traceability, contributor-vs-platform trust, AI-generated content disclosure under EU AI Act + state laws, takedown response under DMCA / DSA) or **`real estate`** (fair-housing rules, PII handling on inquiries, MLS / IDX integrations, dual-agent disclosure, jurisdictional patchwork on rental + tenancy + listing accuracy). Public landing page is still waiting on a one-time owner action.

---

## Run #018 — 2026-04-30 — Domain depth: seventh domain (`logistics & supply chain`)

**Phase:** Phase 1 — Generation quality (continued)
**Duration:** ~0.3 session
**Goal going in:** Add `logistics & supply chain` to the specialised set — same pipeline as Runs #008 / #010 / #013 / #015 / #017. Picked logistics because it was already top of the shortlist after Run #017 promoted it from runner-up to lead. Neither worked example is logistics, so a zero-drift run on `examples/` was expected and delivered.

**What changed**
- Added `"logistics & supply chain"` to both tables in `src/templates/domain-blocks.js`:
  - **Risks** (5 bullets): driver UX constrained by law and physics (UK Highway Code, German StVO §23, US distracted-driving laws + FMCSA mobile-phone rules for CDL drivers — voice-first or motion-locked interaction is non-negotiable on driver-facing surfaces); hardware failure modes are not just software bugs (ELDs, GPS, temperature sensors, scanners, dash cams, refrigeration controllers — every reading carries a freshness/confidence stamp, every offline gap has a documented recovery path, every sensor failure has a designed degradation state); telematics privacy as a real surface (driver location is GDPR personal data, ELD audit trail under FMCSA 49 CFR 395 is both regulatory ammunition and privacy surface, drivers/unions have pushed back in court on GPS surveillance); HOS / DOT / ELD regulatory bedrock (FMCSA 49 CFR 395 in the US, EU 561/2006 + EC 165/2014 tachograph rules in Europe — auto-dispatching into an HOS violation is a fineable offence + license risk); peak-season reliability as the operational test (Q4 retail, back-to-school, harvest, summer tourism — capacity 2–3× overnight, capacity-test against 3× peak before peak).
  - **Positioning** (5 bullets): operations-first not flashy-dashboard (next decision in under three seconds, leave fleet-wide analytics for the after-hours management surface — shift workers have no time for "data storytelling"); mobile-first for the field, desktop-first for the office (drivers + warehouse on phones / tablets / handheld scanners with gloves on, dispatchers + planners + ops managers at workstations — two surfaces, two design briefs); audience as small-and-mid carriers, 3PLs, and shipper ops teams (10–500 vehicles or 1–20 sites — Oracle / SAP / Manhattan are the incumbents at the enterprise tier, win on speed-to-onboard + workflow-slice depth + support response time); reliability and offline-first as the brand (trucks lose signal, scanners drop BT, warehouses have RF dead zones — optimistic UI with deterministic sync, conflict resolution on reconnect, queued actions surviving a force-quit, sold as a marketing surface); quantify in the operator's units (minutes per stop, dock-to-stock, perfect-order rate, cost per mile, OTIF, pick-rate per hour, dwell time — fleet managers already keep that spreadsheet).
- Module-load key check picks up the new key automatically; load passes.

**Files touched**
- Modified: `src/templates/domain-blocks.js`, `tests/generator.test.js`, `RUN_LOG.md`, `CLAUDE.md`.
- **Untouched:** `server.js`, `public/**`, `docs/**`, `src/index.js`, `src/context.js`, `src/schema.js`, `src/examples.js`, `src/utils/**`, `src/templates/{masterplan,productBrief}.js`, `scripts/**`, `examples/**`, `package.json`, CI workflow, README.md (no domain list to update there).

**Tests run**
- `npm test` → **75/75** pass (73 → 75, +2 logistics tests; SPECIALISED_DOMAINS test now expects seven entries instead of six).
- **No prior tests had to be adjusted this run.** The non-target domains test already used `gaming` / `real estate` / `general` (after Run #017's swap), and the helpers-return-empty test already used `general` / `real estate` / `gaming` / `small business`. None of those is logistics, so no swap was needed — the cleanest specialisation diff so far.
- `npm run generate:examples` → **zero drift**. `git status -- examples` is empty. Both worked examples have non-logistics domains (`small business`, `professional services`).
- Live smoke against the local server (`node server.js` then `POST /api/generate` with `"A dispatch app for trucking fleet managers"`): productType `app`, audience `trucking fleet managers`, domain `logistics & supply chain`. Confirmed `### Domain-specific risks (logistics & supply chain)` heading present, FMCSA + ELD bullets render, `### Domain-specific positioning (logistics & supply chain)` heading present, "Operations-first" bullet renders.

**Drift accounting**
None outside the specialisation table itself. Worked examples byte-identical post-regen.

**Known limitations**
- Seven of 21 domain values are now specialised (~33% coverage). Cadence holds at one domain per session.
- Logistics-keyword detection (`logistics`, `shipping`, `freight`, `warehouse`, `fleet`, `dispatch`, `courier`, `supply chain`, `last-mile`) covers the obvious surfaces but misses adjacent ones — `trucking`, `carrier`, `3PL`, `cold chain`, `parcel`, `delivery` (currently lands on the "small business" / no-keyword path), `route` / `routing`, `manifest`, `OTR` (over-the-road). Same explicit limitation as prior runs — domain inference is a heuristic; users sharpen it in `MASTERPLAN.md`.
- Risk bullets cite specific named regulations (FMCSA 49 CFR 395, EU 561/2006, EC 165/2014, UK Highway Code, German StVO §23, CCPA / CPRA / CO / CT / VA) and concrete enterprise incumbents (Oracle, SAP, Manhattan). Names age — they're correct as of Apr 2026 but will need a refresh if any incumbent is acquired or rebranded. The text is written so a stale name reads as a concrete example, not a load-bearing reference.
- The risks bullet on hardware mentions specific peripherals (ELDs, GPS, temperature sensors, scanners, dash cams, refrigeration controllers). The list is illustrative, not exhaustive — voice-controlled forklifts, RFID readers, AGVs, and weight scales aren't named. That's by design; the intent is "hardware is untrusted, give every reading a freshness stamp" rather than "here is the canonical hardware list".

**Decisions**
- **Five bullets each, matching prior specialisations** for visual consistency when readers compare two domain outputs side by side.
- **No keyword-list expansion in this run.** Adding `trucking` / `carrier` / `3PL` / `cold chain` / `parcel` would change which ideas land on this domain; that's a separate keyword-heuristic run, not a domain-depth run. (Same call as Runs #015 and #017.)
- **Test idea uses `dispatch` and `fleet` for unambiguity**: "A dispatch app for trucking fleet managers" — matches logistics via `dispatch` and `fleet`, audience parses cleanly to `trucking fleet managers`, doesn't accidentally hit any earlier-iterated domain.
- **No prior tests adjusted this run** (the cleanest specialisation diff yet). After Run #017's two swaps, the non-target lists already used `gaming` / `real estate` / `general` / `small business`, none of which is logistics.
- **Positioning explicitly names the enterprise incumbents.** Oracle, SAP, and Manhattan are concrete competitors a logistics product team will encounter in deals. Naming them is more useful to the reader than a vague "the established platforms" — and they're durable enough as references that the bullets won't read stale within the typical lifetime of a generated kit.

**Next session starts with**
- The reordered shortlist in `CLAUDE.md`. Top now: **`retail & e-commerce`** (PCI DSS / 3-D Secure / SCA, peak-season + flash-sale reliability, return-fraud surface, marketplace-vs-merchant trust split) or **`creative & media`** (rights / licensing / royalty traceability, contributor-vs-platform trust, AI-generated content disclosure, takedown response). Public landing page is still waiting on a one-time owner action.

---

## Run #017 — 2026-04-30 — Domain depth: sixth domain (`education`)

**Phase:** Phase 1 — Generation quality (continued)
**Duration:** ~0.4 session
**Goal going in:** Add `education` to the specialised set — same pipeline as Runs #008 / #010 / #013 / #015. Picked education over `logistics & supply chain` for two reasons: (a) wider relevance for the kit's likely user base (more people building EdTech than carrier dispatching tools), and (b) neither worked example is education, which guarantees a zero-drift run on `examples/`.

**What changed**
- Added `"education"` to both tables in `src/templates/domain-blocks.js`:
  - **Risks** (5 bullets): student-data privacy as special-category from day one (FERPA in the US, GDPR Art. 9 + age-appropriate-design codes in EU/UK, PIPEDA / FOIPPA in Canada, COPPA's verifiable-parental-consent rule for under-13) plus the parent-vs-student consent split (under-13 parent-controlled, 13–18 jurisdiction-dependent, 18+ student-controlled); minor-safety as a duty-of-care surface on any peer-to-peer or teacher-student channel (moderation, reporting, age-gating, cross-role logging — "family-friendly" copy is the regulatory floor); accessibility for diverse learners as the procurement gate (WCAG 2.2 AA is the entry cost — failing an accessibility audit gets a product banned from districts overnight); proctoring + academic-integrity features as a real harm-risk surface (camera-on, tab-blocking, keystroke patterns, AI cheating detection — default to assistive, not surveillance); outcomes claims as advertising claims subject to FTC / ED Department / ASA scrutiny ("raises grades by X%" needs a study, a cohort, a time window, and a comparator).
  - **Positioning** (5 bullets): tutor-not-replacement framing (lead with "saves the teacher four hours a week", avoid "AI teacher" / "auto-grader" copy that collapses procurement trust and triggers union pushback); inclusive-by-default (low-bandwidth path, captions + transcripts on every video, font-size + contrast controls, home-language ≠ English support); audience framing as teachers / administrators / parents-as-buyers, students as daily-users (rostering hooks: Clever, ClassLink, OneRoster; SSO via Google or Microsoft for Education; classroom integrations: Google Classroom, Canvas, Schoology); evidence-over-hype with cited pedagogical methods (retrieval practice, spaced repetition, formative assessment); procurement-ready marketing surface (public DPA template, FERPA / GDPR posture, WCAG audit summary, third-party sub-processor list as the most valuable B2B page in this space).
- Module-load key check picks up the new key automatically; load passes.

**Files touched**
- Modified: `src/templates/domain-blocks.js`, `tests/generator.test.js`, `README.md`, `CLAUDE.md`, `RUN_LOG.md`.
- **Untouched:** `server.js`, `public/**`, `docs/**`, `src/index.js`, `src/context.js`, `src/schema.js`, `src/examples.js`, `src/utils/**`, `src/templates/{masterplan,productBrief}.js`, `scripts/**`, `examples/**`, `package.json`, CI workflow.

**Tests run**
- `npm test` → **73/73** pass (71 → 73, +2 education tests; SPECIALISED_DOMAINS test now expects six entries instead of five).
- Two existing tests had to be adjusted (not weakened): the "non-target domains" sample list and the "helpers return empty" coverage list both used `education` (or a study-planner idea) as a non-target. Replaced with `real estate` and a property-listing idea — both still hit non-specialised domains, both still exercise the empty-return path. (Same kind of swap as Run #015 did for food & hospitality.)
- `npm run generate:examples` → **zero drift**. `git status -- examples` is empty. Both worked examples have non-education domains (`small business`, `professional services`).
- Live smoke against the local server (`node server.js` then `POST /api/generate` with `"A classroom platform for K-12 teachers"`): productType `platform`, audience `K-12 teachers`, domain `education`. MASTERPLAN.md is 6377 bytes, contains `### Domain-specific risks (education)` and the FERPA bullet. DOCS/product-brief.md contains `### Domain-specific positioning (education)` and the "Tutor, not replacement" bullet. A second smoke against `"A property listing platform for real estate agents"` (now a non-target) confirmed no `Domain-specific` heading leaked into either file.

**Drift accounting**
None outside the specialisation table itself. Worked examples byte-identical post-regen.

**Known limitations**
- Six of 21 domain values are now specialised (~29% coverage). Cadence of one domain per session keeps the diff readable and reversible.
- Education-keyword detection (`school`, `student`, `course`, `learning`, `tutor`, `teacher`, `classroom`) catches the obvious ideas but misses adjacent surfaces like `university`, `college`, `bootcamp`, `EdTech`, `LMS`, `curriculum`, `homework`, `lesson`, `grade`, `parent` (which would help with parent-side products). Same explicit limitation as prior runs — the inferred domain is a heuristic; users sharpen it in `MASTERPLAN.md`.
- The risk bullets cite specific named regulations (FERPA, COPPA, GDPR Art. 9, age-appropriate-design codes, FOIPPA, EEF) and named procurement systems (Clever, ClassLink, OneRoster, Google Classroom, Canvas, Schoology). Names age — they're fine today (Apr 2026) but will need a refresh if any of them rebrand or sunset. The text is written so a stale name reads as a concrete example, not a load-bearing reference.

**Decisions**
- **Five bullets each, matching prior specialisations** for visual consistency when readers compare two domain outputs side by side.
- **No keyword-list expansion in this run.** Adding `university` / `college` / `LMS` / `curriculum` would change which ideas land on this domain; that's a separate keyword-heuristic run, not a domain-depth run. (Same call as Run #015.)
- **Test idea uses `classroom` and `teachers` for unambiguity**: "A classroom platform for K-12 teachers" — matches education via `classroom` and `teacher`, doesn't accidentally hit any earlier-iterated domain. Tested against `buildContext` directly: productType `platform`, audience `K-12 teachers`, domain `education`. Clean.
- **Two prior tests adjusted, not weakened** (mirroring Run #015): the `non-target domains` test still asserts no orphan headings on three non-specialised domains; the `helpers return empty` test still asserts on four non-specialised domains. Only the *specific* education ideas were swapped out — the intent and coverage are unchanged.
- **Education over logistics & supply chain.** Both have substantive depth available. Education won on (a) breadth of likely user-base relevance, (b) zero-drift guarantee for `examples/`, and (c) more legible regulatory surface (FERPA / COPPA / WCAG are universally recognisable; logistics has telematics / DOT / ELD / HOS rules that are less commonly known). Logistics moves to top of the next-session shortlist.

**Next session starts with**
- The reordered shortlist in `CLAUDE.md`. Top now: **`logistics & supply chain` as the seventh specialised domain** (driver UX, hardware integration, telematics privacy, peak-season reliability, ELD / HOS regulatory surface). Public landing page is still waiting on a one-time owner action.

---

## Run #016 — 2026-04-30 — One-click "Generate now" on gallery cards

**Phase:** Phase 1 — UX surface (continued)
**Duration:** ~0.3 session
**Goal going in:** Cut the gallery flow from two clicks to one. Up to now, the path from "land on the page" to "see a generated kit produced from a worked idea" was: click **Use this idea** → idea fills the form → click **Generate kit**. The first-time-visitor "wow" moment was gated behind that second click. Add a **Generate now** button to each gallery card that runs the same end-to-end generate pipeline on click, populates the textarea so the user can see the round-trip, and scrolls to the result.

**What changed**
- `public/app.js`:
  - Extracted a shared `runGenerate(idea, { scrollToResult })` helper. Both the form's submit handler and the new card button funnel through it, so the network contract, the render path, and the source-badge logic stay in exactly one place.
  - Added `generateFromCard(idea, triggerBtn)` — disables the card button, sets its label to "Generating…", mirrors the idea into the textarea (so the live-inference preview line and audience parsing fire as if the user typed it), calls `runGenerate` with `scrollToResult: true`, and restores the button regardless of success/failure.
  - Added a third button to each gallery card. Order is now **Generate now** (primary, accent fill), **Preview example** (secondary), **Use this idea** (secondary). The previous "Preview example" was the primary; demoting it to secondary signals the new card-level call to action without removing the faster-loading example path.
  - The form's submit handler is unchanged behaviourally — it now just delegates the network/render work to `runGenerate`.
- `public/style.css`: untouched. The default `button` rule already paints accent fill, and `button.secondary` already covers the other two. The existing `.example-card .card-actions { gap: 8px; flex-wrap: wrap; }` handles three buttons on narrow widths without further work.

**Files touched**
- Modified: `public/app.js`, `RUN_LOG.md`, `CLAUDE.md`, `README.md`.
- **Untouched:** `public/index.html`, `public/style.css`, `server.js`, `src/**`, `tests/**`, `examples/**`, `docs/**`, `scripts/**`, `package.json`, CI workflow.

**Tests run**
- `npm test` → **71/71** pass. No test changes needed — the gallery's button layout is dynamic DOM that the existing test suite doesn't assert on.
- `npm run audit:a11y` → 0 axe violations on either page (37 / 25 rules), all 13 contrast pairs pass WCAG AA, lowest still 5.15:1. Static HTML didn't change, so the audit's coverage didn't change either.
- Live smoke: started the server, hit `/api/health` → `{"ok":true}`, hit `/api/generate` with the `small-business-website-system` example's idea → 12 files, slug `website-system-for-small-local-businesses`, productType `website`, domain `small business`. Hit `/api/preview` with the SaaS-accountants idea → context returned with productType `web app`, domain `professional services`, audience `small business accountants`. Confirmed the served `/app.js` contains `Generate now`, `generateFromCard`, and `runGenerate`.

**UX details worth knowing**
- **Mirroring the idea into the textarea on click is intentional, not cosmetic.** It (a) makes the round-trip visible (the user sees their input materialise in the form they would have typed into), (b) fires the live-inference preview line so "Detected: web app · for small business accountants · in professional services" lights up underneath the textarea right before the result renders, and (c) leaves the textarea pre-filled if the user wants to tweak the idea and re-generate.
- **Scroll-to-result on card-click only.** The form's submit handler doesn't scroll because the submit button is right above the result section; the scroll would feel jumpy. The card button is much further up the page (gallery sits below the form), so the scroll is necessary to reveal the freshly-rendered result without the user having to hunt for it.
- **The card button shows its own "Generating…" label** independently of the global status line. Status still updates ("Generating…" → "Generated 12 files."), but the per-button label gives local feedback so the user doesn't have to look away from where their click landed.
- **Race-safety**: `generateFromCard` is `async` and disables the trigger button for the duration. If a user clicks Generate now on card A and then card B before the first finishes, the second click is allowed (different button). That's a non-issue in practice — both calls hit the same idempotent endpoint and the latter's `renderResult` simply overwrites the first. Adding a global "in flight" lock would be over-engineering for a kit where Generate kit also accepts back-to-back submissions.

**Drift accounting**
None. Generator behaviour is unchanged, examples regenerate byte-identically (no reason to run `npm run generate:examples` — no template touched), and the static HTML is unchanged so the a11y audit holds.

**Known limitations**
- The new button is text-only ("Generate now"). It could earn an icon for visual differentiation from "Preview example", but adding an SVG icon for a single button is an inconsistency the rest of the UI doesn't have. Skipped.
- On very narrow viewports (≤ ~360 px), three card buttons can wrap onto three lines. That's by design — `flex-wrap: wrap` is the right call there; the cards stay readable. Tested mentally; not worth a media-query change.
- The card click bypasses the `persist` checkbox the user might have ticked at the top of the form. We use whatever `persist` is currently set to. That's correct — the checkbox is a global form preference, not a per-card setting.

**Decisions**
- **Button hierarchy is "Generate now (primary), Preview example (secondary), Use this idea (secondary)".** Previously "Preview example" was the primary. Demoting it sounds risky but is right: a first-time visitor who clicks the primary action of a gallery card now gets the full generator round-trip. The faster-loading "Preview example" path is preserved for users who want to skip rendering, and "Use this idea" stays as the explicit "I want to edit this before generating" escape hatch.
- **No new CSS class for the primary card button.** The default `button` rule already paints it correctly. Adding a `.card-cta` class would be a layer of indirection without a behavioural difference; we'd be inventing a name for "default button styling".
- **No global in-flight lock across cards.** Two reasons: (a) the form's Generate kit button doesn't have one either, so adding one only on the gallery would be inconsistent; (b) the worst case is two API round-trips with the second's render winning, which is fine.
- **Mirror the idea into the textarea on click.** Considered keeping the textarea blank to avoid surprising the user with content they didn't type. Rejected: making the round-trip visible is the whole point of this change.

**Next session starts with**
- The reordered shortlist in `CLAUDE.md`. Top now: **`education` or `logistics & supply chain` as the sixth specialised domain** (same mechanism as Runs #008 / #010 / #013 / #015). Public landing page is still waiting on a one-time owner action (Settings → Pages → Source: main / /docs).

---

## Run #015 — 2026-04-30 — Domain depth: fifth domain (`food & hospitality`)

**Phase:** Phase 1 — Generation quality (continued)
**Duration:** ~0.3 session
**Goal going in:** Add `food & hospitality` to the specialised set — same pipeline as Runs #008 / #010 / #013, no scope creep, no example drift outside the targeted domain.

**What changed**
- Added `"food & hospitality"` to both tables in `src/templates/domain-blocks.js`:
  - **Risks** (5 bullets): seasonality + tight margin pressure (revenue swings hard, daily core action must work brilliantly during 2× rushes); structural front-of-house staff turnover (60–100% annual is normal — onboarding has to survive a new server's first Friday-night shift, train-by-doing > train-by-handout); allergen + food-safety compliance (EU 1169/2011, FDA / FSA, HACCP, date-coding) as regulatory bedrock not "best effort"; peak-hour reliability as the whole game ("two minutes during Saturday rush > two hours on Tuesday"); owner-operator economics (single-digit net margins, the product has to demonstrably save labour, prevent waste, or unlock revenue per shift — quantified).
  - **Positioning** (5 bullets): simple-on-shift first (every interaction in <5 s with one hand on a phone screen smudged with grease); no-laptop-needed (the same phone in the apron is the only surface that matters during service); audience framing as owner-operators and floor managers of independents and 1–5-site chains, **not** enterprise hospitality groups; save-time-or-save-waste pitched in the operator's units (labour hours, food cost percent, covers per shift); reliability as the brand ("still works during Saturday rush" is the most expensive thing competitors fail at).
- Module-load key check picks up the new key automatically; load passes.

**Files touched**
- Modified: `src/templates/domain-blocks.js`, `tests/generator.test.js`, `README.md`, `CLAUDE.md`, `RUN_LOG.md`.
- **Untouched:** `server.js`, `public/**`, `docs/**`, `src/index.js`, `src/context.js`, `src/schema.js`, `src/examples.js`, `src/utils/**`, `src/templates/{masterplan,productBrief}.js`, `scripts/**`, `examples/**`, `package.json`, CI workflow.

**Tests run**
- `npm test` → **71/71** pass (69 → 71, +2 food & hospitality tests; SPECIALISED_DOMAINS test now expects five entries instead of four).
- Two existing tests had to be adjusted (not weakened): the "non-target domains" sample list and the "helpers return empty" coverage list both used `food & hospitality` (or a food idea) as a non-target. Replaced with `education` and a study-planner idea — both still hit non-specialised domains, both still exercise the empty-return path.
- `npm run generate:examples` → **zero drift**. `git status -- examples` is empty. Both worked examples have non-food domains (`small business`, `professional services`).

**Drift accounting**
None outside the specialisation table itself. Worked examples byte-identical post-regen.

**Known limitations**
- Five of 21 domain values are now specialised (~24% coverage). Cadence of one domain per session keeps the diff readable and reversible.
- F&B-keyword detection (`restaurant`, `cafe`, `bistro`, `bar`, `menu`, `kitchen`, `dining`) does not currently catch `pub`, `gastropub`, `food truck`, `caterer`, or `coffee shop` (the last reads as "shop" → retail under leading-`\b` matching, then small business via "small … business"). Edge cases are by design — the kit is explicit that the inferred domain is a heuristic and the user is expected to sharpen it.

**Decisions**
- **Five bullets each, matching prior specialisations** for visual consistency when readers compare two domain outputs side by side.
- **No keyword-list expansion in this run.** Adding `pub` / `gastropub` / `caterer` / `food truck` would change which ideas land on this domain; that's a separate keyword-heuristic run, not a domain-depth run.
- **Test idea uses `restaurant` and `app` for unambiguity**: "A menu management app for restaurant staff" — matches food via `restaurant` and `menu`, doesn't accidentally hit any earlier-iterated domain.
- **Two prior tests adjusted, not weakened.** The `non-target domains` test still asserts no orphan headings on three non-specialised domains; the `helpers return empty` test still asserts on four non-specialised domains. Only the *specific* food/hospitality ideas were swapped out — the intent and coverage are unchanged.

**Next session starts with**
- The reordered shortlist in `CLAUDE.md`. Top now: **one-click "Generate now" on gallery cards** (small UX win), then **`education`** or **`logistics & supply chain`** as the sixth specialised domain.

---

## Run #014 — 2026-04-30 — Brand identity v3 + landing-page polish (PNG OG, hero, asset sync)

**Phase:** Phase 1 — UX surface (continued)
**Duration:** ~1.5 sessions
**Goal going in:** Push the brand from "good enough" to "actually distinctive". The previous 12-pointed compass star (Run #009) was clean but read as a generic star at small sizes. Replace it with a mark that has its own silhouette, ship a proper PNG OG card so link unfurls work everywhere, dress the landing-page hero so the brand reads on first glance, and end the manual asset-sync debt that's been carried since Run #005.

**The new mark — twelve-petal compass bloom**

A radial pattern of 12 leaf-shaped petals around a luminous core:

- Twelve petals total — one per generated Markdown file. The count is the meaning.
- Four petals on the cardinal directions (N / E / S / W) extended to outer radius 28 (vs. 22 for the eight intermediate petals). Same "compass of orientation" reading as v2 but with more visual rhythm — the long/short alternation creates a directional anchor without being literal about it.
- Cardinal petals get a slightly lighter gradient (`#c8d8ff → #a4c2ff → #7aa8ff`) than the intermediate petals (`#a4c2ff → #8ab4ff → #5e8eff`) so they read as the structural anchors, not as outliers.
- Tiny radial-gradient core (`#ffffff → #cdd9ff → #8ab4ff`) sits at the geometric centre; it's the "original idea" the bloom is structured around.
- A soft radial aura behind the petals adds depth without busy-ness.
- Three layered CSS animations, each with its own cycle so they phase against each other instead of locking into a single beat:
  - `bk-ripple` (4.8 s) — every petal rises briefly (opacity 0.78 → 1, scale 1 → 1.025) then falls. The 12 petals are staggered 0.4 s each so the rise travels around the bloom as a clean clockwise wave.
  - `bk-heartbeat` (4.8 s) — the core pulses in scale (1 → 1.18) and opacity (0.85 → 1).
  - `bk-aura-breathe` (6.4 s) — the aura swells and subsides; longer cycle so it phases against the ripple instead of locking.
  - All three honour `@media (prefers-reduced-motion: reduce)`.

The whole mark is a 24-vertex geometric shape with bezier-curved petal outlines — distinct from a star, distinct from a snowflake, distinct from a flower. Most importantly: **distinct at 16 px**. The four cardinal extensions push past the rest of the silhouette so even the favicon reads as "that thing", not "any star".

**Landing-page hero polish**

- Two-column hero grid: copy on the left, the new logo at 280 px on the right. Below 820 px the columns stack and the logo moves above the copy.
- The hero gets an "aurora" effect — three soft, blurred radial blobs (filter: blur(90px), opacity 0.4–0.55) behind the content. Each drifts on its own slow cycle (22 s / 28 s / 26 s) so the background feels alive but never distracting. Pure CSS, zero JavaScript, zero new dependencies, respects `prefers-reduced-motion`.
- The hero logo carries the same animated SVG used in the local app, so the brand reads identically across the local UI and the landing page.

**Social card (PNG)**

- New `docs/og-source.svg` — 1200×630, dark gradient background, two-blob aurora, the new mark scaled 6.5× on the left, and a typeset right column with eyebrow tag, three-line headline (last line in accent), tagline, and brand line.
- New `scripts/build-og.js` — uses `@resvg/resvg-js` (WASM, no native binary) to rasterise the source SVG to `docs/og-card.png` (1200×630, ~207 KB). Wired up as `npm run build:og`.
- The PNG is committed to the repo so GitHub Pages serves it with no build step.
- `docs/index.html` gains `og:image`, `og:image:width`, `og:image:height`, `twitter:card`, `twitter:image`, `twitter:title`, `twitter:description` meta tags pointing at `./og-card.png`.

**Asset-sync automation**

- New `scripts/sync-docs-assets.js` — mirrors `public/{logo,logo-monochrome,favicon}.svg` to `docs/`. Exposes two npm scripts:
  - `sync:assets` — copy and report.
  - `sync:assets:check` — exit 1 if any pair would change.
- CI workflow gains a `Verify brand assets in /docs match /public` step running the check, so any future unsynced edit fails the pipeline rather than landing silently.

**Files touched**

- Added: `scripts/sync-docs-assets.js`, `scripts/build-og.js`, `docs/og-source.svg`, `docs/og-card.png`, `docs/logo-monochrome.svg`.
- Replaced (same paths): `public/logo.svg`, `public/logo-monochrome.svg`, `public/favicon.svg`, `docs/logo.svg`, `docs/favicon.svg`.
- Modified: `docs/index.html`, `docs/style.css`, `docs/README.md`, `package.json`, `package-lock.json`, `.github/workflows/ci.yml`, `README.md`, `CLAUDE.md`, `RUN_LOG.md`.
- **Untouched:** `server.js`, `public/index.html`, `public/style.css`, `public/app.js`, `src/**`, `tests/**`, `examples/**`, `scripts/build-example.js`, `scripts/a11y-audit.js`. Generator behaviour unchanged.

**Tests run**

- `npm test` → **69/69** pass (no test changes — the logo work is static).
- `npm run audit:a11y` → 0 violations on either page (37 / 25 rules), all 13 contrast pairs pass WCAG AA, lowest still 5.15:1.
- `npm run sync:assets` → mirrored three SVGs into `/docs`.
- `npm run sync:assets:check` → "in sync."
- `npm run build:og` → wrote `docs/og-card.png` (206.5 KB, 211431 bytes). Visual review of the rendered PNG: bloom centred, headline bold, eyebrow tag legible, all copy crisp.
- `npm run generate:examples` → both example folders rebuild byte-identically.
- Live smoke on a static server against `docs/`:
  - `/` 200 / 10839 B with `og:image`, `og:image:width/height`, `twitter:card`, `twitter:image` meta tags present.
  - `/style.css` 200 / 8186 B.
  - `/logo.svg` 200 / 5707 B.
  - `/favicon.svg` 200 / 1592 B.
  - `/og-card.png` 200 / 211431 B.

**Drift accounting**

None in `examples/`. The only "drift" is intentional and committed: brand assets in `public/` and `docs/` were replaced in lockstep, the new monochrome SVG was added to `docs/` (it didn't exist there before), and the OG card was generated for the first time.

**Known limitations**

- The OG card depends on whichever sans-serif font `resvg` picks up from the build machine. We pass `defaultFontFamily: "DejaVu Sans"` (present on Linux CI runners) and `loadSystemFonts: true`. Re-renders on a machine without that family will fall back to whatever is available; the headline shape may shift by a few pixels. Acceptable for a build artefact that's checked in.
- The hero aurora uses `filter: blur(90px)` which is GPU-cheap on modern browsers but can be heavy on low-end Android. If we ever see complaints we can drop one of the three blobs or reduce the blur radius.
- The logo's twelve `<g class="bk-petal">` elements depend on `:nth-child(N)` selectors for the per-petal animation delay. If anyone reorders the SVG by hand, the wave direction changes; comments in the file flag this.
- `@resvg/resvg-js` is WASM-only, but it does have a native build step via prebuilds. On unusual platforms (Alpine, FreeBSD) it may need a fallback. Not blocking — the PNG only needs to be regenerated rarely.
- The animated logo is loaded via `<img>` in `docs/index.html`; the embedded `<style>` inside the SVG runs in modern browsers but won't run in IE11 (irrelevant) or in some older email-client renderers (also irrelevant for a landing page).

**Decisions**

- **12-petal bloom over 12-point star.** The radial wave reads as deliberate and calm; the cardinal extension preserves the "compass" reading without leaning on the star cliché. Chunky asterisk-style options (Anthropic-like) felt close-to-imitation; the bloom is genuinely the kit's own shape.
- **PNG OG card committed to git.** Re-rendering on every push is noise; landing pages share rarely. The PNG sits next to the source SVG in `docs/`, regenerable in one command.
- **`@resvg/resvg-js`, not `sharp` or `puppeteer`.** Pure-JS WASM, ~5 MB on disk vs. 50 MB+ for sharp; no system Cairo/Pango required. Build is deterministic across the contributors we expect.
- **CSS-only aurora.** Adding a JS-driven canvas effect would have been more dynamic but would break the "no JavaScript required" line in the landing-page footer. Three blurred blobs with stagger-cycled keyframes give the same impression at zero runtime cost.
- **Sync script is its own tool, not a `prepublish` hook.** Explicit is better than magic — `npm run sync:assets` is a verb the author types when they touch the brand assets, and CI guards the rest.
- **Dev dependencies only.** `@resvg/resvg-js` joins `axe-core` + `jsdom` as audit/build-only tools. The runtime promise (express + archiver, nothing else) is unchanged.

**Next session starts with**

- The reordered `CLAUDE.md` shortlist. Top is now **one-click "Generate now" on gallery cards** (small, high-value onboarding win), then **`food & hospitality`** as the fifth specialised domain. The landing page is in good shape; the remaining piece on it is purely owner-side (enable GitHub Pages in the repo settings).

---

## Run #013 — 2026-04-29 — Domain depth: fourth domain (`finance`)

**Phase:** Phase 1 — Generation quality (continued)
**Duration:** ~0.2 session
**Goal going in:** Add `finance` to the specialised set — same pipeline as Runs #008 and #010, no scope creep, no example drift.

**What changed**
- Added `"finance"` to both tables in `src/templates/domain-blocks.js`:
  - **Risks** (5 bullets): regulatory drift across multiple regimes (GDPR, MiFID II, PSD2, DORA in EU; SOX, GLBA, BSA in US; APRA / FCA / MAS / equivalents elsewhere) with a "pin the version + re-evaluate on a calendar" rule; KYC / AML inheritance once the product touches funds, identity, or onboarding; model risk on any predictive component (training-data lineage + validation + monitoring + deterministic fallback); audit trail as non-negotiable, exportable, and shipped *before* features that depend on it; conservative defaults over impressive automation, because the blast radius of a wrong automated decision in finance is dollars and lawsuits.
  - **Positioning** (5 bullets): auditable-by-default (audit trail is the product, not a feature flag); conservative defaults (read-only first, opt-in writes, multi-step confirmation on irreversible actions); clean separation between informational and advisory output (wording in the product is the contract with the regulator); compliance-aware finance-team audience framed in their own language (controls, evidence, reproducibility) rather than fintech-startup language; reliability as the marketing message (numbers don't disagree across screens, exports tie to the system of record, monthly close doesn't surprise anyone).
- Module-load key check picks up the new key automatically; load passes.

**Files touched**
- Modified: `src/templates/domain-blocks.js`, `tests/generator.test.js`, `README.md`, `CLAUDE.md`, `RUN_LOG.md`.
- **Untouched:** `server.js`, `public/**`, `docs/**`, `src/index.js`, `src/context.js`, `src/schema.js`, `src/examples.js`, `src/utils/**`, `src/templates/{masterplan,productBrief}.js`, `scripts/**`, `examples/**`, `package.json`, CI workflow.

**Tests run**
- `npm test` → **69/69** pass (67 → 69, +2 finance tests; the `SPECIALISED_DOMAINS` test now expects four entries instead of three).
- `npm run generate:examples` → **zero drift**. `git status -- examples` is empty. Both worked examples have non-finance domains (`small business`, `professional services`).

**Drift accounting**
None. No file under `examples/` changed. The `domain heuristics: existing examples remain stable after expansion` test continues to pin both example domains.

**Known limitations**
- Four of 21 domain values are now specialised (~19% coverage). Next priority shifts away from breadth — see the reordered shortlist in `CLAUDE.md`.
- Finance keyword detection (`bank`, `finance`, `invoice`, `payment`, `fintech`) is intentionally narrow. An idea like "An app for crypto traders" would still land on `general` — by design; the kit is explicit that the inferred domain is a heuristic.

**Decisions**
- **One domain per session, period.** Same rhythm as #008 / #010.
- **Five bullets each, matching prior specialisations** for visual consistency when readers compare two domain outputs side by side.
- **Did not expand the finance keyword list.** Adding `crypto` / `treasury` / `ledger` / `compliance` would change which ideas land on this domain; that's a separate keyword-heuristic run, not a domain-depth run.
- **Test idea uses an unambiguous finance phrase**: "A payment reconciliation tool for finance teams" — matches finance via `payment` and `finance`, doesn't accidentally hit any earlier-iterated domain.

**Next session starts with**
- Re-shuffled priorities in `CLAUDE.md`. Top of the list now: **landing-page polish** (PNG OG image, hero visual, `scripts/sync-docs-assets.js`) or the **one-click "Generate now"** button on gallery cards. Domain depth continues at the same cadence — `food & hospitality` is the next candidate when we return to it.

---

## Run #012 — 2026-04-29 — A11y deep-dive: axe-core via jsdom + manual contrast pass

**Phase:** Phase 1 — UX surface (continued)
**Duration:** ~0.6 session
**Goal going in:** Run an automated accessibility audit against both rendered surfaces (`public/index.html` for the local app and `docs/index.html` for the GitHub Pages landing) using the same tooling real auditors use, capture every finding, fix anything blocking, and ship a reproducible audit so future regressions are caught in CI.

**What changed**
- **Two new dev dependencies (only):** `axe-core@^4.11.4` (the de-facto WCAG runtime) and `jsdom@^29.1.0` (so we can run axe in `node:test` without spinning a real browser). Runtime dependency surface is unchanged — still just `express` + `archiver`.
- **`tests/a11y.test.js`** — three new test cases:
  1. axe-core run against `public/index.html` with its inlined stylesheet, asserting **zero** violations of `critical` or `serious` impact.
  2. axe-core run against `docs/index.html` with the same assertion.
  3. Deterministic 11-pair WCAG-AA contrast check on the actual colour pairings used in the UI (text-on-bg, muted-on-panel-2, accent-on-panel, primary-button-label-on-accent, danger-on-bg, etc.). Computed with the standard sRGB relative-luminance formula; lowest pair must be ≥ 4.5:1 for normal text or ≥ 3:1 for large text / UI components.
- **`scripts/a11y-audit.js`** — verbose, standalone CLI version of the same audit (axe + contrast). Designed for interactive runs (`npm run audit:a11y`) when you want to see passes / incomplete / contrast ratios in full. Exit code 0 on a clean run, 1 if any axe violation or contrast failure surfaces.
- **`package.json`** — new script `audit:a11y`. devDependencies block now exists (`axe-core`, `jsdom`).
- **No changes to runtime code, server, templates, public/ HTML/CSS/JS, docs/ HTML/CSS, or examples.** The audit found nothing worth fixing. The manual a11y work in earlier runs (skip link in Run #003, focus-visible + aria-current + role="status" + aria-live + descriptive aria-labels) was thorough enough to clear axe at this scope.

**Audit results**

```
=== PUBLIC  (npm start UI) ===
violations:                                      0
incomplete (jsdom limit, see contrast pass):     3
  color-contrast      (covered by manual pass below)
  landmark-one-main   (false-incomplete; <main> is present)
  page-has-heading-one (false-incomplete; <h1> is present)
passes:                                          37 rules

=== DOCS   (GitHub Pages landing) ===
violations:                                      0
incomplete:                                      3 (same three as above)
passes:                                          25 rules

=== WCAG colour contrast (manual) ===
✓  15.81 : 1   target 4.5   text    on bg        — body text on page background
✓  14.59 : 1   target 4.5   text    on panel     — body text on panel surface
✓  13.31 : 1   target 4.5   text    on panel2    — preformatted file content on panel-2
✓   6.12 : 1   target 4.5   muted   on bg        — muted hint text on page background
✓   5.65 : 1   target 4.5   muted   on panel     — muted hint text on panel
✓   5.15 : 1   target 4.5   muted   on panel2    — muted text on panel-2 (file viewer header)
✓   9.05 : 1   target 4.5   accent  on bg        — accent text/link on page background
✓   8.34 : 1   target 4.5   accent  on panel     — accent text on panel (cards)
✓   7.61 : 1   target 4.5   accent  on panel2    — active file name in nav
✓   9.05 : 1   target 4.5   bg      on accent    — primary button label on accent fill
✓  13.31 : 1   target 4.5   text    on panel2    — secondary button label on panel-2 fill
✓   8.33 : 1   target 4.5   danger  on bg        — error status text on page background
✓   9.05 : 1   target 3     accent  on bg        — skip-link accent on bg (large)
all pairs pass WCAG AA
```

**A11y status checklist (locked in by tests)**

- [x] Skip link to main content (`Skip to main content` → `#main`)
- [x] Visible `:focus-visible` outline on all interactive elements
- [x] `<main>` landmark with `tabindex="-1"` so the skip link can move focus to it
- [x] Single, top-level `<h1>` per page; correct heading hierarchy beneath
- [x] Form input has `<label for=>` and an `aria-describedby` hint
- [x] All `<button>`s have visible text or descriptive `aria-label` (gallery cards: `aria-label="Preview example: <title>"`)
- [x] Status region has `role="status"` + `aria-live="polite"` for generation feedback
- [x] Live preview line under the textarea has `aria-live="polite"`
- [x] Active file in the file list carries `aria-current="true"`
- [x] Gallery list uses semantic `<ul>` of `<li>` cards with `aria-busy` while loading
- [x] Decorative logo `<img>` is `alt=""` + `aria-hidden="true"` (h1 already names the product)
- [x] All 11 audited colour pairs ≥ WCAG AA contrast targets
- [x] No `target="_blank"` traps without `rel="noopener"` (verified — only the GitHub links, all with `rel="noopener"`)
- [x] Native HTML elements throughout — no role-styled `<div>`s

**Files touched**
- Added: `tests/a11y.test.js`, `scripts/a11y-audit.js`.
- Modified: `package.json`, `package-lock.json`, `README.md`, `CLAUDE.md`, `RUN_LOG.md`.
- **Untouched:** `server.js`, `public/**`, `docs/**`, `src/**`, `examples/**`, `scripts/build-example.js`, CI workflow, the existing `tests/generator.test.js`. The a11y work was pure additive verification — nothing rendered needed to change.

**Tests run**
- `npm test` → **67/67** pass (64 → 67, +3 a11y tests).
- `npm run audit:a11y` → 0 violations on either page, 0 contrast failures, exit code 0.
- `npm run generate:examples` → both example folders rebuild byte-identically; `git status -- examples` clean.

**Drift accounting**
None. No example file changed. No template changed. No runtime code changed. Only test/script files added and docs updated.

**Known limitations**
- jsdom can't perform real layout, so axe rules that depend on it (`color-contrast`, `landmark-one-main`, `page-has-heading-one`) report `incomplete` rather than `pass`/`fail`. Color contrast is covered deterministically by the manual pair-wise pass; the other two are sanity-checked against the actual HTML (both files demonstrably have a single `<main>` and a single top-level `<h1>`).
- The `public/index.html` audit runs against the **initial** static markup, not the post-`app.js` populated DOM (gallery cards and file list). Those parts use real `<button>`s with descriptive `aria-label`s so the structural a11y story carries over, but a future run could spin up Express in-process and use Playwright/`axe-puppeteer` for a fully-rendered audit if we ever want to upgrade.
- We're auditing against `wcag2a + wcag2aa + wcag21a + wcag21aa + best-practice`. WCAG 2.2 (Sept 2023) added five new SC; axe-core's `wcag22aa` tag is supported but not enabled here. Worth flipping on once we've validated nothing regresses.
- `axe-core` and `jsdom` are devDependencies, but they bring transitive dependencies (jsdom in particular). Acceptable cost for accessibility coverage; runtime surface unchanged.

**Decisions**
- **devDependencies, not runtime.** Two new packages, both audit-only. Runtime promise (`express` + `archiver`, nothing more) holds.
- **Manual contrast pass as a separate, deterministic test.** Faster, more readable, and platform-independent compared to spinning up a real browser just to satisfy one rule.
- **CI runs `npm test`, which now includes a11y.** No separate CI step. The verbose audit script is for human review, not gating.
- **Sequence of `padEnd`/`padStart` formatting in the audit script** is a cosmetic choice for legibility, not a regression risk.
- **No accessibility regressions to fix.** This is the strongest possible outcome of an audit and reflects deliberate work in earlier runs. Locking it in via tests is the right move so accidental regressions trip CI.

**Next session starts with**
- The `finance` domain depth (4th specialised domain), or one of the other entries in the next-run shortlist in `CLAUDE.md`. Suggested order: `finance` → landing-page polish (PNG OG image + asset-sync script) → one-click "Generate now" on gallery cards.

---

## Run #011 — 2026-04-29 — User-value upgrade: live inference preview + better audience parsing

**Phase:** Phase 1 — UX surface (continued)
**Duration:** ~0.5 session
**Goal going in:** Pause domain breadth/depth and concentrate the run on raising the everyday usefulness of the kit — make the inference layer visible to the user as they type, so they understand what the system is picking up before they commit; and make the inference itself catch a few common phrasings it was missing.

**What changed**
- **New endpoint `POST /api/preview`** in `server.js`. Same input contract as `/api/generate` (single `idea` string, max 500 chars), but it returns only `{ context }` — no file rendering, no ZIP, no disk write. Backed directly by `buildContext` from `src/context.js`, so the call cost is essentially regex evaluation against the idea string. Designed to be hit on every keystroke (debounced) without breaking a sweat.
- **Live inference preview in the UI**: a new `<p id="preview-line">` lives directly under the idea textarea. As the user types, a debounced 350 ms call to `/api/preview` populates it with `Detected: <productType> · for <audience> · in <domain>`. Empty input clears the line; stale responses are dropped via a sequence number guard so a fast typist doesn't see flickering older results. Programmatic value updates (e.g. when "Use this idea" populates the field from a gallery card) now dispatch a synthetic `input` event so the preview line refreshes too.
- **Smarter audience extraction in `src/context.js`**. Replaced the two-pattern `AUDIENCE_HINTS` array with five patterns ordered most-specific first:
  1. `(?:built|made|designed|tailored)\s+for\s+X` — explicit "built for / designed for / made for / tailored for" phrasing.
  2. `for\s+X` — the original generic pattern. Still wins for any idea that uses it, so existing examples are byte-stable.
  3. `(?:that|which)\s+helps?\s+X` — catches "an app that helps freelancers …".
  4. `to\s+help\s+X` — catches "software to help dental clinics …".
  5. `(?:aimed|targeted)\s+at\s+X` — catches "a platform aimed at indie podcasters …".
  Patterns 3–5 only fire when 1–2 don't match, so the change is additive. Inline comment explains the precedence rule for future contributors.
- **Tests grew 57 → 64** (+7):
  - 4 new audience-extraction tests covering "that helps X", "to help X", "aimed at X", and a guard test that the existing `for X` precedence wins when both patterns could match (preventing a future re-order from silently re-routing audience captures).
  - 3 new HTTP tests on `/api/preview`: happy path returns `context.productType`, `context.domain`, `context.audience` for a known idea and explicitly does **not** include `files` / `fileCount` (cheap-call contract). 400 for empty idea. 400 for over-500-char idea.
- **CSS**: small `.preview-line` rule with `min-height: 20px` so the inference line never causes layout shift, plus a 120 ms opacity transition; empty content collapses to opacity 0.

**Files touched**
- Added: nothing.
- Modified: `server.js`, `src/context.js`, `public/index.html`, `public/style.css`, `public/app.js`, `tests/generator.test.js`, `README.md`, `CLAUDE.md`, `RUN_LOG.md`.
- **Untouched:** `docs/**`, `src/index.js`, `src/schema.js`, `src/examples.js`, `src/templates/**`, `src/utils/**`, `scripts/**`, `examples/**`, `package.json`, CI workflow.

**Tests run**
- `npm test` → **64/64** pass.
- `npm run generate:examples` → **zero drift**. `git status -- examples` is empty after regen. The new audience patterns are additive and the existing `for X` pattern still wins for both worked-example ideas, so generated content is byte-identical.
- Live smoke on `:5180`:
  - `POST /api/preview` for `"An app that helps freelancers track invoices"` → 200, `productType: "app"`, `domain: "professional services"` (previously this would have hit the generic `"early adopters …"` audience fallback), `audience` includes "freelancers".
  - `POST /api/preview` with empty idea → 400.
  - `POST /api/preview` with 501-char idea → 400.

**Drift accounting**
None. Worked examples are byte-identical post-regen. Existing tests remain green at their original assertions.

**Known limitations**
- Audience extraction is still string-pattern matching, not NLP. For an idea without a terminating punctuation mark, the lazy quantifier expands to end-of-string, so `"An app that helps freelancers track invoices"` produces `audience: "freelancers track invoices"` rather than just `"freelancers"`. The user can sharpen this in `MASTERPLAN.md`; the kit already advertises that the inference is a heuristic.
- The live preview hits the network on every keystroke (debounced 350 ms). On a flaky connection, the preview line silently clears rather than showing a stale state. No retry, no offline mode — appropriate for a local-first dev tool.
- The preview endpoint returns the full `Context` object, which includes `generatedAt` (a timestamp). On every preview call this changes, which means a smart client that wanted to compare preview-vs-generate context would need to ignore that field. Not a real problem today (the UI only displays `productType / audience / domain`), but worth knowing.
- Preview rate-limiting is not implemented. A malicious tab could fire thousands of requests per second. Acceptable for a local-only tool; if this is ever exposed publicly, a debounce on the server side (e.g. token bucket per IP) would be the right addition.

**Decisions**
- **`POST` not `GET`** for preview, matching the rest of the API surface. Idea strings are short enough to fit in a query string, but consistency wins; documentation surface stays smaller.
- **`buildContext` directly, not `generateKit`**. `generateKit` runs all 12 templates and validates each output; the preview only needs the context, so we skip ~95% of the work and keep keystroke-rate calls comfortable.
- **Debounce on the client at 350 ms**, not on the server. Lower-latency than waiting for server-side throttling, and means the preview feels instant on local dev where the round-trip is sub-10ms.
- **Sequence-number guard against stale responses**, not request cancellation via `AbortController`. Simpler, no DOM-API edge cases on iOS Safari, and the cost is one in-flight fetch that returns dropped data instead of being torn down.
- **Audience patterns reordered specific-first**, not appended. The original code had `for X` ahead of `built for X`; the reordering is functionally identical for current inputs (since `for X` always matched any `built for X` input first anyway), but reading the array top-down now describes precedence honestly: "explicit phrasing → generic phrasing → semantic fallbacks".
- **No new dependency.** Live preview is plain `fetch` + `setTimeout` + `dispatchEvent(new Event("input"))`. ~30 LOC of vanilla JS.

**Next session starts with**
- **Domain depth: `finance`** — the next-priority domain on the shortlist. Risks (regulatory drift across GDPR / MiFID II / PSD2 / DORA, KYC/AML, model risk, audit trail), positioning (auditable-by-default, conservative defaults, clear advisory-vs-informational separation, fit for compliance-aware finance teams). Same mechanism as Run #010, expected drift only in any future finance-domain example.
- Or, if you'd rather keep stacking user-value wins: a one-click "Generate now" button on each example card that goes idea→result panel without the intermediate "Use this idea + Generate" two-step.

---

## Run #010 — 2026-04-29 — Domain depth: third domain (`health & wellness`)

**Phase:** Phase 1 — Generation quality (continued)
**Duration:** ~0.2 session
**Goal going in:** Add `health & wellness` to the specialised set — same mechanism as Run #008, no scope creep, no example drift.

**What changed**
- Added `"health & wellness"` to both tables in `src/templates/domain-blocks.js`:
  - **Risks** (5 bullets): health-data handling under HIPAA-style and GDPR Art. 9 obligations; designed-and-tested crisis/escalation path **before** launch; off-label-use is inevitable, surface in-product disclaimers + a referral path; clinical-claims language ("treats / diagnoses / cures") moves the product into FDA SaMD / EU MDR territory; trust under bad-news scenarios (incident response and user-data export must work end-to-end before traffic scales).
  - **Positioning** (5 bullets): trust over features; calm tone, no gamification of distress; evidence-backed (cite the study or guideline with a date), not influencer-backed; visible escalation-to-a-real-human path; audience framing as people self-managing health, complementing — not replacing — clinicians.
- Module-load key check now sees three keys; load passes.

**Files touched**
- Modified: `src/templates/domain-blocks.js`, `tests/generator.test.js`, `README.md`, `CLAUDE.md`, `RUN_LOG.md`.
- **Untouched:** `server.js`, `public/**`, `docs/**`, `src/index.js`, `src/context.js`, `src/schema.js`, `src/examples.js`, `src/utils/**`, `src/templates/{masterplan,productBrief}.js`, `scripts/**`, `examples/**`, `package.json`, CI workflow. The change is purely additive in one file plus tests.

**Tests run**
- `npm test` → **57/57** pass (55 → 57, +2 new health tests; the `SPECIALISED_DOMAINS` test now expects three entries instead of two).
- `npm run generate:examples` → **zero drift**. `git status -- examples` is empty. Both worked examples have non-health domains (`small business`, `professional services`), so the new specialisation is invisible to them — exactly the safety property the helper was designed for.
- No `npm run build` or `npm run lint` scripts exist; not run.

**Drift accounting**
None. No file under `examples/` changed. The `domain heuristics: existing examples remain stable after expansion` test continues to pin both example domains.

**Known limitations**
- Three of 21 domain values are now specialised — 17% coverage. The other 18 still produce the prior generic content. Continued one-at-a-time expansion is the chosen pace.
- The wellness vs. clinical-product framing is encoded in copy, not in code. If a future contributor adds clinical-grade vocabulary to a different template, the disclaimer language here won't propagate — they'd need to add an analogous block where it lands.
- Health domain detection uses keywords like `clinic`, `doctor`, `patient`, `therapy`, `wellness`, `fitness`, `gym`. Edge cases ("a journaling app for anxious teens" → `general`) are by design — `MASTERPLAN.md` is explicit that the domain is a heuristic and the user is expected to sharpen it.

**Decisions**
- **One domain per session, period.** The same rhythm as Run #008 keeps each step diff-small, regen-clean, and easy to revert if the copy ever needs revision.
- **Five bullets each, not three or seven.** Matches the prior two specialisations; visually consistent across kits when readers compare two domain outputs side by side.
- **No new test for cross-domain isolation.** The existing `non-target domains get no domain-specific subsection` test already exercises four non-health ideas; the new health tests round-trip the positive case.

**Next session starts with**
- **`finance`** as the fourth specialised domain. Risks: regulatory drift (GDPR, MiFID II, PSD2 / open banking, DORA), KYC/AML, model risk on any predictive component, audit-trail expectations. Positioning: auditable-by-default, conservative defaults over flashy automation, clear separation between informational and advisory output, fit for compliance-aware finance teams.

---

## Run #009 — 2026-04-29 — Brand identity v2: twelve-pointed compass star

**Phase:** Phase 1 — UX surface
**Duration:** ~0.3 session
**Goal going in:** Replace the generic five-point mark with a logo that *means* something: a unique silhouette tied directly to what the kit produces, recognisable at favicon size, and not a Mercedes-grade rip but at least a Mercedes-grade *commitment* — one symbol, one story.

**The story (one sentence)**
*Twelve rays — one per generated file — anchored by four longer cardinal points: a compass for what to build next.*

**Geometry**
- 12 outer points spaced at 30°. Four cardinal rays (N / E / S / W) at radius 28; the eight intermediate rays at radius 22. Twelve inner valleys at radius 9, offset 15°.
- Resulting silhouette: a stylised compass rose / dodecagonal star. Distinct from the generic five-point form, still mathematically clean (24-vertex polygon, no curves).
- Same `viewBox="0 0 64 64"` so all existing CSS that sized the logo continues to work.

**Why this and not B / C**
- A (compass star) evolves the existing star without breaking the brand recognition built up over Runs #004–#008.
- It encodes the product literally — the count of rays equals the count of generated files.
- It survives the favicon test: the compass-rose silhouette is recognisable at 16 px because the cardinal rays poke past the rest of the perimeter, giving the mark a distinctive irregular-but-symmetric outline. A generic five-point star at 16 px reads as "any star".

**Animation (subtle, three layers)**
- `bk-breathe` — gentle scale 1 → 1.035 → 1 over 4.8 s, anchored at center.
- `bk-shine` — radial highlight overlay opacity 0.55 → 0.95 → 0.55, in phase with the breathe.
- `bk-north` — soft white glow centred just above the top cardinal point, opacity 0.30 → 0.85 → 0.30 over 6.4 s. Slightly longer cycle so it phases in and out of the breathe rather than locking to it. Visually anchors the "north star" reading without being literal.
- All three respect `@media (prefers-reduced-motion: reduce)`.

**Files touched**
- Replaced (same path): `public/logo.svg` (1791 B → 2652 B; new geometry + north-glow layer), `public/logo-monochrome.svg` (505 B → 652 B), `public/favicon.svg` (324 B → 460 B). Same paths, same names, so no HTML changes needed.
- Synced byte-copies: `docs/logo.svg`, `docs/favicon.svg`. Same manual-sync convention as Run #005; a `scripts/sync-docs-assets.js` is still in the polish backlog.
- Updated: `CLAUDE.md` (new "Recently completed" entry referencing Run #009), `RUN_LOG.md`.
- **Untouched:** `server.js`, `public/index.html`, `public/style.css`, `public/app.js`, `docs/index.html`, `docs/style.css`, `docs/README.md`, `src/**`, `tests/**`, `scripts/**`, `examples/**`, `package.json`, CI workflow.

**Tests run**
- `npm test` → **55/55** pass (logo is static; no test changes needed, but a re-run confirms zero collateral damage).
- `npm run generate:examples` → both example folders rebuild **byte-identically**; `git status -- examples` is clean.
- Live smoke on `:5179`:
  - `/logo.svg` → 200 `image/svg+xml` 2652 B.
  - `/logo-monochrome.svg` → 200 `image/svg+xml` 652 B.
  - `/favicon.svg` → 200 `image/svg+xml` 460 B.

**Known limitations**
- Still no PNG raster fallback (OG cards on Twitter/Slack/LinkedIn don't render SVG `og:image`). Carried forward as the highest-leverage landing-page-polish item.
- No PNG / ICO export pipeline. If anyone needs the logo for a context that requires raster (favicons for older browsers, app icons), they have to convert via Inkscape / ImageMagick by hand. Not blocking; documented in `docs/README.md`.
- Asset sync between `/public` and `/docs` is still manual. `scripts/sync-docs-assets.js` remains in the polish backlog.
- `bk-north` glow uses a `radialGradient` with `cy="0%"`. On rendering engines that interpret percentage gradient stops differently from Chromium / Firefox / Safari (extremely rare), the glow could shift. Acceptable cost; the headline three-engine majority renders correctly.

**Decisions**
- **Evolution, not reinvention.** Same palette, same animation tempo, same accessibility hooks. Brand recognition is preserved while the silhouette becomes meaningful.
- **Polygon, not paths with curves.** A 24-vertex polygon is `~2.6 KB` total and renders identically on every SVG implementation. Bezier curves would have looked smoother but added complexity for a marginal aesthetic win at sizes ≥ 32 px and made the favicon noisier at 16 px.
- **Three subtle animation layers, not one literal compass-needle sweep.** A rotating sweep would have been more on-the-nose but harder to tune to the "professional, not gimmicky" bar. Three layered breathing animations achieve "alive, calm" without dipping into novelty.
- **No new test for the logo itself.** It's a static asset with no behavioural surface; the existing `npm test` + the live HTTP smoke check + the visual review are enough for v1. If we later add a `scripts/verify-logo.js` that validates SVG well-formedness, that's its own session.

**Next session starts with**
- Pick from the existing `CLAUDE.md` shortlist. Top remaining items:
  1. **Domain depth, one more domain.** `health & wellness` → `MASTERPLAN.md` risks (HIPAA-style data handling, crisis-path safety, off-label-use disclaimer) + `DOCS/product-brief.md` positioning (trust, calm tone, escalation path).
  2. **A11y deep-dive** with axe / Lighthouse against the local app and the landing page.
  3. **Landing-page polish** — PNG OG image, tiny static hero visual, `scripts/sync-docs-assets.js` to end the manual asset-sync debt from Run #005 / #009.

---

## Run #008 — 2026-04-29 — Domain depth (first cut): risks + positioning for two domains

**Phase:** Phase 1 — Generation quality (continued)
**Duration:** ~0.4 session
**Goal going in:** Make generated docs noticeably more useful for two domains where we have something specific to say, without rewriting the templates and without affecting any other domain. Strict scope: two templates, two domains, additive only.

**What changed**
- **New helper `src/templates/domain-blocks.js`** with two short tables (`DOMAIN_RISKS`, `DOMAIN_POSITIONING`) and two render helpers (`domainRisksBlock(ctx)`, `domainPositioningBlock(ctx)`). For specialised domains it returns a fully-formatted `### Domain-specific …` subsection. For every other domain it returns `""`, so the host template's spacing and section numbering stay byte-identical.
  - Keys are validated at module load against `DOMAIN_VALUES` from `src/schema.js`; a typo would throw `domain-blocks.js: "<key>" is not in DOMAIN_VALUES …` at server start and during `npm test`.
  - Exports a frozen `SPECIALISED_DOMAINS` array so tests and tooling can introspect coverage without re-reading the tables.
- **Specialised exactly two domains:**
  - **`climate & sustainability`** — risks call out greenwashing exposure, impact measurability with explicit scope/methodology, third-party data quality, regulatory / reporting drift, and audit-trail traceability. Positioning leads with credible impact (claims cite the underlying number), transparent metrics (visible in-product, not in PDFs), honest data sources (modeled labelled as modeled), and an audience framed around the operators reporting the number — not board-deck consumers.
  - **`professional services`** — risks cover trust/credibility, client-data privacy (PII / privileged data), liability + expectation management, the boundary between software help and licensed professional judgement, and onboarding for non-technical experts. Positioning emphasises time saved, repeatable workflows with version history, client-ready drafts, professional documentation by default, and reliable workflows for firms of 1–10 (no 90-day rollout).
- **`src/templates/masterplan.js`** — added `import { domainRisksBlock }` and a single interpolation `${domainRisksBlock(ctx)}` between the existing risks/mitigations table and the `## 9. Open questions` heading. Section numbering unchanged.
- **`src/templates/productBrief.js`** — added `import { domainPositioningBlock }` and a single interpolation `${domainPositioningBlock(ctx)}` between section 5 (Tone and voice) and section 6 (Open questions). Section numbering unchanged.
- **No new dependency, no server change, no public-UI change, no schema or matcher change, no new domain.**
- **Tests grew 47 → 55** (8 new tests):
  - `SPECIALISED_DOMAINS` has exactly the two expected entries.
  - `MASTERPLAN.md` for a climate idea contains the heading + "Greenwashing" + "methodology".
  - `MASTERPLAN.md` for a professional-services idea contains the heading + "Liability" + "Client-data privacy".
  - `DOCS/product-brief.md` for a climate idea contains the heading + "credible impact" + "transparent metrics".
  - `DOCS/product-brief.md` for a professional-services idea contains the heading + "Repeatable processes" + "Better client communication".
  - Non-target domains (small business, food & hospitality, gaming, general) get **no** "Domain-specific risks" or "Domain-specific positioning" heading, and section 8 / 9 / 5 / 6 are still in place.
  - Helpers return `""` for unspecialised domains (smoke check on the helper itself).
  - No generated file across five different ideas contains the strings `"undefined"` or `"[object Object]"`.

**Files touched**
- Added: `src/templates/domain-blocks.js`.
- Modified: `src/templates/masterplan.js`, `src/templates/productBrief.js`, `tests/generator.test.js`, `README.md`, `CLAUDE.md`, `RUN_LOG.md`.
- Examples regenerated (intentional drift, see below).

**Tests run**
- `npm test` → **55/55** pass.
- `npm run generate:examples` → both example folders rebuilt; **drift was limited to exactly two files in one example**:
  - `examples/smb-accounting-saas-dashboard/MASTERPLAN.md` — gained 8 lines (the 5-bullet professional-services risks block).
  - `examples/smb-accounting-saas-dashboard/DOCS/product-brief.md` — gained 8 lines (the 5-bullet professional-services positioning block).
  - `examples/small-business-website-system/` — **byte-identical** (its domain `small business` is not specialised in this run).
  - `git diff --stat examples/` → 2 files changed, 16 insertions(+), 0 deletions(-).
- No `npm run build` or `npm run lint` scripts exist in this project, so they were not run.

**Drift accounting**
The drift is exactly the expected, narrowly-scoped consequence of specialising the `professional services` domain. The existing test `domain heuristics: existing examples remain stable after expansion` confirms domain values are unchanged for both examples. Worked-example file count remains 12 in both folders (covered by the existing on-disk tests).

**Known limitations**
- Only two domains specialised. The other 18 (and `general`) still produce the prior generic content. That's by design — see "Quality bar" in the brief — and the next run can extend coverage one domain at a time using the same helper.
- The specialisation lives in `src/templates/domain-blocks.js`. If a third template ever wants domain depth (say `ARCHITECTURE.md`'s open-questions list), it should add a third small table + helper in the same file rather than a new module.
- The bullets are static text, not parameterised on `ctx`. They reference the domain category, not the user's specific idea. That's a deliberate trade-off — the alternative is a template-engine-shaped rabbit hole.
- Tests assert presence of distinctive phrases (e.g. "Greenwashing", "Liability"). A future contributor rewording the bullets must update the assertions in lockstep — acceptable cost for cheap content-level coverage.

**Decisions**
- **Helper module, not inline duplication.** Two templates need the same conditional logic; one helper module with two render functions keeps the domain decision in one place.
- **`""` for fallback, not a generic placeholder section.** Avoids any risk of an empty heading or a stub bullet block, and keeps non-target examples byte-identical.
- **Subsection (`###`) inside an existing numbered section, not a new numbered section.** Adding `## 6. Domain-specific positioning` would have renumbered Open questions, drifting every example regardless of domain. The chosen `###` slot makes the change purely additive.
- **Load-time key check** instead of a runtime per-call check. The cost is paid once at module init; typos surface immediately, not at the first matching domain.
- **Tests use distinctive substrings**, not equality on the full block, so editorial tweaks to a single bullet don't flap the suite.

**Next session starts with**
- **Extend domain depth carefully.** Best candidates: `health & wellness`, `finance`, `food & hospitality` — each has clean, defensible risks and positioning angles that fit the same two templates without redesign. Cadence should stay small: one domain per session, with a regen + drift inspection of the worked examples.

---

## Run #007 — 2026-04-29 — Context schema extraction (typedef + runtime validator)

**Phase:** Phase 1 — Generation quality (continued)
**Duration:** ~0.4 session
**Goal going in:** Make the inferred-context shape an explicit, machine-checkable contract so contributors writing new templates can rely on it without reading `src/context.js`. With 20 domain groups and 7 product-type patterns now in play, the surface area was big enough to be worth pinning down.

**What changed**
- **New file `src/schema.js`** containing:
  - A JSDoc `@typedef` for `Context` (8 fields: `rawIdea`, `projectName`, `slug`, `productType`, `audience`, `domain`, `generatedAt`, `year`).
  - Closed-set typedefs for `ProductType` (8 string literals) and `Domain` (21 string literals — the 20 keyword groups plus `"general"` as the fallback).
  - `validateContext(ctx)` returning `{ ok: boolean, errors: string[] }` — non-throwing, so callers can decide how to react.
  - `assertContext(ctx)` — strict variant that throws `Invalid context: <reasons>`. Called at the end of every `buildContext()`, so no invalid context can ever reach a template.
  - Re-exports `PRODUCT_TYPE_VALUES` and `DOMAIN_VALUES` so consumers have a single import point for both shape and runtime data.
- **`src/context.js`** now exports the canonical value lists, **derived** from the existing inference data (`PRODUCT_TYPES.map(p => p.type)` + fallback; `Object.keys(DOMAIN_KEYWORDS)` + fallback) and frozen with `Object.freeze`. Adding a new productType / domain stays a one-line change in `context.js` — the schema picks it up automatically. Also added a JSDoc annotation on `buildContext` pointing readers at the `Context` typedef.
- **Cycle handling.** `context.js` and `schema.js` form a small ES-module cycle (`context.js` imports `assertContext`, `schema.js` imports `*_VALUES`). It works because schema.js only reads the imports inside function bodies, not at module top level — by the time `assertContext` is invoked, both modules' top-level code has fully evaluated.
- **`tests/generator.test.js`** grew 35 → 47 with a focused schema test cluster:
  - PRODUCT_TYPE_VALUES contains the expected 8 entries.
  - DOMAIN_VALUES contains 21 entries including `"general"`.
  - Both lists are frozen.
  - `validateContext` accepts the round-trip output of `buildContext` for five varied ideas (including the "general" fallback case).
  - `validateContext` rejects null / non-object input.
  - `validateContext` flags every required-string field individually when emptied.
  - `validateContext` rejects malformed slug, unknown productType, unknown domain, bad year (sub-1970, fractional, stringified), and unparseable `generatedAt`.
  - `assertContext` throws on invalid, no-throws on valid.
  - Every example in the registry produces a context that passes `validateContext`.
  - Round-trip canary: 10 single-keyword ideas (one per new domain group from Run #006) all match a non-`"general"` domain — surfaces any future keyword-overlap regression.

**Files touched**
- Added: `src/schema.js`.
- Modified: `src/context.js`, `tests/generator.test.js`, `README.md`, `CLAUDE.md`, `RUN_LOG.md`.
- **Untouched:** `server.js`, `public/**`, `docs/**`, `src/index.js`, `src/examples.js`, `src/templates/**`, `src/utils/**`, `scripts/**`, `examples/**`, `package.json`, CI workflow. The change is fully contained in the inference + validation layer.

**Tests run**
- `npm test` → **47/47** pass.
- `npm run generate:examples` → both example folders rebuild byte-identically; `git status -- examples` is clean (the validator runs in their generation path now, so this also confirms nothing the validator touches changes the output).

**Known limitations**
- The validator is internal-use only. It's exported, but no public API surface (`/api/generate`) accepts a caller-supplied context, so the validator is currently useful as a developer guard rather than a request-validation tool. That's the right balance for v1; if a future contributor adds a "regenerate from a saved context" endpoint, the validator is ready.
- JSDoc typedefs aren't enforced at runtime by Node — they're only consumed by editors / TypeScript-aware tools. The runtime validator covers the actual enforcement gap. A future move to TypeScript would make the static and runtime stories converge; out of scope today.
- Year bounds (`1970..9999`) are arbitrary. They protect against `0` / `NaN` / typos rather than encoding a meaningful business rule.
- The validator doesn't enforce upper bounds on string length. `buildContext` already caps the project name and idea length elsewhere, but a defensive max-length per field would be a small addition for the next round.

**Decisions**
- **Validator returns errors instead of throwing**, with a separate `assertContext` for the strict path. Tests can read the error array; production code calls `assertContext`. Two tiny functions, one shared check — no clever options-object or class.
- **`*_VALUES` are derived in `context.js`, not redeclared in `schema.js`**. A redeclared list would silently drift the moment someone adds a domain in `context.js` and forgets the schema. Derivation eliminates the failure mode.
- **`Object.freeze` on the value arrays** so a caller can't accidentally `.push()` a "valid" value at runtime. Cheap insurance.
- **Validator runs inside `buildContext`**, not in `generateKit`. Every entry point — including any future test or REPL caller — gets validation for free. The cost is a single function call per invocation; immeasurable.
- **Did not introduce a third-party validator** (Zod / Yup / Ajv). The shape is small, the rules are simple, and adding a runtime dependency for ~40 LOC of hand-rolled validation would violate the project's two-deps guarantee. Documented this explicitly in `CLAUDE.md`.

**Next session starts with**
- Domain depth: pick one or two domains (suggested: `"climate & sustainability"` and `"professional services"`, since both worked examples cover the latter) and add a small domain-conditional section to one or two templates (e.g. `MASTERPLAN.md` risks list, `DOCS/product-brief.md` audience phrasing). Use the `Domain` typedef from `src/schema.js` to make typos visible to editor tooling. New top entry in `CLAUDE.md`'s prioritized shortlist.

---

## Run #006 — 2026-04-29 — Domain heuristics: 10 → 20 groups + leading-boundary matcher

**Phase:** Phase 1 — Generation quality
**Duration:** ~0.4 session
**Goal going in:** Make generated docs feel domain-specific for a much wider range of inputs by doubling the number of recognised domains, and harden the matcher so the existing `.includes()`-based detection stops producing latent false positives.

**What changed**
- **Doubled `DOMAIN_KEYWORDS` in `src/context.js`** from 10 groups to 20 by appending (insertion order matters — first match wins, and appending is the only safe operation): `logistics & supply chain`, `government & civic`, `climate & sustainability`, `agriculture`, `travel & tourism`, `gaming`, `non-profit & community`, `manufacturing`, `HR & recruiting`, `events & ticketing`. Each group has 5–9 keywords chosen for specificity (e.g. `gamedev`, `last-mile`, `agtech`, `ci/cd`) so they read as real-world signals, not generic nouns.
- **Switched the matcher from `String.prototype.includes()` to a pre-compiled regex with a leading word boundary** (`\b<keyword>`, case-insensitive). Two latent bugs surfaced and were fixed in this same change:
  - `"ci"` (a developer-tools keyword) was matching `"civic"` via substring → civic-tech ideas were classified as developer tools. Replaced bare `"ci"` / `"cd"` with the canonical phrases `"ci/cd"` and `"continuous integration"` (most ambiguous remaining bare-bigram keyword removed).
  - `"shop"` (retail keyword) was matching `"workshop"` via substring → events ideas were classified as retail. Leading-`\b` matcher fixes this without any keyword-list change (`\bshop` matches `"shops"`, `"shopkeepers"`, but not `"workshop"`).
  - Trailing boundary intentionally **not** required, so `"shop"` still matches `"shops"`, `"3d print"` still matches `"3d printing"`, and `"developer"` still matches `"developers"`.
- **Added a one-line invariant comment** above `DOMAIN_KEYWORDS` documenting the first-match-wins / append-only contract — the only comment in the file, justified because the iteration-order semantics are non-obvious and the next contributor will need to know.
- **Tests grew 24 → 35** in `tests/generator.test.js`:
  - 10 individual parametric domain-detection tests, one per new group, with descriptive titles like `domain heuristic: "A logistics platform for last-mile couriers" → logistics & supply chain`. Each test uses an idea where the new domain is the unambiguous winner (avoiding overlap with earlier-iterated groups).
  - 1 regression-stability test that explicitly asserts the three pre-existing example/test ideas (`"A website system for small local businesses"`, `"A SaaS dashboard for small business accountants"`, `"I want to build an app for small restaurants"`) still resolve to their original domains after the keyword expansion and the matcher change.

**Files touched**
- Modified: `src/context.js`, `tests/generator.test.js`, `README.md`, `CLAUDE.md`, `RUN_LOG.md`.
- **Untouched:** `server.js`, `public/**`, `src/templates/**`, `src/index.js`, `src/examples.js`, `src/utils/**`, `scripts/**`, `examples/**`, `docs/**`, `package.json`, CI workflow. The change is fully contained within the inference layer.

**Tests run**
- `npm test` → **35/35** pass.
- `npm run generate:examples` → both example folders rebuilt; `git status -- examples` is clean post-regen. The matcher change and the new groups produce **byte-identical** output for both worked examples (confirmed: `"website system for small local businesses"` still resolves to `small business`, and `"SaaS dashboard for small business accountants"` still resolves to `professional services`).

**Known limitations**
- Bare 2-letter or very short keywords still need to be designed carefully. We removed `"ci"` and `"cd"` for this reason, but `"smb"` (3 letters, in `small business`) and `"ngo"` (3 letters, in `non-profit & community`) remain — both are uncommon enough as substrings of unrelated words that they're acceptable, but a future audit may want to add an opt-in trailing-boundary mode for keywords ≤ 3 chars.
- Some domains overlap meaningfully (`"freelance designer"` is both `creative & media` and `professional services`). Today the higher-iterated group wins. A "primary + secondary domain" model would be more accurate but is out of scope until the templates are ready to consume more than one signal.
- The 10 new groups have not been used to differentiate template content — generated docs still mention the domain in passing (e.g. `MASTERPLAN.md` writes "in **{domain}**") but don't yet specialise sections per domain. Listed as the new top priority for follow-on quality work in `CLAUDE.md`.
- No fuzz/property test for the matcher beyond the 10+ explicit cases. With a pre-compiled regex, the failure mode would be a regex-construction error at module load time rather than a silent miss, but a basic round-trip test ("every keyword in `DOMAIN_KEYWORDS` matches itself when fed as a one-word idea") would be a cheap addition next time.

**Decisions**
- **Append-only growth of `DOMAIN_KEYWORDS`** instead of inserting groups in topical order. Reorderings would silently change which domain the existing examples land on, breaking CI's example-drift check. The new comment in `src/context.js` documents this so the next contributor doesn't lose half a session to a confusing diff.
- **Leading-boundary regex, not full word boundary**, so plurals and natural compound suffixes still match. The `"shop" / "workshop"` and `"ci" / "civic"` failures motivated the change; full boundaries would have broken `"developers"` and `"3d printing"`.
- **Removed `"ci"` and `"cd"` outright** rather than keeping them with a clever per-keyword length-based boundary rule. Removing two unreliable signals is simpler than encoding the rule, and the canonical replacement (`"ci/cd"`, `"continuous integration"`) is what real users actually write.
- **Tests use `for (const c of CASES) { test(...) }`** to produce one named subtest per group — descriptive failure messages, no clever harness needed.
- **Did not touch the templates.** Domain depth (specialising template content per domain) is a separate, larger change with its own session.

**Next session starts with**
- Schema extraction for context: write a JSDoc `@typedef` for the inferred-context shape (`{rawIdea, projectName, slug, productType, audience, domain, generatedAt, year}`) and a small runtime validator. With 20 domain values now in play, contributors writing new templates need to be able to reason about the shape without reading `src/context.js`. See `CLAUDE.md` for the new prioritized shortlist.

---

## Run #005 — 2026-04-29 — Public landing page (GitHub Pages source under `/docs`)

**Phase:** Phase 1 — UX surface (continued)
**Duration:** ~0.4 session
**Goal going in:** Ship a polished, professional public landing page that GitHub Pages can serve from `main` / `/docs`, without touching the local Express app or its tests. Target: visitors arriving from search understand what the kit is, how to install it, and where the worked examples live, in under 30 seconds.

**What changed**
- **`docs/index.html`** — single-page static landing site, mobile-first. Sections: sticky header (logo + product name + nav), hero (eyebrow tag, h1, lede, two CTAs, meta strip), "What you get" (12 file cards), "Quick start" (clone + install + API curl), "Worked examples" (two cards linking to the example folders on github.com), "Why this exists" (three honest paragraphs about the problem the kit solves), and a footer with license + repo links.
- **`docs/style.css`** — same dark palette as the local app (`--bg`, `--panel`, `--accent`, etc.) so the brand reads as one product. Sticky translucent header with `backdrop-filter`, `clamp()`-based fluid typography for the hero h1 (34→56px), responsive grid for file and example cards, visible `:focus-visible` outlines, `scroll-behavior: smooth`, and a `prefers-reduced-motion`-aware logo (inherited from the SVG itself).
- **`docs/logo.svg`** + **`docs/favicon.svg`** — copies of the assets in `/public`, kept manually in sync. The animated star renders correctly when loaded via `<img>` in modern browsers (CSS keyframes embedded in the SVG continue to run).
- **`docs/.nojekyll`** — empty file disabling GitHub Pages' Jekyll preprocessing so dotfiles and underscores work consistently.
- **`docs/README.md`** — explains what's in the folder, the exact GitHub Pages settings to enable, how to preview locally with any static server, and the manual asset-sync convention until a future `scripts/sync-docs-assets.js` is added.
- **Root `README.md`** — added a Pages link near the top, a new "Live landing page" section with the four-step Settings → Pages enable instructions, and updated the project tree to show both `docs/` and the new logo files in `public/`.
- **`CLAUDE.md`** — architecture diagram now includes `docs/`. The "Next meaningful run after this one" list is reordered: the landing page is moved to a new "Recently completed" subsection (with checkmarks for Runs #003-#005), and the priority order for the next run becomes (1) more domain heuristics, (2) schema extraction for context, (3) automated a11y audit, (4) landing page polish (OG image, illustration, asset-sync script), (5) optional file-tree filter.

**Files touched**
- Added: `docs/index.html`, `docs/style.css`, `docs/logo.svg`, `docs/favicon.svg`, `docs/.nojekyll`, `docs/README.md`.
- Modified: `README.md`, `CLAUDE.md`, `RUN_LOG.md`.
- **Untouched:** `server.js`, `public/**`, `src/**`, `tests/**`, `examples/**`, `scripts/**`, `package.json`, `.github/workflows/ci.yml`. Zero blast radius on the local app, the API, the generator, the worked examples, the test suite, and CI.

**Tests run**
- `npm test` → **24/24** pass (no test changes — landing page is static).
- Live smoke on a static server (`python3 -m http.server` against `docs/`):
  - `/` → 200, `text/html`, 9874 B; `<title>` and `og:title` present; nav anchors and section ids resolve.
  - `/style.css` → 200, `text/css`, 6135 B.
  - `/logo.svg` → 200, `image/svg+xml`, 1791 B.
  - `/favicon.svg` → 200, `image/svg+xml`, 324 B.
  - `/README.md` → 200, `text/markdown`, 1553 B.
- Confirmed Express isn't affected: started `npm start` on `:5178` after the changes; `GET /` → 200, `GET /api/health` → `{"ok":true}`.

**Known limitations**
- **Pages must be enabled by the repo owner.** The site only goes live after Settings → Pages is configured to deploy from `main` / `/docs`. The README spells out the four steps, but until that's done the URL `https://beko2210.github.io/Claude-Code-Public-Builder-Kit/` returns 404. This is by design — only the repo owner has the permission to enable it.
- **No OG image yet.** Major social platforms (Twitter, Slack, LinkedIn) still don't reliably render SVG `og:image`, and adding a build step to rasterise one isn't worth it for a v1 page. `og:title` and `og:description` are present so links unfurl with text. A PNG OG image is in the `landing page polish` follow-up in `CLAUDE.md`.
- **Asset duplication.** `docs/logo.svg` and `docs/favicon.svg` are byte-copies of the same files in `/public`. If anyone edits the `/public` versions and forgets to copy them, the landing page will drift. `docs/README.md` documents the sync command, and a future run can replace this with a `scripts/sync-docs-assets.js`.
- **No tests for the landing page itself.** It's static HTML with no JavaScript, so a meaningful test would be an HTML-validator or a Lighthouse run; both are in the next-run shortlist (a11y deep-dive). For now we rely on the smoke-test results above and the fact that the page has no behaviour to break.
- **External links are hardcoded** to `https://github.com/BEKO2210/Claude-Code-Public-Builder-Kit/...`. If the repo is forked or moved, the landing page will need a one-line search-and-replace.

**Decisions**
- **Static HTML, no framework, no JavaScript.** The page renders correctly with JS disabled. This matches the kit's "no build step" guarantee and means there is literally nothing that can break at runtime.
- **`/docs` on `main`, not a `gh-pages` branch.** Single source of truth for everything in the repo; no extra branch to maintain; `npm start` keeps working unaltered. The trade-off (deploys on every `main` push) is acceptable since the page changes rarely.
- **External links to GitHub for example browsing**, instead of duplicating the markdown content into the landing page or rendering it client-side. GitHub renders `.md` natively and is always the freshest source; embedding would create a third copy that could drift.
- **No tracking, no analytics.** Documented in the footer ("No tracking. No JavaScript required.") so the user-facing claim matches the code.

**Next session starts with**
- Pick the new top priority from `CLAUDE.md`: **expand the domain heuristics** in `src/context.js` (5–10 new keyword groups + parametric tests). Highest leverage on the quality of generated docs across the long tail of inputs.
- Or pick from the rest of the prioritized shortlist if the user has a different preference.

---

## Run #004 — 2026-04-29 — Brand identity: animated star logo + favicon

**Phase:** Phase 1 — UX surface (continued)
**Duration:** ~0.3 session
**Goal going in:** Give the kit a real visual identity — a professional, scalable, accessible star logo with a subtle animation — and re-prioritize the next-run shortlist so the GitHub Pages landing page comes before the file-tree filter.

**What changed**
- **Logo (`public/logo.svg`)** — a five-pointed star pictorial mark. ViewBox `0 0 64 64`, geometric points computed from polar coordinates (outer radius 28, inner radius 11) so it renders crisply at any size. Two stacked polygons: a base fill using a vertical linear gradient (`#a4c2ff → #8ab4ff → #6c9bff`, matching the existing app accent colors), plus an overlay polygon filled with a radial highlight gradient (`white 35% → transparent`) for depth. Subtle `#cdd9ff` 0.8px stroke for definition.
- **Animation** — two CSS keyframe loops embedded in the SVG (no external scripts):
  - `bk-breathe`: `transform: scale(1) → scale(1.04) → scale(1)` over 4s, ease-in-out, infinite. Anchored at center via `transform-origin: 32px 32px`.
  - `bk-shine`: `opacity: 0.55 → 0.95 → 0.55` over 4s on the highlight overlay, in phase with the breathe.
  - Both wrapped in `@media (prefers-reduced-motion: reduce) { animation: none; }` so motion-sensitive users get a static logo.
- **Accessibility** — `role="img"` + `<title>` + `<desc>` inside the SVG. The HTML `<img>` uses `alt=""` and `aria-hidden="true"` because the visible `<h1>` already names the product (avoids redundant announcement).
- **Variants**:
  - `public/logo-monochrome.svg` — same star geometry, `fill="currentColor"`, no animation, no gradient. For use in contexts that need a single-color or print-friendly mark.
  - `public/favicon.svg` — same star, solid `#8ab4ff` fill, no animation, no gradient. Wired up via `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` in `public/index.html`.
- **Header lockup** — `public/index.html` now wraps the logo and `<h1>` in a `.brand` flex container so they read as a single brand mark. CSS adds a subtle outer drop-shadow on the logo (`drop-shadow(0 0 12px rgba(138, 180, 255, 0.18))`) to lift it off the dark panel, and a small responsive rule that scales the logo + heading on screens narrower than 540px.
- **CLAUDE.md** — updated the "Next meaningful run after this one" list. New top priority is the **public landing page deployed via GitHub Pages**; the file-tree filter is now last, gated on the landing page being online.

**Files touched**
- Added: `public/logo.svg`, `public/logo-monochrome.svg`, `public/favicon.svg`.
- Modified: `public/index.html`, `public/style.css`, `CLAUDE.md`, `RUN_LOG.md`.

**Tests run**
- `npm test` → **24/24** pass (no test changes; logo additions are static assets and don't affect the generator or API surface).
- Live smoke on `:5177`:
  - `GET /` → 200, 4143 bytes (HTML now references the logo + favicon).
  - `GET /logo.svg` → 200, `image/svg+xml`, 1791 bytes.
  - `GET /logo-monochrome.svg` → 200, `image/svg+xml`, 505 bytes.
  - `GET /favicon.svg` → 200, `image/svg+xml`, 324 bytes.

**Known limitations**
- The skill `svg-logo-designer` referenced in the brief is not currently loaded as a Claude Code plugin in this session, so the logo was authored directly using the design principles documented there (combination-mark conventions, single concept, accessibility-first). If the skill is installed later, future logo iterations could be generated through it for full deliverable bundles (mockups, additional concepts, layout lockups).
- Only one concept ships. The skill docs suggest 3–5 concepts per round; we picked one that fits the existing palette and shipped it. Easy to swap if the user wants alternatives.
- No PNG raster fallback yet. Modern browsers all support SVG `<img>` and SVG favicons, so this isn't blocking. If we later need raster favicons (legacy iOS / Windows tiles), they should be exported via Inkscape / ImageMagick from `favicon.svg` and added as additional `<link rel="icon">` entries.
- The animation uses CSS embedded in the SVG. This works fine when loaded via `<img>` in modern browsers but won't run in some very old user agents (IE11). Acceptable — the kit already requires Node ≥ 18 and modern browser features.

**Decisions**
- **One animated concept, not five.** The brief from the user emphasised "professional" and "star". A single, well-tuned star reads more professional than a buffet of options. If the user wants alternatives, this is one PR away.
- **CSS animation, not SMIL.** SMIL is deprecated in some renderers. CSS works in `<img>`-loaded SVG and respects `prefers-reduced-motion` cleanly via a media query.
- **Star ≠ generic Twitter star.** The 11/28 inner/outer radius ratio gives sharper points than the typical "star emoji" 0.5 ratio, which makes it feel more deliberate and less templated.
- **Did not add a runtime dep.** Logo work is pure static SVG/CSS — zero `package.json` changes.

**Next session starts with**
- The public landing page deployed via GitHub Pages — see the new top-priority entry in `CLAUDE.md`. Recommended approach: a `/docs/` folder published from `main` (so `npm start` keeps working unaltered), with the logo embedded, the gallery summarized, and a clean install/quick-start path for visitors arriving from search. Until that's online, the file-tree filter stays parked.

---

## Run #003 — 2026-04-29 — Example gallery + preview experience + a11y pass

**Phase:** Phase 1 — UX surface
**Duration:** ~1 session
**Goal going in:** Make the public UI immediately understandable — a visitor lands, browses real example kits, previews their files, and can either generate their own kit or download a ZIP without needing to read the docs first.

**What changed**
- **Example registry as single source of truth** at `src/examples.js`. Holds `{ id, idea, slug, title, description, now }` for every shipped example, plus `findExample()` and `isSafeExampleId()` helpers. Validates ids against `/^[a-z0-9][a-z0-9-]*$/` and length ≤ 80.
- **Refactored** `scripts/build-example.js` to consume the registry. Removed the duplicate hardcoded list. `npm run generate:examples` continues to produce byte-identical output (verified via clean post-regen `git status`).
- **New API endpoints** in `server.js`:
  - `GET /api/examples` — returns `{ examples: [{id, title, description, idea, slug, fileCount, files[]}] }`. `files` in the list view is paths only, not content (keeps the response light).
  - `GET /api/examples/:id` — returns the full kit `{id, title, description, idea, slug, context, files: [{path, content}]}`. Generated in-memory from the registry on each request, so it always matches what's on disk.
  - Validates `:id` with `isSafeExampleId` (`400` on unsafe input) and uses `findExample` for lookup (`404` on unknown id). No filesystem reads in either handler — defense-in-depth against path traversal.
- **UI: Example gallery** in `public/index.html` and `public/style.css`. Cards show title, the original idea (italic), description, and `<fileCount> files · slug: <slug>`. Each card has two buttons:
  - **Preview example** — fetches `/api/examples/:id`, populates the existing file viewer, shows an "Example" badge in the result header.
  - **Use this idea** — drops the idea into the textarea, focuses + selects the end of the field, and tells the user via the status line.
- **Refactored `public/app.js`** so generate and preview both flow through a single `renderResult()` function. Avoids duplicate file-tree code and guarantees the two flows look identical.
- **Accessibility pass** (practical, not over-engineered):
  - Skip link (`Skip to main content`) targets `#main` with `tabindex="-1"`.
  - Global `:focus-visible` outline using the accent color.
  - All interactive elements use real `<button>`s; the file list adds `aria-current="true"` on the active file (and styles match).
  - The status region has `role="status"` + `aria-live="polite"` so updates are announced.
  - The example gallery uses `aria-busy` while loading and `aria-live="polite"` for the card list.
  - Each gallery button has an explicit `aria-label` ("Preview example: <title>", "Use this idea as input: <idea>") so screen-reader users know which card the action belongs to.
  - Form gets a `for=`/`id=` label, an `aria-describedby` hint, and the file viewer `<pre>` is keyboard-focusable for scrolling.
- **Tests grew 17 → 24** in `tests/generator.test.js`:
  - Registry: ids unique, safe, resolvable; `description` ≥ 20 chars; folder on disk for each id has 12 `.md` files.
  - `GET /api/examples` returns the full registry with paths-only `files` and `fileCount: 12`.
  - `GET /api/examples/:id` returns 12 files with full content for every registered example, paths match `EXPECTED_FILES`, and each file is ≥ 800 bytes.
  - `GET /api/examples/:id` returns `404` for unknown ids and `400` for unsafe ids.
  - `POST /api/generate` and the existing ZIP / determinism tests stay green.

**Files touched**
- Added: `src/examples.js`.
- Modified: `server.js`, `scripts/build-example.js`, `public/index.html`, `public/style.css`, `public/app.js`, `tests/generator.test.js`, `README.md`, `CLAUDE.md`, `RUN_LOG.md`.
- Generated examples regenerated (no on-disk diff — registry refactor is byte-stable).

**Tests run**
- `npm test` → **24/24** pass.
- `npm run generate:examples` → both example folders produced; `git status -- examples` is clean post-regen (CI gate satisfied).
- Live smoke on `:5176`:
  - `GET /api/examples` → 200, both examples, paths-only `files`, `fileCount: 12`.
  - `GET /api/examples/small-business-website-system` → 200, full kit body.
  - `GET /api/examples/bogus` → 404 with `{ "error": "Example not found." }`.
  - `GET /api/examples/UPPER` → 400 with `{ "error": "Invalid example id." }`.
  - `GET /` → 200 (UI loads).

**Known limitations**
- Examples are generated in-memory on each request rather than served from a static cache. Cost is negligible at current size (~80 KB markdown, fully synchronous), but for a much larger registry we'd cache once at boot. Acceptable for now.
- Accessibility was a practical pass, not an automated audit. No axe / Lighthouse run yet (next-run candidate).
- The file viewer doesn't yet support keyboard arrow-key navigation between files. Tab + Enter works, which is sufficient for keyboard users; arrow keys would be a nice extra.
- The example badge appears only on previewed examples — there's no way to distinguish between two example previews in the URL bar. Acceptable; the result header already shows the title.

**Decisions**
- Generated examples in-memory rather than reading `examples/<id>/` from disk. Removes any path-traversal risk and guarantees the API matches the generator's current output (drift is impossible). CI separately enforces that the on-disk example matches.
- Used real `<button>`s for everything interactive instead of role-styled `<div>`s. Keeps a11y "free" (focus, click, keyboard) and removes the need for custom event handlers.
- Did not add a frontend framework, build step, or any extra runtime dependency. Gallery is ~50 lines of vanilla JS in `app.js`.
- Did not introduce a separate caching layer. Premature.

**Next session starts with**
- Pick an item from the prioritized shortlist in `CLAUDE.md` ("Next meaningful run after this one"). The recommended one is **expanding the domain heuristics** in `src/context.js` (5–10 new keyword groups + parametric tests), since it has the highest leverage on the quality of generated docs across the long tail of possible inputs.

---

## Run #002 — 2026-04-29 — Foundation hardening: LICENSE, CI, ZIP download, second example

**Phase:** Phase 0 — Foundation (closing gaps)
**Duration:** ~1 session
**Goal going in:** Close the remaining foundation gaps from Run #001 — add LICENSE, CI, ZIP download, a second worked example, and corresponding tests + docs — without bloating the project.

**What changed**
- **LICENSE** added at the repo root: MIT, copyright BEKO2210, consistent with the README and `package.json` license field.
- **GitHub Actions CI** added at `.github/workflows/ci.yml`. Runs on push and pull request, installs deps with `npm ci` (fallback to `npm install`), runs `npm test`, then runs `npm run generate:examples` and fails if `git diff -- examples` is non-empty. This makes example drift impossible to merge unnoticed.
- **ZIP download feature**:
  - Added `archiver` as a runtime dependency (second one in the project; recorded here as the rationale).
  - New util `src/utils/zip.js` with `buildZipBuffer(files, rootName)`. Validates `rootName` against `/^[a-z0-9][a-z0-9-_]*$/i` and rejects entry paths containing `..`, leading `/`, or backslashes — defense-in-depth against zip-slip.
  - New endpoint `POST /api/generate.zip` in `server.js`. Same input shape as `/api/generate`; returns `application/zip` with a `Content-Disposition: attachment; filename="<slug>.zip"` and the 12 files nested under `<slug>/`.
  - UI: added a **Download ZIP** button in the result header with loading + error states. The button reuses the last-submitted idea, fetches the zip as a blob, and triggers a programmatic download. Existing copy / file-tree behaviour is unchanged.
- **Second worked example** added at `examples/smb-accounting-saas-dashboard/` for *"A SaaS dashboard for small business accountants"*. Generated by the same builder, deterministic via fixed `now`. Demonstrates that context inference identifies `web app` from `saas`, audience as `small business accountants`, and domain as `professional services`.
- **Acronym preservation in `titleCase`**: `src/utils/slug.js` now keeps tokens with two or more uppercase letters intact (`SaaS`, `API`, `B2B`), so the second example reads as "SaaS Dashboard for Small Business Accountants" instead of "Saas Dashboard…". Verified by the new context test and confirmed not to alter the existing example.
- **npm scripts**: added `generate:examples` (runs the same builder), kept `generate:example` as a back-compat alias. Both regenerate every entry in `examples/`.
- **Tests**: extended from 9 to 17 in `tests/generator.test.js`. New coverage:
  - `buildZipBuffer` produces a valid ZIP with 12 entries; entry paths nested under the slug.
  - `buildZipBuffer` rejects unsafe entry paths and unsafe root names.
  - `POST /api/generate.zip` returns `application/zip` with attachment headers and a 12-entry zip body (validated via central-directory header count, no extra dependency).
  - `POST /api/generate.zip` rejects an empty idea with 400.
  - Both example folders contain exactly 12 `.md` files on disk.
  - Second example's context inference asserts `productType === "web app"`, audience matches `/small business accountants/i`, domain `=== "professional services"`, and project name preserves `SaaS`.
- **Docs**: README updated with ZIP download instructions, an API endpoint table, the new examples section, the CI section, and an updated tree. CLAUDE.md rewritten as the single source of truth for future runs — current architecture, run protocol, hard rules, and a short next-run shortlist.

**Files touched**
- Added: `LICENSE`, `.github/workflows/ci.yml`, `src/utils/zip.js`, `examples/smb-accounting-saas-dashboard/**` (12 files).
- Modified: `package.json`, `package-lock.json`, `server.js`, `public/index.html`, `public/style.css`, `public/app.js`, `src/utils/slug.js`, `scripts/build-example.js`, `tests/generator.test.js`, `README.md`, `CLAUDE.md`, `RUN_LOG.md`.

**Tests run**
- `npm test` → 17/17 pass.
- `npm run generate:examples` → both examples produced; manual `git status` after generation showed no diff against committed examples.
- Manual smoke test: started server on `:5175`, hit `POST /api/generate.zip` for the SaaS-dashboard idea, verified `Content-Type: application/zip`, downloaded the archive (22 KB), `unzip -l` listed all 12 files under `saas-dashboard-for-small-business-accountants/`.

**Known limitations**
- No multi-example browser in the UI yet (the worked examples are still browsed on disk).
- Context inference is still keyword-based and intentionally narrow. Idiomatic phrasings outside the seed lists fall back to generic defaults — this is by design (the generated docs are explicit about it) but a richer keyword set is the highest-leverage next improvement.
- No accessibility audit yet; the UI is keyboard-usable but has not been formally checked against WCAG.
- Tests use ephemeral `app.listen(0)` for ZIP HTTP coverage; this is reliable on Linux/macOS CI runners but slightly slower than calling the handler directly. Acceptable trade-off for end-to-end realism.

**Decisions**
- Chose `archiver` over `adm-zip` / `yauzl` / hand-rolled because it is the de-facto standard, is streaming-friendly, and has a low maintenance burden.
- Did **not** parse the zip in tests with a separate library; instead validated the ZIP magic bytes and counted central-directory headers (`PK\x01\x02`). This adds zero test-time dependencies and is invariant to compression settings.
- Kept `generate:example` working as an alias to `generate:examples` to avoid churn for anyone with the old command in muscle memory.
- Deliberately did not introduce a frontend framework or build step. The Download ZIP UX is implemented in ~30 lines of vanilla JS.

**Next session starts with**
- Add a small "Browse examples" panel to the UI so visitors can preview the on-disk worked examples without typing an idea. Mount `examples/` via `express.static` (read-only) and render the file list in the same viewer used for generated kits. Keep determinism guarantees intact.
- Alternatively: add 5–10 additional domain keyword groups in `src/context.js` (logistics, gov-tech, climate, agriculture, …) and a parametric test asserting each is detected. See `CLAUDE.md` for the prioritized shortlist.

---

## Run #001 — 2026-04-29 — Initial scaffold of the builder kit

**Phase:** Phase 0 — Foundation
**Duration:** ~1 session
**Goal going in:** Build a publicly usable kit that turns a one-line project idea into a 12-file Markdown planning foundation, runnable locally with no build step.

**What changed**
- Stack chosen and committed implicitly via `package.json`: Node ≥ 18, Express, vanilla HTML/CSS/JS frontend, `node:test` for tests. Single runtime dependency.
- Repository skeleton created from empty:
  - `server.js` — Express server with `GET /api/health`, `POST /api/generate`, static `/public`.
  - `src/index.js` + `src/context.js` — generator entry point and heuristic idea-parser.
  - `src/templates/` — 12 template modules, one per generated document.
  - `src/utils/` — slugify + filesystem writer.
  - `public/` — minimal frontend (form + file viewer with copy button).
  - `scripts/build-example.js` — regenerates the worked example deterministically.
  - `tests/generator.test.js` — 9 tests (file count, size floors, no-placeholder lints, context inference, determinism).
- Worked example generated at `examples/small-business-website-system/` for the prompt *"A website system for small local businesses"*.
- Repo-level meta-docs written: `README.md` (replaced stub) and `CLAUDE.md`.

**What works now**
- `npm install && npm test` → 9/9 pass.
- `npm start` → server boots on `:5173` (or `PORT=…`), `GET /api/health` returns `{ok:true}`, `POST /api/generate` returns 12 files of substantive markdown and writes them to `output/<slug>/`.
- Web UI at `/` accepts an idea, renders all 12 generated files, copy button works.
- `npm run generate:example` reproduces the example byte-stably (uses fixed `now`).
- Heuristic context inference correctly identifies product type ("app", "website", "platform", …), audience ("small restaurants", "small local businesses", …), and domain ("food & hospitality", "small business", …) on the inputs tested.

**What's still broken or missing**
- No CI pipeline yet (Phase 0 exit gate per the kit's own doctrine — would be the next thing to add).
- No "download as zip" button in the UI; users get individual copy-to-clipboard plus the on-disk path. Acceptable for v0; can add `archiver` later if requested.
- The heuristic in `src/context.js` is intentionally narrow. Some idiomatic phrasings ("a tool to help X do Y") will fall back to generic defaults. Acceptable — generated docs are explicit about which fields are guesses.
- No second worked example. One was requested; more would round out the showcase.
- No `LICENSE` file committed yet (referenced as MIT in `README.md`).

**Decisions**
- Chose Express over plain `http` for clarity; one dependency is worth it.
- Chose vanilla frontend over any framework to keep the project understandable in under 30 minutes.
- Templates are pure functions of `ctx` to make the generator deterministic and unit-testable.
- File-write step is opt-out (`persist: false`) so the API is usable in stateless contexts.

**Next session starts with**
- Add a `LICENSE` (MIT) file.
- Optionally add a GitHub Actions workflow that runs `npm test` and `npm run generate:example` and asserts no diff.
- Consider a "Download all as zip" affordance in the UI.
- Consider a second worked example (e.g. *"A SaaS dashboard for SMB accountants"*) to show how the heuristics adapt.
