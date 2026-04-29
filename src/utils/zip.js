import archiver from "archiver";

const SAFE_ROOT = /^[a-z0-9][a-z0-9-_]*$/i;

export function buildZipBuffer(files, rootName) {
  return new Promise((resolve, reject) => {
    if (!SAFE_ROOT.test(rootName)) {
      return reject(new Error(`Unsafe root name: ${rootName}`));
    }
    for (const f of files) {
      if (
        typeof f.path !== "string" ||
        f.path.length === 0 ||
        f.path.startsWith("/") ||
        f.path.includes("..") ||
        f.path.includes("\\")
      ) {
        return reject(new Error(`Unsafe entry path: ${f.path}`));
      }
    }

    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks = [];
    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("warning", (err) => {
      if (err.code !== "ENOENT") reject(err);
    });
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));

    for (const f of files) {
      archive.append(f.content, { name: `${rootName}/${f.path}` });
    }
    archive.finalize();
  });
}
