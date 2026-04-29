import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateKit } from "../src/index.js";
import { writeKit } from "../src/utils/write.js";
import { EXAMPLES } from "../src/examples.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  for (const ex of EXAMPLES) {
    const target = resolve(__dirname, "..", "examples", ex.id);
    const { files, context } = generateKit(ex.idea, { now: ex.now });
    await writeKit(files, target);
    console.log(`Built example: ${context.projectName} -> ${target}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
