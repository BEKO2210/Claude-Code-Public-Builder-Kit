// Schema for the inferred Context shape produced by `buildContext()`.
//
// This module is the contract between the inference layer (src/context.js)
// and every template in src/templates/. New templates can rely on the
// fields documented in the Context typedef without reading context.js.
//
// Adding a new productType or domain is a two-step change:
//   1. Add it to PRODUCT_TYPES / DOMAIN_KEYWORDS in src/context.js.
//   2. The exported *_VALUES below are derived automatically — no manual
//      edits to this file are needed unless the Context shape itself grows.

import { PRODUCT_TYPE_VALUES, DOMAIN_VALUES } from "./context.js";

export { PRODUCT_TYPE_VALUES, DOMAIN_VALUES };

/**
 * @typedef {("mobile app"|"web app"|"website"|"platform"|"tool"|"service"|"app"|"product")} ProductType
 *
 * @typedef {(
 *   "food & hospitality"|"retail & e-commerce"|"health & wellness"|"education"|
 *   "creative & media"|"professional services"|"small business"|"developer tools"|
 *   "finance"|"real estate"|"logistics & supply chain"|"government & civic"|
 *   "climate & sustainability"|"agriculture"|"travel & tourism"|"gaming"|
 *   "non-profit & community"|"manufacturing"|"HR & recruiting"|"events & ticketing"|
 *   "general"
 * )} Domain
 *
 * @typedef {object} Context
 * @property {string}      rawIdea     Original idea, trimmed. Non-empty.
 * @property {string}      projectName Inferred display name. Non-empty.
 * @property {string}      slug        URL-safe id derived from projectName. Matches /^[a-z0-9-]+$/.
 * @property {ProductType} productType Inferred product type.
 * @property {string}      audience    Inferred target audience phrase. Non-empty.
 * @property {Domain}      domain      Inferred domain bucket.
 * @property {string}      generatedAt ISO 8601 timestamp.
 * @property {number}      year        UTC year extracted from generatedAt. Integer in [1970, 9999].
 */

const SLUG_RE = /^[a-z0-9-]+$/;

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Validate a Context shape. Returns errors instead of throwing so callers can
 * decide how to react (assert in dev, log in prod, surface in tests, etc.).
 *
 * @param {unknown} ctx
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateContext(ctx) {
  const errors = [];

  if (ctx === null || typeof ctx !== "object") {
    return { ok: false, errors: ["context must be a plain object"] };
  }

  for (const field of ["rawIdea", "projectName", "slug", "audience", "generatedAt"]) {
    if (!isNonEmptyString(ctx[field])) {
      errors.push(`field '${field}' must be a non-empty string`);
    }
  }

  if (typeof ctx.slug === "string" && !SLUG_RE.test(ctx.slug)) {
    errors.push(`field 'slug' must match /^[a-z0-9-]+$/ (got "${ctx.slug}")`);
  }

  if (!PRODUCT_TYPE_VALUES.includes(ctx.productType)) {
    errors.push(`field 'productType' must be one of: ${PRODUCT_TYPE_VALUES.join(", ")} (got ${JSON.stringify(ctx.productType)})`);
  }

  if (!DOMAIN_VALUES.includes(ctx.domain)) {
    errors.push(`field 'domain' must be one of the ${DOMAIN_VALUES.length} known values (got ${JSON.stringify(ctx.domain)})`);
  }

  if (typeof ctx.generatedAt === "string" && Number.isNaN(Date.parse(ctx.generatedAt))) {
    errors.push(`field 'generatedAt' must be an ISO 8601 timestamp (got "${ctx.generatedAt}")`);
  }

  if (!Number.isInteger(ctx.year) || ctx.year < 1970 || ctx.year > 9999) {
    errors.push(`field 'year' must be an integer between 1970 and 9999 (got ${JSON.stringify(ctx.year)})`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Strict variant. Throws on invalid input. Used at the end of `buildContext()`
 * so no invalid context can ever reach a template.
 *
 * @param {unknown} ctx
 * @returns {void}
 */
export function assertContext(ctx) {
  const result = validateContext(ctx);
  if (!result.ok) {
    throw new Error(`Invalid context: ${result.errors.join("; ")}`);
  }
}
