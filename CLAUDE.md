# CLAUDE.md — Operating rules for the Claude Code Public Builder Kit

This file is the single source of truth for any Claude Code session inside **this** repository (the kit itself, not the kits it generates). Read it at the start of every session.

## What this project is

A small, self-contained Node.js + Express + vanilla-frontend tool that turns a one-line project idea into 12 substantive Markdown files. It runs locally with no cloud account, no LLM dependency, and no build step.

The most important file is `src/index.js`, which orchestrates the 12 templates in `src/templates/`.

## Current architecture

```
.
├── .github/workflows/ci.yml  # Tests + example reproducibility check on push/PR
├── LICENSE                   # MIT
├── server.js                 # Express app: /api/health, /api/generate, /api/generate.zip,
│                             #              /api/examples, /api/examples/:id, /api/preview.
│                             # Exports the app as default; only listens when run as a CLI
│                             # (auto-listen guard: process.argv[1] === server.js).
├── api/
│   └── index.js              # Vercel Serverless entry — re-exports server.js so hosted
│                             # and local share the same Express app, no fork.
├── vercel.json               # Vercel config — catch-all rewrite of all paths to /api.
├── docs/                     # Public landing page (GitHub Pages source)
│   ├── index.html            # Hero (with logo + aurora), 12-file overview, quick start, examples, footer
│   ├── style.css             # Same dark palette as the local app, CSS-only animations
│   ├── logo.svg, logo-monochrome.svg, favicon.svg  # Mirrored from /public via npm run sync:assets
│   ├── og-source.svg         # 1200×630 source for the social-card PNG
│   ├── og-card.png           # Rasterised social card (committed; rebuild via npm run build:og)
│   ├── .nojekyll             # Disable Jekyll preprocessing on Pages
│   └── README.md             # How to enable Pages + asset-sync notes
├── public/                   # Vanilla HTML/CSS/JS — the local app, no framework, no build
│   ├── index.html            # Form + Example gallery + file viewer
│   ├── style.css             # Includes focus-visible, skip link, gallery cards
│   ├── app.js                # Generate / Preview / Use this idea / Copy / Download ZIP
│   └── logo.svg, logo-monochrome.svg, favicon.svg
├── src/
│   ├── index.js              # generateKit(idea, opts) — orchestrates 12 templates
│   ├── context.js            # Heuristic idea → {projectName, slug, productType, audience, domain, generatedAt}
│   ├── schema.js             # Context typedef + validateContext + assertContext (single contract for templates)
│   ├── examples.js           # SINGLE SOURCE OF TRUTH for worked examples (id, idea, title, description, now)
│   ├── templates/            # 12 modules, each `(ctx) => markdown string`
│   └── utils/
│       ├── slug.js           # slugify + acronym-aware titleCase
│       ├── write.js          # writeKit(files, dir)
│       └── zip.js            # buildZipBuffer(files, rootName) using archiver
├── scripts/
│   ├── build-example.js      # Iterates EXAMPLES from src/examples.js → writes examples/<id>/
│   ├── sync-docs-assets.js   # Mirror logo + favicon from /public into /docs (npm run sync:assets)
│   ├── build-og.js           # Render docs/og-source.svg → docs/og-card.png (npm run build:og)
│   └── a11y-audit.js         # Verbose axe-core + WCAG-AA contrast audit (npm run audit:a11y)
├── examples/
│   ├── small-business-website-system/   # "A website system for small local businesses"
│   └── smb-accounting-saas-dashboard/   # "A SaaS dashboard for small business accountants"
├── tests/
│   └── generator.test.js     # node:test suite (71 tests, no external deps)
└── output/                   # Runtime-generated kits (git-ignored)
```

Runtime dependencies: **express** (HTTP), **archiver** (ZIP). Nothing else.

DevDependencies: **axe-core** + **jsdom** (a11y test), **@resvg/resvg-js** (PNG render of the OG card). All audit-only / build-only. The runtime promise (two deps) is unchanged.

### Example registry as source of truth

`src/examples.js` is the single registry consumed by:

- `scripts/build-example.js` (writes the folders under `examples/<id>/`)
- `server.js` (`/api/examples`, `/api/examples/:id` — generate from registry in-memory, never read arbitrary paths from disk)
- `tests/generator.test.js` (id uniqueness, safety, on-disk parity, API parity)

Do not duplicate the example list anywhere else. Adding a new example = appending to `EXAMPLES`, running `npm run generate:examples`, and committing the resulting folder. CI will fail if the folder drifts from what the registry produces.

## Guarantees we make to users

These are non-negotiable. Don't regress them:

1. **Local-first.** `npm install && npm start` works on any machine with Node ≥ 18. No cloud account, no API key.
2. **No build step.** Source files run as-is. Don't introduce a bundler, transpiler, or framework that requires a build.
3. **Tiny dependency surface.** Express + archiver only. Don't add a third runtime dependency without an entry in the next session's `RUN_LOG.md` and explicit approval.
4. **Each generated file is substantial** (≥ 800 bytes) and contains no orphan `TODO` or `TBD` placeholder lines. The test suite enforces this.
5. **Determinism.** Given the same idea and the same `now`, output is byte-identical. CI fails if regenerated examples drift.
6. **No telemetry.** No network calls beyond the local `/api/*` routes.

## Hard rules

1. **No invented features.** If a change isn't traceable to an explicit user request or a `RUN_LOG.md` follow-up, stop and ask.
2. **One change, one reason per commit.** Don't mix template edits, server changes, and refactors in the same commit.
3. **Tests must pass before commit.** `npm test` is fast — run it.
4. **Update `RUN_LOG.md` at the end of every session.** Even one-line sessions get an entry.
5. **Keep templates honest.** A generated doc may include a placeholder phrase only if that phrase explicitly tells the user what to replace and why. Never leave a bare `TODO`.
6. **Don't break the worked examples.** If you change a template, run `npm run generate:examples` and review the diff before committing — CI will reject any unintended drift.

## File-by-file conventions

- `src/index.js` — one place where the 12-file plan is declared. Adding a 13th file requires an entry here, a corresponding template, and updates to `EXPECTED_FILES` in the test suite.
- `src/context.js` — heuristic only. Don't reach for an LLM. The heuristics are defaults; users sharpen them in `MASTERPLAN.md`. Adding a productType / domain only needs an entry in `PRODUCT_TYPES` / `DOMAIN_KEYWORDS`; `PRODUCT_TYPE_VALUES` and `DOMAIN_VALUES` are derived automatically.
- `src/schema.js` — the contract for everything downstream of inference. Read its `Context` typedef before writing a new template; never reach into `context.js` for the shape.
- `src/templates/*.js` — each exports a default function `(ctx: Context) => string`. Keep templates close to 100–250 lines of generated markdown. Longer is fine if substantive; padding is not.
- `src/templates/domain-blocks.js` — small helper holding domain-conditional content for `MASTERPLAN.md` and `DOCS/product-brief.md`. Keys must be values from `DOMAIN_VALUES` (the load-time check throws on typos). Returns `""` for any unspecialised domain — never an empty heading. To specialise a new domain, add bullets here and run `npm run generate:examples`; drift in `examples/<id>/` is acceptable only if that example's domain matches the key you added.
- `src/utils/zip.js` — pure function. Validates root name and entry paths against traversal. Don't allow callers to bypass that validation.
- `server.js` — keep it boring. Validate input at the boundary (`/api/generate`, `/api/generate.zip`, `/api/preview`), reject anything > 500 chars, never let the slug escape `output/`. The lightweight `/api/preview` endpoint exists so the UI can show live inference results as the user types — it must stay cheap (calls `buildContext` only, no template rendering). The file exports the Express app as default and only listens when started as a CLI (the `process.argv[1]` guard at the bottom); both `npm start` and the Vercel adapter rely on that pattern. **Do not** add a top-level `app.listen()`.
- `api/index.js` — three lines. Re-exports the Express app from `server.js` as the Vercel Serverless handler. If you find yourself adding logic here, you are working around `server.js` — fix it there instead so the local and hosted code paths stay identical.
- `vercel.json` — catch-all rewrite, `version: 2`. Don't add build commands, don't add functions config, don't add env. The whole config fits in 6 lines.
- **Hosted-mode behaviours** controlled by `process.env.VERCEL === "1"` in `server.js`:
  - `IS_HOSTED` is exposed in `/api/health` and `/api/generate` responses so the UI can adapt copy if needed.
  - Filesystem `persist` is force-disabled on hosted (no writable disk on serverless). `req.body.persist` is honoured locally only.
  - Rate limiter (`/api/generate`, `/api/generate.zip`) — 30 requests / IP / 60 s, in-memory `Map`. Best-effort on serverless because each instance has its own Map; do not promise stronger guarantees in the UI than that. Tests stay well under the limit (≤6 calls per run on rate-limited endpoints).
- `public/` — plain HTML/CSS/JS only. No frameworks, no transpilers.
- `tests/generator.test.js` — `node:test`. Adding a new template means updating `EXPECTED_FILES` and the file-count assertions.
- `tests/a11y.test.js` — `node:test` with axe-core via jsdom for the static HTML, plus a deterministic WCAG-AA contrast pass for the rule axe can't evaluate without real layout. Run interactively with `npm run audit:a11y` for verbose output.
- `scripts/sync-docs-assets.js` — `npm run sync:assets` mirrors `public/{logo,logo-monochrome,favicon}.svg` to `docs/`. CI runs `npm run sync:assets:check` so any future drift fails the pipeline. Add `assets` to this script's list when introducing a new mirrored asset.
- `scripts/build-og.js` — `npm run build:og` rasterises `docs/og-source.svg` to `docs/og-card.png` (1200×630) via `@resvg/resvg-js`. Re-run only when the brand or the headline copy in the source SVG changes; the PNG is committed so GitHub Pages can serve it directly.

## Run protocol

For every working session:

1. Read `RUN_LOG.md` and the latest entry first.
2. State the goal of the session in one sentence.
3. Plan: what changes, which files, how you'll verify.
4. Edit. Prefer modifying existing files; create new ones only when there's no good home.
5. Run `npm test`. If a template changed, also run `npm run generate:examples` and check the diff.
6. Update `RUN_LOG.md` with: what changed, files touched, tests run, known limitations, next recommended run.
7. Commit with a descriptive message; push to the branch listed in the user's instructions.

## Things you must not do

- Push directly to a protected branch.
- Run destructive git commands (`reset --hard`, force-push, branch deletion) without explicit approval.
- Add a runtime dependency without recording the decision and the alternative considered.
- Add tracking, telemetry, or network calls beyond the local `/api/*` endpoints.
- Replace the vanilla frontend with a framework. Discuss first.
- Introduce an LLM dependency for generation.

## Acceptance criteria for a "good" session

A session is complete when:

- [ ] `npm test` passes (currently 71 tests).
- [ ] If templates or `src/examples.js` changed, `npm run generate:examples` was run and the resulting diff is intentional and committed.
- [ ] `RUN_LOG.md` has a new entry covering changes, files touched, tests run, known limitations, and next recommended run.
- [ ] No orphan `TODO`/`TBD` placeholders in generated files (the lint test enforces this).
- [ ] No staged-but-uncommitted noise.
- [ ] The branch is pushed.

## Next meaningful run after this one

Pick one of the following, in priority order:

**Phase shift after Run #022.** The first ten specialisations cover every domain a typical idea is likely to land on; pushing past that is real but diminishing-return work. The user-reported gap is now **reach** — most non-technical users cannot use the tool today (terminal-required local install, no public URL). Run #022 closed the hosting half of that gap (Vercel-ready, ship pending owner deploy click). The shortlist below reflects the pivot from depth to reach. Domain runs eleven and beyond are **paused** until the reach work lands.

1. **Run #022 follow-up: link the live URL into the landing page.** Once the owner has clicked Deploy in Vercel and we know the production URL, add a prominent "Tool starten" / "Launch the tool" button to `docs/index.html`. One-line commit, blocked only on the owner action documented at the bottom of Run #022's RUN_LOG entry.
2. **Run #024 — "Was mache ich jetzt damit?" post-generate guidance.** After generation, instead of dumping 12 files in front of a non-technical user, add a 3-step "use your kit" panel: (a) Download ZIP, (b) Go to claude.ai and start a chat, (c) Drop in `MASTERPLAN.md` and paste a starter prompt. Includes screenshots. Removes the "Claude Code / Terminal" assumption from the success path.
4. **Run #025 — Logo + landing-page refit.** Today's geometric "compass bloom" logo reads as a generic SVG mark. Replace with a more distinctive identity (decided with the owner before commissioning) and rebuild `docs/index.html` around: hero with the new mark, embedded live demo, three-image "how it works" strip, one visible example output. The landing page is currently a wall of text; that doesn't sell the product.
5. **Run #026 — Deutsche Sprachvariante** (UI copy). Tool currently English-only. Owner is German-speaking and so is part of the target audience; add a `de` locale to `public/`. Decide whether to default-detect or default-English with a switcher.
6. **Domain depth: resume at eleventh domain** (`non-profit & community` or `government & civic`) once Runs #023–#026 land. The remaining ~7 specialisations stay valuable, just not above the reach work.
7. **Optional file-tree filter** for `#file-list` — only worthwhile once examples grow beyond 12 files.

Whichever you pick, file an entry in `RUN_LOG.md` first.

### Recently completed

- ✓ **Run #023 — Wizard-Onboarding.** Replaced the single textarea with a 4-step guided flow (What → Who → Why → Generate). Six product-type tiles, audience input + 6 quick-pick pills, optional benefit input + 4 quick-pick pills, summary card with live `Detected: …` preview. "Switch to direct input" link reveals the classic textarea form for power users. Wizard composes a deterministic two-sentence pattern (`for X. It Y.`) so the existing audience-extraction regex captures cleanly. Auto-advance after tile pick, focus management between steps, mobile-collapsible step indicator, accent-coloured progress dots. 81/81 tests pass; 0 a11y violations; smoke confirms three different wizard sentence shapes produce clean inferences. See Run #023.
- ✓ **Run #022c — Mobile UX bug + styling refresh.** Owner-reported mobile bug: result rendered far below the gallery, no auto-scroll, owner only saw output by accident. Fixed with section-reorder (`#result` between form and gallery) + auto-scroll on form submit + skeleton/loading state showing immediately on click + status banner upgraded from one-liner to prominent (busy/error variants). Plus a broader styling refresh: ≥44 px touch targets, 16 px input font (no iOS zoom), clamp() typography, soft hero radial gradient, focus-within form glow, smooth scroll, reveal animation, card hover state, prefers-reduced-motion support. Landing page (`docs/`) deliberately untouched — that's Run #025's scope. 81/81 tests pass; 0 a11y violations; all 13 contrast pairs pass WCAG AA. See Run #022c.
- ✓ **Run #022b — Hotfix: ENOENT on Vercel persist write.** Owner deployed and immediately hit `mkdir '/var/task/output'` because the IS_HOSTED sniff missed and persist=true tried to write to read-only FS. Three fixes: broader hosted-mode detection (6 signals incl. `__dirname.startsWith("/var/task")`), try/catch around `writeKit` with friendly `persistError` field, UI hides persist checkbox on hosted via `/api/health` flag. 81/81 still pass.
- ✓ **Run #022 — Hosted Web-Version (Vercel) — `npm install` no longer required for end-users.** Same generator, same Express app, second entry point (`api/index.js`) re-exports the app for Vercel Serverless. `vercel.json` is six lines, `api/index.js` is three. Server gained `IS_HOSTED` flag (gated on `process.env.VERCEL === "1"`), force-disabled filesystem persist on hosted, in-memory rate limiter (30 req / IP / 60 s) on `/api/generate` and `/api/generate.zip`. Local-first guarantee preserved: `npm start` works exactly as before because the `process.argv[1]` guard at the bottom of `server.js` only listens when started as a CLI. 81/81 tests pass; live smoke confirms `/api/health` returns the hosted flag, generate works locally, and the rate limiter trips at request 30 with `Retry-After: 60`. Owner action pending: click Deploy in Vercel (instructions in Run #022's RUN_LOG entry). See Run #022.
- ✓ **Domain depth: tenth domain (`real estate`) — crosses 50% coverage by count of "domains a typical idea lands on".** Same mechanism as Runs #008 / #010 / #013 / #015 / #017 / #018 / #019 / #020. Risks cover fair-housing rules including on algorithmic decisions (US FHA, HUD 2023 algorithmic-screening guidance, Meta 2022 + SafeRent 2024 enforcement precedents, EU Race / Gender Equality Directives), MLS / IDX / portal integration patchwork (US RESO Web API + Data Dictionary + IDX feed contracts; UK + EU Rightmove / Zoopla / OnTheMarket / ImmobilienScout24 / SeLoger), listing-accuracy + advertising rules (square-footage disputes, undisclosed-defect claims, "stigmatised property" disclosure, UK CPRs / BPRs + Property Misdescriptions Act precedent), dual-agency + agency-licensing + disclosure jurisdictional variation (illegal in 8 US states, regulated elsewhere — surface the correct disclosure flow before introducing users), AML on high-value transactions (FinCEN beneficial-ownership rule effective December 2025, EU AMLD5 / AMLD6 + AMLA operational since 2025). Positioning is trust-and-disclosure-first not flashy-listing-first, audience framing depends sharply on which side you serve (B2B agent / B2C buyer / hybrid landlord), local-by-default not global-by-default (gazumping vs. sealed bids vs. escrow), inventory accuracy as a marketing surface, quantify in operator units (deals closed / days-on-market / list-to-sale ratio for agents; occupancy / vacancy / rent-collection % for landlords). **Two prior tests adjusted (`real estate` swapped to `travel & tourism` in the non-target lists), not weakened.** Zero drift in worked examples. See Run #021.
- ✓ **Domain depth: ninth domain (`creative & media`).** Same mechanism as Runs #008 / #010 / #013 / #015 / #017 / #018 / #019. Risks cover rights / licensing / royalty traceability (Creative Commons variants + work-for-hire + DDEX / CWR for music with ASCAP / BMI / SACEM / GEMA / PRS), AI-generated content disclosure as a regulated surface (EU AI Act, California AB 2655 / SB 942 + 9+ US state laws, C2PA / Content Credentials with Adobe / Microsoft / BBC / NYT / OpenAI), takedown + notice-and-action (DMCA 24–48h, EU DSA enforceable since 17 February 2024), contributor-vs-platform trust as fragile (Spotify / YouTube / Substack payout cycles, 60+ days notice + creator-facing changelog), copyright + moral-rights jurisdictional patchwork. Positioning is creator-first not platform-first (visible payout split, working export-and-leave, creator-controlled audience), provenance as a feature not as compliance, audience as 1–50-contributor independents (Universal / Sony / Warner + Adobe / Avid + YouTube / Spotify / TikTok as incumbents), workflow-over-hype (publish-ready in one coherent flow), quantify in creator units (minutes-saved-per-asset, royalty-split-accuracy, time-to-publish, payout latency, disputed-revenue %). **Zero drift in worked examples**; third consecutive run with no prior tests needing adjustment. See Run #020.
- ✓ **Domain depth: eighth domain (`retail & e-commerce`).** Same mechanism as Runs #008 / #010 / #013 / #015 / #017 / #018. Risks cover payment-card compliance non-negotiable (PCI DSS v4.0, 3-D Secure + PSD2 SCA, tokenisation through Stripe / Adyen / Worldpay / Braintree), peak-season + flash-sale reliability (10× capacity-test before Black Friday / Cyber Monday / Singles' Day / Boxing Day), returns + chargebacks as adversarial surface (return fraud + "friendly fraud" cost single-digit % of revenue), marketplace-vs-merchant regulatory split (EU OSS / IOSS, Wayfair-era US thresholds, DAC7, marketplace-facilitator laws in 40+ states, DSA, INFORM Consumers Act), storefront accessibility as law (EAA in full effect since June 2025, ADA Title III stream of US litigation). Positioning is conversion-first not catalogue-first, mobile-first means *checkout-first on mobile* (Apple Pay / Google Pay / Shop Pay), audience as 1–50-store DTC / independent merchants up to ~$50M GMV (Shopify / BigCommerce / WooCommerce / Adobe Commerce as platform incumbents), trust signals as the conversion lever, quantify in merchant units (AOV, CAC, refund rate, repeat-purchase, contribution margin, abandoned-cart recovery). **Zero drift in worked examples**; second consecutive run with no prior tests needing adjustment. See Run #019.
- ✓ **Domain depth: seventh domain (`logistics & supply chain`).** Same mechanism as Runs #008 / #010 / #013 / #015 / #017. Risks cover driver UX constrained by law and physics (UK Highway Code, German StVO §23, US distracted-driving + FMCSA mobile-phone rules), hardware as untrusted (ELDs, GPS, sensors, scanners, dash cams, refrigeration — every reading carries a freshness stamp), telematics privacy under GDPR + US state laws plus the FMCSA 49 CFR 395 ELD audit trail, HOS / DOT / ELD regulatory bedrock (FMCSA 49 CFR 395, EU 561/2006, EC 165/2014), peak-season reliability (capacity 2–3× during Q4 / back-to-school / harvest / summer tourism). Positioning is operations-first not flashy-dashboard, mobile-first for the field + desktop-first for the office (two surfaces, two design briefs), audience as small-and-mid carriers / 3PLs / shipper ops teams (10–500 vehicles or 1–20 sites — Oracle, SAP, Manhattan are the enterprise incumbents), reliability and offline-first as the brand, quantify in operator units (minutes per stop, dock-to-stock, OTIF, perfect-order rate, cost per mile, pick-rate per hour, dwell time). **Zero drift in worked examples**; cleanest specialisation diff yet — no prior tests had to be adjusted. See Run #018.
- ✓ **Domain depth: sixth domain (`education`).** Same mechanism as Runs #008 / #010 / #013 / #015. Risks cover student-data privacy as special-category from day one (FERPA, COPPA, GDPR Art. 9, age-appropriate-design codes) plus the parent-vs-student consent split, minor-safety as a duty-of-care surface, accessibility (WCAG 2.2 AA) as the procurement gate, proctoring + academic-integrity features as a real harm-risk surface, outcomes claims as advertising claims subject to FTC / ED Department / ASA scrutiny. Positioning is tutor-not-replacement framing, inclusive-by-default (low-bandwidth path, captions, font controls, language), audience as teachers / administrators / parents-as-buyers (rostering: Clever / ClassLink / OneRoster; SSO via Google or Microsoft for Education; classroom: Google Classroom / Canvas / Schoology), evidence-over-hype with cited pedagogy, procurement-ready marketing surface (DPA template, FERPA / GDPR posture, WCAG audit, sub-processor list). **Zero drift in worked examples.** See Run #017.
- ✓ **One-click "Generate now" on gallery cards.** Each example card now ships three buttons: **Generate now** (primary, accent fill) runs the full `/api/generate` round-trip on click and scrolls to the result; **Preview example** (secondary) keeps the faster pre-built-example path; **Use this idea** (secondary) keeps the edit-then-generate escape hatch. Click also mirrors the idea into the textarea so the live-inference preview line lights up alongside the result render. Pure UX change in `public/app.js`; no template changes, no test changes (71/71 pass), zero example drift, a11y audit unchanged. See Run #016.
- ✓ **Domain depth: fifth domain (`food & hospitality`).** Same mechanism as Runs #008 / #010 / #013. Risks cover seasonality + margin pressure, structural F&B staff turnover (60–100% annual), allergen + food-safety regulatory bedrock, peak-hour reliability ("two minutes during Saturday rush > two hours on Tuesday"), and owner-operator unit economics. Positioning is simple-on-shift first (sub-five-second one-handed interactions), no-laptop-needed mobile-first surface, owner-operator / floor-manager audience framing for independents and 1–5-site chains, save-time-or-save-waste-quantified pitching, and reliability-as-the-brand. **Zero drift in worked examples.** See Run #015.
- ✓ **Brand identity v3 + landing-page polish.** Logo redesigned from the 12-point compass star to a **12-petal compass bloom** — twelve leaf-shaped petals (one per generated file), four cardinal petals slightly extended (the user's compass), a luminous core (the original idea), three layered animations (rotating ripple wave around the petals, heartbeat on the core, breathing aura). Landing-page hero gained a two-column layout with the new logo at 280 px on the right and a CSS-only aurora effect (three slow-drifting blurred blobs) behind the headline. New `scripts/sync-docs-assets.js` (`npm run sync:assets`, with a `--check` mode wired into CI) ends the manual mirroring debt from Runs #005 / #009. New `scripts/build-og.js` rasterises `docs/og-source.svg` → `docs/og-card.png` (1200×630, 207 KB) via `@resvg/resvg-js`; `og:image` and `twitter:image` meta tags are now wired in `docs/index.html`. See Run #014.
- ✓ **Domain depth: fourth domain (`finance`).** Same mechanism as Run #008 / #010. Risks cover regulatory drift across GDPR / MiFID II / PSD2 / DORA / SOX / GLBA / BSA + equivalents, KYC/AML obligations, model risk on predictive components, audit-trail-as-feature, and conservative-defaults-over-impressive-automation. Positioning is auditable-by-default, read-only-first defaults, clean separation between informational and advisory output, compliance-aware finance teams as the audience, and reliability as the marketing message. **Zero drift in worked examples** (neither is finance). See Run #013.
- ✓ **A11y deep-dive: axe-core via jsdom + manual contrast pass.** Both pages (`public/index.html`, `docs/index.html`) report **zero axe violations** across 37 / 25 WCAG 2.0/2.1 A+AA + best-practice rules. Three rules are reported as `incomplete` (`color-contrast`, `landmark-one-main`, `page-has-heading-one`) because jsdom can't compute pixel-level layout — the latter two are confirmed manually (both pages ship a `<main>` and an `<h1>`); the first is covered by a deterministic 11-pair WCAG-AA contrast test in `tests/a11y.test.js`. Lowest contrast pair is **5.15:1** (muted text on panel-2), well above the 4.5:1 AA bar. Audit reproducible via `npm run audit:a11y`. See Run #012.
- ✓ **User-value upgrade: live inference preview + smarter audience parsing.** New `POST /api/preview` (cheap, context-only). UI shows a live "Detected: …" line under the textarea as you type (debounced, with stale-response protection). Audience extraction gained four fallback patterns (`built/made/designed/tailored for`, `that helps X`, `to help X`, `aimed at X`) — additive, so existing `for X` matches keep precedence and the worked examples stay byte-stable. See Run #011.
- ✓ **Domain depth: third domain (`health & wellness`).** Same mechanism as Run #008 — risks in `MASTERPLAN.md`, positioning in `DOCS/product-brief.md`. Health-data handling, crisis-path safety, off-label-use, clinical-claims regulatory line, trust under bad-news scenarios; positioning around trust-not-features, calm tone, evidence-backed recommendations, escalation path, self-management audience framing. **Zero drift in worked examples** (neither is health). See Run #010.
- ✓ **Brand identity v2.** Twelve-pointed compass-star logo replaces the generic five-point mark (Run #009). Twelve rays = the twelve generated files; four longer cardinal points = the user's "compass" of next steps. Same blue palette, same `prefers-reduced-motion` handling, plus a soft north-glow that pulses to anchor the "north star" reading.
- ✓ **Domain depth: first cut.** `src/templates/domain-blocks.js` adds domain-conditional sections to `MASTERPLAN.md` (risks) and `DOCS/product-brief.md` (positioning) for `climate & sustainability` and `professional services`. Other domains see no change; drift in worked examples was limited to the professional-services example only. See Run #008.
- ✓ **Schema extraction for context.** `src/schema.js` now defines the `Context` typedef, the canonical `PRODUCT_TYPE_VALUES` (8) and `DOMAIN_VALUES` (21) lists, and a `validateContext` / `assertContext` pair. `buildContext` calls `assertContext` so no invalid context can ever reach a template. See Run #007.
- ✓ **Domain heuristics expanded** (10 → 20 groups) + leading-word-boundary regex matcher fixing latent false positives like `"ci" → "civic"` and `"shop" → "workshop"`. See Run #006.
- ✓ **Public landing page deployed via GitHub Pages.** Static site under `/docs/`, deployed from `main` so `npm start` keeps working. See Run #005.
- ✓ **Brand identity.** Animated star logo + monochrome variant + favicon (Run #004).
- ✓ **Example gallery + preview API + accessibility pass.** (Run #003)

## When the user types "/ultrareview"

That's a user-triggered cloud review. You cannot launch it. If asked, explain what it does and stop.
