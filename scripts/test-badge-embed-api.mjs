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
  const trustSignals = require(path.join(process.cwd(), "src/data/trust-signals.json"));
  const expectedDigest = trustSignals.badgeIssuanceReceipts.find(
    (issuance) => issuance.badgeId === "badge-payment-flow-verified"
  ).payloadDigest;

  const { GET } = loadTypeScriptModule("src/app/api/trust/badges/[badgeId]/embed/route.ts");
  const response = await GET(createRequest(), createContext("badge-payment-flow-verified"));
  const body = await response.json();

  assertEqual(response.status, 200, "embed status code");
  assertEqual(response.headers["Cache-Control"], "public, max-age=300", "embed cache control");
  assertEqual(body.version, "v0", "embed version");
  assertEqual(body.badgeId, "badge-payment-flow-verified", "embed badge id");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/trust/badges/badge-payment-flow-verified/embed", "canonical URL");
  assertEqual(body.display.label, "Payment Flow Verified", "display label");
  assertEqual(body.display.status, "verified", "display status");
  assertEqual(body.display.kind, "app-report", "display kind");
  assertEqual(body.verification.status, "valid", "verification status");
  assertEqual(body.verification.issuerKeyId, "nocksperimental-registry-ed25519-dev-v0", "issuer key id");
  assertEqual(body.verification.issuanceDigest, expectedDigest, "issuance digest");
  assertEqual(body.evidence.reportHash, "sha256:3a6d6bff59cb624f-payment-flow", "report hash");
  assertEqual(body.evidence.snapshotRoot, "3a6d6bff59cb624f", "snapshot root");
  assertEqual(body.links.badge, "https://nocksperimental.com/api/trust/badges/badge-payment-flow-verified", "badge link");
  assertEqual(body.links.verification, "https://nocksperimental.com/api/trust/badges/badge-payment-flow-verified/verification", "verification link");
  assertEqual(body.links.reportProvenance, "https://nocksperimental.com/api/reports/generated/payment-flow/provenance", "report provenance link");
  assertIncludes(body.embed.htmlSnippet, "data-nocksperimental-badge=\"badge-payment-flow-verified\"", "HTML badge data attribute");
  assertIncludes(body.embed.htmlSnippet, `data-issuance-digest="${expectedDigest}"`, "HTML issuance digest");
  assertIncludes(body.embed.markdownSnippet, "Payment Flow Verified", "Markdown badge label");

  const revoked = await GET(createRequest(), createContext("badge-payment-flow-legacy"));
  const revokedBody = await revoked.json();

  assertEqual(revoked.status, 410, "revoked badge status");
  assertEqual(revokedBody.error, "Badge is not publicly embeddable", "revoked badge error");
  assertEqual(revokedBody.badgeId, "badge-payment-flow-legacy", "revoked badge id");
  assertEqual(revokedBody.currentStatus, "revoked", "revoked current status");

  const missing = await GET(createRequest(), createContext("missing-badge"));
  const missingBody = await missing.json();

  assertEqual(missing.status, 404, "missing badge status");
  assertEqual(missingBody.error, "Badge not found", "missing badge error");
  assertEqual(missingBody.badgeId, "missing-badge", "missing badge id");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/trust/badges/{badgeId}/embed"]?.get?.summary,
    "Badge embed bundle",
    "OpenAPI badge embed path"
  );
}

function createRequest() {
  return {};
}

function createContext(badgeId) {
  return {
    params: Promise.resolve({ badgeId })
  };
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

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}
