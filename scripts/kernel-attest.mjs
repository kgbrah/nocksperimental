#!/usr/bin/env node
// kernel-attest — compile-gate a NockApp kernel and emit a deterministic kernelHash to bind into
// a lab fixture (app.kernelHash), so a cert commits to the EXACT kernel source that compiled
// clean — closing the "app.kernel is an unverified free-text label" gap (F3).
//
//   node scripts/kernel-attest.mjs <kernel.hoon> [<hoon-deps-dir>] [--no-compile]
//
// It (1) computes kernelHash = sha256 of the canonical kernel source bytes, and (2) runs the real
// `hoonc` compile-gate (failure blocks). A relying party recomputes the same sha256 over the
// published source to confirm a cert's kernelHash matches the deployed kernel.
//
// HONEST LIMIT: kernelHash here binds the SOURCE that compiles clean. The strongest binding is the
// hash of the compiled kernel JAM plus real-VM behavioral execution (poke/peek) via a
// generic-cause nockapp-run; that requires the nockchain kernel-jam build pipeline and a
// structured-cause harness (the bundled nockapp-run only drives simple numeric poke/peek). Until
// then a cert stays `model-attested` unless a real-VM run is wired — see adversarial-audit/REMEDIATION.md 2.8.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const kernelPath = args.find((a) => !a.startsWith("--"));
const depsDir = args.filter((a) => !a.startsWith("--"))[1] ?? "../nockchain/hoon";
const compile = !args.includes("--no-compile");

if (!kernelPath || !existsSync(kernelPath)) {
  process.stderr.write(`kernel-attest: kernel not found: ${kernelPath}\n`);
  process.exit(2);
}

const sourceBytes = readFileSync(kernelPath);
const kernelHash = `sha256:${createHash("sha256").update(sourceBytes).digest("hex")}`;

let compileGate = "skipped";
if (compile) {
  const hoonc = spawnSync("hoonc", ["--ephemeral", kernelPath, depsDir], { encoding: "utf8" });
  const out = `${hoonc.stdout ?? ""}${hoonc.stderr ?? ""}`;
  // hoonc prints "no panic!" on a clean compile and a non-zero / panic trace otherwise.
  compileGate = hoonc.status === 0 && /no panic!/.test(out) ? "pass" : "fail";
  if (compileGate === "fail") {
    process.stderr.write(`kernel-attest: COMPILE GATE FAILED for ${kernelPath}\n${out.slice(-800)}\n`);
    process.exit(1);
  }
}

const result = {
  kernel: path.basename(kernelPath),
  kernelPath,
  kernelHash,
  compileGate,
  // What this binding does and does NOT yet prove, stated on the artifact itself.
  attests: "source-bytes compile clean (hoonc 'no panic'); kernelHash binds the exact source",
  notYetProven: "real-VM behavioral execution (poke/peek invariants over actual state) + compiled-jam hash"
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
