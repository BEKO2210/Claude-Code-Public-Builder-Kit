import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateKit, FILE_PLAN } from "../src/index.js";
import { buildContext, PRODUCT_TYPE_VALUES, DOMAIN_VALUES } from "../src/context.js";
import { buildZipBuffer } from "../src/utils/zip.js";
import { EXAMPLES, findExample, isSafeExampleId } from "../src/examples.js";
import { validateContext, assertContext } from "../src/schema.js";
import {
  domainRisksBlock,
  domainPositioningBlock,
  SPECIALISED_DOMAINS
} from "../src/templates/domain-blocks.js";
import app from "../server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const EXPECTED_FILES = [
  "README.md",
  "CLAUDE.md",
  "MASTERPLAN.md",
  "ROADMAP.md",
  "RUN_LOG.md",
  "ACCEPTANCE_CRITERIA.md",
  "ARCHITECTURE.md",
  "PROMPTS/initial-prompt.md",
  "PROMPTS/run-plan-20-sessions.md",
  "DOCS/product-brief.md",
  "DOCS/market-positioning.md",
  "DOCS/technical-decisions.md"
];

function countCentralDirectoryEntries(buf) {
  // ZIP central directory header signature: 0x02014b50 (little-endian PK\x01\x02).
  let count = 0;
  for (let i = 0; i + 3 < buf.length; i++) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x01 && buf[i + 3] === 0x02) {
      count++;
    }
  }
  return count;
}

async function listMarkdownFiles(dir) {
  const all = await readdir(dir, { recursive: true, withFileTypes: true });
  return all.filter((d) => d.isFile() && d.name.endsWith(".md")).map((d) => d.name);
}

function fileFromKit(idea, path, opts) {
  const { files } = generateKit(idea, opts);
  const file = files.find((f) => f.path === path);
  if (!file) throw new Error(`File ${path} missing for idea: ${idea}`);
  return file.content;
}

test("generates exactly the 12 expected files", () => {
  const { files } = generateKit("I want to build an app for small restaurants");
  assert.equal(files.length, 12);
  assert.deepEqual(files.map((f) => f.path), EXPECTED_FILES);
  assert.equal(FILE_PLAN.length, EXPECTED_FILES.length);
});

test("every generated file has substantial content (>= 800 bytes)", () => {
  const { files } = generateKit("A website system for small local businesses");
  for (const f of files) {
    assert.ok(
      Buffer.byteLength(f.content, "utf8") >= 800,
      `${f.path} too short: ${Buffer.byteLength(f.content, "utf8")} bytes`
    );
  }
});

test("no template leaks raw TODO placeholders", () => {
  const { files } = generateKit("A platform for indie game studios");
  for (const f of files) {
    // Allow the literal word in templates that document the TODO concept,
    // but disallow the classic placeholder pattern with no follow-up text.
    const lines = f.content.split("\n");
    const offending = lines.find((l) => /^\s*TODO\s*$/.test(l) || /TBD\s*$/.test(l));
    assert.equal(offending, undefined, `${f.path} has placeholder line: ${offending}`);
  }
});

test("context infers product type, audience, and domain", () => {
  const ctx = buildContext("I want to build an app for small restaurants");
  assert.equal(ctx.productType, "app");
  assert.match(ctx.audience, /small restaurants/i);
  assert.equal(ctx.domain, "food & hospitality");
  assert.match(ctx.slug, /small-restaurants/);
});

const DOMAIN_DETECTION_CASES = [
  { domain: "logistics & supply chain",  idea: "A logistics platform for last-mile couriers" },
  { domain: "government & civic",         idea: "A civic engagement app for municipality residents" },
  { domain: "climate & sustainability",   idea: "A carbon accounting tool for sustainability teams" },
  { domain: "agriculture",                idea: "A farm management app for organic crop growers" },
  { domain: "travel & tourism",           idea: "A trip planning app for backpackers staying in hostels" },
  { domain: "gaming",                     idea: "A matchmaking server for online multiplayer indie game lobbies" },
  { domain: "non-profit & community",     idea: "A fundraising tool for nonprofit organizations" },
  { domain: "manufacturing",              idea: "A factory floor monitoring system for manufacturing teams" },
  { domain: "HR & recruiting",            idea: "A recruiting CRM for small-team hiring pipelines" },
  { domain: "events & ticketing",         idea: "A ticketing platform for community workshops and meetups" }
];

for (const c of DOMAIN_DETECTION_CASES) {
  test(`domain heuristic: "${c.idea}" → ${c.domain}`, () => {
    const ctx = buildContext(c.idea);
    assert.equal(ctx.domain, c.domain);
  });
}

test("schema: PRODUCT_TYPE_VALUES contains the 8 expected values", () => {
  const expected = ["mobile app", "web app", "website", "platform", "tool", "service", "app", "product"];
  assert.deepEqual([...PRODUCT_TYPE_VALUES].sort(), [...expected].sort());
});

test("schema: DOMAIN_VALUES has 21 entries (20 groups + general)", () => {
  assert.equal(DOMAIN_VALUES.length, 21);
  assert.ok(DOMAIN_VALUES.includes("general"));
  assert.ok(DOMAIN_VALUES.includes("food & hospitality"));
  assert.ok(DOMAIN_VALUES.includes("events & ticketing"));
});

test("schema: PRODUCT_TYPE_VALUES and DOMAIN_VALUES are immutable (frozen)", () => {
  assert.ok(Object.isFrozen(PRODUCT_TYPE_VALUES));
  assert.ok(Object.isFrozen(DOMAIN_VALUES));
});

test("schema: validateContext accepts the output of buildContext for varied ideas", () => {
  const ideas = [
    "I want to build an app for small restaurants",
    "A SaaS dashboard for small business accountants",
    "A platform for indie game studios",
    "A logistics platform for last-mile couriers",
    "Just a tool" // falls back to general / tool
  ];
  for (const idea of ideas) {
    const ctx = buildContext(idea);
    const r = validateContext(ctx);
    assert.equal(r.ok, true, `expected valid ctx for "${idea}", got: ${r.errors.join("; ")}`);
  }
});

test("schema: validateContext rejects null / non-object input", () => {
  assert.equal(validateContext(null).ok, false);
  assert.equal(validateContext(undefined).ok, false);
  assert.equal(validateContext("string").ok, false);
  assert.equal(validateContext(42).ok, false);
});

test("schema: validateContext flags missing required string fields", () => {
  const base = buildContext("A platform for indie studios");
  for (const field of ["rawIdea", "projectName", "slug", "audience", "generatedAt"]) {
    const broken = { ...base, [field]: "" };
    const r = validateContext(broken);
    assert.equal(r.ok, false, `expected failure when ${field} is empty`);
    assert.ok(r.errors.some((e) => e.includes(field)), `error must mention '${field}'`);
  }
});

test("schema: validateContext rejects malformed slug", () => {
  const base = buildContext("A platform for indie studios");
  const r = validateContext({ ...base, slug: "Bad Slug With Spaces" });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /slug/.test(e)));
});

test("schema: validateContext rejects unknown productType / domain", () => {
  const base = buildContext("A platform for indie studios");
  assert.equal(validateContext({ ...base, productType: "spaceship" }).ok, false);
  assert.equal(validateContext({ ...base, domain: "atlantis" }).ok, false);
});

test("schema: validateContext rejects bad year and bad generatedAt", () => {
  const base = buildContext("A platform for indie studios");
  assert.equal(validateContext({ ...base, year: 1969 }).ok, false);
  assert.equal(validateContext({ ...base, year: 2026.5 }).ok, false);
  assert.equal(validateContext({ ...base, year: "2026" }).ok, false);
  assert.equal(validateContext({ ...base, generatedAt: "not-a-date" }).ok, false);
});

test("schema: assertContext throws on invalid, returns nothing on valid", () => {
  const valid = buildContext("A platform for indie studios");
  assert.doesNotThrow(() => assertContext(valid));
  assert.throws(() => assertContext({ ...valid, domain: "atlantis" }), /Invalid context/);
  assert.throws(() => assertContext(null), /Invalid context/);
});

test("schema: every generated example's context is valid", () => {
  for (const ex of EXAMPLES) {
    const ctx = buildContext(ex.idea, { now: ex.now });
    const r = validateContext(ctx);
    assert.equal(r.ok, true, `example ${ex.id} produced an invalid context: ${r.errors.join("; ")}`);
  }
});

test("domain depth: SPECIALISED_DOMAINS has exactly the two expected entries", () => {
  assert.deepEqual([...SPECIALISED_DOMAINS].sort(), ["climate & sustainability", "professional services"]);
});

test("domain depth: climate & sustainability — MASTERPLAN.md has the risks subsection", () => {
  const md = fileFromKit("A carbon accounting tool for sustainability teams", "MASTERPLAN.md");
  assert.match(md, /### Domain-specific risks \(climate & sustainability\)/);
  assert.match(md, /Greenwashing/);
  assert.match(md, /methodology/);
});

test("domain depth: professional services — MASTERPLAN.md has the risks subsection", () => {
  const md = fileFromKit("A SaaS dashboard for small business accountants", "MASTERPLAN.md");
  assert.match(md, /### Domain-specific risks \(professional services\)/);
  assert.match(md, /Liability/);
  assert.match(md, /Client-data privacy/);
});

test("domain depth: climate & sustainability — DOCS/product-brief.md has the positioning subsection", () => {
  const md = fileFromKit("A carbon accounting tool for sustainability teams", "DOCS/product-brief.md");
  assert.match(md, /### Domain-specific positioning \(climate & sustainability\)/);
  assert.match(md, /credible impact/);
  assert.match(md, /transparent metrics/);
});

test("domain depth: professional services — DOCS/product-brief.md has the positioning subsection", () => {
  const md = fileFromKit("A SaaS dashboard for small business accountants", "DOCS/product-brief.md");
  assert.match(md, /### Domain-specific positioning \(professional services\)/);
  assert.match(md, /Repeatable processes/);
  assert.match(md, /Better client communication/);
});

test("domain depth: non-target domains get no domain-specific subsection (no orphan headings)", () => {
  // small business — already a worked example; must not regress.
  const sbMaster = fileFromKit("A website system for small local businesses", "MASTERPLAN.md", { now: "2026-04-29T00:00:00Z" });
  const sbBrief = fileFromKit("A website system for small local businesses", "DOCS/product-brief.md", { now: "2026-04-29T00:00:00Z" });
  assert.doesNotMatch(sbMaster, /Domain-specific risks/);
  assert.doesNotMatch(sbBrief, /Domain-specific positioning/);

  // food & hospitality, gaming, general — sample three more non-target domains.
  for (const idea of [
    "I want to build an app for small restaurants",
    "A matchmaking server for online multiplayer indie game lobbies",
    "Just a tool for keeping track of stuff"
  ]) {
    const m = fileFromKit(idea, "MASTERPLAN.md");
    const b = fileFromKit(idea, "DOCS/product-brief.md");
    assert.doesNotMatch(m, /Domain-specific risks/, `MASTERPLAN.md leaked domain heading for "${idea}"`);
    assert.doesNotMatch(b, /Domain-specific positioning/, `product-brief.md leaked domain heading for "${idea}"`);
    // Existing structure is intact.
    assert.match(m, /## 8\. Risks and mitigations/);
    assert.match(m, /## 9\. Open questions/);
    assert.match(b, /## 5\. Tone and voice/);
    assert.match(b, /## 6\. Open questions/);
  }
});

test("domain depth: helpers return empty string for unspecialised domains", () => {
  for (const ctx of [
    { domain: "general" },
    { domain: "food & hospitality" },
    { domain: "gaming" },
    { domain: "small business" }
  ]) {
    assert.equal(domainRisksBlock(ctx), "");
    assert.equal(domainPositioningBlock(ctx), "");
  }
});

test("no generated file leaks 'undefined' or '[object Object]'", () => {
  const ideas = [
    "I want to build an app for small restaurants",
    "A carbon accounting tool for sustainability teams",
    "A SaaS dashboard for small business accountants",
    "A platform for indie game studios",
    "Just a thing"
  ];
  for (const idea of ideas) {
    const { files } = generateKit(idea);
    for (const f of files) {
      assert.ok(!f.content.includes("undefined"), `${f.path} contains 'undefined' for idea "${idea}"`);
      assert.ok(!f.content.includes("[object Object]"), `${f.path} contains '[object Object]' for idea "${idea}"`);
    }
  }
});

test("schema: every keyword in DOMAIN_KEYWORDS round-trips to its declared domain", () => {
  // Round-trip canary — if we ever add a keyword that contains a substring of
  // an earlier-iterated keyword, this test will surface the conflict.
  for (const idea of [
    "logistics", "civic", "carbon", "farm", "trip",
    "gamedev", "nonprofit", "factory", "recruiting", "ticketing"
  ]) {
    const ctx = buildContext(idea);
    assert.ok(DOMAIN_VALUES.includes(ctx.domain), `domain "${ctx.domain}" not in DOMAIN_VALUES`);
    assert.notEqual(ctx.domain, "general", `keyword "${idea}" should match a non-general domain`);
  }
});

test("domain heuristics: existing examples remain stable after expansion", () => {
  // The two worked examples must keep their original domain — adding new
  // groups at the end of DOMAIN_KEYWORDS preserves first-match-wins behavior.
  assert.equal(buildContext("A website system for small local businesses").domain, "small business");
  assert.equal(buildContext("A SaaS dashboard for small business accountants").domain, "professional services");
  assert.equal(buildContext("I want to build an app for small restaurants").domain, "food & hospitality");
});

test("context handles website + small-business idea", () => {
  const ctx = buildContext("A website system for small local businesses");
  assert.equal(ctx.productType, "website");
  assert.equal(ctx.domain, "small business");
  assert.ok(ctx.projectName.length > 0);
  assert.ok(ctx.slug.length > 0);
});

test("context rejects empty idea", () => {
  assert.throws(() => buildContext(""), /required/i);
  assert.throws(() => buildContext("   "), /required/i);
});

test("project name in README matches context", () => {
  const { context, files } = generateKit("Build me a tool for freelance designers");
  const readme = files.find((f) => f.path === "README.md");
  assert.ok(readme.content.includes(context.projectName));
  assert.ok(readme.content.includes(context.audience));
});

test("RUN_LOG seeds Run #001", () => {
  const { files } = generateKit("A SaaS dashboard for SMB accountants");
  const log = files.find((f) => f.path === "RUN_LOG.md");
  assert.match(log.content, /Run #001/);
  assert.match(log.content, /Repository scaffolded/);
});

test("deterministic output when 'now' is fixed", () => {
  const a = generateKit("A platform for indie game studios", { now: "2026-04-29T00:00:00Z" });
  const b = generateKit("A platform for indie game studios", { now: "2026-04-29T00:00:00Z" });
  assert.deepEqual(a.files, b.files);
});

test("buildZipBuffer produces a valid zip with 12 entries", async () => {
  const { context, files } = generateKit("A SaaS dashboard for small business accountants");
  const buf = await buildZipBuffer(files, context.slug);
  assert.ok(Buffer.isBuffer(buf));
  assert.deepEqual(Array.from(buf.subarray(0, 4)), [0x50, 0x4b, 0x03, 0x04]);
  assert.equal(countCentralDirectoryEntries(buf), 12);
  for (const path of EXPECTED_FILES) {
    assert.ok(
      buf.toString("latin1").includes(`${context.slug}/${path}`),
      `zip missing entry: ${context.slug}/${path}`
    );
  }
});

test("buildZipBuffer rejects unsafe entry paths", async () => {
  const evil = [{ path: "../escape.md", content: "x" }];
  await assert.rejects(() => buildZipBuffer(evil, "ok-slug"), /Unsafe entry path/);
});

test("buildZipBuffer rejects unsafe root names", async () => {
  await assert.rejects(() => buildZipBuffer([], "../etc"), /Unsafe root name/);
});

test("POST /api/generate.zip returns a zip response", async () => {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const port = server.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/generate.zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: "A SaaS dashboard for small business accountants" })
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") || "", /application\/zip/);
    assert.match(res.headers.get("content-disposition") || "", /attachment/);
    const buf = Buffer.from(await res.arrayBuffer());
    assert.deepEqual(Array.from(buf.subarray(0, 4)), [0x50, 0x4b, 0x03, 0x04]);
    assert.equal(countCentralDirectoryEntries(buf), 12);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("POST /api/generate.zip rejects empty idea", async () => {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const port = server.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/generate.zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: "" })
    });
    assert.equal(res.status, 400);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("worked example: small-business-website-system has all 12 files on disk", async () => {
  const dir = resolve(REPO_ROOT, "examples/small-business-website-system");
  const files = await listMarkdownFiles(dir);
  assert.equal(files.length, 12, `expected 12 .md files, got ${files.length}`);
});

test("worked example: smb-accounting-saas-dashboard has all 12 files on disk", async () => {
  const dir = resolve(REPO_ROOT, "examples/smb-accounting-saas-dashboard");
  const files = await listMarkdownFiles(dir);
  assert.equal(files.length, 12, `expected 12 .md files, got ${files.length}`);
});

test("second example demonstrates SaaS / dashboard / accounting context", () => {
  const ctx = buildContext("A SaaS dashboard for small business accountants");
  assert.equal(ctx.productType, "web app");
  assert.match(ctx.audience, /small business accountants/i);
  assert.equal(ctx.domain, "professional services");
  assert.match(ctx.projectName, /SaaS/);
});

test("example registry: ids are unique, safe, and resolvable", () => {
  assert.ok(EXAMPLES.length >= 2, "registry should ship at least 2 examples");
  const ids = EXAMPLES.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "ids must be unique");
  for (const ex of EXAMPLES) {
    assert.ok(isSafeExampleId(ex.id), `unsafe example id: ${ex.id}`);
    assert.equal(findExample(ex.id)?.id, ex.id);
    assert.ok(typeof ex.idea === "string" && ex.idea.length > 0);
    assert.ok(typeof ex.title === "string" && ex.title.length > 0);
    assert.ok(typeof ex.description === "string" && ex.description.length > 20);
    assert.ok(typeof ex.now === "string");
  }
});

test("example registry: each example folder on disk matches its id", async () => {
  for (const ex of EXAMPLES) {
    const dir = resolve(REPO_ROOT, "examples", ex.id);
    const files = await listMarkdownFiles(dir);
    assert.equal(files.length, 12, `${ex.id} should have 12 .md files`);
  }
});

test("GET /api/examples returns both examples with metadata", async () => {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const port = server.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/examples`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.examples));
    assert.equal(data.examples.length, EXAMPLES.length);
    for (const item of data.examples) {
      assert.ok(item.id);
      assert.ok(item.title);
      assert.ok(item.idea);
      assert.ok(item.slug);
      assert.ok(item.description);
      assert.equal(item.fileCount, 12);
      assert.equal(item.files.length, 12);
      // Files in the list endpoint are paths only, not content.
      for (const f of item.files) assert.equal(typeof f, "string");
    }
    const ids = data.examples.map((e) => e.id).sort();
    assert.deepEqual(ids, EXAMPLES.map((e) => e.id).sort());
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("GET /api/examples/:id returns a kit with 12 files", async () => {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const port = server.address().port;
  try {
    for (const ex of EXAMPLES) {
      const res = await fetch(`http://127.0.0.1:${port}/api/examples/${ex.id}`);
      assert.equal(res.status, 200, `expected 200 for ${ex.id}`);
      const data = await res.json();
      assert.equal(data.id, ex.id);
      assert.equal(data.idea, ex.idea);
      assert.ok(data.context);
      assert.equal(data.files.length, 12);
      assert.deepEqual(data.files.map((f) => f.path), EXPECTED_FILES);
      // Content is included in the detail endpoint.
      for (const f of data.files) {
        assert.ok(Buffer.byteLength(f.content, "utf8") >= 800);
      }
    }
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("GET /api/examples/:id returns 404 for unknown id", async () => {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const port = server.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/examples/does-not-exist`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.match(data.error, /not found/i);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("GET /api/examples/:id returns 400 for unsafe id (path traversal)", async () => {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const port = server.address().port;
  try {
    // Express normalises ".." in the path, but we still defend explicitly.
    const res = await fetch(`http://127.0.0.1:${port}/api/examples/UPPERCASE_BAD`);
    assert.equal(res.status, 400);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("POST /api/generate still works after gallery additions", async () => {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const port = server.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: "A platform for indie game studios", persist: false })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.files.length, 12);
    assert.equal(data.writtenTo, null);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
