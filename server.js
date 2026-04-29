import express from "express";
import { dirname, resolve, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { generateKit } from "./src/index.js";
import { writeKit } from "./src/utils/write.js";
import { buildZipBuffer } from "./src/utils/zip.js";
import { EXAMPLES, findExample, isSafeExampleId } from "./src/examples.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;
const OUTPUT_DIR = resolve(__dirname, "output");

const app = express();
app.use(express.json({ limit: "64kb" }));
app.use(express.static(resolve(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/generate", async (req, res) => {
  const idea = typeof req.body?.idea === "string" ? req.body.idea.trim() : "";
  const persist = req.body?.persist !== false;

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
    res.json({ context, files, writtenTo });
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

app.post("/api/generate.zip", async (req, res) => {
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

if (process.argv[1] && resolve(process.argv[1]) === resolve(__dirname, "server.js")) {
  app.listen(PORT, () => {
    console.log(`Builder Kit running at http://localhost:${PORT}`);
  });
}

export default app;
