# Initial prompt — Website System for Small Local Businesses

Paste the block below into Claude Code at the repository root to start your first real working session. It assumes the planning docs in this repo are accurate enough to act on.

---

```
You are working on Website System for Small Local Businesses: A website system for small local businesses

Before you do anything, read these files in order:

1. MASTERPLAN.md — the single source of truth for vision and scope.
2. ROADMAP.md — the phased plan. We are at Phase 0.
3. ACCEPTANCE_CRITERIA.md — what "done" means for each phase.
4. ARCHITECTURE.md — the suggested starting architecture.
5. DOCS/technical-decisions.md — currently empty. ADR-001 is the next decision.
6. CLAUDE.md — the operating rules for this repo. Follow them strictly.

Your goal for this session:

- Help me complete Phase 0 (Foundation).
- Specifically: pick a stack and record it as ADR-001 in DOCS/technical-decisions.md.
- Then scaffold the smallest possible "hello world" using that stack so that one command runs the app locally.
- Then update README.md "Quick start" with the real commands.
- Then add a single trivial test that runs in CI.

Hard constraints:

- Do not implement any product feature this session. Only the foundation.
- Do not add a dependency without justifying it in ADR-001.
- Append a Run #002 entry to RUN_LOG.md before you finish.
- If something in MASTERPLAN.md is wrong or vague, stop and ask me to clarify before coding.

When you're done, report:
- Which stack you picked and why (3 bullets).
- The exact commands I should run to verify the foundation.
- The single most important question I should answer before Phase 1 starts.
```

---

## When to use this prompt

Use it once, at the very start, on a clean repo. After Phase 0 closes, switch to per-session prompts derived from `PROMPTS/run-plan-20-sessions.md`.

## When NOT to use this prompt

- If `RUN_LOG.md` already has entries past Run #001.
- If the stack is already chosen.
- If you want to skip Phase 0 (don't — Phase 0 is cheap and prevents weeks of churn).
