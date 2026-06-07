#!/usr/bin/env node

import { loadTs, assert, assertEqual, run } from "./x402-testkit.mjs";

run("test-x402-config", async () => {
  const { resolveX402Config, DEFAULT_PAY_TO, DEFAULT_NETWORK, isSafeFacilitatorUrl } = loadTs(
    "src/lib/x402/config.ts"
  );

  const defaults = resolveX402Config({});
  assertEqual(defaults.payTo, DEFAULT_PAY_TO, "default payTo is the project wallet");
  assertEqual(defaults.network, DEFAULT_NETWORK, "default network is fakenet");
  assertEqual(defaults.verifierMode, "stub", "no facilitator url -> stub mode");
  assertEqual(defaults.enabled, false, "metering is off by default (dark launch)");
  assertEqual(defaults.asset, "NOCK", "asset");
  assertEqual(defaults.scheme, "exact", "scheme");
  assertEqual(defaults.freeAllowancePerDay, 5, "default free allowance");
  assertEqual(defaults.clockSkewSeconds, 30, "default clock skew");

  const overridden = resolveX402Config({
    NOCKS_X402_PAY_TO: "PAYTOXYZ",
    NOCKS_X402_NETWORK: "nockchain:mainnet",
    NOCKS_X402_FACILITATOR_URL: "https://facilitator.example",
    NOCKS_X402_FREE_ALLOWANCE_PER_DAY: "0",
    NOCKS_X402_CLOCK_SKEW_SECONDS: "15"
  });
  assertEqual(overridden.payTo, "PAYTOXYZ", "override payTo");
  assertEqual(overridden.network, "nockchain:mainnet", "override network");
  assertEqual(overridden.verifierMode, "facilitator", "facilitator url -> facilitator mode");
  assertEqual(overridden.facilitatorUrl, "https://facilitator.example", "facilitator url passthrough");
  assertEqual(overridden.freeAllowancePerDay, 0, "override allowance to 0");
  assertEqual(overridden.clockSkewSeconds, 15, "override clock skew");

  assertEqual(resolveX402Config({ NOCKS_X402_ENABLED: "true" }).enabled, true, "enabled via 'true'");
  assertEqual(resolveX402Config({ NOCKS_X402_ENABLED: "1" }).enabled, true, "enabled via '1'");
  assertEqual(resolveX402Config({ NOCKS_X402_ENABLED: "off" }).enabled, false, "stays off via 'off'");

  const blank = resolveX402Config({ NOCKS_X402_PAY_TO: "   ", NOCKS_X402_FACILITATOR_URL: "  " });
  assertEqual(blank.payTo, DEFAULT_PAY_TO, "blank payTo falls back to default");
  assertEqual(blank.verifierMode, "stub", "blank facilitator url -> stub mode");

  // SSRF guard on the operator-configured facilitator URL (used by FacilitatorVerifier).
  assert(isSafeFacilitatorUrl("https://facilitator.example/"), "https external facilitator allowed");
  assert(isSafeFacilitatorUrl("http://localhost:8402"), "http loopback dev facilitator allowed");
  assert(isSafeFacilitatorUrl("http://127.0.0.1:8402"), "http 127.0.0.1 dev facilitator allowed");
  assert(!isSafeFacilitatorUrl("http://facilitator.example/"), "plain http to a non-loopback host rejected");
  assert(!isSafeFacilitatorUrl("https://169.254.169.254/"), "link-local address rejected even over https");
  assert(!isSafeFacilitatorUrl("http://169.254.169.254/latest/meta-data/"), "cloud metadata endpoint rejected");
  assert(!isSafeFacilitatorUrl("https://metadata.google.internal/"), "gcp metadata host rejected");
  assert(!isSafeFacilitatorUrl("https://facilitator.internal/verify"), ".internal host rejected");
  assert(!isSafeFacilitatorUrl("https://db.local"), ".local host rejected");
  assert(!isSafeFacilitatorUrl("not a url"), "unparseable url rejected");
  assert(!isSafeFacilitatorUrl(null), "missing url rejected");
});
