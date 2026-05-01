// Dynamic Open Graph card renderer.
//
// /api/og               → returns the static, brand-default 1200×630 PNG.
// /api/og?idea=...      → splices the idea text into the headline area
//                         of the same template and rasterises it on demand.
//
// Why server-side: og:image consumers (Twitter, Slack, LinkedIn, Discord,
// iMessage, WhatsApp) fetch the URL when a kit's share-link is posted. The
// dynamic image makes each shared kit visually distinct, which is the entire
// point of the share buttons added in Run #032 Part 4.
//
// The renderer reuses docs/og-source.svg as a string template — same logo,
// same palette, same brand line. The three-line headline is replaced with
// up to three wrapped lines of the user's idea. Falls back to the static
// PNG if rendering throws (read-only FS, font load failure, malformed SVG).
//
// Caching: rendered PNGs are kept in a small in-memory LRU keyed on the
// normalised idea string. Cap at 64 entries — enough to absorb a viral
// burst, small enough not to leak memory on a long-running process.

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = resolve(__dirname, "..");
const SVG_SRC_PATH = resolve(repo, "docs/og-source.svg");
const STATIC_PNG_PATH = resolve(repo, "docs/og-card.png");

const MAX_IDEA_LEN = 200;
const CACHE_MAX = 64;
const cache = new Map(); // ideaKey → Buffer

let svgTemplatePromise = null;
function loadSvgTemplate() {
  if (!svgTemplatePromise) svgTemplatePromise = readFile(SVG_SRC_PATH, "utf8");
  return svgTemplatePromise;
}

let staticPngPromise = null;
function loadStaticPng() {
  if (!staticPngPromise) staticPngPromise = readFile(STATIC_PNG_PATH);
  return staticPngPromise;
}

// XML-escape so an idea like `<script>` can never escape the SVG context.
function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Greedy word-wrap with hard cap on line length. Returns up to `maxLines`
// lines; the last line truncates to a single ellipsis if anything spills.
export function wrapIdea(idea, { maxCharsPerLine = 26, maxLines = 3 } = {}) {
  const cleaned = String(idea).replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const words = cleaned.split(" ");
  const lines = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? current + " " + w : w;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = w;
      if (lines.length === maxLines - 1) break;
    } else {
      current = candidate;
    }
    // A single word longer than maxCharsPerLine: shove it onto its own line.
    if (!current && w.length > maxCharsPerLine) {
      lines.push(w.slice(0, maxCharsPerLine - 1) + "…");
      current = "";
      if (lines.length === maxLines) break;
    }
  }
  if (current && lines.length < maxLines) {
    // If there's still spillover, ellipsise the last line.
    const remaining = words.slice(words.indexOf(current.split(" ").pop()) + 1).join(" ");
    if (remaining && lines.length === maxLines - 1) {
      const cap = Math.max(maxCharsPerLine - 1, 1);
      const compacted = (current + " " + remaining).slice(0, cap);
      lines.push(compacted + "…");
    } else {
      lines.push(current);
    }
  }
  return lines.slice(0, maxLines);
}

// Build the SVG string for a given idea. We replace the three headline
// <text> elements in og-source.svg with wrapped lines of the user's idea
// and swap the eyebrow chip from "FREE · NO INSTALL · 30 SECONDS" to
// "YOUR IDEA →" so the card visibly self-identifies as a per-share render.
export function buildSvgForIdea(template, idea) {
  const wrapped = wrapIdea(idea);
  // Pad to exactly 3 entries so the SVG always has three text rows.
  while (wrapped.length < 3) wrapped.push("");

  const escaped = wrapped.map(xmlEscape);

  let out = template;

  // Replace the eyebrow chip text.
  out = out.replace(
    /(>)FREE · NO INSTALL · 30 SECONDS(<\/text>)/,
    "$1YOUR PROJECT KIT  →$2"
  );

  // Replace the three headline lines. The accent-blue colour stays on the
  // last line so the visual rhythm matches the static card.
  out = out.replace(/(>)From one sentence(<\/text>)/, "$1" + escaped[0] + "$2");
  out = out.replace(/(>)to a complete(<\/text>)/, "$1" + escaped[1] + "$2");
  out = out.replace(/(>)project plan\.(<\/text>)/, "$1" + escaped[2] + "$2");

  // Tagline: keep generic — the headline carries the idea.
  return out;
}

function rasterise(svg) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    background: "#0f1115",
    font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" }
  });
  return resvg.render().asPng();
}

function cachePut(key, buf) {
  if (cache.size >= CACHE_MAX) {
    // Drop oldest insertion-order entry. Map preserves insertion order.
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, buf);
}

/**
 * Render the dynamic OG PNG for an idea. Falls back to the static card
 * if rendering fails for any reason (missing font, malformed SVG, etc).
 *
 * @param {string} idea
 * @returns {Promise<Buffer>}
 */
export async function renderOgPng(idea) {
  const cleaned = String(idea || "").trim().slice(0, MAX_IDEA_LEN);
  if (!cleaned) return loadStaticPng();

  const cacheKey = cleaned.toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  try {
    const template = await loadSvgTemplate();
    const svg = buildSvgForIdea(template, cleaned);
    const png = rasterise(svg);
    const buf = Buffer.from(png);
    cachePut(cacheKey, buf);
    return buf;
  } catch {
    return loadStaticPng();
  }
}

/**
 * Return the static fallback OG card. Used when no idea is supplied.
 * @returns {Promise<Buffer>}
 */
export function renderStaticOgPng() {
  return loadStaticPng();
}
