#!/usr/bin/env node
// issue-badge — REPRODUCIBLE trust-badge issuance gate (remediation Phase 2.7).
//
// The issuer never trusts a submitted report. Given a fixture, it RE-RUNS the lab itself in a
// clean sandbox, loads the report through the status-re-deriving badge-candidate loader, and
// signs a badge ONLY IF the candidate is genuinely promotable ("ready"): re-derived status is a
// real pass that agrees with the report's own summary, and it is not a negative control. The
// signed cert binds to the reproduced reportHash/snapshotRoot (and kernelHash when the real
// kernel was executed). Signing is fail-closed — it needs the production seed (or an explicit
// NOCKS_ALLOW_DEV_SIGNING=1 demo), and a model-attested run is never issued as an app-report cert.
//
// Usage (from the repo root):
//   NOCKS_BADGE_ISSUER_SIGNING_SEED=<secret> NOCKS_BADGE_ISSUER_KEY_ID=<active-keyid> \
//     node scripts/issue-badge.mjs <fixture.lab.json> [--out badge.json]
//   (demo: prefix NOCKS_ALLOW_DEV_SIGNING=1 instead of a real seed)

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const REPO = process.cwd();
const cache = new Map();
function loadTS(rel) {
  const p = path.join(REPO, rel);
  if (cache.has(p)) return cache.get(p).exports;
  const src = readFileSync(p, "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, resolveJsonModule: true, target: ts.ScriptTarget.ES2020 }, fileName: p }).outputText;
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

function fail(msg) {
  process.stderr.write(`issue-badge: REFUSED — ${msg}\n`);
  process.exit(1);
}

const args = process.argv.slice(2);
const fixturePath = args.find((a) => !a.startsWith("--"));
const outIdx = args.indexOf("--out");
const outPath = outIdx !== -1 ? args[outIdx + 1] : null;
if (!fixturePath || !existsSync(fixturePath)) fail(`fixture not found: ${fixturePath}`);

// 1) Re-run the lab ourselves in a clean sandbox — we do not trust any submitted report.
const sandbox = mkdtempSync(path.join(tmpdir(), "issue-badge-"));
const reportPath = path.join(sandbox, "report.json");
execFileSync("node", ["scripts/run-lab.mjs", fixturePath, "--out", reportPath], { cwd: REPO, encoding: "utf8" });
const reportBytes = readFileSync(reportPath);
const report = JSON.parse(reportBytes.toString("utf8"));
const appSlug = report.app.slug;

// 2) Load it through the status-re-deriving candidate loader (a private manifest over our run).
const manifestPath = path.join(sandbox, "manifest.json");
writeFileSync(
  manifestPath,
  JSON.stringify({ reportDir: ".", status: report.summary.status, reports: [{ fixture: report.fixtureId, app: appSlug, status: report.summary.status, json: "report.json" }] })
);
const { loadGeneratedLabReport } = loadTS("src/lib/generated-lab-reports.ts");
const detail = loadGeneratedLabReport({ appSlug, manifestPath, rootDir: sandbox });
if (!detail) fail("could not load the reproduced report");
const candidate = detail.entry.badgeCandidate;

// 3) Refuse to issue unless the candidate is genuinely promotable.
if (!candidate.statusConsistent) {
  fail(`report self-declared status (${report.summary.status}) disagrees with the re-derived status (${candidate.statusReDerived}) — possible tamper`);
}
if (candidate.status !== "ready") {
  fail(`not promotable: re-derived status=${candidate.statusReDerived}, evidenceKind=${candidate.evidenceKind}`);
}

// 4) Build + sign the cert. A model-attested run is issued as a MODEL-ATTESTED badge (kind), never
//    an app-report "this deployed app works" cert — that requires real-VM kernelVerified.
const crypto = loadTS("src/lib/trust-badge-crypto.ts");
const keyId = crypto.resolveActiveIssuerKeyId();
if (crypto.isDevIssuerKey(keyId) && process.env.NOCKS_ALLOW_DEV_SIGNING !== "1") {
  fail(`active signing key (${keyId}) is a public demo key — set NOCKS_BADGE_ISSUER_SIGNING_SEED + NOCKS_BADGE_ISSUER_KEY_ID to issue a real cert`);
}
const seed = crypto.badgeIssuerSigningSeed(keyId); // throws fail-closed without a seed/opt-in
const now = new Date(0).toISOString(); // deterministic stamp; the caller re-stamps issuedAt if desired
const sourceAnchor = { commit: report.environment?.sourceCommit ?? "uncommitted", build: "lab-reissue" };
const signedPayload = {
  badgeId: `badge-${appSlug}-${candidate.evidenceKind}`,
  status: "verified",
  reportHash: candidate.evidence.reportHash,
  snapshotRoot: candidate.evidence.snapshotRoot,
  issuedAt: now,
  expiresAt: now,
  sourceAnchor,
  // Bind the cert's registry category to the signature (verifier checks signedPayload.kind === badge.kind).
  kind: candidate.evidenceKind,
  ...(candidate.kernelHash ? { kernelHash: candidate.kernelHash } : {}),
  ...(candidate.baseDeploymentHash ? { baseDeploymentHash: candidate.baseDeploymentHash } : {})
};
const signed = crypto.signBadgePayload(signedPayload, seed);
const badge = {
  id: signedPayload.badgeId,
  label: `${report.app.name} (${candidate.evidenceKind})`,
  kind: candidate.evidenceKind,
  status: "verified",
  reportSlug: appSlug,
  fixtureId: report.fixtureId,
  issuedAt: now,
  expiresAt: now,
  issuer: "Nocksperimental Trust Registry",
  evidence: {
    reportHash: candidate.evidence.reportHash,
    snapshotRoot: candidate.evidence.snapshotRoot,
    signature: signed.signature,
    invariantPacks: candidate.evidence.invariantPacks,
    ...(candidate.kernelHash ? { kernelHash: candidate.kernelHash } : {}),
    ...(candidate.baseDeploymentHash ? { baseDeploymentHash: candidate.baseDeploymentHash } : {})
  },
  sourceAnchor
};
const issuance = {
  id: `issue-${signedPayload.badgeId}`,
  badgeId: signedPayload.badgeId,
  issuedAt: now,
  issuer: "Nocksperimental Trust Registry",
  issuerKeyId: keyId,
  payloadDigest: signed.payloadDigest,
  signature: signed.signature,
  signedPayload,
  verification: { status: "valid", algorithm: signed.algorithm, checkedAt: now }
};

const result = {
  issued: true,
  evidenceKind: candidate.evidenceKind,
  kernelVerified: candidate.kernelVerified,
  reDerivedStatus: candidate.statusReDerived,
  issuerKeyId: keyId,
  badge,
  issuance
};
const json = `${JSON.stringify(result, null, 2)}\n`;
if (outPath) writeFileSync(path.resolve(REPO, outPath), json);
else process.stdout.write(json);
process.stderr.write(
  `issue-badge: ISSUED ${badge.kind} cert for "${appSlug}" (reDerived=${candidate.statusReDerived}, kernelVerified=${candidate.kernelVerified}, key=${keyId})\n`
);
