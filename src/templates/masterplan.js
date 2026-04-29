import { domainRisksBlock } from "./domain-blocks.js";

export default function masterplan(ctx) {
  return `# MASTERPLAN — ${ctx.projectName}

> Single source of truth. If anything in the repo contradicts this file, this file wins.

## 1. Vision

A focused ${ctx.productType} that helps **${ctx.audience}** solve a specific, painful problem in **${ctx.domain}** — without bloat, without ceremony, and without a multi-month onboarding curve.

## 2. The problem we're solving

Today, ${ctx.audience} typically rely on a patchwork of tools that were not designed for them: spreadsheets, generic SaaS, ad-hoc workflows. The result is wasted time, brittle process, and decisions made without good data.

Concretely, three pains we believe matter most (validate or replace these in the first week):

1. **Friction** — too many steps to do the daily core action.
2. **Visibility** — no clear, current picture of what's happening in the business / workflow.
3. **Lock-in** — when the user outgrows their current setup, switching costs are punishing.

## 3. The solution in one paragraph

A ${ctx.productType} that does the daily core action in one place, gives ${ctx.audience} an at-a-glance picture of the things they actually care about, and is exportable / portable by default. Opinionated where opinions help, configurable where they must be.

## 4. Core principles

1. **Boring tech, sharp product.** Use proven stack components; spend the novelty budget on UX and domain insight.
2. **Ship vertical slices.** Each release is a thin, end-to-end usable feature — never a half-built backend with no UI.
3. **Optimize for legibility.** A new contributor should understand what the codebase does in under 30 minutes.
4. **Default to fewer features.** Adding is easy; subtracting is hard.
5. **Real users from week one.** Synthetic data is for tests, not for product decisions.

## 5. Scope

### In scope (initial release)

- The single daily core action, end-to-end.
- A minimum viable surface for visibility (one dashboard view).
- Account creation, basic auth, and data export.
- Documentation good enough that a new user can self-onboard.

### Out of scope (until proven necessary)

- Multi-tenant enterprise features (SSO, audit logs, RBAC).
- Mobile-native apps.
- Integrations beyond one or two highest-leverage targets.
- AI features that aren't directly tied to the daily core action.

> Items in "out of scope" can move into scope only via an entry in \`DOCS/technical-decisions.md\` (an ADR) that justifies the move and updates \`ROADMAP.md\`.

## 6. Success metrics

We measure three things, in this order:

1. **Activation** — % of new users who complete the daily core action within 24 hours.
2. **Retention** — % of activated users still active in week 4.
3. **Word-of-mouth** — % of new users who arrive via existing-user referral.

Targets for the first 90 days post-launch:

- Activation ≥ 50%.
- Week-4 retention ≥ 25%.
- Referral share ≥ 20% by day 90.

## 7. Non-goals

- Becoming a horizontal platform for everyone.
- Matching the feature surface of incumbent tools.
- Premature monetization complexity (multi-tier plans, seat math, usage metering).

## 8. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| We build the wrong "daily core action" | Medium | High | 5 user interviews before week 2; revisit in \`RUN_LOG.md\` entries. |
| Scope creep from enthusiastic users | High | Medium | Hard enforcement of \`ACCEPTANCE_CRITERIA.md\`. |
| Stack choice locks us in | Low | Medium | Boring, swappable components. ADR required for any lock-in dependency. |
| Solo-developer burnout | Medium | High | One phase at a time. Each phase has a clear "stop and reassess" gate. |
${domainRisksBlock(ctx)}
## 9. Open questions

These are the questions we will answer in the first two weeks. Each gets an ADR.

- What is the single most important "daily core action" for ${ctx.audience}?
- Where do they currently do this action, and what would make them switch?
- What's the smallest piece of data we need to make their visibility view useful?
- What's the simplest pricing model that doesn't pre-decide the business model?

## 10. How this document changes

- Edits to this file require a \`RUN_LOG.md\` entry.
- Major changes (vision, scope, principles) require an ADR in \`DOCS/technical-decisions.md\`.
- Minor edits (typos, clarifications) can be made directly with a one-line note in \`RUN_LOG.md\`.

_Last edited: ${ctx.generatedAt.slice(0, 10)} (initial scaffold)._
`;
}
