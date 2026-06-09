#!/usr/bin/env node
// ADVERSARIAL TEST RUNNER (defensive security audit of nocksperimental's trust-cert issuance).
// Goal: determine whether a MALICIOUS casino app can obtain a VERIFIED trust cert.
// Safety: backs up every committed data file it touches and restores it in a finally block.
// Run from the repo root: node scripts/_atk-run.mjs

import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const REPO = process.cwd();
const OUT = "/tmp/atk-results";
mkdirSync(OUT, { recursive: true });

// ---- transpile-load the REAL crypto module (same trick the repo's sign tool uses) ----
const tcache = new Map();
function loadTS(rel) {
  const p = path.join(REPO, rel);
  if (tcache.has(p)) return tcache.get(p).exports;
  const src = readFileSync(p, "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, resolveJsonModule: true, target: ts.ScriptTarget.ES2020 }, fileName: p }).outputText;
  const m = { exports: {} };
  tcache.set(p, m);
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
const crypto = loadTS("src/lib/trust-badge-crypto.ts");
const PUBLIC_ACTIVE_SEED = crypto.DEV_ISSUER_SEEDS[crypto.ACTIVE_DEV_ISSUER_KEY_ID];
const ANCHOR = { commit: "33ba97b1e206dd89b15c61b72b7802caf2136c18", build: "build-33ba97b1e206dd89b15c61b72b7802caf2136c18" };

const SIGNALS = "src/data/trust-signals.json";
const KEYS = "src/data/trust-issuer-keys.json";
const LE = "src/data/launch-evidence.json";

// ---- backup / restore ----
const backups = {};
function backup(rel) { const b = path.join(OUT, "backup-" + path.basename(rel)); copyFileSync(path.join(REPO, rel), b); backups[rel] = b; }
function restoreAll() { for (const [rel, b] of Object.entries(backups)) copyFileSync(b, path.join(REPO, rel)); }

// ---- craft a signed cert for an attacker-chosen badge, using the PUBLIC committed seed ----
function craftCert({ badgeId, reportSlug, fixtureId, label, reportHash, snapshotRoot, seed = PUBLIC_ACTIVE_SEED, issuerKeyId = crypto.ACTIVE_DEV_ISSUER_KEY_ID, status = "verified" }) {
  const issuedAt = "2026-06-08T00:00:00.000Z";
  const expiresAt = "2027-06-08T00:00:00.000Z";
  const signedPayload = { badgeId, status, reportHash, snapshotRoot, issuedAt, expiresAt, sourceAnchor: { ...ANCHOR } };
  const signed = crypto.signBadgePayload(signedPayload, seed);
  const badge = {
    id: badgeId, label, kind: "app-report", status, reportSlug, fixtureId,
    issuedAt, expiresAt, issuer: "Nocksperimental Trust Registry",
    evidence: { reportHash, snapshotRoot, signature: signed.signature, invariantPacks: [] },
    sourceAnchor: { ...ANCHOR },
  };
  const issuance = {
    id: "issue-" + badgeId, badgeId, issuedAt, issuer: "Nocksperimental Trust Registry",
    issuerKeyId, payloadDigest: signed.payloadDigest, signature: signed.signature,
    signedPayload, verification: { status: "valid", algorithm: "ed25519", checkedAt: issuedAt },
  };
  return { badge, issuance };
}

function writeSignalsWith(badge, issuance, baseRel = SIGNALS) {
  const s = JSON.parse(readFileSync(backups[baseRel] ?? path.join(REPO, baseRel), "utf8"));
  s.verifiedBadges = s.verifiedBadges.filter((b) => b.id !== badge.id).concat([badge]);
  s.badgeIssuanceReceipts = s.badgeIssuanceReceipts.filter((i) => i.badgeId !== badge.id).concat([issuance]);
  writeFileSync(path.join(REPO, SIGNALS), JSON.stringify(s, null, 2) + "\n");
}

function verifyChild(badgeId, env = {}) {
  const out = execFileSync("node", ["adversarial-audit/verify-child.mjs", badgeId], { cwd: REPO, env: { ...process.env, ...env }, encoding: "utf8" });
  return JSON.parse(out);
}

const results = [];
function record(id, title, mintsCert, verified, detail, evidence) {
  results.push({ id, title, mintsCert, verified, detail, evidence });
  console.log(`\n### ${id}: ${title}`);
  console.log(`    cert minted: ${mintsCert ? "YES" : "no"}   verifier verified=${verified}`);
  console.log(`    ${detail}`);
}

try {
  backup(SIGNALS); backup(KEYS); backup(LE);

  // confirm the public seed derives the COMMITTED active public key (the root cause)
  const keys = JSON.parse(readFileSync(path.join(REPO, KEYS), "utf8"));
  const committedActive = keys.issuerKeys.find((k) => k.keyId === crypto.ACTIVE_DEV_ISSUER_KEY_ID);
  const derived = crypto.publicKeySpkiFromSeed(PUBLIC_ACTIVE_SEED);
  const seedMatchesPublished = committedActive && committedActive.publicKeySpki === derived;
  console.log(`PRECHECK: public committed seed for active key ${crypto.ACTIVE_DEV_ISSUER_KEY_ID} derives the committed published public key: ${seedMatchesPublished}`);

  // ===== ATTACK A: forge a verified cert from scratch with the public seed =====
  {
    const c = craftCert({ badgeId: "badge-rigged-casino-verified", reportSlug: "forfeit-roulette", fixtureId: "rigged-casino-v0", label: "Rigged Roulette — Verified", reportHash: "sha256:" + "ab".repeat(32), snapshotRoot: "deadbeefdeadbeef" });
    writeSignalsWith(c.badge, c.issuance);
    const v = verifyChild("badge-rigged-casino-verified");
    record("A", "Forge a verified cert from scratch (public committed seed)", v.verified, v.verified,
      `signatureCryptographicallyValid=${v.checks.signatureCryptographicallyValid}, payloadBoundToBadge=${v.checks.payloadBoundToBadge}, activeVerifiedStatus=${v.checks.activeVerifiedStatus}, notRevoked=${v.checks.notRevoked}`,
      { checks: v.checks, match: v.match });
    restoreAll();
  }

  // ===== ATTACK B: same, but with EMPTY reportHash/snapshotRoot (no real evidence at all) =====
  {
    const c = craftCert({ badgeId: "badge-empty-evidence", reportSlug: "forfeit-roulette", fixtureId: "x", label: "Empty-Evidence Cert", reportHash: "", snapshotRoot: "" });
    writeSignalsWith(c.badge, c.issuance);
    const v = verifyChild("badge-empty-evidence");
    record("B", "Verified cert with EMPTY reportHash + snapshotRoot", v.verified, v.verified,
      `the cert binds to '' === '' string equality; no report or kernel referenced. payloadBoundToBadge=${v.checks.payloadBoundToBadge}`,
      { checks: v.checks });
    restoreAll();
  }

  // ===== ATTACK C: launder an attacker STUB through the real maintainer sign script =====
  {
    const s = JSON.parse(readFileSync(backups[SIGNALS], "utf8"));
    const badgeId = "badge-laundered-casino";
    s.verifiedBadges.push({
      id: badgeId, label: "Laundered Casino", kind: "app-report", status: "verified",
      reportSlug: "forfeit-roulette", fixtureId: "rigged-casino-v0",
      issuedAt: "2026-06-08T00:00:00.000Z", expiresAt: "2027-06-08T00:00:00.000Z",
      issuer: "Nocksperimental Trust Registry",
      evidence: { reportHash: "sha256:" + "cc".repeat(32), snapshotRoot: "0000111122223333", signature: "PLACEHOLDER", invariantPacks: [] },
      sourceAnchor: { ...ANCHOR },
    });
    s.badgeIssuanceReceipts.push({
      id: "issue-" + badgeId, badgeId, issuedAt: "2026-06-08T00:00:00.000Z",
      issuer: "Nocksperimental Trust Registry", issuerKeyId: crypto.ACTIVE_DEV_ISSUER_KEY_ID,
      payloadDigest: "PLACEHOLDER", signature: "",
      signedPayload: { badgeId, status: "verified", reportHash: "PLACEHOLDER", snapshotRoot: "PLACEHOLDER", issuedAt: "2026-06-08T00:00:00.000Z", expiresAt: "2027-06-08T00:00:00.000Z", sourceAnchor: { ...ANCHOR } },
      verification: { status: "unchecked", algorithm: "ed25519", checkedAt: "2026-06-08T00:00:00.000Z" },
    });
    writeFileSync(path.join(REPO, SIGNALS), JSON.stringify(s, null, 2) + "\n");
    // run the REAL maintainer tool with NO env seed. Post-fix it must FAIL CLOSED (refuse to
    // sign with a public demo seed); pre-fix it silently signed with the public dev seed.
    let signFailed = false;
    try {
      execFileSync("node", ["scripts/sign-trust-badges.mjs"], { cwd: REPO, env: { ...process.env, NOCKS_BADGE_ISSUER_SIGNING_SEED: "" }, encoding: "utf8", stdio: "pipe" });
    } catch {
      signFailed = true;
    }
    const v = signFailed ? { verified: false, checks: {} } : verifyChild(badgeId);
    record("C", "Launder an attacker stub through the real sign-trust-badges.mjs tool", v.verified, v.verified,
      signFailed
        ? "sign tool FAILED CLOSED (refused to sign without the production secret seed) — laundering blocked"
        : `the maintainer tool signed signedPayload.status='verified'. activeVerifiedStatus=${v.checks.activeVerifiedStatus}, sig valid=${v.checks.signatureCryptographicallyValid}`,
      { checks: v.checks, signFailed });
    restoreAll();
  }

  // ===== ATTACK G: deploy-env attacker injects a NEW active issuer key =====
  {
    const attackerSeed = "deadbeef".repeat(8); // 32-byte attacker seed
    const attackerKeyId = "attacker-key-v1";
    const c = craftCert({ badgeId: "badge-env-overlay", reportSlug: "forfeit-roulette", fixtureId: "x", label: "Env-Overlay Cert", reportHash: "sha256:" + "ee".repeat(32), snapshotRoot: "feedfacefeedface", seed: attackerSeed, issuerKeyId: attackerKeyId });
    writeSignalsWith(c.badge, c.issuance);
    const env = { NOCKS_BADGE_ISSUER_SIGNING_SEED: attackerSeed, NOCKS_BADGE_ISSUER_KEY_ID: attackerKeyId };
    const v = verifyChild("badge-env-overlay", env);
    record("G", "Deploy-env attacker injects a brand-new ACTIVE issuer key (overlay)", v.verified, v.verified,
      `with NOCKS_BADGE_ISSUER_SIGNING_SEED set to an attacker key not in the committed registry, the overlay publishes it as active and the cert verifies. sig valid=${v.checks.signatureCryptographicallyValid}, issuerKeyResolved=${v.checks.issuerKeyResolved}`,
      { checks: v.checks });
    restoreAll();
  }

  writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ seedMatchesPublished, results }, null, 2));
  console.log("\n================= SUMMARY =================");
  for (const r of results) console.log(`${r.id}  cert=${r.mintsCert ? "MINTED" : "no   "}  verified=${r.verified}  ${r.title}`);
  // Regression gate: this suite MUST mint zero certs. If any forgery verifies again, fail loudly.
  const minted = results.filter((r) => r.mintsCert);
  if (minted.length > 0) {
    console.error(`\nREGRESSION: ${minted.length} forged cert(s) verified — the issuance trust boundary is broken: ${minted.map((r) => r.id).join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("\nOK: 0 forged certs minted — the issuance trust boundary holds.");
  }
} finally {
  restoreAll();
  console.log("[restored all committed data files from backup]");
}
