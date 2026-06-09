// Offline regression test for the live-base promotion gate in generated-lab-reports.ts.
//
// Trust boundary: a live-base run earns an "app-report" cert ONLY when it BOTH actually read the
// chain (environment.baseExecuted) AND binds the deployed identity (app.baseDeploymentHash) — exactly
// as a kernel run requires kernelExecuted + kernelHash. baseExecuted alone (e.g. a hand-edited report)
// must stay "model-attested". This guards against a future change silently promoting on the flag alone.
//
// Fully offline: it runs the lab on an existing mock-fakenet fixture, then re-derives the badge
// candidate over edited copies of that real report through the REAL loader.

import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const REPO = process.cwd();
const cache = new Map();
function loadTS(rel) {
  const p = path.join(REPO, rel);
  if (cache.has(p)) return cache.get(p).exports;
  const src = readFileSync(p, "utf8");
  const out = ts.transpileModule(src, {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, resolveJsonModule: true, target: ts.ScriptTarget.ES2020 },
    fileName: p
  }).outputText;
  const m = { exports: {} };
  cache.set(p, m);
  new Function("exports", "require", "module", "__filename", "__dirname", out)(m.exports, areq(), m, p, path.dirname(p));
  return m.exports;
}
function areq() {
  return (s) => {
    if (s.startsWith("@/")) {
      const a = path.join(REPO, "src", s.slice(2));
      if (existsSync(a) && path.extname(a) === ".json") return require(a);
      if (existsSync(`${a}.ts`)) return loadTS(path.relative(REPO, `${a}.ts`));
      if (existsSync(`${a}.json`)) return require(`${a}.json`);
      throw new Error(`alias ${s}`);
    }
    return require(s);
  };
}

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

console.log(failures === 0 ? "\ntest-live-base-promotion: all assertions passed" : `\ntest-live-base-promotion: ${failures} assertion(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
