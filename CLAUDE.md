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
├── server.js                 # Express app: /api/health, /api/generate, /api/generate.zip
├── public/                   # Vanilla HTML/CSS/JS — no framework, no build
│   ├── index.html            # Form, file viewer, Copy + Download ZIP buttons
│   ├── style.css
│   └── app.js                # Submit → render files → optional ZIP download
├── src/
│   ├── index.js              # generateKit(idea, opts) — orchestrates 12 templates
│   ├── context.js            # Heuristic idea → {projectName, slug, productType, audience, domain, generatedAt}
│   ├── templates/            # 12 modules, each `(ctx) => markdown string`
│   └── utils/
│       ├── slug.js           # slugify + acronym-aware titleCase
│       ├── write.js          # writeKit(files, dir)
│       └── zip.js            # buildZipBuffer(files, rootName) using archiver
├── scripts/
│   └── build-example.js      # Regenerates everything under examples/ deterministically
├── examples/
│   ├── small-business-website-system/   # "A website system for small local businesses"
│   └── smb-accounting-saas-dashboard/   # "A SaaS dashboard for small business accountants"
├── tests/
│   └── generator.test.js     # node:test suite (17 tests, no external deps)
└── output/                   # Runtime-generated kits (git-ignored)
```

Runtime dependencies: **express** (HTTP), **archiver** (ZIP). Nothing else.

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
- `src/context.js` — heuristic only. Don't reach for an LLM. The heuristics are defaults; users sharpen them in `MASTERPLAN.md`.
- `src/templates/*.js` — each exports a default function `(ctx) => string`. Keep templates close to 100–250 lines of generated markdown. Longer is fine if substantive; padding is not.
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

- [ ] `npm test` passes (currently 17 tests).
- [ ] If templates changed, `npm run generate:examples` was run and the resulting diff is intentional and committed.
- [ ] `RUN_LOG.md` has a new entry covering changes, tests, and next steps.
- [ ] No orphan `TODO`/`TBD` placeholders in generated files (the lint test enforces this).
- [ ] No staged-but-uncommitted noise.
- [ ] The branch is pushed.

## Next meaningful run after this one

Pick one of the following, in priority order:

1. **Multi-example UI gallery.** Add a small "Browse examples" panel in the UI that loads the on-disk examples (read-only) so visitors can preview without typing an idea. Keep it client-only — no new backend route needed if the example folders are exposed via `express.static`.
2. **Accessibility pass.** Audit the UI for keyboard navigation, focus order, and contrast. Document findings as a checklist in the UI section of this file.
3. **Schema extraction.** Move the inferred-context shape into a typed schema (JSDoc + a runtime validator like Zod-or-handwritten) so contributors writing new templates can rely on it without reading `context.js`.
4. **More heuristics.** Add 5–10 more domain keyword groups (e.g. logistics, gov-tech, climate, agriculture) and ensure each is covered by a test case in `context.js` tests.

Whichever you pick, file an entry in `RUN_LOG.md` first.

## When the user types "/ultrareview"

That's a user-triggered cloud review. You cannot launch it. If asked, explain what it does and stop.
