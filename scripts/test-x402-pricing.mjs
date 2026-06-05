#!/usr/bin/env node

import { loadTs, assert, assertEqual, run } from "./x402-testkit.mjs";

run("test-x402-pricing", async () => {
  const { METERED_RESOURCES, meteredResourceBySlug } = loadTs("src/lib/x402/pricing.ts");

  assert(Array.isArray(METERED_RESOURCES), "metered resources is an array");
  assert(METERED_RESOURCES.length >= 6, "ships at least six metered resources");

  const slugs = new Set();
  for (const resource of METERED_RESOURCES) {
    assert(typeof resource.slug === "string" && resource.slug.length > 0, "slug present");
    assert(!slugs.has(resource.slug), `slug is unique: ${resource.slug}`);
    slugs.add(resource.slug);
    assert(resource.pathPattern.startsWith("/api/"), `path under /api: ${resource.pathPattern}`);
    assert(BigInt(resource.priceNicks) > 0n, `price is positive: ${resource.slug}`);
    assertEqual(resource.mimeType, "application/json", `json mime: ${resource.slug}`);
    assertEqual(resource.method, "GET", `GET method: ${resource.slug}`);
  }

  assertEqual(
    meteredResourceBySlug("badge-verify")?.pathPattern,
    "/api/trust/badges/verify",
    "lookup by slug resolves the path"
  );
  assertEqual(meteredResourceBySlug("does-not-exist"), undefined, "unknown slug resolves undefined");
});
