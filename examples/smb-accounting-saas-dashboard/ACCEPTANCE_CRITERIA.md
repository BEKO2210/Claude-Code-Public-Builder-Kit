# ACCEPTANCE CRITERIA — SaaS Dashboard for Small Business Accountants

Concrete, checkable statements of "done" for each phase in `ROADMAP.md`. A phase is complete only when every box in its section is checked.

> Rule: If a feature is not listed here, it is not in scope. To add scope, edit `MASTERPLAN.md` and `ROADMAP.md`, then add a checklist here in the same commit.

---

## Phase 0 — Foundation

### Stack & tooling
- [ ] Stack decision recorded as ADR-001 in `DOCS/technical-decisions.md`.
- [ ] `README.md` "Quick start" runs end-to-end on a clean machine.
- [ ] `npm test` (or stack equivalent) exists and passes — even if it only asserts `true`.
- [ ] CI pipeline runs lint + tests on every push.

### Hygiene
- [ ] `.gitignore` excludes secrets, build artifacts, and editor noise.
- [ ] No committed credentials, API keys, or `.env` files.
- [ ] License chosen (MIT unless ADR says otherwise).

---

## Phase 1 — MVP / Daily core action

### Functional
- [ ] One end-to-end flow exists: a user can complete the daily core action.
- [ ] Data persists across server restarts (no in-memory-only stores).
- [ ] At least one automated test per critical path.

### Quality
- [ ] No unhandled errors on the happy path.
- [ ] Error states are visible to the user (not silently swallowed).
- [ ] Code passes the project linter without warnings.

### Dogfooding
- [ ] You (the maintainer) used the product for the daily core action for 5 consecutive working days without falling back to a previous tool.

---

## Phase 2 — Validation

### Onboarding
- [ ] Sign-up flow works without manual intervention.
- [ ] A new user reaches the daily core action in < 3 minutes.

### Feedback
- [ ] Activation metric is instrumented and visible to you.
- [ ] At least one feedback channel is active (form / call notes / shared doc).

### External validation
- [ ] ≥ 3 external users have completed activation.
- [ ] ≥ 2 of them have stated they would continue using it.

---

## Phase 3 — Visibility & Retention

### Functional
- [ ] The single dashboard view from `MASTERPLAN.md` is shipped.
- [ ] Data export works (CSV at minimum, in a format the user can open in Excel / Sheets).
- [ ] Reminders / notifications exist (opt-in, dismissible).

### Metrics
- [ ] Retention metric is instrumented; week-4 retention is computable.
- [ ] Time-to-first-action for returning users is measurable.

---

## Phase 4 — Sustainable scale

### Performance
- [ ] Performance budget is defined in `ARCHITECTURE.md` (e.g., p95 < 500ms for the daily core action).
- [ ] Budget is enforced in CI or via a manual pre-release check.

### Operability
- [ ] One-page runbook exists for the three most likely incidents.
- [ ] Errors are observable (logging, error tracker, or equivalent).
- [ ] Backups / data export verified by an actual restore test.

### Public surface
- [ ] Public landing page exists.
- [ ] A stranger has signed up unaided and reached activation within 24 hours.

---

## Cross-cutting (every phase)

- [ ] `RUN_LOG.md` has an entry for every working session.
- [ ] No `TODO` comments older than the previous phase without an open issue.
- [ ] No dead code paths or orphaned files.
- [ ] Every new dependency is justified in `DOCS/technical-decisions.md`.

_Last edited: 2026-04-29 (initial scaffold)._
