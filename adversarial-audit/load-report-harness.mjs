#!/usr/bin/env node
// Adversarial harness: loads nocksperimental's REAL TS issuance/verification modules
// (via the same ts.transpileModule + @/ alias resolver the repo's own sign-trust-badges.mjs
// uses) and exercises them against crafted inputs. Run from the repo root.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();
const REPO = process.cwd();

function loadTS(relativePath) {
  const modulePath = path.join(REPO, relativePath);
  if (moduleCache.has(modulePath)) return moduleCache.get(modulePath).exports;
  if (!existsSync(modulePath)) throw new Error(`Missing module: ${relativePath}`);
  const source = readFileSync(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: modulePath,
  }).outputText;
  const compiled = { exports: {} };
  moduleCache.set(modulePath, compiled);
  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiled.exports, aliasRequire(), compiled, modulePath, path.dirname(modulePath));
  return compiled.exports;
}

function aliasRequire() {
  return (specifier) => {
    if (specifier.startsWith("@/")) {
      const aliasPath = path.join(REPO, "src", specifier.slice(2));
      const tsPath = `${aliasPath}.ts`;
      const jsonPath = `${aliasPath}.json`;
      if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") return require(aliasPath);
      if (existsSync(tsPath)) return loadTS(path.relative(REPO, tsPath));
      if (existsSync(jsonPath)) return require(jsonPath);
      throw new Error(`Unsupported alias: ${specifier}`);
    }
    return require(specifier);
  };
}

const cmd = process.argv[2];

if (cmd === "load-report") {
  // load-report <manifestPath> <rootDir>
  const manifestPath = path.resolve(process.argv[3]);
  const rootDir = path.resolve(process.argv[4] ?? path.dirname(manifestPath));
  const mod = loadTS("src/lib/generated-lab-reports.ts");
  const index = mod.loadGeneratedLabReports({ manifestPath, rootDir });
  const out = {
    status: index.status,
    reports: index.reports.map((r) => ({
      appSlug: r.appSlug,
      appName: r.appName,
      kernel: undefined,
      status: r.status,
      reportHash: r.reportHash,
      snapshotRoot: r.snapshotRoot,
      invariantsPassed: r.invariantsPassed,
      invariantsTotal: r.invariantsTotal,
      stepsPassed: r.stepsPassed,
      stepsTotal: r.stepsTotal,
      badgeCandidate: r.badgeCandidate,
    })),
  };
  console.log(JSON.stringify(out, null, 2));
} else if (cmd === "verify-badge") {
  // verify-badge <badgeId>  — runs verifyTrustBadgeIssuance against the COMMITTED trust-signals.json
  const badgeId = process.argv[3];
  const mod = loadTS("src/lib/trust-badge-verifier.ts");
  const result = mod.verifyTrustBadgeIssuance({ badgeId });
  console.log(JSON.stringify({ verified: result.verified, checks: result.checks, freshness: result.freshness }, null, 2));
} else if (cmd === "verify-badge-data") {
  // verify-badge-data <badgeId> <trustSignalsPath>  — verify against a SWAPPED trust-signals.json
  // (used to test whether a hand-crafted verifiedBadge+issuance entry verifies once signed)
  const badgeId = process.argv[3];
  const signalsPath = path.resolve(process.argv[4]);
  // monkeypatch the @/data/trust-signals.json require by pre-seeding the alias cache.
  const realRequire = require;
  const data = JSON.parse(readFileSync(signalsPath, "utf8"));
  // Patch: intercept the trust-signals.json import inside trust-signals.ts by overriding require cache.
  const signalsJsonPath = path.join(REPO, "src/data/trust-signals.json");
  realRequire.cache &&
    (realRequire.cache[signalsJsonPath] = { id: signalsJsonPath, exports: data, loaded: true });
  // Force commonjs require of the json to return patched data:
  const Module = realRequire("module");
  const origLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === signalsJsonPath || request.endsWith("data/trust-signals.json")) return data;
    return origLoad.apply(this, arguments);
  };
  const mod = loadTS("src/lib/trust-badge-verifier.ts");
  const result = mod.verifyTrustBadgeIssuance({ badgeId });
  console.log(JSON.stringify({ verified: result.verified, checks: result.checks, freshness: result.freshness }, null, 2));
} else {
  console.error("usage: load-report <manifest> <root> | verify-badge <id> | verify-badge-data <id> <signals.json>");
  process.exitCode = 1;
}
