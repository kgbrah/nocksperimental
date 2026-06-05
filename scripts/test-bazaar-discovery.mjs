#!/usr/bin/env node

import { loadTs, assert, assertEqual, run } from "./x402-testkit.mjs";

run("test-bazaar-discovery", async () => {
  const { createWellKnownRegistryManifest, createRegistryManifest } = loadTs("src/lib/registry-manifest.ts");
  const { createOpenApiSpec } = loadTs("src/lib/openapi-spec.ts");

  const wellKnown = createWellKnownRegistryManifest();
  assert(wellKnown.capabilities.includes("verified-bazaar"), "well-known advertises verified-bazaar capability");
  assertEqual(wellKnown.links.bazaar, "https://nocksperimental.com/api/bazaar", "well-known bazaar link");

  const registry = createRegistryManifest();
  assert(
    registry.endpoints.some((endpoint) => endpoint.id === "bazaar-directory" && endpoint.path === "/api/bazaar"),
    "registry lists the bazaar endpoint"
  );

  const spec = createOpenApiSpec();
  assertEqual(spec.paths["/api/bazaar"]?.get?.summary, "Verified Bazaar directory", "openapi bazaar directory path");
  assertEqual(
    spec.paths["/api/bazaar/{listingId}"]?.get?.summary,
    "Verified Bazaar listing detail",
    "openapi bazaar listing detail path"
  );
});
