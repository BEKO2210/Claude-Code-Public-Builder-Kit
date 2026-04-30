import express from "express";
import { dirname, resolve, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { generateKit } from "./src/index.js";
import { buildContext } from "./src/context.js";
import { writeKit } from "./src/utils/write.js";
import { buildZipBuffer } from "./src/utils/zip.js";
import { EXAMPLES, findExample, isSafeExampleId } from "./src/examples.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;
const OUTPUT_DIR = resolve(__dirname, "output");

// `process.env.VERCEL` is "1" on every Vercel runtime (build + serverless).
// We use it to disable filesystem-persist (no writable disk on serverless)
// and to surface a "hosted" flag for the UI if it ever needs to differ.
const IS_HOSTED = process.env.VERCEL === "1";

// In-memory rate limiter for the heavy endpoints (`/api/generate`,
// `/api/generate.zip`). Each Vercel function instance has its own Map;
// the limiter is best-effort on serverless but still raises the cost of
// abuse meaningfully because Vercel keeps warm instances long enough that
// a single bad actor lands on the same instance repeatedly. Locally it
// behaves identically. Tests stay well under the limit (≤6 calls per
// run on rate-limited endpoints).
const RL_WINDOW_MS = 60_000;
const RL_MAX = 30;
const rateLimitBuckets = new Map();

function rateLimit(req, res, next) {
  const fwd = req.headers["x-forwarded-for"];
  const ip = (typeof fwd === "string" ? fwd.split(",")[0].trim() : "")
    || req.socket?.remoteAddress
    || "unknown";
  const now = Date.now();
  const entry = rateLimitBuckets.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimitBuckets.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    return next();
  }
  if (entry.count >= RL_MAX) {
    res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
    return res.status(429).json({ error: "Too many requests. Please slow down and try again in a minute." });
  }
  entry.count += 1;
  next();
}

const app = express();
app.use(express.json({ limit: "64kb" }));
app.use(express.static(resolve(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hosted: IS_HOSTED });
});

app.post("/api/generate", rateLimit, async (req, res) => {
  const idea = typeof req.body?.idea === "string" ? req.body.idea.trim() : "";
  // Locally the user can opt in to filesystem persistence. On hosted we
  // ignore the flag — there is no writable disk, and even if there were,
  // we don't want one user's slug to collide with the next.
  const wantsPersist = req.body?.persist !== false;
  const persist = wantsPersist && !IS_HOSTED;

  if (!idea) {
    return res.status(400).json({ error: "Field 'idea' is required." });
  }
  if (idea.length > 500) {
    return res.status(400).json({ error: "Idea must be 500 characters or fewer." });
  }

  try {
    const { context, files } = generateKit(idea);
    let writtenTo = null;
    if (persist) {
      const target = join(OUTPUT_DIR, context.slug);
      // Defence-in-depth: never let the slug escape OUTPUT_DIR.
      if (!normalize(target).startsWith(normalize(OUTPUT_DIR))) {
        return res.status(400).json({ error: "Invalid project slug." });
      }
      await writeKit(files, target);
      writtenTo = target;
    }
    res.json({ context, files, writtenTo, hosted: IS_HOSTED });
  } catch (err) {
    res.status(500).json({ error: err.message || "Generation failed." });
  }
});

function readIdea(req) {
  const idea = typeof req.body?.idea === "string" ? req.body.idea.trim() : "";
  if (!idea) return { error: "Field 'idea' is required." };
  if (idea.length > 500) return { error: "Idea must be 500 characters or fewer." };
  return { idea };
}

app.get("/api/examples", (_req, res) => {
  const list = EXAMPLES.map((ex) => {
    const { context, files } = generateKit(ex.idea, { now: ex.now });
    return {
      id: ex.id,
      title: ex.title,
      description: ex.description,
      idea: ex.idea,
      slug: context.slug,
      fileCount: files.length,
      files: files.map((f) => f.path)
    };
  });
  res.json({ examples: list });
});

app.get("/api/examples/:id", (req, res) => {
  const id = req.params.id;
  if (!isSafeExampleId(id)) {
    return res.status(400).json({ error: "Invalid example id." });
  }
  const ex = findExample(id);
  if (!ex) {
    return res.status(404).json({ error: "Example not found." });
  }
  const { context, files } = generateKit(ex.idea, { now: ex.now });
  res.json({
    id: ex.id,
    title: ex.title,
    description: ex.description,
    idea: ex.idea,
    slug: context.slug,
    context,
    files
  });
});

app.post("/api/generate.zip", rateLimit, async (req, res) => {
  const parsed = readIdea(req);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  try {
    const { context, files } = generateKit(parsed.idea);
    const buf = await buildZipBuffer(files, context.slug);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${context.slug}.zip"`);
    res.setHeader("Content-Length", buf.length);
    res.end(buf);
  } catch (err) {
    res.status(500).json({ error: err.message || "ZIP generation failed." });
  }
});

app.post("/api/preview", (req, res) => {
  const parsed = readIdea(req);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  try {
    // buildContext is cheap and pure; no template rendering, no file I/O.
    // Suitable for live, debounced calls as the user types.
    const context = buildContext(parsed.idea);
    res.json({ context });
  } catch (err) {
    res.status(500).json({ error: err.message || "Preview failed." });
  }
});

if (process.argv[1] && resolve(process.argv[1]) === resolve(__dirname, "server.js")) {
  app.listen(PORT, () => {
    console.log(`Builder Kit running at http://localhost:${PORT}`);
  });
}

export default app;
