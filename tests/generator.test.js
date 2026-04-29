import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateKit, FILE_PLAN } from "../src/index.js";
import { buildContext } from "../src/context.js";
import { buildZipBuffer } from "../src/utils/zip.js";
import { EXAMPLES, findExample, isSafeExampleId } from "../src/examples.js";
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
