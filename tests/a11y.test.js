import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import axe from "axe-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// Inline the page's stylesheet so jsdom has computed styles for axe rules
// that depend on visual state (visibility, display, basic positioning).
// Note: jsdom does NOT do real layout, so contrast and other rules that
// require pixel-level computation are reported as "incomplete" by axe and
// are not considered failures here. They're audited manually below.
async function buildDOM(htmlPath, cssPath) {
  const [html, css] = await Promise.all([
    readFile(htmlPath, "utf8"),
    cssPath ? readFile(cssPath, "utf8") : Promise.resolve("")
  ]);
  const inlined = css
    ? html.replace(
        /<link[^>]*href="[^"]*style\.css"[^>]*>/,
        `<style>${css}</style>`
      )
    : html;
  return new JSDOM(inlined, {
    url: "http://localhost/",
    pretendToBeVisual: true,
    runScripts: "outside-only"
  });
}

async function runAxe(dom) {
  const { window } = dom;
  // axe-core looks at `window` globals — wire them up before injection.
  const prevWindow = global.window;
  const prevDocument = global.document;
  global.window = window;
  global.document = window.document;
  try {
    // axe.source is the standalone runtime; injecting it into the jsdom
    // window gives us a `window.axe` we can call against this exact DOM.
    window.eval(axe.source);
    const results = await window.axe.run(window.document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
      resultTypes: ["violations"]
    });
    return results;
  } finally {
    global.window = prevWindow;
    global.document = prevDocument;
  }
}

function summarise(results) {
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
    target: v.nodes[0]?.target?.[0] || "(unknown)"
  }));
}

test("a11y: public/index.html has no critical or serious axe violations", async () => {
  const dom = await buildDOM(
    resolve(REPO_ROOT, "public/index.html"),
    resolve(REPO_ROOT, "public/style.css")
  );
  const results = await runAxe(dom);
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  assert.equal(
    blocking.length,
    0,
    `Critical/serious axe violations on /public:\n${JSON.stringify(summarise({ violations: blocking }), null, 2)}`
  );
});

test("a11y: docs/index.html has no critical or serious axe violations", async () => {
  const dom = await buildDOM(
    resolve(REPO_ROOT, "docs/index.html"),
    resolve(REPO_ROOT, "docs/style.css")
  );
  const results = await runAxe(dom);
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  assert.equal(
    blocking.length,
    0,
    `Critical/serious axe violations on /docs:\n${JSON.stringify(summarise({ violations: blocking }), null, 2)}`
  );
});

// jsdom can't compute contrast (no real layout), so axe reports it as
// "incomplete" — we evaluate the actual UI colour pairs by hand here.
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

test("a11y: every UI colour pair meets WCAG AA contrast", () => {
  const c = {
    bg: "#0f1115", panel: "#161a22", panel2: "#1c2230",
    text: "#e7ebf3", muted: "#8a93a6", accent: "#8ab4ff", danger: "#ff8a8a"
  };
  const PAIRS = [
    [c.text,   c.bg,     "body text on bg",                4.5],
    [c.text,   c.panel,  "body text on panel",             4.5],
    [c.text,   c.panel2, "file content on panel-2",        4.5],
    [c.muted,  c.bg,     "muted hint text on bg",          4.5],
    [c.muted,  c.panel,  "muted text on panel",            4.5],
    [c.muted,  c.panel2, "muted text on panel-2",          4.5],
    [c.accent, c.bg,     "accent text/link on bg",         4.5],
    [c.accent, c.panel,  "accent text on panel",           4.5],
    [c.accent, c.panel2, "active file name on panel-2",    4.5],
    [c.bg,     c.accent, "primary button label on accent", 4.5],
    [c.danger, c.bg,     "error status text on bg",        4.5]
  ];
  const fails = [];
  for (const [fg, bg, where, target] of PAIRS) {
    const ratio = contrastRatio(fg, bg);
    if (ratio < target) {
      fails.push(`${where}: ${ratio.toFixed(2)}:1 (target ${target}:1)`);
    }
  }
  assert.equal(
    fails.length,
    0,
    `WCAG AA contrast failures:\n  ${fails.join("\n  ")}`
  );
});

// Sanity: both i18n.js files must parse as valid JavaScript. The Run #028
// post-mortem caught a SyntaxError caused by ASCII " (U+0022) accidentally
// closing a string mid-sentence in a German translation — the entire i18n
// module then failed to load silently in the browser, leaving the UI
// untranslated and the deep-flow stages invisible (because the
// IntersectionObserver setup never ran). This test catches that class of
// bug at CI time, before deploy.
import { spawnSync } from "node:child_process";
const i18nFiles = [
  resolve(REPO_ROOT, "public/i18n.js"),
  resolve(REPO_ROOT, "docs/i18n.js")
];
for (const file of i18nFiles) {
  test(`syntax: ${file.replace(REPO_ROOT + "/", "")} parses as valid JavaScript`, () => {
    const r = spawnSync("node", ["-c", file], { encoding: "utf8" });
    assert.equal(
      r.status,
      0,
      `${file} has a syntax error:\n${r.stderr || r.stdout}`
    );
  });
}
