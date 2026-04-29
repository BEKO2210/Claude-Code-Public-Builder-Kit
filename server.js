import express from "express";
import { dirname, resolve, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { generateKit } from "./src/index.js";
import { writeKit } from "./src/utils/write.js";

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

if (process.argv[1] && resolve(process.argv[1]) === resolve(__dirname, "server.js")) {
  app.listen(PORT, () => {
    console.log(`Builder Kit running at http://localhost:${PORT}`);
  });
}

export default app;
