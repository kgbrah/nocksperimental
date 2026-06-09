#!/usr/bin/env node
// NEGATIVE CONTROLS: prove the verifier is SOUND (it rejects tampered certs), so that the
// verified=true results from _atk-run.mjs are real breaks, not an always-true verifier.
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const REPO = process.cwd();
mkdirSync("/tmp/atk-results", { recursive: true });
const tcache = new Map();
function loadTS(rel) { const p = path.join(REPO, rel); if (tcache.has(p)) return tcache.get(p).exports; const src = readFileSync(p, "utf8"); const out = ts.transpileModule(src, { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, resolveJsonModule: true, target: ts.ScriptTarget.ES2020 }, fileName: p }).outputText; const m = { exports: {} }; tcache.set(p, m); new Function("exports", "require", "module", "__filename", "__dirname", out)(m.exports, areq(), m, p, path.dirname(p)); return m.exports; }
function areq() { return (s) => { if (s.startsWith("@/")) { const a = path.join(REPO, "src", s.slice(2)); if (existsSync(a) && path.extname(a) === ".json") return require(a); if (existsSync(`${a}.ts`)) return loadTS(path.relative(REPO, `${a}.ts`)); if (existsSync(`${a}.json`)) return require(`${a}.json`); throw new Error(`alias ${s}`); } return require(s); }; }
const crypto = loadTS("src/lib/trust-badge-crypto.ts");
// Positive cases sign with the PRODUCTION secret (env or the local secret file); the dev-key
// case signs with the public demo seed and MUST be rejected. If no prod seed is available the
// positive (accept) control is skipped — the reject controls still run.
const PROD_KEY_ID = "nocksperimental-registry-ed25519-prod-v1";
const DEV_KEY_ID = crypto.ACTIVE_DEV_ISSUER_KEY_ID;
const DEV_SEED = crypto.DEV_ISSUER_SEEDS[DEV_KEY_ID];
const SECRET_FILE = path.join(process.env.HOME ?? "", ".config/nocklab/prod-issuer-seed.txt");
const PROD_SEED = (process.env.NOCKS_BADGE_ISSUER_SIGNING_SEED || (existsSync(SECRET_FILE) ? readFileSync(SECRET_FILE, "utf8").trim() : "")).trim();
const ANCHOR = { commit: "33ba97b1e206dd89b15c61b72b7802caf2136c18", build: "build-33ba97b1e206dd89b15c61b72b7802caf2136c18" };
const SIGNALS = "src/data/trust-signals.json";
const bak = "/tmp/atk-results/backup-trust-signals.json";
copyFileSync(path.join(REPO, SIGNALS), bak);
function craft({ badgeId, status = "verified", corruptSig = false, watchStatus = false, noIssuance = false, revoke = false, devKey = false }) {
  const issuedAt = "2026-06-08T00:00:00.000Z", expiresAt = "2027-06-08T00:00:00.000Z";
  const reportHash = "sha256:" + "ab".repeat(32), snapshotRoot = "deadbeefdeadbeef";
  const seed = devKey ? DEV_SEED : PROD_SEED;
  const keyId = devKey ? DEV_KEY_ID : PROD_KEY_ID;
  const signedPayload = { badgeId, status, reportHash, snapshotRoot, issuedAt, expiresAt, sourceAnchor: { ...ANCHOR }, kind: "app-report" };
  const signed = crypto.signBadgePayload(signedPayload, seed);
  let sig = signed.signature;
  if (corruptSig) { const b = Buffer.from(sig, "base64"); b[0] ^= 0xff; sig = b.toString("base64"); }
  const badge = { id: badgeId, label: "NC", kind: "app-report", status: watchStatus ? "watch" : status, reportSlug: "forfeit-roulette", fixtureId: "x", issuedAt, expiresAt, issuer: "Nocksperimental Trust Registry", evidence: { reportHash, snapshotRoot, signature: sig, invariantPacks: [] }, sourceAnchor: { ...ANCHOR } };
  const issuance = { id: "issue-" + badgeId, badgeId, issuedAt, issuer: "Nocksperimental Trust Registry", issuerKeyId: keyId, payloadDigest: signed.payloadDigest, signature: sig, signedPayload, verification: { status: "valid", algorithm: "ed25519", checkedAt: issuedAt } };
  const s = JSON.parse(readFileSync(bak, "utf8"));
  s.verifiedBadges = s.verifiedBadges.filter((b) => b.id !== badgeId).concat([badge]);
  if (!noIssuance) s.badgeIssuanceReceipts = s.badgeIssuanceReceipts.filter((i) => i.badgeId !== badgeId).concat([issuance]);
  if (revoke) s.badgeRevocations = (s.badgeRevocations || []).concat([{ id: "rev-" + badgeId, badgeId, statusBeforeRevocation: "verified", revokedAt: issuedAt, revokedBy: "x", reason: "nc", evidence: { reportHash, snapshotRoot, signature: sig } }]);
  writeFileSync(path.join(REPO, SIGNALS), JSON.stringify(s, null, 2) + "\n");
}
function verify(badgeId) { return JSON.parse(execFileSync("node", ["adversarial-audit/verify-child.mjs", badgeId], { cwd: REPO, encoding: "utf8" })).verified; }
const controls = [
  ["NC1 corrupt signature -> expect REJECT", () => craft({ badgeId: "nc1", corruptSig: true }), "nc1", false],
  ["NC2 status watch (not verified) -> expect REJECT", () => craft({ badgeId: "nc2", watchStatus: true }), "nc2", false],
  ["NC3 no issuance receipt -> expect REJECT", () => craft({ badgeId: "nc3", noIssuance: true }), "nc3", false],
  ["NC4 revoked badge -> expect REJECT", () => craft({ badgeId: "nc4", revoke: true }), "nc4", false],
  ["NC5 valid signature under a RETIRED DEV key -> expect REJECT (the fix)", () => craft({ badgeId: "nc5", devKey: true }), "nc5", false],
];
if (PROD_SEED) controls.push(["NC6 untouched valid PROD-signed cert -> expect ACCEPT (sanity)", () => craft({ badgeId: "nc6" }), "nc6", true]);
else console.log("NC6 (positive accept) SKIPPED: no production seed available (set NOCKS_BADGE_ISSUER_SIGNING_SEED or ~/.config/nocklab/prod-issuer-seed.txt)");
try {
  let sound = true;
  for (const [label, setup, id, expectAccept] of controls) {
    setup();
    const v = verify(id);
    const ok = expectAccept ? v === true : v === false;
    if (!ok) sound = false;
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (verified=${v})`);
    copyFileSync(bak, path.join(REPO, SIGNALS));
  }
  console.log(`\nVERIFIER SOUNDNESS: ${sound ? "SOUND (rejects tamper, accepts only valid sig+status) -> the verified=true mints are REAL breaks" : "UNSOUND"}`);
} finally { copyFileSync(bak, path.join(REPO, SIGNALS)); }
