#!/usr/bin/env node
// Locks the reproducible issuance gate (scripts/issue-badge.mjs): the issuer RE-RUNS the lab and
// only signs a promotable candidate; it refuses negative-control / non-pass / tampered fixtures,
// and it never issues an app-report cert from a model-only run.
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const fails = [];
const ok = (cond, label) => { if (!cond) fails.push(label); console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`); };
const tmp = mkdtempSync(path.join(tmpdir(), "issue-badge-test-"));

function runIssue(fixturePath, extraEnv = {}) {
  const out = path.join(tmp, `badge-${Math.abs(hash(fixturePath))}.json`);
  const r = spawnSync(process.execPath, ["scripts/issue-badge.mjs", fixturePath, "--out", out], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, NOCKS_ALLOW_DEV_SIGNING: "1", ...extraEnv }
  });
  return { status: r.status, stderr: r.stderr ?? "", out, json: existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null };
}
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

// 1) Honest fixture → ISSUED, but only as model-attested (mock-fakenet never executes the kernel).
const honest = runIssue("fixtures/forfeit-roulette-fairness.lab.json");
ok(honest.status === 0, "honest fixture is issued (exit 0)");
ok(honest.json?.badge?.kind === "model-attested", "honest mock-fakenet run is model-attested, NOT app-report");
ok(honest.json?.kernelVerified === false, "kernelVerified is false without real-VM execution");
ok(honest.json?.reDerivedStatus === "pass", "status is re-derived (pass) by the issuer, not trusted");

// 2) expectRejected negative control → REFUSED (it is exploit-prevention, not an app cert).
const launder = mkFixture("launder", { expectRejected: true, invariants: [{ id: "x", title: "t", severity: "critical", kind: "numeric-min", path: "peekSurface.nonce", min: 999999 }] });
const lr = runIssue(launder);
ok(lr.status !== 0, "expectRejected (negative control) is REFUSED");
ok(/exploit-prevention|not promotable/.test(lr.stderr), "refusal cites exploit-prevention/not-promotable");

// 3) Tampered report can't slip through: a fixture whose invariant fails but is not expectRejected
//    re-derives to fail → REFUSED.
const failing = mkFixture("failing", { invariants: [{ id: "x", title: "t", severity: "critical", kind: "numeric-min", path: "peekSurface.nonce", min: 999999 }] });
const fr = runIssue(failing);
ok(fr.status !== 0, "a genuinely failing run is REFUSED");

console.log(`\n${fails.length === 0 ? "issue-badge: all assertions passed" : `FAILURES: ${fails.join(", ")}`}`);
if (fails.length) process.exitCode = 1;

function mkFixture(slug, overrides) {
  const base = JSON.parse(readFileSync("fixtures/forfeit-roulette-fairness.lab.json", "utf8"));
  base.id = `${slug}-v0`;
  base.app = { name: `${slug} casino`, slug: `${slug}-casino`, version: "1.0.0", kernel: "x" };
  Object.assign(base, overrides);
  const p = path.join(tmp, `${slug}.lab.json`);
  writeFileSync(p, JSON.stringify(base, null, 2));
  return p;
}
