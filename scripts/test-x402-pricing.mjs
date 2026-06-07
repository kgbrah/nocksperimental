#!/usr/bin/env node

import { loadTs, assert, assertEqual, run } from "./x402-testkit.mjs";

run("test-x402-pricing", async () => {
  const { METERED_RESOURCES, meteredResourceBySlug } = loadTs("src/lib/x402/pricing.ts");

  assert(Array.isArray(METERED_RESOURCES), "metered resources is an array");
  assert(METERED_RESOURCES.length >= 8, "ships at least eight metered resources");

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
  assertEqual(
    meteredResourceBySlug("invariant-pack-report-verify")?.pathPattern,
    "/api/invariants/packs/verify",
    "invariant pack verify resource path"
  );
  assertEqual(
    meteredResourceBySlug("invariant-pack-report-verify")?.priceNicks,
    "1000",
    "invariant pack verify is verification-tier priced"
  );
  assertEqual(
    meteredResourceBySlug("drift-status-attestation")?.pathPattern,
    "/api/nockchain/drift-status/attestation",
    "drift-status attestation resource path"
  );
  assertEqual(
    meteredResourceBySlug("drift-status-attestation")?.priceNicks,
    "10000",
    "drift-status attestation is premium-tier priced"
  );
  assertEqual(meteredResourceBySlug("does-not-exist"), undefined, "unknown slug resolves undefined");
});
