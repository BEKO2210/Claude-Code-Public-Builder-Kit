export default function readme(ctx) {
  return `# ${ctx.projectName}

> ${ctx.rawIdea}

A ${ctx.productType} for **${ctx.audience}** in the **${ctx.domain}** space.

This repository was scaffolded by the [Claude Code Public Builder Kit](https://github.com/) on ${ctx.generatedAt.slice(0, 10)}. It contains a complete planning foundation — vision, roadmap, acceptance criteria, architecture, and ready-to-use prompts — so you can start building with a clear direction from day one.

## What's in this repo

| File | Purpose |
| --- | --- |
| \`MASTERPLAN.md\` | Vision, scope, success metrics. The single source of truth. |
| \`ROADMAP.md\` | Phased build plan from foundation through scale. |
| \`RUN_LOG.md\` | Append-only journal of every working session. |
| \`ACCEPTANCE_CRITERIA.md\` | Concrete, checkable definitions of done. |
| \`ARCHITECTURE.md\` | Suggested starting architecture and key open questions. |
| \`CLAUDE.md\` | Operating rules for Claude Code sessions in this repo. |
| \`PROMPTS/initial-prompt.md\` | Drop-in first prompt to start building. |
| \`PROMPTS/run-plan-20-sessions.md\` | A 20-session execution plan. |
| \`DOCS/product-brief.md\` | Audience, jobs-to-be-done, top user stories. |
| \`DOCS/market-positioning.md\` | Where this fits in the market. |
| \`DOCS/technical-decisions.md\` | Stack candidates and decision log. |

## How to use this scaffold

1. **Read** \`MASTERPLAN.md\` first. Edit anything that doesn't match your actual intent. The generator made educated guesses — your job is to sharpen them.
2. **Pin** the scope in \`ACCEPTANCE_CRITERIA.md\`. If a feature isn't there, it isn't in scope.
3. **Pick** a stack in \`DOCS/technical-decisions.md\`. Record the choice as ADR-001.
4. **Open** Claude Code at the repo root and paste \`PROMPTS/initial-prompt.md\` to start your first session.
5. **After every session**, append an entry to \`RUN_LOG.md\` (date, what changed, what's next).

## Quick start (placeholder)

The generator does not pick a stack for you. Once you've recorded ADR-001, replace this block with the real commands.

\`\`\`bash
# example only — replace once your stack is decided
git clone <this-repo>
cd ${ctx.slug}
# install dependencies
# run the dev server
\`\`\`

## License

MIT — see \`LICENSE\` if/when you add one.
`;
}
