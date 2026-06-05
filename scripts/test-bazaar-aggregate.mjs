#!/usr/bin/env node

import { loadTs, assert, assertEqual, run } from "./x402-testkit.mjs";

run("test-bazaar-aggregate", async () => {
  const { buildBazaarDirectory, parseBazaarFilters, findBazaarListing } = loadTs("src/lib/bazaar/aggregate.ts");
  const { defaultBazaarFilters } = loadTs("src/lib/bazaar/types.ts");

  const directory = await buildBazaarDirectory(defaultBazaarFilters());
  assertEqual(directory.version, "v0", "version");
  assert(directory.listings.length >= 6, "directory has listings");

  const own = directory.listings.filter((listing) => listing.source === "nocksperimental");
  assert(own.length >= 6, "lists own metered resources");
  assert(
    own.every((listing) => listing.payable && listing.payment && listing.payment.payTo),
    "own resources are payable with a payTo"
  );

  assert(directory.listings.some((listing) => listing.kind === "solver"), "lists solvers");
  assert(directory.listings.some((listing) => listing.kind === "compute-provider"), "lists compute providers");
  assert(directory.listings.some((listing) => listing.kind === "token-issuer"), "lists token issuers");

  assertEqual(
    directory.counts.verified,
    directory.listings.filter((listing) => listing.trust.verified).length,
    "verified count matches listings"
  );
  assert(directory.counts.verified >= 1, "at least one verified listing");
  assertEqual(directory.facilitator.configured, false, "no facilitator configured by default");

  const verifiedOnly = await buildBazaarDirectory({ ...defaultBazaarFilters(), verifiedOnly: true });
  assert(verifiedOnly.listings.every((listing) => listing.trust.verified), "verifiedOnly keeps only verified");

  const payableOnly = await buildBazaarDirectory({ ...defaultBazaarFilters(), payableOnly: true });
  assert(payableOnly.listings.every((listing) => listing.payable), "payableOnly keeps only payable");
  assert(payableOnly.listings.length >= 6, "payable set includes own metered resources");

  const solvers = await buildBazaarDirectory({ ...defaultBazaarFilters(), kind: "solver" });
  assert(solvers.listings.length >= 1 && solvers.listings.every((listing) => listing.kind === "solver"), "kind filter");

  const scored = await buildBazaarDirectory({ ...defaultBazaarFilters(), minScore: 1 });
  assert(
    scored.listings.every((listing) => listing.trust.score != null && listing.trust.score >= 1),
    "minScore keeps only scored listings"
  );

  const parsed = parseBazaarFilters(
    new URLSearchParams("verifiedOnly=true&kind=solver&minScore=80&network=nockchain:fakenet&payableOnly=1")
  );
  assertEqual(parsed.verifiedOnly, true, "parse verifiedOnly");
  assertEqual(parsed.kind, "solver", "parse kind");
  assertEqual(parsed.minScore, 80, "parse minScore");
  assertEqual(parsed.network, "nockchain:fakenet", "parse network");
  assertEqual(parsed.payableOnly, true, "parse payableOnly");
  assertEqual(parseBazaarFilters(new URLSearchParams("kind=bogus")).kind, null, "invalid kind -> null");

  const first = directory.listings[0];
  const found = await findBazaarListing(first.id);
  assertEqual(found?.id, first.id, "find listing by id");
  assertEqual(await findBazaarListing("does-not-exist"), null, "missing id -> null");
});
