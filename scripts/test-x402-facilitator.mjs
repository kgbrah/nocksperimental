#!/usr/bin/env node

import { loadTs, assert, assertEqual, run } from "./x402-testkit.mjs";

run("test-x402-facilitator", async () => {
  const { selectVerifier, FacilitatorUnreachableError } = loadTs("src/lib/x402/verifier.ts");
  const { resolveX402Config } = loadTs("src/lib/x402/config.ts");

  const config = resolveX402Config({ NOCKS_X402_FACILITATOR_URL: "https://facilitator.example/" });
  const verifier = selectVerifier(config);
  assertEqual(verifier.mode, "facilitator", "facilitator url selects facilitator verifier");

  const requirements = {
    scheme: "exact",
    network: "nockchain:fakenet",
    maxAmountRequired: "1000",
    resource: "https://nocksperimental.com/api/trust/badges/verify",
    asset: "NOCK",
    payTo: config.payTo,
    maxTimeoutSeconds: 120
  };
  const payload = {
    x402Version: 2,
    scheme: "exact",
    network: "nockchain:fakenet",
    payload: {
      signature: { pubkey: "PUB", schnorr: { chal: [], sig: [] } },
      authorization: {
        from: "PUB",
        to: config.payTo,
        value: "1000",
        fee: "10",
        nonce: "nf-1",
        validAfter: 0,
        validBefore: 9999999999,
        notes: [],
        changeAddress: "PUB"
      }
    }
  };

  const originalFetch = global.fetch;
  try {
    global.fetch = async (input, init) => {
      assert(String(input) === "https://facilitator.example/verify", "calls facilitator /verify with trimmed slash");
      const sent = JSON.parse(init.body);
      assert(sent.payload && sent.requirements, "sends payload + requirements");
      return { ok: true, status: 200, json: async () => ({ valid: true }) };
    };
    const ok = await verifier.verify(payload, requirements);
    assert(ok.valid, "facilitator valid accepted");
    assertEqual(ok.mode, "facilitator", "outcome mode facilitator");
    assertEqual(ok.payer, "PUB", "payer passthrough");

    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ valid: false, error: { code: "bad_signature", message: "nope" } })
    });
    const rejected = await verifier.verify(payload, requirements);
    assert(!rejected.valid, "facilitator rejection surfaces");
    assertEqual(rejected.code, "bad_signature", "facilitator error code passthrough");

    global.fetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    await assertThrowsUnreachable(verifier, payload, requirements, FacilitatorUnreachableError, "network error");

    global.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
    await assertThrowsUnreachable(verifier, payload, requirements, FacilitatorUnreachableError, "5xx");
  } finally {
    global.fetch = originalFetch;
  }
});

async function assertThrowsUnreachable(verifier, payload, requirements, ErrorType, label) {
  let threw = false;
  try {
    await verifier.verify(payload, requirements);
  } catch (error) {
    threw = error instanceof ErrorType;
  }
  if (!threw) {
    throw new Error(`expected FacilitatorUnreachableError for ${label}`);
  }
}
