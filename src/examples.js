// Single source of truth for the worked examples shipped with the kit.
// Consumed by:
//   - scripts/build-example.js  (writes examples/<id>/ to disk)
//   - server.js                 (serves /api/examples and /api/examples/:id)
//   - tests/generator.test.js   (consistency + API coverage)
//
// Each entry must have a stable `id` (used as folder name and URL segment),
// a deterministic `now` so generated content is byte-stable, and short,
// honest `title` and `description` strings for the UI gallery.

export const EXAMPLES = [
  {
    id: "small-business-website-system",
    title: "Small Business Website System",
    description:
      "A focused website system that local shops, cafes, and service businesses can run themselves — get found, take bookings, update hours, no developer required.",
    idea: "A website system for small local businesses",
    now: "2026-04-29T00:00:00Z"
  },
  {
    id: "smb-accounting-saas-dashboard",
    title: "SMB Accounting SaaS Dashboard",
    description:
      "A SaaS dashboard built for accountants serving small business clients — month-end status at a glance, client requests in one place, and a clear answer to 'what do I work on next?'.",
    idea: "A SaaS dashboard for small business accountants",
    now: "2026-04-29T00:00:00Z"
  }
];

const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/;

export function findExample(id) {
  return EXAMPLES.find((e) => e.id === id) || null;
}

export function isSafeExampleId(id) {
  return typeof id === "string" && SAFE_ID.test(id) && id.length <= 80;
}
