// LIVE smoke test for the live-base reader — OPT-IN, network-gated.
//
// Runs only when BASE_SEPOLIA_RPC_URL is set; otherwise it prints a skip line and exits 0
// (mirrors the repo's graceful-skip convention so it is safe in any CI without an RPC).
// NOT part of the default `npm test` fan-out. It reads the REAL Basescan-verified bridge on
// Base Sepolia and asserts the structural invariants of the deployment (5-node roster, threshold 3,
// a sane head block). It deliberately does NOT assert a specific event count — the window may be
// empty, which is a legitimate live observation.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBaseReader, readBaseXchainState } from "./lib/base-evm-reader.mjs";

const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
if (!rpcUrl || rpcUrl.trim().length === 0) {
  console.log("test-base-evm-live: SKIPPED (set BASE_SEPOLIA_RPC_URL to run the live Base Sepolia smoke test)");
  process.exit(0);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = JSON.parse(readFileSync(path.join(repoRoot, "fixtures/xchain-base-sepolia-live.lab.json"), "utf8"));
const env = fixture.environment;

let failures = 0;
function ok(cond, label) {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures += 1;
}

console.log(`test-base-evm-live: reading the live Base Sepolia bridge via ${rpcUrl}\n`);

const reader = await createBaseReader({ rpcUrl, chainId: env.baseChainId });
const { xchain, provenance } = await readBaseXchainState(reader, {
  inboxAddress: env.baseInboxAddress,
  nockAddress: env.baseNockAddress,
  requiredConfirmations: env.baseConfirmationDepth,
  appRequiredConfirmations: env.baseAppRequiredConfirmations,
  chainId: env.baseChainId
});

const ADDR = /^0x[0-9a-fA-F]{40}$/;
const nonZero = (a) => ADDR.test(a) && !/^0x0+$/.test(a);

ok(provenance.currentBlock > 0, `head block is sane (${provenance.currentBlock})`);
ok(xchain.signers.length === 5, `bridgeNodes roster has 5 signers`);
ok(xchain.signers.every(nonZero), "every bridge node is a non-zero address");
ok(new Set(xchain.signers.map((s) => s.toLowerCase())).size === 5, "the 5 bridge nodes are distinct");
ok(xchain.threshold === 3, `THRESHOLD is 3 (got ${xchain.threshold})`);
ok(typeof provenance.withdrawalsEnabled === "boolean", `withdrawalsEnabled readable (${provenance.withdrawalsEnabled})`);
ok(Array.isArray(xchain.mints), `DepositProcessed window read (${provenance.eventCounts.mints} mint(s) observed)`);
console.log(`  INFO  observed ${provenance.eventCounts.mints} mint(s) and ${provenance.eventCounts.burns} burn(s) in the scanned window`);

console.log(failures === 0 ? "\ntest-base-evm-live: all live assertions passed" : `\ntest-base-evm-live: ${failures} live assertion(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
