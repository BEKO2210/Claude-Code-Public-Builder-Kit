import { domainPositioningBlock } from "./domain-blocks.js";

export default function productBrief(ctx) {
  return `# Product brief — ${ctx.projectName}

A short, sharp statement of who we are building for, what they are trying to get done, and what we will ship to help them.

> This is a working hypothesis, not a research report. Update it after every user contact.

## 1. The user, in one sentence

A ${ctx.audience} owner / operator who is currently working in **${ctx.domain}**, has tried at least one existing tool, and is willing to switch if a better one shows up.

## 2. Jobs to be done

When ${ctx.audience} hire a tool like this, they are usually trying to:

- **Reduce friction** on the daily core action so they spend less time on operations and more time on the work that actually pays.
- **See the state of their world** without assembling reports manually.
- **Avoid lock-in** so that switching tools later doesn't punish them.

Three "jobs" framed in the canonical way:

1. *When* I sit down to start my day, *I want to* see what needs my attention right now, *so I can* act on the most important thing first.
2. *When* I take an action that the system should know about, *I want to* record it in seconds, *so I can* keep going without interrupting my flow.
3. *When* I want to evaluate how the past week / month went, *I want to* see one screen that summarises it, *so I can* decide what to change.

## 3. Top user stories (initial release)

| ID | As a … | I want to … | so that … |
| --- | --- | --- | --- |
| US-1 | new user | sign up with just an email and password | I can try it without ceremony |
| US-2 | new user | complete the daily core action within 3 minutes of signing up | I get value before I lose patience |
| US-3 | returning user | resume yesterday's state when I open the app | I don't have to rebuild context |
| US-4 | returning user | export all my data to CSV | I don't feel locked in |
| US-5 | returning user | see a single dashboard view of my last 30 days | I can spot trends without building reports |
| US-6 | any user | trust that my data is safe and private | I can use this for real work |

## 4. Non-users (explicit)

We are **not** building this for:

- Large enterprises with procurement processes.
- Users who need offline-first / poor-network-first UX.
- Power users who want full configurability over the daily core action — opinionation is the product.

If demand from these segments grows, we revisit via an ADR. Not before.

## 5. Tone and voice

- Plain language. No jargon.
- Confident, not breathless. We help people get on with their work; we are not a lifestyle.
- Show, don't tell. Empty states explain by example.
${domainPositioningBlock(ctx)}
## 6. Open questions

- Who exactly is the first cohort of 10 users? Names go here once we know them.
- What is the one number we'd put on a t-shirt to describe value delivered?
- What is the smallest behaviour change in a user that means we're winning?

_Last edited: ${ctx.generatedAt.slice(0, 10)} (initial scaffold)._
`;
}
