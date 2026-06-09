// Offline regression test for the live-base promotion gate in generated-lab-reports.ts.
//
// Trust boundary: a live-base run earns an "app-report" cert ONLY when it BOTH actually read the
// chain (environment.baseExecuted) AND binds the deployed identity (app.baseDeploymentHash) — exactly
// as a kernel run requires kernelExecuted + kernelHash. baseExecuted alone (e.g. a hand-edited report)
// must stay "model-attested". This guards against a future change silently promoting on the flag alone.
//
// Fully offline: it runs the lab on an existing mock-fakenet fixture, then re-derives the badge
// candidate over edited copies of that real report through the REAL loader.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createTsLoader } from "./lib/load-ts-module.mjs";

const REPO = process.cwd();
const { loadTS } = createTsLoader(REPO);

const { loadGeneratedLabReport } = loadTS("src/lib/generated-lab-reports.ts");

let failures = 0;
function ok(cond, label) {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures += 1;
}

// 1) Produce a REAL model-attested report offline (mock-fakenet).
const sandbox = mkdtempSync(path.join(tmpdir(), "live-base-promo-"));
const seedReportPath = path.join(sandbox, "seed.json");
execFileSync("node", ["scripts/run-lab.mjs", "fixtures/xchain-federated-bridge.lab.json", "--out", seedReportPath], { cwd: REPO, encoding: "utf8" });
const baseReport = JSON.parse(readFileSync(seedReportPath, "utf8"));
const appSlug = baseReport.app.slug;

// Build a candidate from a report variant by writing it + a one-entry manifest into its own dir.
function candidateFor(label, mutate) {
  const dir = mkdtempSync(path.join(tmpdir(), `lb-${label}-`));
  const report = JSON.parse(JSON.stringify(baseReport));
  mutate(report);
  writeFileSync(path.join(dir, "report.json"), JSON.stringify(report));
  writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify({ reportDir: ".", status: report.summary.status, reports: [{ fixture: report.fixtureId, app: appSlug, status: report.summary.status, json: "report.json" }] })
  );
  const detail = loadGeneratedLabReport({ appSlug, manifestPath: path.join(dir, "manifest.json"), rootDir: dir });
  return detail?.entry?.badgeCandidate;
}

const HASH = "0811d2a7d8733683f04b5c560bcda7cbba2cde837b03d63d24814edf966d91bf";

console.log("live-base promotion gate (app-report requires baseExecuted AND baseDeploymentHash)\n");

// Baseline: the untouched model run is model-attested.
const baseline = candidateFor("baseline", () => {});
ok(baseline.evidenceKind === "model-attested", "untouched model-attested run -> model-attested");
ok(baseline.baseVerified === false, "  baseVerified false at baseline");

// Both flag + hash -> app-report (the genuine live-base case).
const both = candidateFor("both", (r) => {
  r.environment.baseExecuted = true;
  r.app.baseDeploymentHash = HASH;
});
ok(both.evidenceKind === "app-report", "baseExecuted + baseDeploymentHash -> app-report");
ok(both.baseVerified === true, "  baseVerified true");
ok(both.baseDeploymentHash === HASH, "  baseDeploymentHash surfaced on the candidate");

// Flag WITHOUT hash -> stays model-attested (the load-bearing guard).
const flagOnly = candidateFor("flag-only", (r) => {
  r.environment.baseExecuted = true;
});
ok(flagOnly.evidenceKind === "model-attested", "baseExecuted WITHOUT hash -> model-attested (guard holds)");
ok(flagOnly.baseVerified === false, "  baseVerified false without the hash binding");

// Hash WITHOUT flag -> stays model-attested (a stray hash cannot promote).
const hashOnly = candidateFor("hash-only", (r) => {
  r.app.baseDeploymentHash = HASH;
});
ok(hashOnly.evidenceKind === "model-attested", "baseDeploymentHash WITHOUT baseExecuted -> model-attested");
ok(hashOnly.baseVerified === false, "  baseVerified false without a real on-chain read");

// FORGERY REGRESSION (end-to-end through the REAL runner): a fixture AUTHOR who injects the
// runner-owned promotion fields must NOT mint an app-report. The runner strips kernelExecuted/
// baseExecuted/baseDeploymentHash from author input; only a genuine kernel run / live-base read sets
// them. (The in-memory variants above test the gate; this tests that run-lab never trusts the fixture.)
console.log("\nForgery regression — malicious fixture through run-lab:");
{
  const malDir = mkdtempSync(path.join(tmpdir(), "lb-forge-"));
  const mal = JSON.parse(readFileSync(path.join(REPO, "fixtures/xchain-federated-bridge.lab.json"), "utf8"));
  mal.environment.kernelExecuted = true;
  mal.environment.baseExecuted = true;
  mal.app.kernelHash = "sha256:forged-kernel-hash";
  mal.app.baseDeploymentHash = "forgedbasedeploymenthash";
  const malFixture = path.join(malDir, "malicious.lab.json");
  writeFileSync(malFixture, JSON.stringify(mal));
  const malReportPath = path.join(malDir, "report.json");
  execFileSync("node", ["scripts/run-lab.mjs", malFixture, "--out", malReportPath], { cwd: REPO, encoding: "utf8" });
  const malReport = JSON.parse(readFileSync(malReportPath, "utf8"));
  ok(malReport.environment.kernelExecuted === undefined, "runner strips fixture-injected environment.kernelExecuted");
  ok(malReport.environment.baseExecuted === undefined, "runner strips fixture-injected environment.baseExecuted");
  ok(malReport.app.baseDeploymentHash === undefined, "runner strips fixture-injected app.baseDeploymentHash");

  writeFileSync(
    path.join(malDir, "manifest.json"),
    JSON.stringify({ reportDir: ".", status: malReport.summary.status, reports: [{ fixture: malReport.fixtureId, app: malReport.app.slug, status: malReport.summary.status, json: "report.json" }] })
  );
  const malCand = loadGeneratedLabReport({ appSlug: malReport.app.slug, manifestPath: path.join(malDir, "manifest.json"), rootDir: malDir })?.entry?.badgeCandidate;
  ok(malCand.evidenceKind === "model-attested", "injected-forgery fixture stays model-attested (NOT app-report)");
  ok(malCand.baseVerified === false, "baseVerified false despite injected baseExecuted + baseDeploymentHash");
  ok(malCand.kernelVerified === false, "kernelVerified false despite injected kernelExecuted + kernelHash");
}

console.log(failures === 0 ? "\ntest-live-base-promotion: all assertions passed" : `\ntest-live-base-promotion: ${failures} assertion(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
