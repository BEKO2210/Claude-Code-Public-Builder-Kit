# Run plan — 20 sessions for SaaS Dashboard for Small Business Accountants

A concrete, ordered list of 20 working sessions to get from empty repo to a sustainable product. Treat the order as a default; reorder when reality demands, but record the change in `RUN_LOG.md`.

Each session should fit in 60–120 minutes. If a session is overflowing, split it; do not steamroll past the exit criteria.

---

### Session 01 — Sharpen the masterplan

- **Phase:** Phase 0
- **Goal:** Edit MASTERPLAN.md so every paragraph is true and specific to your real intent.
- **Deliverable:** MASTERPLAN.md updated; assumptions removed.
- **Exit criteria:** You can read it aloud without flinching.

### Session 02 — Pick the stack (ADR-001)

- **Phase:** Phase 0
- **Goal:** Decide language, framework, and database.
- **Deliverable:** ADR-001 in DOCS/technical-decisions.md.
- **Exit criteria:** ADR is committed; rationale fits in 5 bullets.

### Session 03 — Hello-world scaffold

- **Phase:** Phase 0
- **Goal:** Boot the chosen stack with one command.
- **Deliverable:** Working `npm start` (or equivalent); README quick-start replaced.
- **Exit criteria:** Fresh clone runs in <5 minutes.

### Session 04 — CI pipeline

- **Phase:** Phase 0
- **Goal:** Lint + test on every push.
- **Deliverable:** .github/workflows/ci.yml or equivalent; one trivial test.
- **Exit criteria:** Green check on a PR.

### Session 05 — Domain model — first cut

- **Phase:** Phase 1
- **Goal:** Define the core entity.
- **Deliverable:** Type definitions and a single migration in `data/`.
- **Exit criteria:** Schema reviewed; ADR if non-obvious.

### Session 06 — Create + read endpoints

- **Phase:** Phase 1
- **Goal:** Persist and retrieve the core entity.
- **Deliverable:** Two routes in `http/`; matching service in `services/`.
- **Exit criteria:** Manual curl + one integration test pass.

### Session 07 — Minimal UI for the core action

- **Phase:** Phase 1
- **Goal:** A single screen where the core action happens.
- **Deliverable:** One page / view; no styling beyond legible defaults.
- **Exit criteria:** You can perform the action without the network tab open.

### Session 08 — Update flow

- **Phase:** Phase 1
- **Goal:** User can edit / correct the core entity.
- **Deliverable:** Update route + UI affordance + test.
- **Exit criteria:** Edit round-trips through Postgres.

### Session 09 — Dogfood week

- **Phase:** Phase 1
- **Goal:** You use it daily for 5 working days.
- **Deliverable:** 5 RUN_LOG entries describing real usage.
- **Exit criteria:** No fall-back to the previous tool.

### Session 10 — Sign-up + auth

- **Phase:** Phase 2
- **Goal:** External users can create accounts.
- **Deliverable:** Sign-up + login flow; password hashing.
- **Exit criteria:** Two test accounts created end-to-end.

### Session 11 — Empty + error states

- **Phase:** Phase 2
- **Goal:** First-run UX is not embarrassing.
- **Deliverable:** Empty-state copy; one error boundary.
- **Exit criteria:** Screenshot review; nothing reads as broken.

### Session 12 — Activation metric

- **Phase:** Phase 2
- **Goal:** Instrument the activation event.
- **Deliverable:** Event log; weekly activation report you can read.
- **Exit criteria:** Number is visible in your own dashboard.

### Session 13 — Three external testers

- **Phase:** Phase 2
- **Goal:** Recruit and onboard 3 users from the target audience.
- **Deliverable:** RUN_LOG entries with their feedback verbatim.
- **Exit criteria:** ≥ 2 say they would keep using it.

### Session 14 — Dashboard view

- **Phase:** Phase 3
- **Goal:** The single visibility view from MASTERPLAN.md.
- **Deliverable:** One page summarising the user's data.
- **Exit criteria:** It answers the user's primary visibility question.

### Session 15 — Reminders / re-engagement

- **Phase:** Phase 3
- **Goal:** Bring users back the next day.
- **Deliverable:** Email or push reminder; opt-in; unsubscribe path.
- **Exit criteria:** First reminder sent and confirmed received.

### Session 16 — CSV export

- **Phase:** Phase 3
- **Goal:** Portability beats lock-in.
- **Deliverable:** Export endpoint + UI button.
- **Exit criteria:** File opens cleanly in Excel and Sheets.

### Session 17 — Retention metric

- **Phase:** Phase 3
- **Goal:** Compute week-4 retention.
- **Deliverable:** Query + saved view.
- **Exit criteria:** Number computed for the existing cohort.

### Session 18 — Performance pass

- **Phase:** Phase 4
- **Goal:** Hit the budget in ARCHITECTURE.md.
- **Deliverable:** Profiling notes; one optimisation per slow path.
- **Exit criteria:** p95 within budget.

### Session 19 — Public landing page

- **Phase:** Phase 4
- **Goal:** A stranger can find and try this.
- **Deliverable:** Landing page + signup link.
- **Exit criteria:** Lighthouse passes; copy peer-reviewed.

### Session 20 — Stranger onboarding test

- **Phase:** Phase 4
- **Goal:** Someone you don't know reaches activation.
- **Deliverable:** RUN_LOG entry capturing what they hit.
- **Exit criteria:** They activate within 24 hours of signup.


---

## How to use this list

1. At the start of a session, read the next unfinished entry above.
2. Paste a derived prompt into Claude Code: "We're at Session NN. Goal: ... Deliverable: ... Exit: ...".
3. Stop when the exit criteria are met. Append to `RUN_LOG.md`.
4. Do not skip sessions to chase a feature. The order matters more than speed.

_Last edited: 2026-04-29 (initial scaffold)._
