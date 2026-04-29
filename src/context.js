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

// First-match-wins, in insertion order. Append new groups at the end so
// existing detection (and the worked examples on disk) remain stable.
const DOMAIN_KEYWORDS = {
  "food & hospitality": ["restaurant", "cafe", "bistro", "bar", "menu", "kitchen", "dining"],
  "retail & e-commerce": ["shop", "store", "retail", "ecommerce", "e-commerce", "boutique"],
  "health & wellness": ["clinic", "doctor", "patient", "therapy", "wellness", "fitness", "gym"],
  "education": ["school", "student", "course", "learning", "tutor", "teacher", "classroom"],
  "creative & media": ["artist", "designer", "photographer", "studio", "music", "podcast"],
  "professional services": ["lawyer", "accountant", "consultant", "agency", "freelancer"],
  "small business": ["small business", "local business", "shop owner", "smb"],
  "developer tools": ["developer", "engineer", "devops", "ci/cd", "continuous integration", "code"],
  "finance": ["bank", "finance", "invoice", "payment", "fintech"],
  "real estate": ["property", "realtor", "rental", "lease", "house"],
  "logistics & supply chain": ["logistics", "shipping", "freight", "warehouse", "fleet", "dispatch", "courier", "supply chain", "last-mile"],
  "government & civic": ["government", "civic", "public sector", "municipality", "citizen", "gov-tech", "public records"],
  "climate & sustainability": ["climate", "sustainability", "carbon", "emissions", "renewable", "recycling", "environmental", "esg"],
  "agriculture": ["farm", "farmer", "agriculture", "agtech", "crop", "livestock", "harvest", "ranch", "organic"],
  "travel & tourism": ["travel", "tourism", "hotel", "booking", "trip", "itinerary", "guesthouse", "hostel", "vacation"],
  "gaming": ["gaming", "esports", "multiplayer", "mmo", "gamedev", "indie game", "matchmaking"],
  "non-profit & community": ["nonprofit", "non-profit", "charity", "volunteer", "ngo", "fundraising"],
  "manufacturing": ["manufacturing", "factory", "fabrication", "cnc", "3d print", "prototyping"],
  "HR & recruiting": ["recruiting", "hiring", "applicant tracking", "payroll", "onboarding", "human resources"],
  "events & ticketing": ["conference", "meetup", "workshop", "ticketing", "venue"]
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

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Pre-compile each keyword with a leading word boundary so "ci" no longer
// matches "civic" and "shop" no longer matches "workshop". No trailing
// boundary — we still want plurals and compound suffixes ("shops",
// "shopkeepers", "3d printing") to match.
const COMPILED_DOMAIN_PATTERNS = Object.entries(DOMAIN_KEYWORDS).map(([domain, keywords]) => ({
  domain,
  patterns: keywords.map((k) => new RegExp("\\b" + escapeRegex(k), "i"))
}));

function inferDomain(idea) {
  for (const { domain, patterns } of COMPILED_DOMAIN_PATTERNS) {
    if (patterns.some((p) => p.test(idea))) return domain;
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
