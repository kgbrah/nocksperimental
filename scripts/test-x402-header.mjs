#!/usr/bin/env node

import { loadTs, assertEqual, run } from "./x402-testkit.mjs";

run("test-x402-header", async () => {
  const { decodePaymentPayload, encodePaymentResponseHeader, readPaymentHeader } = loadTs(
    "src/lib/x402/header.ts"
  );

  const payload = {
    x402Version: 2,
    scheme: "exact",
    network: "nockchain:fakenet",
    payload: {
      signature: { pubkey: "PUB", schnorr: { chal: ["1"], sig: ["2"] } },
      authorization: {
        from: "F",
        to: "T",
        value: "65536",
        fee: "10",
        nonce: "N1",
        validAfter: 1,
        validBefore: 9999999999,
        notes: [],
        changeAddress: "F"
      }
    }
  };
  const json = JSON.stringify(payload);

  const fromRaw = decodePaymentPayload(json);
  assertEqual(fromRaw?.payload?.authorization?.to, "T", "raw json decodes");
  assertEqual(fromRaw?.x402Version, 2, "raw json version preserved");

  const base64 = Buffer.from(json, "utf8").toString("base64");
  const fromBase64 = decodePaymentPayload(base64);
  assertEqual(fromBase64?.payload?.authorization?.nonce, "N1", "base64 json decodes");

  assertEqual(decodePaymentPayload("%%% not json %%%"), null, "garbage decodes to null");
  assertEqual(decodePaymentPayload(null), null, "null decodes to null");

  const encoded = encodePaymentResponseHeader({ success: true, mode: "stub" });
  const roundTripped = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  assertEqual(roundTripped.mode, "stub", "response header round-trips");

  assertEqual(readPaymentHeader(new Headers({ "payment-signature": "sig" })), "sig", "reads PAYMENT-SIGNATURE");
  assertEqual(readPaymentHeader(new Headers({ "x-payment": "xp" })), "xp", "reads X-PAYMENT alias");
  assertEqual(readPaymentHeader(new Headers()), null, "no header -> null");
});
