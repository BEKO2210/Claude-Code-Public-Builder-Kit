# CLAUDE.md — Operating rules for the Claude Code Public Builder Kit

This file governs how Claude Code should behave inside **this** repository (the kit itself, not the kits it generates). Read it at the start of every session.

## What this project is

A small, self-contained Node.js + Express + vanilla-frontend tool that turns a one-line project idea into 12 substantive Markdown files. Users run it locally; there is no hosted instance, no database, no auth.

The most important file is `src/index.js`, which orchestrates the 12 templates in `src/templates/`.

## Guarantees we make to users

These are non-negotiable. Don't regress them:

1. **Local-first.** `npm install && npm start` works on any machine with Node ≥ 18. No cloud account, no API key.
2. **No build step.** Source files run as-is. Don't introduce a bundler, transpiler, or framework that requires a build.
3. **Tiny dependency surface.** Express is the only runtime dependency. Don't add another without an entry in `DOCS/technical-decisions.md` and explicit approval.
4. **Each generated file is substantial** (≥ 800 bytes) and contains no orphan `TODO` or `TBD` placeholder lines. The test suite enforces this.
5. **Determinism.** Given the same idea and the same `now`, output is byte-identical. The tests rely on this for the worked example.

## Hard rules

1. **No invented features.** If a change isn't traceable to an explicit user request or a `RUN_LOG.md` follow-up, stop and ask.
2. **One change, one reason per commit.** Don't mix template edits, server changes, and refactors in the same commit.
3. **Tests must pass before commit.** `npm test` is fast — run it.
4. **Update `RUN_LOG.md` at the end of every session.** Even one-line sessions get an entry.
5. **Keep templates honest.** A generated doc may include a placeholder phrase only if that phrase explicitly tells the user what to replace and why. Never leave a bare `TODO`.
6. **Don't break the worked example.** If you change a template, run `npm run generate:example` and review the diff before committing.

## File-by-file conventions

- `src/index.js` — one place where the 12-file plan is declared. Adding a 13th file requires an entry here and a corresponding template.
- `src/context.js` — heuristic only. Don't reach for an LLM. The heuristics are defaults; users sharpen them in `MASTERPLAN.md`.
- `src/templates/*.js` — each exports a default function `(ctx) => string`. Keep templates close to 100–250 lines of generated markdown. Longer is fine if substantive; padding is not.
- `server.js` — keep it boring. Validate input at the boundary (`/api/generate`), reject anything > 500 chars, never let the slug escape `output/`.
- `public/` — plain HTML/CSS/JS only. No frameworks, no transpilers.
- `tests/generator.test.js` — `node:test`. Adding a new template means adding (or updating) the file-count and content-floor assertions.

## Working method

- Start each session by reading the latest `RUN_LOG.md` entry.
- Plan before editing: state the change, the files involved, and how you'll verify it.
- Prefer editing existing files to creating new ones.
- After changing a template, regenerate the worked example and skim the diff.

## Things you must not do

- Push directly to a protected branch.
- Run destructive git commands (`reset --hard`, force-push, branch deletion) without explicit approval.
- Add a runtime dependency without recording the decision and the alternative considered.
- Add tracking, telemetry, or network calls beyond the local `/api/generate` endpoint.
- Replace the vanilla frontend with a framework. Discuss first.

## Session checklist

Before ending a session, confirm:

- [ ] `npm test` passes.
- [ ] If a template changed, `npm run generate:example` was run and the example diff is intentional.
- [ ] `RUN_LOG.md` has a new entry describing what changed and what's next.
- [ ] No staged-but-uncommitted noise.

## When the user types "/ultrareview"

That's a user-triggered cloud review. You cannot launch it. If asked, explain what it does and stop.
