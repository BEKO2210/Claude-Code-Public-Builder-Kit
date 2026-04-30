<p align="center">
  <img src="docs/logo.svg" alt="Builder Kit logo" width="120" />
</p>

<h1 align="center">Builder Kit</h1>

<p align="center">
  <strong>From one sentence to a complete project plan in 30 seconds.</strong>
</p>

<p align="center">
  <a href="https://claude-code-public-builder-kit.vercel.app/"><strong>🚀 Launch the tool →</strong></a>
  &nbsp;·&nbsp;
  <a href="https://beko2210.github.io/Claude-Code-Public-Builder-Kit/">Landing page</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/BEKO2210/Claude-Code-Public-Builder-Kit">Source</a>
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-8ab4ff.svg" />
  <img alt="Node ≥ 18" src="https://img.shields.io/badge/Node-%E2%89%A5%2018-8ab4ff.svg" />
  <img alt="Tests: 81/81" src="https://img.shields.io/badge/Tests-81%2F81-6dd6a3.svg" />
  <img alt="Languages: EN + DE" src="https://img.shields.io/badge/UI-EN%20%2B%20DE-8ab4ff.svg" />
  <img alt="Build step: none" src="https://img.shields.io/badge/Build%20step-none-6dd6a3.svg" />
</p>

---

## What it does

You type one sentence — *"An app for parents of small children"* — and the kit produces **12 ready-to-use planning documents**: vision, roadmap, risks, architecture, marketing brief, and a starter prompt for Claude or ChatGPT.

The output is opinionated, generic where it has to be, and explicit about what's a placeholder. No `TODO`-only stubs (the test suite enforces that).

It's the **planning foundation** you'd otherwise spend a weekend writing — done in under a minute, then sharpened iteratively in a Claude / ChatGPT chat.

## Two ways to use it

### 1. Hosted version (recommended, no install)

[**Launch the tool →**](https://claude-code-public-builder-kit.vercel.app/)

Free, in the browser. No terminal, no `npm`, no Claude account required. The tool guides you through 4 short questions, generates the 12 files, hands you a ZIP and a starter prompt for Claude. UI is available in **English and German** — auto-detected from your browser, switchable in the header.

### 2. Local version (for developers)

```bash
git clone https://github.com/BEKO2210/Claude-Code-Public-Builder-Kit
cd Claude-Code-Public-Builder-Kit
npm install
npm start
# open http://localhost:5173
```

Same tool, your machine. Two runtime dependencies (Express + archiver), no build step, MIT licensed.

Override the port with `PORT=5174 npm start`. Files persist to `output/<slug>/` on disk if you tick the "Save a copy on my computer" checkbox.

## What you get — the 12 files

| File | Purpose |
| --- | --- |
| `MASTERPLAN.md` | Vision, scope, success metrics, **domain-specific risks** — the single source of truth. |
| `ROADMAP.md` | Five phases from foundation to scale, each with an exit gate. |
| `ARCHITECTURE.md` | Recommended starting architecture and open questions. |
| `ACCEPTANCE_CRITERIA.md` | Phase-tied checklists of what "done" actually means. |
| `DOCS/product-brief.md` | Audience, jobs-to-be-done, top user stories, **domain-specific positioning**. |
| `DOCS/market-positioning.md` | Positioning statement and competitive frame. |
| `DOCS/technical-decisions.md` | Stack candidates and an ADR template. |
| `PROMPTS/initial-prompt.md` | Drop-in first prompt to start your Phase 0 chat. |
| `PROMPTS/run-plan-20-sessions.md` | A 20-session execution plan from empty repo to product. |
| `README.md` | Project entry point with quick start and structure. |
| `CLAUDE.md` | Operating rules for any Claude Code session in your repo. |
| `RUN_LOG.md` | Append-only session journal, seeded with Run #001. |

The MASTERPLAN and product-brief get **domain-specific depth** for ten domains: climate & sustainability, professional services, health & wellness, finance, food & hospitality, education, logistics & supply chain, retail & e-commerce, creative & media, and real estate. The other domains stay generic but honest.

## How it works — three steps

1. **Describe your idea** in plain language (the wizard guides you).
2. **Get the 12 files** as a ZIP — substantial content, no placeholder text.
3. **Open in Claude Code** — either via a free GitHub repo (browser-based Claude Code) or in your terminal (`npx @anthropic-ai/claude-code` in the unzipped folder). Claude Code reads every file and walks you through Phase 1 / Step 1, one decision at a time.

> The wizard is the **entry door** — Claude Code is where you sharpen the plan into a real project. Each session iterates on a piece of the masterplan; over time the plan stops being a generated stub and becomes the spec your project actually runs on. Note: this kit is built for Claude Code specifically, not for the regular claude.ai chat — Claude Code can actually read every file and edit them, the chat can't.

## Worked examples

Two pre-generated kits live in [`examples/`](./examples/) so you can browse exactly what the generator produces without running anything:

- [`small-business-website-system/`](./examples/small-business-website-system/) — *"A website system for small local businesses"*
- [`smb-accounting-saas-dashboard/`](./examples/smb-accounting-saas-dashboard/) — *"A SaaS dashboard for small business accountants"*

CI fails if regeneration produces a non-empty git diff — example drift cannot land unnoticed.

## API

The local app and the hosted Vercel deployment expose the same endpoints:

| Method | Path | Description |
| --- | --- | --- |
| `GET`  | `/api/health` | Liveness check. Returns `{ "ok": true, "hosted": bool }`. |
| `GET`  | `/api/examples` | Lists registered examples with metadata + file paths. |
| `GET`  | `/api/examples/:id` | Returns the full kit for one example. |
| `POST` | `/api/preview` | Returns just the inferred context — for live preview UI. |
| `POST` | `/api/generate` | Generate a kit, return JSON. |
| `POST` | `/api/generate.zip` | Generate a kit, return a ZIP. |

```bash
# Hit the hosted API directly
curl -s -X POST https://claude-code-public-builder-kit.vercel.app/api/generate.zip \
  -H 'Content-Type: application/json' \
  -d '{"idea":"A SaaS dashboard for small business accountants"}' \
  -o kit.zip
```

Rate limit on `/api/generate` and `/api/generate.zip`: 30 requests / IP / minute. Best-effort on serverless because each function instance has its own counter.

## Use the generator from Node

```js
import { generateKit } from "./src/index.js";
import { writeKit } from "./src/utils/write.js";

const { context, files } = generateKit("A platform for indie game studios");
await writeKit(files, `./output/${context.slug}`);
```

## Tests

```bash
npm test                    # 81 tests, no external dependencies
npm run audit:a11y          # axe-core + WCAG-AA contrast on both HTML pages
npm run sync:assets:check   # verify /docs and /public brand assets are mirrored
npm run generate:examples   # regenerate the worked-example folders
```

The CI pipeline runs all of these on every push and pull request.

## Tech stack

- **Express** + **archiver** — the only two runtime dependencies.
- **Vanilla HTML / CSS / JS** in `public/` — no build step, no framework.
- **Vercel** for the hosted version, **GitHub Pages** for the landing page.
- **Client-side i18n** (~330 lines of vanilla JS) — auto-detect + manual switcher, English and German.

## Project structure

```
.
├── api/index.js              # Vercel Serverless entry — re-exports the Express app.
├── vercel.json               # Catch-all rewrite to /api.
├── server.js                 # Express app: API + static. Exports the app; only listens as CLI.
├── public/                   # The local web app
│   ├── index.html            # Wizard + direct form + result panel + gallery
│   ├── style.css
│   ├── app.js                # Wizard, generate flow, gallery cards, copy/download/share
│   ├── i18n.js               # Client-side translations (EN + DE)
│   ├── logo.svg              # Animated logo
│   ├── logo-monochrome.svg
│   └── favicon.svg
├── docs/                     # GitHub Pages landing page
│   ├── index.html            # Hero + how-it-works + example output + what-you-get
│   ├── style.css
│   ├── i18n.js               # Landing-page i18n
│   ├── impressum.html        # Imprint (German law, §5 TMG)
│   ├── datenschutz.html      # Privacy notice (GDPR Art. 13)
│   ├── og-source.svg         # OG-card source
│   ├── og-card.png           # Rasterised OG card (committed)
│   └── logo.svg, logo-monochrome.svg, favicon.svg
├── src/
│   ├── index.js              # generateKit(idea) — orchestrates the 12 templates
│   ├── context.js            # Heuristic inference: idea → {projectName, slug, productType, audience, domain, …}
│   ├── schema.js             # Context typedef + validateContext / assertContext
│   ├── examples.js           # Worked-example registry (single source of truth)
│   ├── templates/            # 12 templates, one per generated file, plus domain-blocks
│   └── utils/                # slug, file writer, zip builder
├── scripts/
│   ├── build-example.js      # Regenerates examples/ deterministically
│   ├── sync-docs-assets.js   # Mirrors brand assets into /docs
│   ├── build-og.js           # Renders the OG-card PNG
│   └── a11y-audit.js         # axe-core + WCAG-AA contrast audit
├── examples/                 # Pre-generated worked examples (regenerable)
├── tests/                    # node:test suite (81 tests)
└── output/                   # Runtime-generated kits (git-ignored)
```

## Design choices

- **Boring stack on purpose.** The surface area you have to read to understand this project is small.
- **No build step.** ESM straight off disk in both Node and the browser.
- **Templates are functions.** Each generated document is a `(ctx) => string` in `src/templates/`.
- **Honest assumptions.** Every generated doc is upfront about what's a guess and how to sharpen it.
- **Local-first guarantee.** `npm install && npm start` works without a Vercel account, an LLM key, or any cloud service.
- **i18n without a build step.** ~330 lines of vanilla JavaScript handle EN + DE, auto-detect, manual switcher, localStorage persistence.

## Contributing

Pull requests welcome. Before submitting:

```bash
npm test                    # must be green
npm run generate:examples   # if you touched a template — commit the diff
npm run audit:a11y          # must show 0 violations
```

Each commit gets one reason. The kit's own `RUN_LOG.md` (root file, separate from generated kits) journals every working session — that's how this codebase is maintained.

## Legal

- 📄 **[Impressum](https://beko2210.github.io/Claude-Code-Public-Builder-Kit/impressum.html)** (TMG §5)
- 🔒 **[Datenschutz](https://beko2210.github.io/Claude-Code-Public-Builder-Kit/datenschutz.html)** (DSGVO Art. 13)

The hosted tool processes only the idea you type, in-memory, for the duration of the request. No tracking, no analytics, no third-party scripts. localStorage is used **only** for your language preference.

## License

[MIT](./LICENSE) — generated docs are yours, edit them freely. The kit itself is open source: fork it, modify it, ship a fork with your own templates.

---

<p align="center">
  Built by <a href="mailto:belkis.aslani@gmail.com">Belkis Aslani</a> · <a href="https://github.com/BEKO2210/Claude-Code-Public-Builder-Kit">github.com/BEKO2210</a>
</p>
