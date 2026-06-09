#!/usr/bin/env node
// Fresh-process verifier: loads the REAL trust-badge-verifier.ts (re-importing whatever
// src/data/trust-signals.json + trust-issuer-keys.json currently contain) and runs the
// actual verifyTrustBadgeIssuance. Each invocation is a clean process => fresh json import.
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
const badgeId = process.argv[2];
const mod = loadTS("src/lib/trust-badge-verifier.ts");
const r = mod.verifyTrustBadgeIssuance({ badgeId });
console.log(JSON.stringify({ verified: r.verified, freshness: r.freshness, checks: r.checks, match: r.match ? { badgeId: r.match.badgeId, label: r.match.label, reportHash: r.match.reportHash, snapshotRoot: r.match.snapshotRoot, issuerKeyId: r.match.issuerKeyId } : null }, null, 2));
