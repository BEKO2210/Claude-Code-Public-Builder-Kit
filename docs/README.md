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

If you change `/public/logo.svg` or `/public/favicon.svg`, copy them into this folder so the landing page stays consistent with the local app:

```bash
cp public/logo.svg public/favicon.svg docs/
```

A future run could automate this with a small `scripts/sync-docs-assets.js`, but for now the assets change rarely enough that manual sync is fine.
