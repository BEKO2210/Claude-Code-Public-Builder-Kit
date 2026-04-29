# Claude Code Public Builder Kit

> Turn a one-line project idea into a clean, structured planning foundation: vision, roadmap, acceptance criteria, architecture, and ready-to-use Claude Code prompts.

You type one sentence — *"I want to build an app for small restaurants"* — and the kit produces a 12-file Markdown scaffold that's good enough to start building from on day one.

## What you get

For any idea you enter, the kit produces:

| File | Purpose |
| --- | --- |
| `README.md` | Project entry point with quick start and structure. |
| `CLAUDE.md` | Operating rules for any Claude Code session in that repo. |
| `MASTERPLAN.md` | Vision, scope, success metrics — the single source of truth. |
| `ROADMAP.md` | Five phases from foundation to scale, with exit gates. |
| `RUN_LOG.md` | Append-only session journal, seeded with Run #001. |
| `ACCEPTANCE_CRITERIA.md` | Phase-tied checklists of what "done" means. |
| `ARCHITECTURE.md` | Recommended starting architecture and open questions. |
| `PROMPTS/initial-prompt.md` | Drop-in first prompt to start Phase 0. |
| `PROMPTS/run-plan-20-sessions.md` | A 20-session execution plan. |
| `DOCS/product-brief.md` | Audience, jobs-to-be-done, top user stories. |
| `DOCS/market-positioning.md` | Positioning statement and competitive frame. |
| `DOCS/technical-decisions.md` | Stack candidates and ADR template. |

The output is opinionated, generic where it has to be, and explicit about what's a placeholder assumption (so you can sharpen it instead of chasing fake confidence).

## Requirements

- Node.js **>= 18** (uses native ESM and `node:test`).
- npm (bundled with Node).

No other system dependencies. No build step.

## Install

```bash
git clone <this-repo>
cd Claude-Code-Public-Builder-Kit
npm install
```

## Run the web UI

```bash
npm start
# or, with auto-restart on file changes:
npm run dev
```

Then open <http://localhost:5173>. Enter an idea, click **Generate kit**, and:

- All 12 files render in the right pane with one-click copy.
- Files are also written to `output/<slug>/` on disk (toggleable in the UI).

Override the port with `PORT=5174 npm start`.

## Use the API directly

```bash
curl -s -X POST http://localhost:5173/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"idea":"I want to build an app for small restaurants"}' \
  | jq '.files[].path'
```

Request body:

```json
{
  "idea": "string (required, <= 500 chars)",
  "persist": "boolean (optional, default true) — also write to output/<slug>/"
}
```

Response:

```json
{
  "context":  { "projectName": "...", "slug": "...", "productType": "...", "audience": "...", "domain": "...", "generatedAt": "..." },
  "files":    [ { "path": "README.md", "content": "..." }, ... ],
  "writtenTo": "/abs/path/to/output/<slug>"
}
```

## Use the generator from Node

```js
import { generateKit } from "./src/index.js";
import { writeKit } from "./src/utils/write.js";

const { context, files } = generateKit("A platform for indie game studios");
await writeKit(files, `./output/${context.slug}`);
```

## Worked example

A pre-generated kit for *"A website system for small local businesses"* lives in
`examples/small-business-website-system/`. Browse those 12 files to see exactly
what the generator produces.

To regenerate it from scratch:

```bash
npm run generate:example
```

The example uses a fixed `generatedAt` timestamp so the output is byte-stable.

## Tests

```bash
npm test
```

Nine tests covering: file count, file size floors, no leaked placeholder lines, context inference, deterministic output, and round-trip content checks.

## Project structure

```
.
├── server.js                 # Express server: serves /public and /api/generate
├── package.json
├── public/                   # Vanilla HTML/CSS/JS frontend, no build step
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/
│   ├── index.js              # generateKit(idea) — orchestrates all 12 templates
│   ├── context.js            # Heuristic inference: idea -> {projectName, slug, …}
│   ├── templates/            # One file per generated document
│   └── utils/                # slug, file writer
├── scripts/
│   └── build-example.js      # Regenerates examples/small-business-website-system
├── examples/
│   └── small-business-website-system/   # Pre-generated worked example (12 files)
├── tests/
│   └── generator.test.js     # node:test suite
└── output/                   # Runtime-generated kits land here (git-ignored)
```

## Design choices

- **Boring stack on purpose.** Express + vanilla frontend means the surface area you have to read to understand this project is tiny.
- **No build step.** ESM straight off disk in both Node and the browser.
- **Templates are functions.** Each generated document is a `(ctx) => string` in `src/templates/`. To add a thirteenth file, add a template and one row to `FILE_PLAN` in `src/index.js`.
- **Honest assumptions.** Every generated doc is upfront about what's a guess and how to sharpen it. There are no `TODO`-only stubs.

## How to extend

| Add… | Where |
| --- | --- |
| A new generated doc | New file in `src/templates/`, append to `FILE_PLAN` in `src/index.js`. |
| A new domain heuristic | `DOMAIN_KEYWORDS` in `src/context.js`. |
| A new product type | `PRODUCT_TYPES` in `src/context.js`. |
| A second example | Append to `EXAMPLES` in `scripts/build-example.js`. |

## License

MIT.
