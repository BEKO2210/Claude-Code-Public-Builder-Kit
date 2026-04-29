# Claude Code Public Builder Kit

> Turn a one-line project idea into a clean, structured planning foundation: vision, roadmap, acceptance criteria, architecture, and ready-to-use Claude Code prompts.

You type one sentence — *"I want to build an app for small restaurants"* — and the kit produces a 12-file Markdown scaffold that's good enough to start building from on day one.

🌐 **Public landing page:** [`https://beko2210.github.io/Claude-Code-Public-Builder-Kit/`](https://beko2210.github.io/Claude-Code-Public-Builder-Kit/) (after GitHub Pages is enabled — see [Live landing page](#live-landing-page) below).

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

## Download as ZIP

After generating a kit in the UI, click **Download ZIP** to save the whole bundle as a single archive. The button reuses the idea you typed and shows a loading state while the server builds the archive.

You can also call the ZIP endpoint directly:

```bash
curl -s -X POST http://localhost:5173/api/generate.zip \
  -H 'Content-Type: application/json' \
  -d '{"idea":"A SaaS dashboard for small business accountants"}' \
  -o kit.zip
unzip -l kit.zip
```

The archive contains all 12 generated files nested under a single root folder named after the project slug.

## Example gallery

The UI shows an **Example gallery** beneath the input form. Each card lists the example title, the original idea, a short description, and the file count. Two actions:

- **Preview example** — loads all 12 generated files into the same viewer the generate flow uses, with an "Example" badge so you know it isn't your own kit.
- **Use this idea** — drops the example idea into the input field so you can generate (and download) a fresh kit from it.

The examples are served from a registry in `src/examples.js`, which is also the source of truth for `scripts/build-example.js` and the test suite — there is no duplicated list.

## API endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET`  | `/api/health` | Liveness check. Returns `{ "ok": true }`. |
| `GET`  | `/api/examples` | Lists registered examples with metadata + file paths (no content). |
| `GET`  | `/api/examples/:id` | Returns the full kit (12 files with content) for one example. `400` on unsafe ids, `404` on unknown ids. |
| `POST` | `/api/generate` | Generate a kit from an idea and return JSON. Optionally writes to `output/<slug>/`. |
| `POST` | `/api/generate.zip` | Generate a kit and return a ZIP attachment. |

### `POST /api/generate`

```bash
curl -s -X POST http://localhost:5173/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"idea":"I want to build an app for small restaurants"}' \
  | jq '.files[].path'
```

Request body:

```json
{
  "idea":    "string (required, <= 500 chars)",
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

### `POST /api/generate.zip`

Same request body as `/api/generate` (`idea` field; `persist` is ignored — nothing is written to disk). The response is a `application/zip` attachment containing all 12 files under `<slug>/`.

### `GET /api/examples` and `GET /api/examples/:id`

```bash
curl -s http://localhost:5173/api/examples | jq '.examples | map({id, title, fileCount})'
curl -s http://localhost:5173/api/examples/small-business-website-system | jq '.context'
```

`:id` must match `^[a-z0-9][a-z0-9-]*$`; anything else returns `400`. Unknown ids return `404`. Examples are generated in-memory from the registry on each request, so they always match the on-disk worked examples (which CI also enforces).

## Use the generator from Node

```js
import { generateKit } from "./src/index.js";
import { writeKit } from "./src/utils/write.js";

const { context, files } = generateKit("A platform for indie game studios");
await writeKit(files, `./output/${context.slug}`);
```

## Worked examples

Two pre-generated kits live in `examples/` so you can browse exactly what the generator produces without running anything:

- `examples/small-business-website-system/` — *"A website system for small local businesses"*
- `examples/smb-accounting-saas-dashboard/` — *"A SaaS dashboard for small business accountants"* (showcases acronym preservation and inferred domain `professional services`)

Regenerate both from scratch:

```bash
npm run generate:examples
# alias kept for backward compatibility:
npm run generate:example
```

Both scripts call the same builder. Each example uses a fixed `generatedAt` timestamp so the output is byte-stable, and CI fails if regeneration produces a non-empty git diff.

## Tests

```bash
npm test
```

35 tests covering: file count, file size floors, no leaked placeholder lines, context inference, deterministic output, ZIP buffer construction, ZIP path-traversal rejection, the live `/api/generate.zip` endpoint, on-disk integrity of both worked examples, registry id/safety/disk consistency, full coverage of `/api/examples` and `/api/examples/:id` (200, 400, 404), and parametric detection of all 10 newly-added domain groups (logistics, government, climate, agriculture, travel, gaming, non-profit, manufacturing, HR, events).

## Live landing page

A static landing page lives in [`docs/`](./docs/) and is published via **GitHub Pages**. It re-uses the same logo and palette as the local UI and links out to the worked examples on GitHub.

### Enabling GitHub Pages (one-time, repo owner only)

1. Open the repository on github.com.
2. **Settings → Pages**.
3. **Source:** *Deploy from a branch*.
4. **Branch:** `main` and **Folder:** `/docs`.
5. Save. The site appears at `https://beko2210.github.io/Claude-Code-Public-Builder-Kit/` within a minute.

The local Express app continues to serve `/public` and is **not** affected by anything in `/docs`. See [`docs/README.md`](./docs/README.md) for editing notes and how to keep the logo assets in sync.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request. It:

1. Installs dependencies (`npm ci` if a lockfile is present, else `npm install`).
2. Runs `npm test`.
3. Runs `npm run generate:examples` and fails if any example file changed — making example drift impossible to merge unnoticed.

## Project structure

```
.
├── .github/workflows/ci.yml  # GitHub Actions: tests + example reproducibility
├── server.js                 # Express: /api/health, /api/generate, /api/generate.zip,
│                             #          /api/examples, /api/examples/:id
├── package.json
├── LICENSE                   # MIT
├── docs/                     # Public landing page, deployed via GitHub Pages
│   ├── index.html
│   ├── style.css
│   ├── logo.svg
│   ├── favicon.svg
│   ├── .nojekyll
│   └── README.md             # How to enable Pages and keep assets in sync
├── public/                   # Vanilla HTML/CSS/JS frontend (the local app)
│   ├── index.html            # Form + Example gallery + file viewer
│   ├── style.css
│   ├── app.js                # Generate / Preview / Use this idea / Copy / Download ZIP
│   ├── logo.svg              # Animated star (used by the local app header)
│   ├── logo-monochrome.svg
│   └── favicon.svg
├── src/
│   ├── index.js              # generateKit(idea) — orchestrates all 12 templates
│   ├── context.js            # Heuristic inference: idea -> {projectName, slug, …}
│   ├── examples.js           # Registry of worked examples (single source of truth)
│   ├── templates/            # One file per generated document (12 of them)
│   └── utils/                # slug, file writer, zip builder
├── scripts/
│   └── build-example.js      # Regenerates every entry in examples/ deterministically
├── examples/
│   ├── small-business-website-system/   # Pre-generated worked example (12 files)
│   └── smb-accounting-saas-dashboard/   # Pre-generated worked example (12 files)
├── tests/
│   └── generator.test.js     # node:test suite (35 tests)
└── output/                   # Runtime-generated kits land here (git-ignored)
```

## Design choices

- **Boring stack on purpose.** Express + vanilla frontend means the surface area you have to read to understand this project is tiny.
- **No build step.** ESM straight off disk in both Node and the browser.
- **Templates are functions.** Each generated document is a `(ctx) => string` in `src/templates/`. To add a thirteenth file, add a template and one row to `FILE_PLAN` in `src/index.js`.
- **Honest assumptions.** Every generated doc is upfront about what's a guess and how to sharpen it. There are no `TODO`-only stubs.
- **Two runtime dependencies.** Express (HTTP) and archiver (ZIP). Both are widely deployed and easy to audit.

## How to extend

| Add… | Where |
| --- | --- |
| A new generated doc | New file in `src/templates/`, append to `FILE_PLAN` in `src/index.js`. |
| A new domain heuristic | `DOMAIN_KEYWORDS` in `src/context.js`. |
| A new product type | `PRODUCT_TYPES` in `src/context.js`. |
| A new worked example | Append to `EXAMPLES` in `src/examples.js`, run `npm run generate:examples`, commit the new folder. |

## License

MIT.
