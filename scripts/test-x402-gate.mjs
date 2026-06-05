#!/usr/bin/env node

import process from "node:process";
import { loadTs, assert, assertEqual, run } from "./x402-testkit.mjs";

run("test-x402-gate", async () => {
  const { guard } = loadTs("src/lib/x402/meter.ts");
  const { DEFAULT_PAY_TO } = loadTs("src/lib/x402/config.ts");
  const store = loadTs("src/lib/x402/receipt-store.ts");
  const allowance = loadTs("src/lib/x402/allowance.ts");

  const url = "https://nocksperimental.com/api/trust/badges/verify?badgeId=x";
  const reqWith = (headers = {}) => new Request(url, { headers: { "cf-connecting-ip": "9.9.9.9", ...headers } });
  const paymentHeader = (nonce) => {
    const payload = {
      x402Version: 2,
      scheme: "exact",
      network: "nockchain:fakenet",
      payload: {
        signature: { pubkey: "PUB", schnorr: { chal: [], sig: [] } },
        authorization: {
          from: "PUB",
          to: DEFAULT_PAY_TO,
          value: "1000",
          fee: "10",
          nonce,
          validAfter: 0,
          validBefore: 9999999999,
          notes: [],
          changeAddress: "PUB"
        }
      }
    };
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  };

  const restore = (key, value) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  };

  const prevEnabled = process.env.NOCKS_X402_ENABLED;
  const prevAllowance = process.env.NOCKS_X402_FREE_ALLOWANCE_PER_DAY;

  try {
    delete process.env.NOCKS_X402_ENABLED;
    const disabled = await guard(reqWith(), "badge-verify");
    assertEqual(disabled.blocked, false, "metering off -> not blocked");
    assertEqual(Object.keys(disabled.headers).length, 0, "metering off -> no headers");

    process.env.NOCKS_X402_ENABLED = "1";
    process.env.NOCKS_X402_FREE_ALLOWANCE_PER_DAY = "0";
    store.__resetReceiptsForTest();
    allowance.__resetAllowanceForTest();

    const unpaid = await guard(reqWith(), "badge-verify");
    assertEqual(unpaid.blocked, true, "enabled + unpaid -> blocked");
    assertEqual(unpaid.response.status, 402, "enabled + unpaid -> 402");

    const paid = await guard(reqWith({ "payment-signature": paymentHeader("gate-1") }), "badge-verify");
    assertEqual(paid.blocked, false, "enabled + paid -> not blocked");
    assert(paid.headers["X-PAYMENT-RESPONSE"], "enabled + paid -> receipt header");

    const unknown = await guard(reqWith(), "no-such-slug");
    assertEqual(unknown.blocked, false, "unknown slug -> passthrough");
  } finally {
    restore("NOCKS_X402_ENABLED", prevEnabled);
    restore("NOCKS_X402_FREE_ALLOWANCE_PER_DAY", prevAllowance);
  }
});
