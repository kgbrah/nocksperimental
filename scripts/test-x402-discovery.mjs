#!/usr/bin/env node

import { loadTs, assert, assertEqual, run } from "./x402-testkit.mjs";

run("test-x402-discovery", async () => {
  const { createWellKnownRegistryManifest } = loadTs("src/lib/registry-manifest.ts");
  const { createOpenApiSpec } = loadTs("src/lib/openapi-spec.ts");
  const { DEFAULT_PAY_TO } = loadTs("src/lib/x402/config.ts");

  const wellKnown = createWellKnownRegistryManifest();
  assert(wellKnown.x402, "well-known advertises an x402 block");
  assertEqual(wellKnown.x402.payTo, DEFAULT_PAY_TO, "x402 payTo is the project wallet by default");
  assert(wellKnown.x402.network.startsWith("nockchain:"), "x402 network is a nockchain CAIP-2 id");
  assertEqual(wellKnown.x402.scheme, "exact", "x402 scheme");
  assertEqual(wellKnown.x402.paymentRequestHeader, "PAYMENT-SIGNATURE", "advertises the request header");
  assert(Array.isArray(wellKnown.x402.resources) && wellKnown.x402.resources.length >= 6, "lists metered resources");
  for (const resource of wellKnown.x402.resources) {
    assert(resource.url.startsWith("https://nocksperimental.com/api/"), `resource url: ${resource.slug}`);
    assert(BigInt(resource.priceNicks) > 0n, `resource price positive: ${resource.slug}`);
  }
  assert(wellKnown.capabilities.includes("x402-metered-trust-api"), "advertises the x402 capability");

  const spec = createOpenApiSpec();
  const meteredPaths = [
    "/api/trust/badges/verify",
    "/api/reports/generated/verify",
    "/api/fakenet/evidence/verify",
    "/api/workspaces/evidence/verify",
    "/api/trust/compute-benchmarks/{profileId}",
    "/api/trust/token-compatibility/{reportId}"
  ];
  for (const meteredPath of meteredPaths) {
    assert(spec.paths[meteredPath]?.get?.responses?.["402"], `402 advertised on ${meteredPath}`);
  }
});
