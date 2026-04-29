export default function runPlan(ctx) {
  const sessions = [
    { phase: "Phase 0", title: "Sharpen the masterplan", goal: "Edit MASTERPLAN.md so every paragraph is true and specific to your real intent.", deliverable: "MASTERPLAN.md updated; assumptions removed.", exit: "You can read it aloud without flinching." },
    { phase: "Phase 0", title: "Pick the stack (ADR-001)", goal: "Decide language, framework, and database.", deliverable: "ADR-001 in DOCS/technical-decisions.md.", exit: "ADR is committed; rationale fits in 5 bullets." },
    { phase: "Phase 0", title: "Hello-world scaffold", goal: "Boot the chosen stack with one command.", deliverable: "Working `npm start` (or equivalent); README quick-start replaced.", exit: "Fresh clone runs in <5 minutes." },
    { phase: "Phase 0", title: "CI pipeline", goal: "Lint + test on every push.", deliverable: ".github/workflows/ci.yml or equivalent; one trivial test.", exit: "Green check on a PR." },
    { phase: "Phase 1", title: "Domain model — first cut", goal: "Define the core entity.", deliverable: "Type definitions and a single migration in `data/`.", exit: "Schema reviewed; ADR if non-obvious." },
    { phase: "Phase 1", title: "Create + read endpoints", goal: "Persist and retrieve the core entity.", deliverable: "Two routes in `http/`; matching service in `services/`.", exit: "Manual curl + one integration test pass." },
    { phase: "Phase 1", title: "Minimal UI for the core action", goal: "A single screen where the core action happens.", deliverable: "One page / view; no styling beyond legible defaults.", exit: "You can perform the action without the network tab open." },
    { phase: "Phase 1", title: "Update flow", goal: "User can edit / correct the core entity.", deliverable: "Update route + UI affordance + test.", exit: "Edit round-trips through Postgres." },
    { phase: "Phase 1", title: "Dogfood week", goal: "You use it daily for 5 working days.", deliverable: "5 RUN_LOG entries describing real usage.", exit: "No fall-back to the previous tool." },
    { phase: "Phase 2", title: "Sign-up + auth", goal: "External users can create accounts.", deliverable: "Sign-up + login flow; password hashing.", exit: "Two test accounts created end-to-end." },
    { phase: "Phase 2", title: "Empty + error states", goal: "First-run UX is not embarrassing.", deliverable: "Empty-state copy; one error boundary.", exit: "Screenshot review; nothing reads as broken." },
    { phase: "Phase 2", title: "Activation metric", goal: "Instrument the activation event.", deliverable: "Event log; weekly activation report you can read.", exit: "Number is visible in your own dashboard." },
    { phase: "Phase 2", title: "Three external testers", goal: "Recruit and onboard 3 users from the target audience.", deliverable: "RUN_LOG entries with their feedback verbatim.", exit: "≥ 2 say they would keep using it." },
    { phase: "Phase 3", title: "Dashboard view", goal: "The single visibility view from MASTERPLAN.md.", deliverable: "One page summarising the user's data.", exit: "It answers the user's primary visibility question." },
    { phase: "Phase 3", title: "Reminders / re-engagement", goal: "Bring users back the next day.", deliverable: "Email or push reminder; opt-in; unsubscribe path.", exit: "First reminder sent and confirmed received." },
    { phase: "Phase 3", title: "CSV export", goal: "Portability beats lock-in.", deliverable: "Export endpoint + UI button.", exit: "File opens cleanly in Excel and Sheets." },
    { phase: "Phase 3", title: "Retention metric", goal: "Compute week-4 retention.", deliverable: "Query + saved view.", exit: "Number computed for the existing cohort." },
    { phase: "Phase 4", title: "Performance pass", goal: "Hit the budget in ARCHITECTURE.md.", deliverable: "Profiling notes; one optimisation per slow path.", exit: "p95 within budget." },
    { phase: "Phase 4", title: "Public landing page", goal: "A stranger can find and try this.", deliverable: "Landing page + signup link.", exit: "Lighthouse passes; copy peer-reviewed." },
    { phase: "Phase 4", title: "Stranger onboarding test", goal: "Someone you don't know reaches activation.", deliverable: "RUN_LOG entry capturing what they hit.", exit: "They activate within 24 hours of signup." }
  ];

  const rows = sessions
    .map((s, i) => {
      const num = String(i + 1).padStart(2, "0");
      return `### Session ${num} — ${s.title}\n\n- **Phase:** ${s.phase}\n- **Goal:** ${s.goal}\n- **Deliverable:** ${s.deliverable}\n- **Exit criteria:** ${s.exit}\n`;
    })
    .join("\n");

  return `# Run plan — 20 sessions for ${ctx.projectName}

A concrete, ordered list of 20 working sessions to get from empty repo to a sustainable product. Treat the order as a default; reorder when reality demands, but record the change in \`RUN_LOG.md\`.

Each session should fit in 60–120 minutes. If a session is overflowing, split it; do not steamroll past the exit criteria.

---

${rows}

---

## How to use this list

1. At the start of a session, read the next unfinished entry above.
2. Paste a derived prompt into Claude Code: "We're at Session NN. Goal: ... Deliverable: ... Exit: ...".
3. Stop when the exit criteria are met. Append to \`RUN_LOG.md\`.
4. Do not skip sessions to chase a feature. The order matters more than speed.

_Last edited: ${ctx.generatedAt.slice(0, 10)} (initial scaffold)._
`;
}
