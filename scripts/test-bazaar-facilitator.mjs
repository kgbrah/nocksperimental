#!/usr/bin/env node

import process from "node:process";
import { loadTs, assert, assertEqual, run } from "./x402-testkit.mjs";

run("test-bazaar-facilitator", async () => {
  const { buildBazaarDirectory } = loadTs("src/lib/bazaar/aggregate.ts");
  const { defaultBazaarFilters } = loadTs("src/lib/bazaar/types.ts");

  const previous = process.env.NOCKS_X402_FACILITATOR_URL;
  const originalFetch = global.fetch;

  try {
    process.env.NOCKS_X402_FACILITATOR_URL = "https://facilitator.example/";

    global.fetch = async (input) => {
      assert(String(input).endsWith("/discovery/resources"), "queries facilitator /discovery/resources");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          resources: [
            {
              resource: "https://svc.example/widget",
              type: "http",
              description: "Widget API",
              accepts: [
                { network: "nockchain:fakenet", scheme: "exact", maxAmountRequired: "2500", payTo: "PAYEE" }
              ]
            }
          ]
        })
      };
    };

    const directory = await buildBazaarDirectory(defaultBazaarFilters());
    assertEqual(directory.facilitator.configured, true, "facilitator configured");
    assertEqual(directory.facilitator.reachable, true, "facilitator reachable");
    const facilitatorListings = directory.listings.filter((listing) => listing.source === "facilitator");
    assertEqual(facilitatorListings.length, 1, "one facilitator listing");
    assert(facilitatorListings[0].payable, "facilitator listing is payable");
    assertEqual(facilitatorListings[0].payment.priceNicks, "2500", "facilitator price from accepts");
    assertEqual(facilitatorListings[0].payment.payTo, "PAYEE", "facilitator payTo from accepts");

    global.fetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    const degraded = await buildBazaarDirectory(defaultBazaarFilters());
    assertEqual(degraded.facilitator.configured, true, "still configured when unreachable");
    assertEqual(degraded.facilitator.reachable, false, "unreachable when fetch throws");
    assert(
      degraded.listings.every((listing) => listing.source !== "facilitator"),
      "no facilitator listings when unreachable (graceful)"
    );
  } finally {
    global.fetch = originalFetch;
    if (previous === undefined) {
      delete process.env.NOCKS_X402_FACILITATOR_URL;
    } else {
      process.env.NOCKS_X402_FACILITATOR_URL = previous;
    }
  }
});
