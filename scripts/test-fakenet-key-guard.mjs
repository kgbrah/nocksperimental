#!/usr/bin/env node
// Correctness gate for the fakenet-key trojan-horse guard (src/lib/fakenet-keys.ts
// + its wiring in src/lib/trust-badge-verifier.ts). The published fakenet key
// also works on livenet, so a cert that claims a LIVENET network while bound to
// that key must never verify — while honest fakenet/testnet certs are unaffected.

import process from "node:process";
import { createTsLoader } from "./lib/load-ts-module.mjs";

const REPO = process.cwd();
const { loadTS } = createTsLoader(REPO);
let pass = 0;
const ok = (c, m) => {
  if (!c) throw new Error("FAIL: " + m);
  console.log("  ✓ " + m);
  pass += 1;
};

const FAKENET = "9yPePjfWAdUnzaQKyxcRXKRa5PpUzKKEwtpECBZsUYt9Jd7egSDEWoV";

try {
  main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}

function main() {
  const F = loadTS("src/lib/fakenet-keys.ts");

  console.log("1. key + network recognition");
  ok(F.isWellKnownFakenetKey(FAKENET), "recognizes the canonical fakenet PKH");
  ok(F.isWellKnownFakenetKey(`  ${FAKENET}  `), "trims surrounding whitespace");
  ok(!F.isWellKnownFakenetKey("9yPePjfWdifferentkeyentirely000000000000000000"), "a different key is not flagged");
  ok(!F.isWellKnownFakenetKey(null) && !F.isWellKnownFakenetKey(undefined) && !F.isWellKnownFakenetKey(123), "non-strings are not keys");
  ok(F.isLivenetNetwork("nockchain") && F.isLivenetNetwork("base"), "nockchain/base are livenet");
  ok(!F.isLivenetNetwork("nockchain-fakenet") && !F.isLivenetNetwork("base-sepolia"), "*-fakenet/*-sepolia are not livenet");

  console.log("2. deep scan");
  ok(F.containsWellKnownFakenetKey({ a: { b: [{ owner: FAKENET }] } }), "finds the key nested in arrays/objects");
  ok(!F.containsWellKnownFakenetKey({ a: { b: ["clean", 123, null] } }), "clean evidence is not flagged");
  ok(!F.containsWellKnownFakenetKey(null) && !F.containsWellKnownFakenetKey(undefined), "null/undefined evidence is clean");

  console.log("3. the livenet violation guard");
  ok(F.fakenetKeyOnLivenetViolation({ network: "nockchain", evidence: { signer: FAKENET } }),
    "livenet network + fakenet key => violation (must reject)");
  ok(!F.fakenetKeyOnLivenetViolation({ network: "nockchain-fakenet", evidence: { signer: FAKENET } }),
    "fakenet network + fakenet key => OK (honest test evidence)");
  ok(!F.fakenetKeyOnLivenetViolation({ network: "nockchain", evidence: { signer: "someOtherLivenetKey" } }),
    "livenet network + non-fakenet key => OK");
  ok(!F.fakenetKeyOnLivenetViolation({ network: undefined, evidence: { signer: FAKENET } }),
    "no network => no violation");

  console.log("4. integration: verifier surfaces + does not disturb honest certs");
  const V = loadTS("src/lib/trust-badge-verifier.ts");
  // The committed demo cert is base-sepolia (testnet) with no fakenet key, so the
  // new guard must pass for it (the cert's prior verification outcome is unchanged).
  const res = V.verifyTrustBadgeIssuance({ badgeId: "badge-chain-anchored-base-redeem-001" });
  ok(res.checks.notFakenetSignedLivenet === true, "existing testnet cert passes the fakenet-livenet guard");
  ok("notFakenetSignedLivenet" in res.checks, "the guard is surfaced as a verifier check");

  console.log(`\ntest-fakenet-key-guard: all ${pass} assertions passed`);
}
