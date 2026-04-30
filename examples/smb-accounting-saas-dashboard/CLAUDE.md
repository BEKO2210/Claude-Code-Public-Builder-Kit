# CLAUDE.md — Operating rules for SaaS Dashboard for Small Business Accountants

This file governs how Claude Code should behave inside this repository. Read it at the start of every session.

## Project context

- **What we're building:** A SaaS dashboard for small business accountants
- **Audience:** small business accountants
- **Domain:** professional services
- **Product type:** web app

The authoritative description lives in `MASTERPLAN.md`. If `MASTERPLAN.md` and this file disagree, `MASTERPLAN.md` wins — fix this file in the same session.

## Hard rules

1. **Stay in scope.** If a change isn't traceable to `MASTERPLAN.md` or `ROADMAP.md`, stop and ask.
2. **No invented features.** Don't add functionality that isn't listed in `ACCEPTANCE_CRITERIA.md`.
3. **No silent placeholders.** Never leave `TODO`, `FIXME`, or empty stubs without an entry in `RUN_LOG.md` describing why and the follow-up.
4. **One change, one reason.** A commit fixes one thing or adds one thing. Mixed commits are rejected.
5. **Tests or proof.** Every behavioral change ships with a test, or with a documented manual verification step in the session's `RUN_LOG.md` entry.
6. **Update the log.** Append an entry to `RUN_LOG.md` at the end of every session — even short ones.

## Working method

- Start each session by reading the latest `RUN_LOG.md` entry and the `ROADMAP.md` row for the current phase.
- Plan before editing: state the change, the files involved, and the exit criteria.
- Prefer editing existing files to creating new ones.
- Keep modules small (~150 lines) and functions single-purpose.
- Match the style of surrounding code. If the codebase has no style yet, default to the choices recorded in `DOCS/technical-decisions.md`.

## What "done" means

A task is done when:

1. The acceptance criteria for the relevant scope item are checked off in `ACCEPTANCE_CRITERIA.md`.
2. Tests pass locally.
3. The change is documented in `RUN_LOG.md`.
4. No new `TODO` comments without an owner and date.

## Communication style

- State what you're about to do in one sentence before you do it.
- Cite file paths with line numbers (`src/foo.ts:42`) when referring to code.
- When you don't know something, say so and propose how to find out — never invent.

## Things you must not do

- Do not push directly to a protected branch.
- Do not run destructive commands (`rm -rf`, force-push, `git reset --hard`) without explicit user approval.
- Do not add dependencies without recording the decision in `DOCS/technical-decisions.md`.
- Do not refactor opportunistically. Refactors require their own session and entry.

## Session checklist

Before ending a session, confirm:

- [ ] `RUN_LOG.md` has a new entry.
- [ ] `ACCEPTANCE_CRITERIA.md` reflects what's actually true today.
- [ ] No staged-but-uncommitted changes you don't intend to keep.
- [ ] Next session has a clear starting point written down.

---

*This planning kit was generated from a one-line idea by [Builder Kit](https://claude-code-public-builder-kit.vercel.app/) — free, open source, MIT-licensed. To regenerate or build a kit for a different idea, visit the URL above.*
