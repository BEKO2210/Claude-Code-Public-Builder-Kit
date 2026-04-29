import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateKit } from "../src/index.js";
import { writeKit } from "../src/utils/write.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const EXAMPLES = [
  {
    folder: "small-business-website-system",
    idea: "A website system for small local businesses",
    now: "2026-04-29T00:00:00Z"
  }
];

async function main() {
  for (const ex of EXAMPLES) {
    const target = resolve(__dirname, "..", "examples", ex.folder);
    const { files, context } = generateKit(ex.idea, { now: ex.now });
    await writeKit(files, target);
    console.log(`Built example: ${context.projectName} -> ${target}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
