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
  ],
  "finance": [
    "Regulatory drift: applicable regimes (GDPR, MiFID II, PSD2, DORA in the EU; SOX, GLBA, BSA / FinCEN in the US; APRA, FCA, MAS, equivalents elsewhere) update yearly. Pin the version you support, store the policy artefact next to the code, and re-evaluate on a calendar — not when a regulator pings you.",
    "KYC / AML obligations: any product that touches funds, identity verification, or account onboarding inherits Customer Due Diligence and Suspicious-Activity-Report workflows. Do not add \"deposits\" / \"transfers\" / \"wallet\" language until the program is real, documented, and reviewed.",
    "Model risk on any predictive component: if the product scores, recommends, or auto-decides, document training-data lineage, validation methodology, ongoing monitoring, and a deterministic fallback for when the model is unavailable or wrong. Regulators will ask; users will not trust unsigned numbers either.",
    "Audit trail is non-negotiable: every state change captured with who / when / what / why, immutably and exportable. Auditors and customers ask for the same evidence — ship the export path before you ship features that depend on it.",
    "Conservative defaults beat impressive automation: \"we suggested + a human approved\" always wins over \"we did\". The blast radius of a wrong automated decision in finance is measured in dollars and lawsuits — design for reversibility before speed."
  ],
  "food & hospitality": [
    "Seasonality and margin pressure: revenue swings hard between peak (weekend lunch, holidays, summer terraces) and trough. The daily core action has to work brilliantly during 2× rushes or it gets dropped during them. Margin per cover is tight — every minute of operator attention has a measurable cost.",
    "Shift / front-of-house turnover: staff churn in F&B is structurally high (60–100% annual is normal). Product onboarding has to survive a new server's first Friday-night shift, with no read-the-manual moment. Train-by-doing beats train-by-handout.",
    "Allergen and food-safety compliance: allergen labelling, HACCP records, supply-chain traceability (EU 1169/2011, FDA / FSA equivalents), and date-coding are regulatory bedrock — not \"best effort\". A wrong allergen label is a hospitalised customer and a lawsuit, not a UX bug.",
    "Peak-hour reliability is the whole game: two minutes of downtime during a Saturday rush is worse than two hours on Tuesday afternoon. Offline graceful degradation, conservative caching, and a predictable performance budget matter more than feature breadth.",
    "Owner-operator economics: most independents run at single-digit net margins. They will not pay for \"nice to have\" — the product has to demonstrably save labour hours, prevent waste, or unlock revenue per shift. Quantify the saving in the pitch; the operator already does the math."
  ],
  "education": [
    "Student-data privacy is special-category from day one: FERPA (US), GDPR Art. 9 + age-appropriate-design codes (EU / UK), PIPEDA / FOIPPA (Canada), and COPPA's verifiable-parental-consent rule for under-13 in the US. The parent-vs-student split is the hardest part — under-13 is parent-controlled, 13–18 is jurisdiction-dependent, 18+ is student-controlled. Build the consent and data-subject-rights flow before the first feature, not after the first procurement question.",
    "Minor-safety is a duty-of-care surface, not a feature flag: any direct-message, peer-to-peer, or teacher-student channel inherits real safeguarding obligations — moderation, reporting paths, age-gating, and explicit logging of cross-role interactions. \"Family-friendly\" copy is the regulatory floor; the design has to back it up under a school-board audit.",
    "Accessibility for diverse learners is the procurement gate: WCAG 2.2 AA is the entry cost, not a stretch goal. The product must work for screen-reader users, keyboard-only users, students with dyslexia or low vision, and cognitive-load-sensitive learners. Education products that fail an accessibility audit get banned from districts and lose entire revenue lines overnight — this is not a \"v2 polish\" item.",
    "Proctoring and academic-integrity features carry real harm risk: camera-on monitoring, tab-blocking, keystroke patterns, and AI-driven \"cheating detection\" are increasingly regulated and litigated. A wrong flag has lasting consequences on a student's record. Default to assistive, not surveillance; if proctoring ships, the human-review path and the appeal process are part of the product, not a settings toggle.",
    "Outcomes claims are advertising claims: \"raises grades by X%\", \"boosts reading level by Y\" trigger FTC, ED Department, or ASA scrutiny once the product scales. Cite the study, the cohort, the time window, and the comparator. Vague efficacy copy fails school-district procurement and collapses parent trust on the first hard question."
  ],
  "logistics & supply chain": [
    "Driver UX is constrained by law and physics: interacting with a screen while a vehicle is in motion is illegal in most jurisdictions (UK Highway Code, German StVO §23, US state-by-state distracted-driving laws plus FMCSA mobile-phone rules for CDL drivers). Driver-facing surfaces need voice-first or motion-locked interaction modes; UI that requires taps on the move is a regulatory liability and a safety incident waiting to happen.",
    "Hardware-integration failure modes are not just software bugs: ELDs, GPS units, temperature sensors, barcode scanners, dash cams, refrigeration controllers all fail in the real world (battery dead, GPS denied, cellular dropout, sensor drift, BT pairing lost). Treat hardware as untrusted — every reading carries a freshness / confidence stamp, every offline gap has a documented recovery path, every sensor failure has a designed degradation state, not a generic error toast.",
    "Telematics privacy is a real surface: driver location is personal data under GDPR (and increasingly under US state privacy laws — CCPA, CPRA, CO, CT, VA equivalents). The ELD mandate (FMCSA 49 CFR 395) produces an audit trail that is both regulatory ammunition and a privacy surface. Document who can see what, retention windows, off-duty boundaries, and the lawful basis for processing — drivers and unions have pushed back on GPS surveillance more than once, sometimes in court.",
    "Hours-of-Service / DOT / ELD regulatory bedrock: HOS rules (FMCSA 49 CFR 395 in the US, EU 561/2006 + EC 165/2014 tachograph rules in Europe, equivalents in CA / AU / NZ) govern when a driver may legally drive. Any product that schedules, dispatches, or routes drivers must encode these rules, not just display them — auto-dispatching a driver into an HOS violation is a fineable offence for the carrier and a license risk for the driver.",
    "Peak-season reliability is the operational test: Q4 retail (Black Friday → Christmas), back-to-school, harvest, summer tourism — network capacity can 2–3× overnight, queues back up, hardware fails under heat / cold / dust, on-call rotations break. Capacity-test the product against 3× peak load before peak — discovering it during peak is a customer-loss event in a margin-tight industry that does not give second chances."
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
  ],
  "finance": [
    "Auditable by default: every output is reproducible from the inputs, the version of the rules, and the timestamp. The audit trail is the product, not a feature flag.",
    "Conservative defaults: read-only first; opt-in for write actions; multi-step confirmation on anything irreversible. Boring is a virtue here — finance teams pay for predictability, not for surprises.",
    "Clear separation between informational and advisory: surface the data clearly, but never blur the line into investment / tax / accounting advice unless you are licensed for it. Wording in the product is the contract with the regulator and the user.",
    "Audience framing: compliance-aware finance teams who already track regulatory cycles, write SOX-style controls, and pass IT audits. Sell to them in their language — controls, evidence, reproducibility — not in fintech-startup language.",
    "Reliability as the marketing message: numbers do not disagree across screens; exports tie back to the system of record; monthly close does not surprise anyone. Predictability is the most valuable thing you can sell to a finance team."
  ],
  "food & hospitality": [
    "Simple-on-shift first: every interaction must work in under five seconds with one hand, on a phone screen smudged with grease. No multi-step modals, no \"click here, then there\" — at peak service the operator has no spare attention to give.",
    "No laptop needed: the product runs end-to-end on the same phone the operator already has in their apron. Desktop is a back-office bonus, not the primary surface — design mobile-first because it is the only surface that matters during service.",
    "Audience framing: owner-operators and floor managers of independent restaurants, cafés, bistros, and small chains (1–5 sites). Not enterprise hospitality groups; not platform plays for \"the future of restaurant tech\".",
    "Save-time-or-save-waste, never both at once in the pitch: one clear value bullet (e.g. \"saves six hours per week of stocktake\") beats a vague \"operations platform\" story. Quantify in the operator's units — labour hours, food cost percent, covers per shift.",
    "Reliability as the brand: \"still works during the Saturday rush\" is the most expensive thing competitors fail at. Lean into it — uptime numbers, offline mode, two-tap fallbacks. Predictability beats novelty every time in a service environment."
  ],
  "education": [
    "Tutor, not replacement: the product sits next to the teacher, tutor, or parent — never in front of them. Lead with \"saves the teacher four hours a week of lesson planning\" or \"gives the parent visibility on the homework gap\". Avoid \"AI teacher\", \"auto-grader\", or \"personalised curriculum that adapts to your child\" framing — even when technically true, that copy collapses trust at the procurement stage and triggers union pushback.",
    "Inclusive by default: the product works for the kid with a screen reader, the kid on a 2018 Chromebook, and the kid whose home language is not English. Every flow has a low-bandwidth path, every video has captions and a transcript, every reading task exposes font-size and contrast controls. Inclusion is the design brief, not a footer link to an accessibility statement.",
    "Audience framing: teachers, school administrators, and parents are the buyers; students may be the daily users. Sell to district decision-makers in their language — rostering hooks (Clever, ClassLink, OneRoster), SSO via Google or Microsoft for Education, classroom-management integrations (Google Classroom, Canvas, Schoology), and a clear FERPA / GDPR posture. Not \"students-as-product\" framing.",
    "Evidence over hype: every learning recommendation cites the underlying pedagogical method — retrieval practice, spaced repetition, formative assessment — and a real source. \"Built on the Education Endowment Foundation's 2024 evidence summary\" beats \"AI-powered learning\" every time on a buyer's spreadsheet.",
    "Procurement-ready on the marketing surface: a public \"for educators\" page with the data-processing addendum template, the FERPA / GDPR posture, the WCAG audit summary, and the third-party sub-processor list is the most valuable B2B page in this space. Districts have a procurement checklist; meet it on the first email, not after three weeks of back-and-forth."
  ],
  "logistics & supply chain": [
    "Operations-first, not flashy-dashboard: dispatchers, drivers, and warehouse leads spend their day on a screen that has to surface the next decision in under three seconds. Lead with the daily core action (dispatch a load, scan a parcel, log a delivery exception). Leave fleet-wide analytics for the after-hours management surface — the shift worker has no time for \"data storytelling\".",
    "Mobile-first for the field, desktop-first for the office: drivers and warehouse staff are on phones, tablets, or handheld scanners — often with gloves on, often outdoors, often offline. Dispatchers, planners, and ops managers are at workstations. Two surfaces, two design briefs. A single responsive layout that \"adapts to mobile\" is the wrong answer in this space.",
    "Audience framing: small-and-mid carriers, 3PLs, and shipper ops teams (10–500 vehicles or 1–20 sites). Not the enterprise platform play — Oracle, SAP, Manhattan are the incumbents and they win on pricing and integration depth. Win on speed-to-onboard, on the specific slice of the workflow you do better, and on the support-call response time the carrier will quote when comparing vendors.",
    "Reliability and offline-first as the brand: trucks lose signal, scanners drop BT, warehouses have RF dead zones. The product must behave well under real network conditions — optimistic UI with deterministic sync, conflict resolution on reconnect, queued actions that survive a force-quit. Sell that ability — uptime, offline mode, sync-since-last-online — as a marketing surface, not a footnote.",
    "Quantify in the operator's units: minutes per stop, dock-to-stock time, perfect-order rate, cost per mile, on-time-in-full (OTIF), pick-rate per hour, dwell time. Pitch in those numbers — generic \"operational efficiency\" copy reads as software-vendor noise to a fleet manager who already keeps a spreadsheet of those KPIs and updates it weekly."
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
