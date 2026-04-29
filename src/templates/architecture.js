export default function architecture(ctx) {
  const isWeb = /web|website|saas|dashboard|app|platform/.test(ctx.productType);
  const isMobile = /mobile/.test(ctx.productType);
  const recommendedStack = isMobile
    ? "React Native + a small Node/Express or Hono backend, Postgres for persistence."
    : isWeb
      ? "TypeScript + a thin server framework (Hono, Express, or Fastify), Postgres for persistence, server-rendered HTML or a small React/Svelte frontend."
      : "TypeScript + Node, Postgres for persistence; choose a UI framework only when there's a UI requirement.";

  return `# ARCHITECTURE — ${ctx.projectName}

Suggested starting architecture. **Nothing here is final.** Every decision should be re-examined and either ratified or replaced with an ADR in \`DOCS/technical-decisions.md\` before Phase 1 ends.

## 1. Guiding principles

- **Boring on the inside, sharp on the outside.** Pick stack components used by thousands of teams. Spend the novelty budget on the user experience and domain model.
- **Two layers, not five.** Until the product proves otherwise, a server and a database are enough.
- **One process, one repo.** Do not split into microservices until you have at least one independent deployment cadence reason to do so.
- **Schema first.** The data model is the contract. UI follows.

## 2. Recommended starting stack

> ${recommendedStack}

This is a default, not a prescription. Record the actual choice as ADR-001.

## 3. High-level shape

\`\`\`
┌────────────────────┐        ┌──────────────────────┐        ┌────────────────────┐
│  Client (browser   │  HTTP  │  Server (one process │  SQL   │  Postgres          │
│  / mobile / CLI)   │ ─────▶ │   handles all routes)│ ─────▶ │  (single instance) │
└────────────────────┘        └──────────────────────┘        └────────────────────┘
                                       │
                                       │ (job queue when needed)
                                       ▼
                              ┌──────────────────────┐
                              │  Background worker   │
                              │  (same codebase)     │
                              └──────────────────────┘
\`\`\`

## 4. Module layout

A monorepo-friendly, framework-agnostic skeleton:

\`\`\`
src/
  domain/         # Pure types and business rules — no I/O.
  data/           # Database access (queries, migrations).
  services/       # Use-cases orchestrating domain + data.
  http/           # Route handlers, request/response shapes.
  ui/             # Views, components, or templates (if applicable).
  jobs/           # Background tasks.
tests/
  unit/
  integration/
\`\`\`

Rules:

- \`domain/\` may not import from \`data/\`, \`http/\`, or \`ui/\`.
- \`http/\` and \`ui/\` may not import from \`data/\` directly — go through \`services/\`.
- A new top-level folder requires an ADR.

## 5. Data model — first cut

Resist the urge to over-normalize. Start with three or fewer tables.

| Table | Why it exists | Keys |
| --- | --- | --- |
| \`users\` | Identify who took an action. | \`id\`, \`email\` |
| \`<core_entity>\` | The thing the daily core action is performed on. | \`id\`, \`user_id\`, \`created_at\` |
| \`events\` (optional) | Append-only audit / activation log. | \`id\`, \`user_id\`, \`type\`, \`created_at\` |

Replace \`<core_entity>\` with the real noun once \`MASTERPLAN.md\` is sharpened.

## 6. Performance budget (Phase 4)

These are placeholder numbers to be ratified or replaced before Phase 4:

- p50 server response for the daily core action: **< 150 ms**
- p95: **< 500 ms**
- Time to interactive on a cold landing page (4G): **< 3 s**
- DB connection pool: sized for 4× current peak QPS

## 7. Security baseline

- All inputs validated at the HTTP boundary.
- Passwords hashed with bcrypt / argon2; never stored or logged in plaintext.
- Secrets only in environment variables, never in committed files.
- HTTPS in any environment that talks to a real user.
- Dependency upgrades reviewed weekly; security advisories actioned within 7 days.

## 8. Open questions (to resolve before Phase 1 ends)

- Hosting target (single VM, managed PaaS, edge runtime)?
- Auth approach (sessions vs. JWT vs. third-party)?
- Background job runner (in-process timers vs. dedicated queue)?
- Analytics / metrics destination?

Each gets its own ADR. Until then, this document is read as "the current best guess".

_Last edited: ${ctx.generatedAt.slice(0, 10)} (initial scaffold)._
`;
}
