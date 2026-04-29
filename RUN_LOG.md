# RUN_LOG — Claude Code Public Builder Kit

Append-only journal of every working session. Newest entry on top.

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
