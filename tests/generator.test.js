import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKit, FILE_PLAN } from "../src/index.js";
import { buildContext } from "../src/context.js";

test("generates exactly the 12 expected files", () => {
  const { files } = generateKit("I want to build an app for small restaurants");
  assert.equal(files.length, 12);
  const expected = [
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
  assert.deepEqual(files.map((f) => f.path), expected);
  assert.equal(FILE_PLAN.length, expected.length);
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
