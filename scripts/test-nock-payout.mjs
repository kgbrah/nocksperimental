#!/usr/bin/env node

// Unit checks for src/lib/nock-payout.ts: one-way payout command building (single + batched), exact
// totals, and validation/shell-safety inherited from the donation module. Pure logic — no network.

import process from "node:process";
import { createTsLoader } from "./lib/load-ts-module.mjs";

const { loadTS } = createTsLoader(process.cwd());
const p = loadTS("src/lib/nock-payout.ts");

let passed = 0;
const failures = [];
const ok = (name, cond) => (cond ? (passed += 1) : failures.push(name));
const throws = (name, fn) => {
  try {
    fn();
    failures.push(`${name} (expected throw)`);
  } catch {
    passed += 1;
  }
};

const A1 = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"; // valid base58 shape
const A2 = "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ"; // the project nock address (valid)

// --- single payout ---
const single = p.buildPayoutCommand({ address: A1, nock: "2" }, "10");
ok("single starts with create-tx", single.startsWith("nockchain-wallet create-tx"));
ok("single embeds address", single.includes(`"address":"${A1}"`));
ok("single amount in nicks (2 NOCK = 131072)", single.includes('"amount":131072'));
ok("single fee in nicks", single.includes("--fee 10"));

// --- batch payout ---
const batch = p.buildBatchPayoutCommand(
  [
    { address: A1, nock: "1" },
    { address: A2, nock: "0.5" }
  ],
  "20"
);
ok("batch has two --recipient args", (batch.match(/--recipient/g) || []).length === 2);
ok("batch recipient1 amount 65536", batch.includes('"amount":65536'));
ok("batch recipient2 amount 32768", batch.includes('"amount":32768'));
ok("batch single fee", (batch.match(/--fee/g) || []).length === 1 && batch.includes("--fee 20"));
ok("batch embeds both addresses", batch.includes(A1) && batch.includes(A2));

// --- totals (exact) ---
ok("total 1 + 0.5 = 1.5", p.totalPayoutNock([{ address: A1, nock: "1" }, { address: A2, nock: "0.5" }]) === "1.5");
ok("total whole = '3'", p.totalPayoutNock([{ address: A1, nock: "2" }, { address: A2, nock: "1" }]) === "3");

// --- validation / shell-safety (inherited from donation module) ---
throws("empty batch rejected", () => p.buildBatchPayoutCommand([], "10"));
throws("batch rejects invalid address", () => p.buildBatchPayoutCommand([{ address: "not valid!", nock: "1" }], "10"));
throws("batch rejects shell-meta address", () => p.buildBatchPayoutCommand([{ address: `${A1}'; rm -rf /`, nock: "1" }], "10"));
throws("batch rejects fractional fee", () => p.buildBatchPayoutCommand([{ address: A1, nock: "1" }], "0.5"));
throws("batch rejects ! in names", () => p.buildBatchPayoutCommand([{ address: A1, nock: "1" }], "10", "abc!ls"));
throws("single rejects sub-nick amount", () => p.buildPayoutCommand({ address: A1, nock: "0.01" }, "10"));
ok(
  "batch accepts valid custom names",
  p.buildBatchPayoutCommand([{ address: A1, nock: "1" }], "10", "[abcde fghij]").includes('--names "[abcde fghij]"')
);

if (failures.length) {
  process.stderr.write(`test-nock-payout: FAILED ${failures.length}/${passed + failures.length}\n`);
  for (const f of failures) process.stderr.write(`  - ${f}\n`);
  process.exit(1);
}
process.stdout.write(`test-nock-payout: OK (${passed} checks)\n`);
