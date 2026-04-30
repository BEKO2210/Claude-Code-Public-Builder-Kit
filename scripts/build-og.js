// Render docs/og-source.svg to docs/og-card.png (1200×630).
//
// The PNG is committed to the repo so GitHub Pages can serve it as
// og:image without a build step. Most platforms (Twitter, Slack,
// LinkedIn, Discord) still don't reliably render SVG og:image, hence
// the rasterise step.
//
// Usage:  npm run build:og
// Re-run only when the source SVG, the brand colours, or the headline
// copy changes.

import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = resolve(__dirname, "..");

const SRC = resolve(repo, "docs/og-source.svg");
const OUT = resolve(repo, "docs/og-card.png");

const svg = await readFile(SRC, "utf8");

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  background: "#0f1115",
  font: {
    loadSystemFonts: true,
    defaultFontFamily: "DejaVu Sans"
  }
});

const pngData = resvg.render().asPng();
await writeFile(OUT, pngData);

const { size } = await stat(OUT);
console.log(`wrote ${OUT}  (${(size / 1024).toFixed(1)} KB, ${pngData.length} bytes)`);
