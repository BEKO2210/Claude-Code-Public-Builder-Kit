export function slugify(input) {
  return String(input)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "project";
}

export function titleCase(input) {
  const small = new Set(["a", "an", "the", "for", "of", "and", "or", "in", "on", "to", "with"]);
  const words = String(input).trim().split(/\s+/);
  return words
    .map((w, i) => {
      // Preserve already-cased acronyms / mixed-case tokens (SaaS, API, B2B, etc.).
      const upperCount = (w.match(/[A-Z]/g) || []).length;
      if (upperCount >= 2) return w;
      const lower = w.toLowerCase();
      if (i !== 0 && small.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
