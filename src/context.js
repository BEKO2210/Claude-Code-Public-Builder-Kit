import { slugify, titleCase } from "./utils/slug.js";
import { assertContext } from "./schema.js";

const PRODUCT_TYPES = [
  { type: "mobile app", patterns: [/\bmobile app\b/, /\bios\b/, /\bandroid\b/] },
  { type: "web app", patterns: [/\bweb app\b/, /\bsaas\b/, /\bdashboard\b/] },
  { type: "website", patterns: [/\bwebsite\b/, /\blanding page\b/, /\bmicrosite\b/] },
  { type: "platform", patterns: [/\bplatform\b/, /\bmarketplace\b/, /\bnetwork\b/] },
  { type: "tool", patterns: [/\btool\b/, /\butility\b/, /\bcli\b/, /\bextension\b/] },
  { type: "service", patterns: [/\bservice\b/, /\bapi\b/] },
  { type: "app", patterns: [/\bapp\b/, /\bapplication\b/] }
];

// Ordered: stronger / more idiomatic patterns first, looser fallbacks last.
// First match wins, so adding a pattern at the end never changes existing
// detection — only catches ideas that would otherwise hit the generic fallback.
const AUDIENCE_HINTS = [
  /(?:built|made|designed|tailored)\s+for\s+([^.,;!?\n]{3,80}?)(?:\.|,|;|!|\?|$)/i,
  /for\s+([^.,;!?\n]{3,80}?)(?:\.|,|;|!|\?|$)/i,
  /(?:that|which)\s+helps?\s+([^.,;!?\n]{3,80}?)(?:\.|,|;|!|\?|$)/i,
  /to\s+help\s+([^.,;!?\n]{3,80}?)(?:\.|,|;|!|\?|$)/i,
  /(?:aimed\s+at|targeted\s+at|targeting)\s+([^.,;!?\n]{3,80}?)(?:\.|,|;|!|\?|$)/i
];

// First-match-wins, in insertion order. Append new groups at the end so
// existing detection (and the worked examples on disk) remain stable.
//
// Keyword expansion notes (Run #036):
//   - Each domain has been broadened to ~25-40 specific lemmas so the
//     heuristic catches paraphrases ("eatery" / "deli" / "bakery" alongside
//     "restaurant"; "marathon" / "athlete" / "yoga" alongside "fitness").
//   - Words that could legally route to multiple domains are placed under
//     the more specific one (e.g. "accounting" stays out of professional
//     services because the climate test idea contains "carbon accounting"
//     and climate sits later in the order).
//   - Domains earlier in the list (food, retail, health, education,
//     creative, professional services, small business) deliberately avoid
//     generic words like "system", "saas", "dashboard", "platform",
//     "small", "business" — those would shadow the worked examples and the
//     existing test cases. Specific industry terminology only.
const DOMAIN_KEYWORDS = {
  "food & hospitality": [
    "restaurant", "cafe", "bistro", "bar", "menu", "kitchen", "dining",
    "café", "eatery", "deli", "bakery", "butcher", "pizzeria", "sushi",
    "takeaway", "takeout", "catering", "chef", "barista", "sommelier",
    "hospitality", "gastropub", "gastronom", "brewery", "brewpub", "taproom",
    "pub", "cocktail", "wine bar", "foodservice", "restaurateur", "food truck",
    "table reservation", "table booking", "allergen", "recipe", "ingredient",
    "cuisine", "diner", "kebab", "ramen", "patisserie", "confectionery"
  ],
  "retail & e-commerce": [
    "shop", "store", "retail", "ecommerce", "e-commerce", "boutique",
    "shopping", "shopkeeper", "merchant", "shopping cart", "checkout",
    "storefront", "webshop", "online store", "dropshipping", "fulfillment",
    "fulfilment", "loyalty programme", "loyalty program", "wishlist",
    "product catalog", "product catalogue", "stockroom", "till", "epos",
    "consumer goods", "direct-to-consumer", "dtc", "indie crafter",
    "etsy", "amazon seller", "ebay", "shopify", "woocommerce", "magento",
    "abandoned cart", "outlet", "showroom", "till receipt", "merchandiser"
  ],
  "health & wellness": [
    "clinic", "doctor", "patient", "therapy", "wellness", "fitness", "gym",
    "health", "healthcare", "physician", "nurse", "nursing", "hospital",
    "medical", "medicine", "telemedicine", "telehealth", "mental-health",
    "mental health", "psychotherapy", "counsellor", "counselor", "counseling",
    "counselling", "physio", "physiotherapy", "rehab", "yoga", "pilates",
    "meditation", "mindfulness", "nutrition", "dietitian", "weight loss",
    "running", "training plan", "workout", "athlete", "marathon", "runner",
    "runners", "jogger", "cyclist", "cycling", "swimmer", "swim",
    "pharma", "pharmacy", "diagnostic", "wearable", "ehr", "emr",
    "hrt", "physical therapy", "chiropractic", "dentist", "dental",
    "pediatric", "paediatric", "geriatric", "elderly care", "homecare"
  ],
  "education": [
    "school", "student", "course", "learning", "tutor", "teacher", "classroom",
    "education", "kindergarten", "preschool", "primary school", "secondary school",
    "high school", "elementary school", "college", "university", "academic",
    "scholar", "lecturer", "professor", "syllabus", "curriculum", "lesson",
    "homework", "exam", "test prep", "edtech", "lms", "moodle", "homeschool",
    "language learning", "vocabulary", "flashcard", "tutoring", "study group",
    "academia", "thesis", "dissertation", "mooc", "bootcamp", "e-learning",
    "online learning", "stem education", "literacy", "numeracy", "phonics",
    "tutorial", "pupil", "schooling", "alumni", "scholarship", "school district"
  ],
  "creative & media": [
    "artist", "designer", "photographer", "studio", "music", "podcast",
    "creator", "filmmaker", "videographer", "illustrator", "illustration",
    "writer", "novelist", "blogger", "vlogger", "youtuber", "streamer",
    "twitch", "tiktok", "instagram creator", "creative agency", "art gallery",
    "exhibition", "theatre", "theater", "stage", "musician", "band", "album",
    "song", "video editing", "audio editing", "audiobook", "newsletter",
    "substack", "comic", "manga", "publishing", "editorial", "journalism",
    "journalist", "magazine", "documentary", "screenplay", "screenwriter",
    "film", "cinema", "broadcasting", "media production", "sound design",
    "vfx", "animation", "animator", "motion graphics", "branding",
    "graphic design", "ux design", "ui design", "creative writing"
  ],
  "professional services": [
    "lawyer", "accountant", "consultant", "agency", "freelancer",
    "law firm", "legal", "attorney", "barrister", "solicitor", "paralegal",
    "consulting", "auditor", "audit firm", "bookkeeping", "bookkeeper", "cpa",
    "advisor", "advisory", "broker", "notary", "translator", "translation",
    "interpreter", "consultancy", "professional services", "billable hours",
    "client portal", "self-employed", "sole proprietor", "tradesperson",
    "tradesman", "contractor", "freelance", "freelance designers",
    "estate planner", "tax preparer", "compliance officer", "executive coach"
  ],
  "small business": [
    "small business", "local business", "shop owner", "smb",
    "mom and pop", "mom-and-pop", "main street", "high street", "smb owner",
    "small-business", "small biz", "main-street", "neighbourhood business",
    "neighborhood business", "family business", "local entrepreneur"
  ],
  "developer tools": [
    "developer", "engineer", "devops", "ci/cd", "continuous integration", "code",
    "programmer", "software engineer", "sysadmin", "infrastructure", "iac",
    "terraform", "kubernetes", "k8s", "docker", "container", "ci pipeline",
    "build system", "build tool", "compiler", "linter", "static analysis",
    "code review", "git workflow", "gitops", "monorepo", "package manager",
    "ide plugin", "language server", "vscode extension", "jetbrains plugin",
    "open source library", "sdk", "cli tool", "command-line tool", "rest client",
    "graphql client", "api client", "scaffolding", "boilerplate generator",
    "test runner", "fuzzer", "debugger", "profiler", "observability", "tracing",
    "log aggregation", "feature flag", "release management", "sre"
  ],
  "finance": [
    "bank", "finance", "invoice", "payment", "fintech",
    "banking", "neobank", "credit", "credit card", "debit card", "loan",
    "mortgage", "underwriting", "insurance", "insurer", "insurtech", "broker",
    "brokerage", "investment", "investing", "stock trading", "trading",
    "portfolio", "wealth management", "asset management", "robo-advisor",
    "robo advisor", "ledger", "general ledger", "expense tracking", "expense report",
    "budgeting", "personal finance", "kyc", "aml", "anti-money laundering",
    "anti money laundering", "psd2", "open banking", "iso 20022", "swift",
    "remittance", "cross-border payment", "fx", "forex", "treasury",
    "actuarial", "pension", "retirement plan", "tax filing", "tax return",
    "credit score", "credit bureau", "stripe", "adyen", "paypal"
  ],
  "real estate": [
    "property", "realtor", "rental", "lease", "house",
    "real estate", "real-estate", "realty", "estate agent", "letting agent",
    "landlord", "tenant", "renter", "homebuyer", "homeowner", "homeseller",
    "mls", "idx", "rightmove", "zoopla", "immobilienscout", "seloger",
    "listing", "listing agent", "open house", "showing", "viewing",
    "property management", "property manager", "strata", "condo",
    "apartment", "flat", "townhouse", "single-family", "duplex", "studio rental",
    "short-term rental", "vacation rental", "airbnb host", "vrbo", "lease agreement",
    "rental agreement", "tenancy", "subletting", "sublease", "escrow", "title insurance",
    "appraisal", "valuation", "square footage", "fair housing", "section 8"
  ],
  "logistics & supply chain": [
    "logistics", "shipping", "freight", "warehouse", "fleet", "dispatch", "courier", "supply chain", "last-mile",
    "third-party logistics", "3pl", "4pl", "carrier", "trucking", "trucker",
    "haulage", "haulier", "drayage", "intermodal", "container shipping",
    "ltl", "less than truckload", "ftl", "full truckload", "tms",
    "transportation management", "wms", "warehouse management",
    "yard management", "dock management", "loading dock", "pick-pack-ship",
    "pick and pack", "delivery driver", "delivery route", "route optimization",
    "route planning", "telematics", "eld", "hours of service",
    "fmcsa", "rolling stock", "railway freight", "ocean freight", "air freight",
    "customs broker", "freight forwarder", "consignment", "bill of lading",
    "demand planning", "inventory management", "stock keeping", "sku tracking",
    "cold chain", "perishables logistics", "reverse logistics"
  ],
  "government & civic": [
    "government", "civic", "public sector", "municipality", "citizen", "gov-tech", "public records",
    "city council", "town council", "municipal", "borough", "county", "state agency",
    "federal agency", "regulatory", "regulator", "policy", "policymaker",
    "constituent", "voter", "voting", "elections", "ballot", "election commission",
    "open data", "freedom of information", "foi", "transparency", "civic tech",
    "e-government", "egov", "digital government", "permitting", "licensing portal",
    "tax authority", "irs", "hmrc", "social services", "benefits agency",
    "benefit claim", "welfare", "public health agency", "department of",
    "ministry of", "civil servant", "public administration", "court system",
    "judicial", "courthouse", "police department", "law enforcement", "ems"
  ],
  "climate & sustainability": [
    "climate", "sustainability", "carbon", "emissions", "renewable", "recycling", "environmental", "esg",
    "co2", "greenhouse gas", "ghg", "carbon footprint", "carbon offset", "carbon credit",
    "net zero", "net-zero", "decarbonisation", "decarbonization", "circular economy",
    "circular", "biodiversity", "rewilding", "conservation", "wildlife",
    "renewables", "solar", "solar panel", "photovoltaic", "wind farm", "wind turbine",
    "geothermal", "tidal energy", "hydropower", "battery storage", "ev charging",
    "electric vehicle", "ev", "energy efficiency", "energy transition",
    "scope 1", "scope 2", "scope 3", "csrd", "sec climate disclosure",
    "iss", "sasb", "tcfd", "lca", "life cycle assessment", "supply-chain emissions",
    "compostable", "biodegradable", "zero waste", "low carbon"
  ],
  "agriculture": [
    "farm", "farmer", "agriculture", "agtech", "crop", "livestock", "harvest", "ranch", "organic",
    "agricultural", "vineyard", "orchard", "greenhouse", "nursery", "smallholder",
    "smallholding", "homestead", "homesteader", "ag-tech", "precision agriculture",
    "precision-ag", "irrigation", "tractor", "combine harvester", "soil",
    "fertiliser", "fertilizer", "pesticide", "herbicide", "agronomist",
    "agronomy", "dairy farm", "dairy", "poultry", "cattle", "sheep", "goat",
    "pig farming", "aquaculture", "fish farm", "beekeeper", "beekeeping",
    "apiary", "permaculture", "regenerative agriculture", "csa", "farmers market",
    "farm-to-table", "agrobusiness", "viticulture", "horticulture"
  ],
  "travel & tourism": [
    "travel", "tourism", "hotel", "booking", "trip", "itinerary", "guesthouse", "hostel", "vacation",
    "tourist", "traveller", "traveler", "backpacker", "vacationer", "holidaymaker",
    "travel agency", "tour operator", "tour guide", "guided tour", "sightseeing",
    "destination", "resort", "spa resort", "boutique hotel", "bed and breakfast",
    "bed-and-breakfast", "b&b", "inn", "lodge", "motel", "campsite", "campground",
    "rv park", "caravan park", "cruise", "cruise line", "cruise ship", "ferry",
    "rail travel", "train ticket", "flight booking", "airline", "frequent flyer",
    "loyalty miles", "expedia", "booking.com", "airbnb stay", "tripadvisor",
    "travel insurance", "visa application", "passport", "tourism board",
    "city break", "weekend getaway", "package holiday", "all-inclusive"
  ],
  "gaming": [
    "gaming", "esports", "multiplayer", "mmo", "gamedev", "indie game", "matchmaking",
    "video game", "videogame", "game developer", "game studio", "game design",
    "game designer", "level design", "level designer", "playtest", "playtesting",
    "twitch streamer", "speedrunner", "speedrun", "fps", "moba", "battle royale",
    "rpg", "jrpg", "rts", "tower defense", "platformer", "roguelike", "metroidvania",
    "couch coop", "co-op", "lan party", "tabletop", "tabletop rpg", "ttrpg",
    "dungeon master", "ttrpg campaign", "board game", "card game", "ccg",
    "trading card game", "deckbuilder", "modding", "game mod", "mod community",
    "discord server", "guild", "clan", "leaderboard", "ranked play", "tournament"
  ],
  "non-profit & community": [
    "nonprofit", "non-profit", "charity", "volunteer", "ngo", "fundraising",
    "non profit", "501c3", "501(c)(3)", "donor", "donation", "donor management",
    "philanthropic", "philanthropy", "foundation grant", "grantmaking", "grant writing",
    "advocacy", "activist", "advocacy group", "social good", "social impact",
    "mutual aid", "community organising", "community organizing", "community group",
    "local chapter", "shelter", "animal shelter", "homeless shelter", "food bank",
    "soup kitchen", "thrift store", "community fridge", "neighbourhood watch",
    "neighborhood watch", "co-op", "cooperative", "mutual society", "credit union",
    "mission-driven", "ethically minded", "social enterprise"
  ],
  "manufacturing": [
    "manufacturing", "factory", "fabrication", "cnc", "3d print", "prototyping",
    "factory floor", "shop floor", "production line", "assembly line", "lean manufacturing",
    "kaizen", "six sigma", "tpm", "oee", "mtbf", "mttr", "scada", "plc",
    "iec 62443", "nis2", "industry 4.0", "industrie 4.0", "smart factory",
    "digital twin", "machine vision", "robotic arm", "industrial robot",
    "co-bot", "cobot", "preventive maintenance", "predictive maintenance",
    "condition monitoring", "vibration sensor", "torque sensor", "manufacturer",
    "fabricator", "machine shop", "tool and die", "metal stamping", "injection moulding",
    "injection molding", "die casting", "extrusion", "welding", "additive manufacturing",
    "subtractive manufacturing", "milling", "lathe", "edm"
  ],
  "HR & recruiting": [
    "recruiting", "hiring", "applicant tracking", "payroll", "onboarding", "human resources",
    "recruiter", "recruitment", "talent acquisition", "talent pipeline", "job board",
    "applicant tracking system", "ats", "resume parser", "cv parser", "cv screening",
    "candidate experience", "headhunter", "headhunting", "executive search",
    "interview scheduling", "background check", "reference check", "offer letter",
    "compensation", "compensation planning", "benefits administration", "401k",
    "retirement benefits", "health benefits", "stock options", "rsu", "esop",
    "performance review", "performance management", "1:1 meeting", "okr", "kpi review",
    "people ops", "peopleops", "hris", "hr information system", "hr business partner",
    "hrbp", "diversity hiring", "diversity equity inclusion", "dei"
  ],
  "events & ticketing": [
    "conference", "meetup", "workshop", "ticketing", "venue",
    "event planner", "event planning", "event production", "event coordinator",
    "wedding planner", "wedding planning", "trade show", "exhibitor", "expo",
    "convention", "summit", "symposium", "panel discussion", "keynote",
    "networking event", "speaker bureau", "event website", "rsvp", "guest list",
    "seating chart", "ticket sales", "box office", "will call", "qr ticket",
    "qr code ticket", "ticket scanner", "festival", "music festival", "film festival",
    "art fair", "craft fair", "pop-up event", "popup event", "fundraiser event",
    "gala", "auction event", "happy hour", "after party"
  ]
};

// Canonical value lists derived from the inference data above. Consumed by
// src/schema.js for runtime validation and by external readers (templates,
// docs) that need to know the closed set of legal values without parsing
// the keyword tables.
export const PRODUCT_TYPE_VALUES = Object.freeze([
  ...PRODUCT_TYPES.map((p) => p.type),
  "product"
]);
export const DOMAIN_VALUES = Object.freeze([
  ...Object.keys(DOMAIN_KEYWORDS),
  "general"
]);

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

/**
 * Build the inferred Context for a raw idea string.
 *
 * @param {string} rawIdea
 * @param {{ now?: string|number|Date }} [opts]
 * @returns {import("./schema.js").Context}
 */
export function buildContext(rawIdea, opts = {}) {
  const idea = String(rawIdea || "").trim();
  if (!idea) throw new Error("Idea is required.");

  const productType = inferProductType(idea);
  const audience = inferAudience(idea);
  const domain = inferDomain(idea);
  const projectName = deriveProjectName(idea, audience, productType);
  const slug = slugify(projectName);
  const generatedAt = opts.now ? new Date(opts.now).toISOString() : new Date().toISOString();

  const ctx = {
    rawIdea: idea,
    projectName,
    slug,
    productType,
    audience,
    domain,
    generatedAt,
    year: new Date(generatedAt).getUTCFullYear()
  };
  assertContext(ctx);
  return ctx;
}
