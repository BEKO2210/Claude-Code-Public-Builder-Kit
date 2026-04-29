import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export async function writeKit(files, targetDir) {
  const root = resolve(targetDir);
  for (const f of files) {
    const full = join(root, f.path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, f.content, "utf8");
  }
  return root;
}
