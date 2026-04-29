// Small, focused domain specialisation. Each table maps a `Domain` value
// from src/schema.js to a short list of bullets; the helpers below render
// the bullets as a `###` subsection or — for any unspecialised domain —
// return an empty string so the host template stays byte-stable.
//
// To add a new specialised domain:
//   1. Add a key to DOMAIN_RISKS and/or DOMAIN_POSITIONING using a value
//      that exists in DOMAIN_VALUES (the load-time check below will catch
//      typos at server start and during `npm test`).
//   2. Run `npm test` and `npm run generate:examples`. Drift in
//      examples/<id> is only acceptable if that example's domain matches
//      the key you just added.

import { DOMAIN_VALUES } from "../schema.js";

const DOMAIN_RISKS = {
  "climate & sustainability": [
    "Greenwashing exposure: every public claim must be specific and falsifiable. Vague \"sustainable\" copy is a liability, not a marketing asset.",
    "Impact measurability: emissions / impact numbers must declare their methodology, scope (1 / 2 / 3 if applicable), time window, and uncertainty band — never round to a clean number that hides the math.",
    "Data quality: third-party sustainability data is patchy and slow-moving. Document every source and refresh cadence; treat stale data as a bug, not a footnote.",
    "Reporting / regulatory drift: rules (CSRD, SEC climate disclosure, voluntary frameworks) change yearly. Pin the version you support and a re-evaluation date.",
    "Trust and traceability: users will only adopt this if they can show an auditor where each number came from. Audit trail is a feature, not an extra."
  ],
  "professional services": [
    "Trust and credibility: a single embarrassing output destroys word-of-mouth. Slow rollout and a supervised mode beat a fast generic launch.",
    "Client-data privacy: assume PII and privileged information will end up in the system. No third-party logging, conservative retention, clear export + delete on request.",
    "Liability and expectation management: the product assists, it does not give legal / financial / tax / strategic advice. Make this boundary explicit in the UI, not buried in the ToS.",
    "Boundary between software help and professional judgement: the user is still the licensed expert. Avoid UX patterns that nudge them to rubber-stamp model output.",
    "Onboarding for non-technical users: partners / consultants / advisors are domain experts, not power users. First-run flow has to make the daily core action obvious in under three minutes."
  ],
  "health & wellness": [
    "Health-data handling: assume HIPAA-style obligations even outside the US (GDPR Art. 9 covers health data as special-category). Encryption at rest and in transit, minimal retention, audit logs, and a clear data-residency story are entry-cost, not differentiators.",
    "Crisis-path safety: anything that touches mental health, self-harm, or acute medical situations needs a designed and tested escalation path — visible, fast, with real-human routing — *before* launch, not after the first incident.",
    "Off-label use is inevitable: users will reach for the product for diagnosis, dosing, or therapy regardless of what the ToS says. Surface a clear in-product \"this is not medical advice\" line and a documented referral path; ToS-only disclaimers do not survive scrutiny.",
    "Clinical claims = different product: \"treats\", \"diagnoses\", \"cures\" language moves you into MedTech regulation (FDA SaMD, EU MDR). Wellness phrasing is fine; clinical phrasing is a regulated product class with a different launch path.",
    "Trust under bad-news scenarios: a wellness product is judged on the day a user's data leaks or a recommendation contributes to harm. Incident response, user-initiated export, and account deletion must work end-to-end before traffic scales."
  ]
};

const DOMAIN_POSITIONING = {
  "climate & sustainability": [
    "Lead with credible impact, not marketing copy: every claim cites the underlying number and the source.",
    "Default to transparent metrics — methodology, time window, scope, and uncertainty are visible in-product, not buried in PDFs.",
    "Honest data sources: name them on the same screen as the number. If a number is modeled, label it modeled.",
    "Audience framing: built for the operators who actually report the number (sustainability leads, project teams, civic / NGO programmes), not for board-deck consumption."
  ],
  "professional services": [
    "Sell time saved on the boring half of the work — repeatable workflows, not productivity theatre.",
    "Repeatable processes: every recurring task lives in one place, with a recorded version history that can be shown to a client.",
    "Better client communication: drafts, summaries, and status updates that the practitioner can send with confidence after a quick review.",
    "Professional documentation by default: every output is presentable to a client without rework.",
    "Reliable workflows for small teams — partner / consultant / firm of 1–10 — without a 90-day rollout."
  ],
  "health & wellness": [
    "Lead with trust, not features: clear data ownership, clear opt-out, clear deletion. People share more here than they intend; the product has to be worth that trust.",
    "Calm tone, no gamification of distress: streaks, leaderboards, and shame-based nudges hurt health-adjacent audiences. Default to gentle, opt-in encouragement.",
    "Evidence-backed, not influencer-backed: every recommendation cites the underlying study, guideline, or clinical source — with a date. \"Follows [guideline, 2025 update]\" beats \"trusted by 10,000 users\".",
    "Escalation path is part of the product: when someone needs a real human, the product gets out of the way fast. A visible \"talk to a real person\" route, not buried in settings.",
    "Audience framing: people self-managing their health (recovery, chronic conditions, day-to-day wellness), not patients in active acute care. The product complements clinicians; it does not replace them."
  ]
};

// Load-time check: every specialisation key must be a real Domain value.
// This catches typos before any kit is ever generated.
for (const key of [...Object.keys(DOMAIN_RISKS), ...Object.keys(DOMAIN_POSITIONING)]) {
  if (!DOMAIN_VALUES.includes(key)) {
    throw new Error(
      `domain-blocks.js: "${key}" is not in DOMAIN_VALUES. ` +
      `Use an existing value from src/schema.js or add the domain there first.`
    );
  }
}

function renderBlock(heading, items) {
  if (!items || items.length === 0) return "";
  const bullets = items.map((line) => `- ${line}`).join("\n");
  return `\n${heading}\n\n${bullets}\n`;
}

/**
 * Domain-conditional risks block for MASTERPLAN.md. Returns "" for any
 * domain we have not specialised — the host template renders nothing extra.
 *
 * @param {import("../schema.js").Context} ctx
 * @returns {string}
 */
export function domainRisksBlock(ctx) {
  return renderBlock(
    `### Domain-specific risks (${ctx.domain})`,
    DOMAIN_RISKS[ctx.domain]
  );
}

/**
 * Domain-conditional positioning block for DOCS/product-brief.md.
 *
 * @param {import("../schema.js").Context} ctx
 * @returns {string}
 */
export function domainPositioningBlock(ctx) {
  return renderBlock(
    `### Domain-specific positioning (${ctx.domain})`,
    DOMAIN_POSITIONING[ctx.domain]
  );
}

// Exposed for tests and for any future tooling that wants to introspect
// the specialised set without re-reading the tables.
export const SPECIALISED_DOMAINS = Object.freeze(
  Array.from(new Set([...Object.keys(DOMAIN_RISKS), ...Object.keys(DOMAIN_POSITIONING)]))
);
