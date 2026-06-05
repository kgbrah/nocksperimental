#!/usr/bin/env node

import { loadTs, assert, assertEqual, run } from "./x402-testkit.mjs";

run("test-x402-meter", async () => {
  const { meterRequest } = loadTs("src/lib/x402/meter.ts");
  const { resolveX402Config } = loadTs("src/lib/x402/config.ts");
  const { meteredResourceBySlug } = loadTs("src/lib/x402/pricing.ts");
  const store = loadTs("src/lib/x402/receipt-store.ts");
  const allowance = loadTs("src/lib/x402/allowance.ts");

  const resource = meteredResourceBySlug("badge-verify");
  const NOW = new Date("2030-01-01T00:00:00Z");
  const url = "https://nocksperimental.com/api/trust/badges/verify?badgeId=x";

  const reqWith = (headers = {}) => new Request(url, { headers: { "cf-connecting-ip": "1.2.3.4", ...headers } });

  const noAllowance = resolveX402Config({ NOCKS_X402_FREE_ALLOWANCE_PER_DAY: "0" });
  const payTo = noAllowance.payTo;

  const paymentHeader = (nonce, overrides = {}) => {
    const payload = {
      x402Version: 2,
      scheme: "exact",
      network: "nockchain:fakenet",
      payload: {
        signature: { pubkey: "PUB", schnorr: { chal: [], sig: [] } },
        authorization: {
          from: "PUB",
          to: payTo,
          value: "1000",
          fee: "10",
          nonce,
          validAfter: 0,
          validBefore: 9999999999,
          notes: [],
          changeAddress: "PUB",
          ...overrides
        }
      }
    };
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  };

  store.__resetReceiptsForTest();
  allowance.__resetAllowanceForTest();

  // Unpaid + no allowance -> 402 with a well-formed PaymentRequired.
  const unpaid = await meterRequest(reqWith(), resource, noAllowance, NOW);
  assertEqual(unpaid.kind, "blocked", "unpaid is blocked");
  assertEqual(unpaid.response.status, 402, "unpaid returns 402");
  const body = await unpaid.response.json();
  assertEqual(body.x402Version, 2, "402 x402Version");
  assertEqual(body.error, "Payment required", "402 error string");
  assertEqual(body.accepts[0].payTo, payTo, "402 payTo is the project wallet");
  assertEqual(body.accepts[0].maxAmountRequired, "1000", "402 price");
  assertEqual(body.accepts[0].asset, "NOCK", "402 asset");
  assert(
    body.accepts[0].resource.startsWith("https://nocksperimental.com/api/trust/badges/verify"),
    "402 resource url"
  );
  assert(body.extensions && body.extensions.bazaar, "402 advertises a bazaar block");
  assertEqual(unpaid.response.headers.get("cache-control"), "no-store", "402 is not cached");

  // Valid payment -> granted, stub mode, receipt header.
  const paid = await meterRequest(reqWith({ "payment-signature": paymentHeader("n-1") }), resource, noAllowance, NOW);
  assertEqual(paid.kind, "granted", "valid payment granted");
  assertEqual(paid.grant.mode, "stub", "granted stub mode");
  assert(paid.grant.responseHeaders["X-PAYMENT-RESPONSE"], "granted attaches X-PAYMENT-RESPONSE");

  // Replay of the same nonce -> 402 replayed_nonce.
  const replay = await meterRequest(reqWith({ "payment-signature": paymentHeader("n-1") }), resource, noAllowance, NOW);
  assertEqual(replay.kind, "blocked", "replay blocked");
  assertEqual(replay.response.status, 402, "replay 402");
  assertEqual(replay.response.headers.get("x-payment-error"), "replayed_nonce", "replay error code");

  // Undecodable payment header -> 402 invalid_payload.
  const bad = await meterRequest(reqWith({ "payment-signature": "%%%not-a-payload%%%" }), resource, noAllowance, NOW);
  assertEqual(bad.response.status, 402, "bad payload 402");
  assertEqual(bad.response.headers.get("x-payment-error"), "invalid_payload", "bad payload code");

  // Free allowance: first two unpaid pass, third is charged (402).
  store.__resetReceiptsForTest();
  allowance.__resetAllowanceForTest();
  const twoFree = resolveX402Config({ NOCKS_X402_FREE_ALLOWANCE_PER_DAY: "2" });
  const a1 = await meterRequest(reqWith(), resource, twoFree, NOW);
  const a2 = await meterRequest(reqWith(), resource, twoFree, NOW);
  const a3 = await meterRequest(reqWith(), resource, twoFree, NOW);
  assertEqual(a1.kind, "granted", "allowance call 1 granted");
  assertEqual(a1.grant.mode, "free-allowance", "allowance mode");
  assertEqual(a2.kind, "granted", "allowance call 2 granted");
  assertEqual(a3.kind, "blocked", "allowance exhausted -> blocked");
  assertEqual(a3.response.status, 402, "allowance exhausted 402");
});
