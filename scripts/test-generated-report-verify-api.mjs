#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const evidence = loadTypeScriptModule("src/lib/generated-report-evidence.ts")
    .createGeneratedReportEvidenceBundle("payment-flow");
  const { GET } = loadTypeScriptModule("src/app/api/reports/generated/verify/route.ts");

  const verified = await GET(createRequest({
    reportHash: evidence.artifacts.reportHash,
    snapshotRoot: evidence.artifacts.snapshotRoot,
    appSlug: "payment-flow"
  }));
  const verifiedBody = await verified.json();

  assertEqual(verified.status, 200, "verified status code");
  assertEqual(verifiedBody.version, "v0", "verify version");
  assertEqual(verifiedBody.subject, "nocksperimental.com", "verify subject");
  assertEqual(verifiedBody.canonicalUrl, "https://nocksperimental.com/api/reports/generated/verify", "canonical URL");
  assertEqual(verifiedBody.verified, true, "matching evidence verifies");
  assertEqual(verifiedBody.checks.reportHashProvided, true, "report hash provided check");
  assertEqual(verifiedBody.checks.reportHashMatched, true, "report hash match check");
  assertEqual(verifiedBody.checks.snapshotRootMatched, true, "snapshot root match check");
  assertEqual(verifiedBody.checks.appSlugMatched, true, "app slug match check");
  assertEqual(verifiedBody.checks.exactEvidenceMatch, true, "exact evidence match check");
  assertEqual(verifiedBody.match.appSlug, "payment-flow", "matched app slug");
  assertEqual(verifiedBody.match.reportHash, evidence.artifacts.reportHash, "matched report hash");
  assertEqual(verifiedBody.match.snapshotRoot, evidence.artifacts.snapshotRoot, "matched snapshot root");
  assertEqual(verifiedBody.match.links.evidence, "https://nocksperimental.com/api/reports/generated/payment-flow/evidence", "evidence link");
  assertEqual(verifiedBody.match.links.provenance, "https://nocksperimental.com/api/reports/generated/payment-flow/provenance", "provenance link");

  const mismatched = await GET(createRequest({
    reportHash: evidence.artifacts.reportHash,
    snapshotRoot: "state:wrong-root",
    appSlug: "payment-flow"
  }));
  const mismatchedBody = await mismatched.json();

  assertEqual(mismatched.status, 200, "mismatched status code");
  assertEqual(mismatchedBody.verified, false, "mismatched evidence does not verify");
  assertEqual(mismatchedBody.checks.reportHashMatched, true, "mismatched hash still matches");
  assertEqual(mismatchedBody.checks.snapshotRootMatched, false, "mismatched root check");
  assertEqual(mismatchedBody.checks.exactEvidenceMatch, false, "mismatched exact check");
  assertEqual(mismatchedBody.match, null, "mismatched match");

  const missingHash = await GET(createRequest({ appSlug: "payment-flow" }));
  const missingHashBody = await missingHash.json();

  assertEqual(missingHash.status, 400, "missing hash status");
  assertEqual(missingHashBody.error, "Missing reportHash query parameter", "missing hash error");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/reports/generated/verify"]?.get?.summary,
    "Generated report evidence verifier",
    "OpenAPI verifier path"
  );
}

function createRequest(params) {
  const url = new URL("https://nocksperimental.com/api/reports/generated/verify");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return new Request(url);
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  const source = readFileSync(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2020
    },
    fileName: modulePath
  }).outputText;

  const compiled = { exports: {} };
  moduleCache.set(modulePath, compiled);

  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiled.exports, createModuleRequire(), compiled, modulePath, path.dirname(modulePath));

  return compiled.exports;
}

function createModuleRequire() {
  return (specifier) => {
    if (specifier === "next/server") {
      return {
        NextResponse: {
          json: (body, init = {}) => ({
            headers: init.headers ?? {},
            status: init.status ?? 200,
            json: async () => body
          })
        }
      };
    }

    if (specifier.startsWith("@/")) {
      return loadAliasModule(specifier);
    }

    return require(specifier);
  };
}

function loadAliasModule(specifier) {
  const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
  const jsonPath = `${aliasPath}.json`;
  const tsPath = `${aliasPath}.ts`;

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
    return require(aliasPath);
  }

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".ts") {
    return loadTypeScriptModule(path.relative(process.cwd(), aliasPath));
  }

  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }

  if (existsSync(tsPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
  }

  throw new Error(`Unsupported module alias: ${specifier}`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
