# RUN_LOG — Claude Code Public Builder Kit

Append-only journal of every working session. Newest entry on top.

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
