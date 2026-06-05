#!/usr/bin/env node

import { loadTs, assert, assertEqual, run } from "./x402-testkit.mjs";

run("test-bazaar-api", async () => {
  const bazaarRoute = loadTs("src/app/api/bazaar/route.ts");
  const detailRoute = loadTs("src/app/api/bazaar/[listingId]/route.ts");

  const indexResponse = await bazaarRoute.GET(new Request("https://nocksperimental.com/api/bazaar"));
  assertEqual(indexResponse.status, 200, "index status");
  const index = await indexResponse.json();
  assertEqual(index.version, "v0", "index version");
  assert(index.listings.length >= 6, "index lists services");
  assert(typeof index.counts.verified === "number", "index has verified count");
  assert(typeof index.counts.payable === "number", "index has payable count");

  const verifiedResponse = await bazaarRoute.GET(
    new Request("https://nocksperimental.com/api/bazaar?verifiedOnly=true")
  );
  const verified = await verifiedResponse.json();
  assert(verified.listings.every((listing) => listing.trust.verified), "verifiedOnly query filter applied");

  const payableResponse = await bazaarRoute.GET(
    new Request("https://nocksperimental.com/api/bazaar?payableOnly=true&kind=verification-endpoint")
  );
  const payable = await payableResponse.json();
  assert(payable.listings.length >= 6, "payable verification endpoints listed");
  assert(payable.listings.every((listing) => listing.payable && listing.kind === "verification-endpoint"), "combined filters applied");

  const targetId = index.listings[0].id;
  const detailResponse = await detailRoute.GET(
    new Request(`https://nocksperimental.com/api/bazaar/${encodeURIComponent(targetId)}`),
    { params: Promise.resolve({ listingId: encodeURIComponent(targetId) }) }
  );
  assertEqual(detailResponse.status, 200, "detail status");
  const detail = await detailResponse.json();
  assertEqual(detail.listing.id, targetId, "detail returns the listing");

  const missingResponse = await detailRoute.GET(
    new Request("https://nocksperimental.com/api/bazaar/does-not-exist"),
    { params: Promise.resolve({ listingId: "does-not-exist" }) }
  );
  assertEqual(missingResponse.status, 404, "missing listing 404");
});
