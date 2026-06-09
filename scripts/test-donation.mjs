#!/usr/bin/env node

// Unit checks for src/lib/donation.ts: exact NICKS<->NOCK math, fail-closed placeholder gating, address
// validation, and the shell-injection-hardened create-tx command builder. Pure logic — no network.

import process from "node:process";
import { createTsLoader } from "./lib/load-ts-module.mjs";

const { loadTS } = createTsLoader(process.cwd());
const d = loadTS("src/lib/donation.ts");

let passed = 0;
const failures = [];

function ok(name, cond) {
  if (cond) {
    passed += 1;
  } else {
    failures.push(name);
  }
}

function throws(name, fn) {
  try {
    fn();
    failures.push(`${name} (expected throw)`);
  } catch {
    passed += 1;
  }
}

// A valid-shaped base58 address (Bitcoin-style; only base58 chars, length in [32,128]).
const VALID_B58 = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";

// --- NICKS constants + conversion ---
ok("NICKS_PER_NOCK = 65536", d.NICKS_PER_NOCK === BigInt(65536));
ok("nockToNicks(1) = 65536", d.nockToNicks("1") === BigInt(65536));
ok("nockToNicks(2) = 131072", d.nockToNicks(2) === BigInt(131072));
ok("nockToNicks(0.5) = 32768", d.nockToNicks("0.5") === BigInt(32768));
ok("nockToNicks(0) = 0", d.nockToNicks("0") === BigInt(0));
// 1/65536 NOCK is EXACTLY one nick — the finest valid amount.
ok("nockToNicks(1 nick worth) = 1", d.nockToNicks("0.0000152587890625") === BigInt(1));
// Half a nick is finer than the base unit — must be rejected.
throws("nockToNicks(half-nick) rejects", () => d.nockToNicks("0.00000762939453125"));
// 0.01 NOCK = 655.36 nicks — not whole, must be rejected.
throws("nockToNicks(0.01) rejects", () => d.nockToNicks("0.01"));
throws("nockToNicks(negative) rejects", () => d.nockToNicks("-1"));
throws("nockToNicks(NaN) rejects", () => d.nockToNicks("abc"));

// --- nicksToNock (exact, lossless) ---
ok("nicksToNock(65536) = '1'", d.nicksToNock(BigInt(65536)) === "1");
ok("nicksToNock(98304) = '1.5'", d.nicksToNock(BigInt(98304)) === "1.5");
ok("nicksToNock(1) exact", d.nicksToNock(BigInt(1)) === "0.0000152587890625");
ok("nicksToNock(0) = '0'", d.nicksToNock(BigInt(0)) === "0");
// round-trip
ok("round-trip 3.25 NOCK", d.nicksToNock(d.nockToNicks("3.25")) === "3.25");

// --- placeholder / validation (fail closed) ---
ok("placeholder native sentinel", d.isPlaceholder(d.PLACEHOLDER_NOCK_ADDRESS) === true);
ok("placeholder zero addr", d.isPlaceholder("0x0000000000000000000000000000000000000000") === true);
ok("placeholder empty", d.isPlaceholder("") === true);
ok("placeholder SET_ prefix", d.isPlaceholder("SET_ANYTHING") === true);
ok("valid b58 not placeholder", d.isPlaceholder(VALID_B58) === false);
ok("valid evm not placeholder", d.isPlaceholder("0x9B5E262cF9bb04869ab40b19AF91D2dc85761722") === false);
ok("isValidNockAddress(valid)", d.isValidNockAddress(VALID_B58) === true);
ok("isValidNockAddress(too short)", d.isValidNockAddress("abc") === false);
ok("isValidNockAddress(non-b58 chars)", d.isValidNockAddress("0OIl" + "x".repeat(40)) === false);
ok("isValidEvmAddress", d.isValidEvmAddress("0x9B5E262cF9bb04869ab40b19AF91D2dc85761722") === true);

// --- create-tx command builder ---
const cmd = d.buildCreateTxCommand({ address: VALID_B58, nock: "1", feeNicks: "10" });
ok("cmd starts with nockchain-wallet create-tx", cmd.startsWith("nockchain-wallet create-tx"));
ok("cmd has p2pkh recipient", cmd.includes('"kind":"p2pkh"'));
ok("cmd embeds address", cmd.includes(`"address":"${VALID_B58}"`));
ok("cmd amount in nicks", cmd.includes('"amount":65536'));
ok("cmd fee in nicks", cmd.includes("--fee 10"));
throws("cmd refuses placeholder address", () => d.buildCreateTxCommand({ address: d.PLACEHOLDER_NOCK_ADDRESS, nock: "1", feeNicks: "10" }));
// Shell-injection attempt in the recipient must be rejected by the base58 validator.
throws("cmd rejects shell-meta address", () =>
  d.buildCreateTxCommand({ address: `${VALID_B58}'; rm -rf /`, nock: "1", feeNicks: "10" })
);
throws("cmd rejects shell-meta names", () =>
  d.buildCreateTxCommand({ address: VALID_B58, nock: "1", feeNicks: "10", names: "$(rm -rf /)" })
);
// `!` triggers bash history expansion even inside double quotes — allowlist must reject it.
throws("cmd rejects ! in names", () => d.buildCreateTxCommand({ address: VALID_B58, nock: "1", feeNicks: "10", names: "abc!ls" }));
ok(
  "cmd accepts valid custom names",
  d.buildCreateTxCommand({ address: VALID_B58, nock: "1", feeNicks: "10", names: "[abcde fghij]" }).includes('--names "[abcde fghij]"')
);
throws("cmd rejects fractional fee", () => d.buildCreateTxCommand({ address: VALID_B58, nock: "1", feeNicks: "0.5" }));

// --- shortNockAddress ---
ok("shortNockAddress elides middle", d.shortNockAddress(VALID_B58).includes("…"));
ok("shortNockAddress keeps short addrs", d.shortNockAddress("abc") === "abc");

// --- cross-module drift guards (fund-routing config must not silently diverge) ---
const net = loadTS("src/lib/networks.ts");
// The Sepolia NOCK ERC20 used for donations must be the SAME contract networks.ts treats as the
// authoritative bridged NOCK; otherwise a donation could transfer() to a stale/dead token.
ok(
  "Sepolia NOCK token == networks.ts bridge.nock",
  d.NOCK_TOKENS[84532].address.toLowerCase() === net.APP_NETWORKS[84532].bridge.nock.toLowerCase()
);
// Every chain offered as a donation target must define a NOCK token for the ERC20 lane.
for (const id of net.DONATION_CHAIN_IDS) {
  ok(`DONATION_CHAIN_IDS ${id} has a NOCK token`, Boolean(d.NOCK_TOKENS[id]));
}

if (failures.length) {
  process.stderr.write(`test-donation: FAILED ${failures.length}/${passed + failures.length}\n`);
  for (const f of failures) process.stderr.write(`  - ${f}\n`);
  process.exit(1);
}
process.stdout.write(`test-donation: OK (${passed} checks)\n`);
