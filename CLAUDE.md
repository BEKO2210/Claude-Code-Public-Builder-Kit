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
│                             #              /api/examples, /api/examples/:id
├── docs/                     # Public landing page (GitHub Pages source)
│   ├── index.html            # Hero, 12-file overview, quick start, examples, footer
│   ├── style.css             # Same dark palette as the local app, no JS
│   ├── logo.svg, favicon.svg # Copies of /public assets — sync manually if changed
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
│   └── build-example.js      # Iterates EXAMPLES from src/examples.js → writes examples/<id>/
├── examples/
│   ├── small-business-website-system/   # "A website system for small local businesses"
│   └── smb-accounting-saas-dashboard/   # "A SaaS dashboard for small business accountants"
├── tests/
│   └── generator.test.js     # node:test suite (55 tests, no external deps)
└── output/                   # Runtime-generated kits (git-ignored)
```

Runtime dependencies: **express** (HTTP), **archiver** (ZIP). Nothing else.

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
- `server.js` — keep it boring. Validate input at the boundary (`/api/generate`, `/api/generate.zip`), reject anything > 500 chars, never let the slug escape `output/`.
- `public/` — plain HTML/CSS/JS only. No frameworks, no transpilers.
- `tests/generator.test.js` — `node:test`. Adding a new template means updating `EXPECTED_FILES` and the file-count assertions.

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

- [ ] `npm test` passes (currently 55 tests).
- [ ] If templates or `src/examples.js` changed, `npm run generate:examples` was run and the resulting diff is intentional and committed.
- [ ] `RUN_LOG.md` has a new entry covering changes, files touched, tests run, known limitations, and next recommended run.
- [ ] No orphan `TODO`/`TBD` placeholders in generated files (the lint test enforces this).
- [ ] No staged-but-uncommitted noise.
- [ ] The branch is pushed.

## Next meaningful run after this one

Pick one of the following, in priority order:

1. **Domain depth: extend coverage carefully.** Two domains are now specialised (`climate & sustainability`, `professional services`) in two templates. Good next candidates with similar leverage and similar template fit: `health & wellness`, `finance`, `food & hospitality`. Keep the cadence small — one domain at a time, in the existing two templates, with tests and an example regen each time.
2. **A11y deep-dive.** Beyond the practical pass already done (skip link, focus-visible, aria-current, aria-live, labels), run an automated audit (axe / Lighthouse) against both the local app and the landing page; capture findings as a checklist here.
3. **Landing page polish.** After the page is online, iterate based on what visitors actually click — maybe add a tiny static screenshot/illustration for the hero, an OG image (PNG, since most platforms don't render SVG OG images), and a `scripts/sync-docs-assets.js` so logo updates auto-mirror into `docs/`.
4. **Optional file-tree filter.** Inline filter input above `#file-list` to narrow large examples — only worthwhile once examples grow beyond 12 files.

Whichever you pick, file an entry in `RUN_LOG.md` first.

### Recently completed

- ✓ **Brand identity v2.** Twelve-pointed compass-star logo replaces the generic five-point mark (Run #009). Twelve rays = the twelve generated files; four longer cardinal points = the user's "compass" of next steps. Same blue palette, same `prefers-reduced-motion` handling, plus a soft north-glow that pulses to anchor the "north star" reading.
- ✓ **Domain depth: first cut.** `src/templates/domain-blocks.js` adds domain-conditional sections to `MASTERPLAN.md` (risks) and `DOCS/product-brief.md` (positioning) for `climate & sustainability` and `professional services`. Other domains see no change; drift in worked examples was limited to the professional-services example only. See Run #008.
- ✓ **Schema extraction for context.** `src/schema.js` now defines the `Context` typedef, the canonical `PRODUCT_TYPE_VALUES` (8) and `DOMAIN_VALUES` (21) lists, and a `validateContext` / `assertContext` pair. `buildContext` calls `assertContext` so no invalid context can ever reach a template. See Run #007.
- ✓ **Domain heuristics expanded** (10 → 20 groups) + leading-word-boundary regex matcher fixing latent false positives like `"ci" → "civic"` and `"shop" → "workshop"`. See Run #006.
- ✓ **Public landing page deployed via GitHub Pages.** Static site under `/docs/`, deployed from `main` so `npm start` keeps working. See Run #005.
- ✓ **Brand identity.** Animated star logo + monochrome variant + favicon (Run #004).
- ✓ **Example gallery + preview API + accessibility pass.** (Run #003)

## When the user types "/ultrareview"

That's a user-triggered cloud review. You cannot launch it. If asked, explain what it does and stop.
