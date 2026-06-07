#!/usr/bin/env node

import { loadTs, assert, assertEqual, run } from "./x402-testkit.mjs";

run("test-x402-verifier-stub", async () => {
  const { selectVerifier } = loadTs("src/lib/x402/verifier.ts");
  const { resolveX402Config } = loadTs("src/lib/x402/config.ts");
  const store = loadTs("src/lib/x402/receipt-store.ts");
  store.__resetReceiptsForTest();

  const config = resolveX402Config({});
  const verifier = selectVerifier(config);
  assertEqual(verifier.mode, "stub", "selects stub when no facilitator url");

  const NOW = new Date("2030-01-01T00:00:00Z");
  const payTo = config.payTo;
  const requirements = {
    scheme: "exact",
    network: "nockchain:fakenet",
    maxAmountRequired: "1000",
    resource: "https://nocksperimental.com/api/trust/badges/verify",
    asset: "NOCK",
    payTo,
    maxTimeoutSeconds: 120
  };

  const mkPayload = (authOverrides = {}, topOverrides = {}) => ({
    x402Version: 2,
    scheme: "exact",
    network: "nockchain:fakenet",
    payload: {
      signature: { pubkey: "PUBKEY", schnorr: { chal: [], sig: [] } },
      authorization: {
        from: "PUBKEY",
        to: payTo,
        value: "1000",
        fee: "10",
        nonce: "nonce-default",
        validAfter: 0,
        validBefore: 9999999999,
        notes: [],
        changeAddress: "PUBKEY",
        ...authOverrides
      }
    },
    ...topOverrides
  });

  const ok = await verifier.verify(mkPayload({ nonce: "n-ok" }), requirements, NOW);
  assert(ok.valid, "valid payment accepted");
  assertEqual(ok.mode, "stub", "valid outcome is stub mode");
  assertEqual(ok.payer, "PUBKEY", "payer taken from pubkey");
  assertEqual(ok.amountNicks, "1000", "amount echoed");

  const replay = await verifier.verify(mkPayload({ nonce: "n-ok" }), requirements, NOW);
  assert(!replay.valid, "replayed nonce rejected");
  assertEqual(replay.code, "replayed_nonce", "replay code");

  const overpay = await verifier.verify(mkPayload({ nonce: "n-over", value: "5000" }), requirements, NOW);
  assert(overpay.valid, "paying more than required is accepted");

  const cases = [
    [{ nonce: "n1", to: "WRONGPKH" }, {}, "recipient_mismatch"],
    [{ nonce: "n2", value: "500" }, {}, "insufficient_amount"],
    [{ nonce: "n3", value: "not-a-number" }, {}, "invalid_amount"],
    [{ nonce: "n4", validBefore: 1000 }, {}, "expired"],
    [{ nonce: "n5", validAfter: 99999999999 }, {}, "not_yet_valid"],
    // Untrusted JSON may carry string timestamps; they must still be range-checked,
    // not skipped (a string previously bypassed the `typeof === "number"` guard).
    [{ nonce: "n4s", validBefore: "1000" }, {}, "expired"],
    [{ nonce: "n5s", validAfter: "99999999999" }, {}, "not_yet_valid"],
    // A missing/garbage expiry must fail CLOSED, not be treated as "no expiry".
    [{ nonce: "n10", validBefore: null }, {}, "invalid_time"],
    [{ nonce: "n11", validBefore: "not-a-time" }, {}, "invalid_time"],
    [{ nonce: "" }, {}, "invalid_nonce"],
    [{ nonce: "n7" }, { x402Version: 1 }, "invalid_version"],
    [{ nonce: "n8" }, { scheme: "upto" }, "scheme_mismatch"],
    [{ nonce: "n9" }, { network: "nockchain:mainnet" }, "network_mismatch"]
  ];

  for (const [authOverrides, topOverrides, expectedCode] of cases) {
    const outcome = await verifier.verify(mkPayload(authOverrides, topOverrides), requirements, NOW);
    assert(!outcome.valid, `rejected: ${expectedCode}`);
    assertEqual(outcome.code, expectedCode, `code for ${expectedCode}`);
  }

  const noAuth = await verifier.verify(
    { x402Version: 2, scheme: "exact", network: "nockchain:fakenet", payload: {} },
    requirements,
    NOW
  );
  assertEqual(noAuth.code, "invalid_payload", "missing authorization rejected");
});
