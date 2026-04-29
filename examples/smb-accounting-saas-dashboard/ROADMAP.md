# ROADMAP — SaaS Dashboard for Small Business Accountants

A phased plan from foundation through scale. Each phase has a clear goal, a small set of deliverables, and an exit gate. **Do not start a phase until the previous phase's exit gate is met.**

Cross-reference: every deliverable here maps to a checklist in `ACCEPTANCE_CRITERIA.md`.

---

## Phase 0 — Foundation (≈ 2 sessions)

**Goal:** Lock vision, choose stack, get a hello-world running.

**Deliverables**
- ADR-001: stack decision committed in `DOCS/technical-decisions.md`.
- Hello-world app boots locally with one command.
- CI runs lint + tests on every push.
- `README.md` "Quick start" is replaced with real commands.

**Exit gate**
- A new contributor can clone, install, and run the app in under 5 minutes following only `README.md`.

---

## Phase 1 — MVP / "Daily core action" (≈ 5 sessions)

**Goal:** A single user can perform the daily core action end-to-end with real data.

**Deliverables**
- Minimal data model for the core entity.
- Create / read / update flow for that entity.
- One persisted store (no in-memory fakes).
- One automated test per critical path.
- A dogfood account where you yourself perform the core action daily.

**Exit gate**
- You have used the product for your own daily core action for 5 working days without falling back to spreadsheets / notes / the previous tool.

---

## Phase 2 — Validation (≈ 4 sessions)

**Goal:** Three external users perform the daily core action and answer "would you keep using this?" honestly.

**Deliverables**
- Sign-up flow (email + password is fine; no SSO yet).
- Basic empty-state and error handling.
- One feedback loop (in-app form, Discord, or scheduled call notes).
- Activation metric instrumented (see `MASTERPLAN.md §6`).

**Exit gate**
- ≥ 2 of 3 external users complete activation. At least 1 said unprompted that they would keep using it.

---

## Phase 3 — Visibility & Retention (≈ 5 sessions)

**Goal:** Users come back tomorrow, next week, next month.

**Deliverables**
- The single dashboard view referenced in `MASTERPLAN.md`.
- Email or push reminder for the daily core action (opt-in).
- Data export (CSV at minimum).
- Retention metric instrumented and visible to you.

**Exit gate**
- Week-4 retention ≥ 25% across the small cohort. Time-to-first-action median < 60 seconds for returning users.

---

## Phase 4 — Sustainable scale (≈ 4 sessions)

**Goal:** It survives 10× the current load and onboards strangers without you in the loop.

**Deliverables**
- Performance budget defined and enforced (see `ARCHITECTURE.md`).
- Public landing page with a self-serve signup path.
- One paid tier (if pricing is decided in an ADR).
- Runbook for the three most likely production incidents.

**Exit gate**
- A stranger signed up unaided and reached activation within 24 hours.

---

## Beyond Phase 4

Resist the urge to plan beyond here at the start. After Phase 4, the roadmap should be rewritten based on what real users actually do.

## How this document changes

- Phase reordering or new phases require an ADR.
- Within a phase, deliverables can be edited freely with a `RUN_LOG.md` entry.
- Estimated session counts are guidance, not contracts.

_Last edited: 2026-04-29 (initial scaffold)._
