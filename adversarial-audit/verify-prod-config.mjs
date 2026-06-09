#!/usr/bin/env node
// Operator check: confirm the production issuer env is configured so that live signing stamps
// the ACTIVE prod key and the signature verifies against the committed public key.
// Run from the repo root with the prod env set, e.g.:
//   NOCKS_BADGE_ISSUER_SIGNING_SEED=$(cat ~/.config/nocklab/prod-issuer-seed.txt) \
//   NOCKS_BADGE_ISSUER_KEY_ID=nocksperimental-registry-ed25519-prod-v1 \
//   node adversarial-audit/verify-prod-config.mjs
// It never prints the seed.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
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
const crypto = loadTS("src/lib/trust-badge-crypto.ts");
const keys = loadTS("src/lib/trust-issuer-keys.ts");

const seedSet = Boolean((process.env.NOCKS_BADGE_ISSUER_SIGNING_SEED ?? "").trim());
const keyId = crypto.resolveActiveIssuerKeyId();
const committedActive = keys.activeIssuerKey()?.keyId;
const fails = [];
const ok = (cond, label) => { if (!cond) fails.push(label); console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`); };

console.log(`signing seed configured: ${seedSet}`);
console.log(`resolveActiveIssuerKeyId(): ${keyId}`);
console.log(`committed active anchor:    ${committedActive}`);

ok(seedSet, "NOCKS_BADGE_ISSUER_SIGNING_SEED is set (production secret present)");
ok(keyId === committedActive, `signing keyId (${keyId}) == committed active anchor (${committedActive}) — set NOCKS_BADGE_ISSUER_KEY_ID to the active key if this fails`);
ok(!crypto.isDevIssuerKey(keyId), "the signing key is NOT a public dev key");

if (seedSet) {
  const payload = { probe: "prod-config", at: "fixed" };
  const sig = crypto.signBadgePayload(payload, crypto.badgeIssuerSigningSeed(keyId)).signature;
  const pub = keys.publicKeyForKeyId(keyId);
  const valid = crypto.verifyBadgeSignature({ payload, signature: sig, publicKeySpkiBase64: pub });
  ok(Boolean(pub), `committed registry resolves a public key for ${keyId}`);
  ok(valid, "a live signature under the prod seed verifies against the committed public key");
}

console.log(`\n${fails.length === 0 ? "PROD CONFIG OK — live signing will mint verifiable certs under the active anchor." : `MISCONFIGURED: ${fails.join("; ")}`}`);
process.exitCode = fails.length ? 1 : 0;
