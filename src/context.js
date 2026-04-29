import { slugify, titleCase } from "./utils/slug.js";

const PRODUCT_TYPES = [
  { type: "mobile app", patterns: [/\bmobile app\b/, /\bios\b/, /\bandroid\b/] },
  { type: "web app", patterns: [/\bweb app\b/, /\bsaas\b/, /\bdashboard\b/] },
  { type: "website", patterns: [/\bwebsite\b/, /\blanding page\b/, /\bmicrosite\b/] },
  { type: "platform", patterns: [/\bplatform\b/, /\bmarketplace\b/, /\bnetwork\b/] },
  { type: "tool", patterns: [/\btool\b/, /\butility\b/, /\bcli\b/, /\bextension\b/] },
  { type: "service", patterns: [/\bservice\b/, /\bapi\b/] },
  { type: "app", patterns: [/\bapp\b/, /\bapplication\b/] }
];

const AUDIENCE_HINTS = [
  /for\s+([^.,;!?\n]{3,80}?)(?:\.|,|;|!|\?|$)/i,
  /(?:built|made|designed)\s+for\s+([^.,;!?\n]{3,80}?)(?:\.|,|;|!|\?|$)/i
];

const DOMAIN_KEYWORDS = {
  "food & hospitality": ["restaurant", "cafe", "bistro", "bar", "menu", "kitchen", "dining"],
  "retail & e-commerce": ["shop", "store", "retail", "ecommerce", "e-commerce", "boutique"],
  "health & wellness": ["clinic", "doctor", "patient", "therapy", "wellness", "fitness", "gym"],
  "education": ["school", "student", "course", "learning", "tutor", "teacher", "classroom"],
  "creative & media": ["artist", "designer", "photographer", "studio", "music", "podcast"],
  "professional services": ["lawyer", "accountant", "consultant", "agency", "freelancer"],
  "small business": ["small business", "local business", "shop owner", "smb"],
  "developer tools": ["developer", "engineer", "devops", "ci", "cd", "code"],
  "finance": ["bank", "finance", "invoice", "payment", "fintech"],
  "real estate": ["property", "realtor", "rental", "lease", "house"]
};

function inferProductType(idea) {
  const lower = idea.toLowerCase();
  for (const { type, patterns } of PRODUCT_TYPES) {
    if (patterns.some((p) => p.test(lower))) return type;
  }
  return "product";
}

function inferAudience(idea) {
  for (const re of AUDIENCE_HINTS) {
    const m = idea.match(re);
    if (m && m[1]) {
      return m[1].trim().replace(/\s+/g, " ");
    }
  }
  return "early adopters in your target segment";
}

function inferDomain(idea) {
  const lower = idea.toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return domain;
  }
  return "general";
}

function deriveProjectName(idea, audience, productType) {
  // Trim conversational openers like "I want to build", "Build me", etc.
  let cleaned = idea
    .replace(/^\s*(i\s+want\s+to\s+(build|create|make)|build\s+me|create|make|let's\s+build)\s+/i, "")
    .replace(/^\s*(an?|the)\s+/i, "")
    .trim();
  if (!cleaned) cleaned = `${audience} ${productType}`;
  // Cap length, drop trailing punctuation
  cleaned = cleaned.replace(/[.!?]+$/g, "").trim();
  if (cleaned.length > 60) cleaned = cleaned.slice(0, 60).replace(/\s+\S*$/, "");
  return titleCase(cleaned);
}

export function buildContext(rawIdea, opts = {}) {
  const idea = String(rawIdea || "").trim();
  if (!idea) throw new Error("Idea is required.");

  const productType = inferProductType(idea);
  const audience = inferAudience(idea);
  const domain = inferDomain(idea);
  const projectName = deriveProjectName(idea, audience, productType);
  const slug = slugify(projectName);
  const generatedAt = opts.now ? new Date(opts.now).toISOString() : new Date().toISOString();

  return {
    rawIdea: idea,
    projectName,
    slug,
    productType,
    audience,
    domain,
    generatedAt,
    year: new Date(generatedAt).getUTCFullYear()
  };
}
