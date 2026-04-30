# `/docs` — public landing page

This folder is the source of the public landing page published via **GitHub Pages**.

- `index.html` — single-page site with hero, file overview, quick start, and links to the worked examples.
- `style.css` — same dark palette as the local app, no JavaScript, no build step.
- `logo.svg`, `favicon.svg` — copies of the assets in `/public`. Kept in sync manually; if you change `/public/logo.svg`, copy it here too.
- `.nojekyll` — disables GitHub Pages' Jekyll preprocessing so files starting with `_` and `.` are served as-is.

## Enabling GitHub Pages

In the repository on github.com:

1. **Settings → Pages**.
2. **Source:** *Deploy from a branch*.
3. **Branch:** `main` and **Folder:** `/docs`.
4. Save. The site will be available at `https://beko2210.github.io/Claude-Code-Public-Builder-Kit/` within a minute.

The local Express app is unaffected — it serves `/public`, not `/docs`.

## Editing locally

Open `docs/index.html` directly in a browser, or serve the folder with any static server, e.g.:

```bash
npx --yes http-server docs -p 8080
# then open http://localhost:8080
```

No npm dependency or build step is required.

## Updating the logo

The logo lives in `/public` (the canonical home). To mirror it here:

```bash
npm run sync:assets       # copies public/{logo,logo-monochrome,favicon}.svg → docs/
npm run sync:assets:check # CI mode — exit 1 if any pair would change
```

CI runs `sync:assets:check` on every push and PR, so unsynced changes fail the pipeline rather than landing silently.

## Rebuilding the social card

`docs/og-card.png` (1200×630) is what Twitter, Slack, LinkedIn, Discord, and Facebook show when someone shares the landing page. Most of them still don't reliably render SVG `og:image`, hence the rasterise step.

To regenerate from `docs/og-source.svg`:

```bash
npm run build:og
```

The script uses `@resvg/resvg-js` (a WASM-only dev-dependency, no native binaries) and writes the PNG back to `docs/og-card.png`. Re-run only when the source SVG, the brand colours, or the headline copy changes.
