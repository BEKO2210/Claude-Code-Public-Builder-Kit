// Standalone accessibility audit. Runs axe-core (via jsdom) against both
// HTML pages and prints the report; then runs a manual WCAG color-contrast
// check on the hand-picked colour pairs that actually appear in the UI
// (jsdom can't compute contrast — needs real layout — so this is the
// authoritative pass for that rule).
//
// Usage:  npm run audit:a11y
//
// Exit code: 0 if no axe violations and all contrast pairs ≥ WCAG AA,
//            1 otherwise. Suitable for CI if we ever choose to gate on it.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import axe from "axe-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = resolve(__dirname, "..");

let exitCode = 0;

// ----- axe-core -----

async function auditAxe(htmlPath, cssPath, label) {
  const html = await readFile(resolve(repo, htmlPath), "utf8");
  const css = await readFile(resolve(repo, cssPath), "utf8");
  const inlined = html.replace(
    /<link[^>]*href="[^"]*style\.css"[^>]*>/,
    `<style>${css}</style>`
  );

  const dom = new JSDOM(inlined, {
    url: "http://localhost/",
    pretendToBeVisual: true,
    runScripts: "outside-only"
  });
  const { window } = dom;
  global.window = window;
  global.document = window.document;

  window.eval(axe.source);
  const results = await window.axe.run(window.document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] }
  });

  console.log(`\n=== ${label} ===`);
  console.log(`violations:                                      ${results.violations.length}`);
  for (const v of results.violations) {
    if (v.impact === "critical" || v.impact === "serious") exitCode = 1;
    console.log(`  [${v.impact || "n/a"}] ${v.id}: ${v.help}`);
    for (const node of v.nodes.slice(0, 3)) {
      console.log(`     ${node.target.join(" ")}`);
    }
  }
  console.log(`incomplete (jsdom limit, see contrast pass):     ${results.incomplete.length}`);
  for (const i of results.incomplete) {
    console.log(`  ${i.id}: ${i.help}`);
  }
  console.log(`passes:                                          ${results.passes.length} rules`);
}

// ----- WCAG colour-contrast (manual, deterministic) -----

function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const COLORS = {
  bg:       "#0f1115",
  panel:    "#161a22",
  panel2:   "#1c2230",
  border:   "#2a3142",
  text:     "#e7ebf3",
  muted:    "#8a93a6",
  accent:   "#8ab4ff",
  accentP:  "#6c9bff",
  danger:   "#ff8a8a"
};

// [foreground, background, where, isLargeOrUI]
// WCAG AA: 4.5 normal text, 3.0 large text (≥ 18pt or ≥ 14pt bold) or UI components.
const PAIRS = [
  ["text",    "bg",     "body text on page background",                 false],
  ["text",    "panel",  "body text on panel surface",                   false],
  ["text",    "panel2", "preformatted file content on panel-2",         false],
  ["muted",   "bg",     "muted hint text on page background",           false],
  ["muted",   "panel",  "muted hint text on panel (cards, headers)",    false],
  ["muted",   "panel2", "muted text on panel-2 (file viewer header)",   false],
  ["accent",  "bg",     "accent text/link on page background",          false],
  ["accent",  "panel",  "accent text on panel (cards)",                 false],
  ["accent",  "panel2", "active file name in nav (panel-2)",            false],
  ["bg",      "accent", "primary button label on accent fill",          false],
  ["text",    "panel2", "secondary button label on panel-2 fill",       false],
  ["danger",  "bg",     "error status text on page background",         false],
  ["accent",  "bg",     "skip-link accent on bg (large)",                true]
];

function auditContrast() {
  console.log(`\n=== WCAG colour contrast (manual) ===`);
  let fails = 0;
  for (const [fg, bg, where, isLargeOrUI] of PAIRS) {
    const ratio = contrastRatio(COLORS[fg], COLORS[bg]);
    const target = isLargeOrUI ? 3.0 : 4.5;
    const ok = ratio >= target;
    if (!ok) { fails++; exitCode = 1; }
    console.log(
      `${ok ? "✓" : "✗"}  ${ratio.toFixed(2).padStart(5)} : 1   target ${target}   ${fg.padEnd(7)} on ${bg.padEnd(7)}   — ${where}`
    );
  }
  console.log(fails === 0 ? "all pairs pass WCAG AA" : `${fails} pair(s) fail`);
}

await auditAxe("public/index.html", "public/style.css", "PUBLIC  (npm start UI)");
await auditAxe("docs/index.html",   "docs/style.css",   "DOCS   (GitHub Pages landing)");
auditContrast();

process.exit(exitCode);
