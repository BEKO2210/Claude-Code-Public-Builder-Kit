// Mirror brand assets from /public to /docs.
//
// /public is the canonical home for the brand mark; /docs ships the
// landing page deployed via GitHub Pages and re-uses the same files.
// Until this script existed, the duplication was kept in sync by hand
// (see Run #005 / #009 in RUN_LOG.md). Now: `npm run sync:assets`.
//
// Usage:
//   npm run sync:assets         # copy and report
//   npm run sync:assets -- --check   # exit 1 if any pair would change

import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = resolve(__dirname, "..");

const ASSETS = [
  "logo.svg",
  "logo-monochrome.svg",
  "favicon.svg"
];

const checkOnly = process.argv.includes("--check");

async function bytesEqual(a, b) {
  if (!existsSync(a) || !existsSync(b)) return false;
  const [bufA, bufB] = await Promise.all([readFile(a), readFile(b)]);
  return bufA.equals(bufB);
}

let drift = 0;
for (const asset of ASSETS) {
  const src = resolve(repo, "public", asset);
  const dst = resolve(repo, "docs", asset);
  if (!existsSync(src)) {
    console.error(`✗ missing source: public/${asset}`);
    drift++;
    continue;
  }
  const same = await bytesEqual(src, dst);
  if (same) {
    console.log(`= public/${asset}  ↔  docs/${asset}  (in sync)`);
    continue;
  }
  drift++;
  if (checkOnly) {
    console.log(`✗ public/${asset}  ≠  docs/${asset}  (would copy)`);
  } else {
    await mkdir(resolve(repo, "docs"), { recursive: true });
    await copyFile(src, dst);
    console.log(`→ public/${asset}  ⇒  docs/${asset}  (copied)`);
  }
}

if (checkOnly && drift > 0) {
  console.error(`\n${drift} asset pair(s) out of sync. Run \`npm run sync:assets\` and commit.`);
  process.exit(1);
}
console.log(checkOnly ? "\nin sync." : `\n${drift === 0 ? "already in sync." : `${drift} asset(s) updated.`}`);
