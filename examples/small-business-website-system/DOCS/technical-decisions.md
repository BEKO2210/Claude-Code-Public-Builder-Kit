# Technical decisions — Website System for Small Local Businesses

This file is the project's decision log. It uses the [ADR](https://adr.github.io/) format: short, immutable records of important technical choices.

> Rule: every dependency, every datastore, every framework choice that the project relies on must have an ADR here. If a decision is not recorded, it can be revisited freely. If it is recorded, changing it requires a new ADR that supersedes the previous one.

## How to add an ADR

Copy the template at the bottom of this file. Number sequentially (ADR-001, ADR-002, …). Status is one of `Proposed`, `Accepted`, `Deprecated`, or `Superseded by ADR-XXX`. Never delete an ADR — supersede it.

---

## Stack candidates (pre-decision notes)

A neutral starting menu. Pick from this menu in ADR-001 or replace it entirely with a justified alternative.

### Backend

| Option | Strengths | Weaknesses | Use when |
| --- | --- | --- | --- |
| **Node + TypeScript (Express / Hono / Fastify)** | Massive ecosystem, easy hiring, fast to scaffold. | Async pitfalls, runtime type erasure. | You want to ship a typical web product fast. |
| **Python + FastAPI** | Great for data-heavy domains; strong typing via Pydantic. | Smaller frontend integration story; deploy is fiddlier. | The product has data / ML logic at its core. |
| **Go + chi / fiber** | Single binary, easy ops, great performance. | More boilerplate, smaller frontend ecosystem. | You expect long-running services and want simple deploys. |
| **Rust + Axum** | Performance, correctness. | Higher cognitive load; slower iteration. | Performance / correctness is genuinely a feature. |

### Database

| Option | Strengths | Weaknesses | Use when |
| --- | --- | --- | --- |
| **Postgres** | Reliable, flexible, great tooling. | Operationally non-trivial at scale. | Default. Pick this unless you have a reason not to. |
| **SQLite + Litestream** | Zero ops, ridiculously fast, simple backups. | Single-writer; not ideal for many concurrent writers. | Solo / small-scale; embedded; offline-first. |
| **Managed Postgres (Neon / Supabase / RDS)** | Same Postgres, less ops. | Vendor lock-in to varying degrees. | You don't want to babysit a database. |

### Frontend

| Option | Strengths | Weaknesses | Use when |
| --- | --- | --- | --- |
| **Server-rendered HTML + a sprinkle of JS** | Simplest mental model, fastest TTI. | Limited for app-like interactivity. | Most "app" projects can start here. |
| **React / Next.js** | Massive ecosystem, hiring, component reuse. | Bundle size, hydration cost, churn. | The UI is genuinely app-like. |
| **Svelte / SvelteKit** | Smaller bundles, simpler mental model. | Smaller ecosystem. | You're starting fresh and value simplicity. |
| **HTMX + a server template engine** | Closest thing to "no frontend"; minimal JS. | Animation-heavy or complex client state is painful. | The interactions are mostly request/response. |

### Hosting

| Option | Strengths | Weaknesses | Use when |
| --- | --- | --- | --- |
| **A single VPS** | Cheapest, simplest mental model. | Manual ops; you own uptime. | < 1k users, you like UNIX. |
| **Managed PaaS (Fly.io, Railway, Render)** | Simple deploys, autoscaling. | Cost grows with usage; some lock-in. | You want to forget about infra. |
| **Edge (Cloudflare Workers, Deno Deploy)** | Global latency, no servers. | Constraints on long-running tasks, libraries. | The product is read-heavy and global. |

---

## Decision log

> No decisions recorded yet. ADR-001 (stack) is the next entry.

### ADR template

```markdown
## ADR-NNN — <short title>

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX
**Date:** YYYY-MM-DD
**Decision driver:** <the question we needed to answer>

### Context

<2–4 sentences. What is the situation that forces this decision?>

### Options considered

1. <Option A> — <one-line summary>
2. <Option B> — <one-line summary>
3. <Option C> — <one-line summary>

### Decision

<We chose Option B because …>

### Consequences

- Positive: <…>
- Negative: <…>
- Reversal cost: <Low / Medium / High>

### Follow-ups

- <Concrete next action, with owner and date>
```

_Last edited: 2026-04-29 (initial scaffold)._
