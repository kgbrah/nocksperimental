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
  const badgeBundle = loadTypeScriptModule("src/lib/trust-badge-verification.ts")
    .createBadgeVerificationBundle("badge-payment-flow-verified");
  const { GET } = loadTypeScriptModule("src/app/api/trust/badges/verify/route.ts");

  const verified = await GET(createRequest({
    badgeId: badgeBundle.badgeId,
    payloadDigest: badgeBundle.issuance.payloadDigest,
    signature: badgeBundle.issuance.signature,
    issuerKeyId: badgeBundle.issuance.issuerKeyId
  }));
  const verifiedBody = await verified.json();

  assertEqual(verified.status, 200, "verified status code");
  assertEqual(verifiedBody.version, "v0", "verify version");
  assertEqual(verifiedBody.subject, "nocksperimental.com", "verify subject");
  assertEqual(verifiedBody.canonicalUrl, "https://nocksperimental.com/api/trust/badges/verify", "canonical URL");
  assertEqual(verifiedBody.verified, true, "matching badge verifies");
  assertEqual(verifiedBody.checks.badgeFound, true, "badge found check");
  assertEqual(verifiedBody.checks.issuanceFound, true, "issuance found check");
  assertEqual(verifiedBody.checks.payloadDigestMatched, true, "payload digest match check");
  assertEqual(verifiedBody.checks.signatureMatched, true, "signature match check");
  assertEqual(verifiedBody.checks.issuerKeyMatched, true, "issuer key match check");
  assertEqual(verifiedBody.checks.activeVerifiedStatus, true, "active verified status check");
  assertEqual(verifiedBody.checks.notRevoked, true, "not revoked check");
  assertEqual(verifiedBody.checks.publicEmbedAvailable, true, "public embed check");
  assertEqual(verifiedBody.checks.exactIssuanceMatch, true, "exact issuance match check");
  assertEqual(verifiedBody.match.badgeId, "badge-payment-flow-verified", "matched badge id");
  assertEqual(verifiedBody.match.payloadDigest, badgeBundle.issuance.payloadDigest, "matched payload digest");
  assertEqual(verifiedBody.match.signature, badgeBundle.issuance.signature, "matched signature");
  assertEqual(verifiedBody.match.links.verification, "https://nocksperimental.com/api/trust/badges/badge-payment-flow-verified/verification", "verification link");
  assertEqual(verifiedBody.match.links.embed, "https://nocksperimental.com/api/trust/badges/badge-payment-flow-verified/embed", "embed link");
  assertEqual(verifiedBody.match.links.reportProvenance, "https://nocksperimental.com/api/reports/generated/payment-flow/provenance", "provenance link");

  const badSignature = await GET(createRequest({
    badgeId: badgeBundle.badgeId,
    payloadDigest: badgeBundle.issuance.payloadDigest,
    signature: "sig:wrong"
  }));
  const badSignatureBody = await badSignature.json();

  assertEqual(badSignature.status, 200, "bad signature status code");
  assertEqual(badSignatureBody.verified, false, "bad signature does not verify");
  assertEqual(badSignatureBody.checks.badgeFound, true, "bad signature badge found");
  assertEqual(badSignatureBody.checks.payloadDigestMatched, true, "bad signature digest matched");
  assertEqual(badSignatureBody.checks.signatureMatched, false, "bad signature check");
  assertEqual(badSignatureBody.checks.exactIssuanceMatch, false, "bad signature exact match");
  assertEqual(badSignatureBody.match, null, "bad signature match");

  const missingIdentifier = await GET(createRequest({ signature: badgeBundle.issuance.signature }));
  const missingIdentifierBody = await missingIdentifier.json();

  assertEqual(missingIdentifier.status, 400, "missing identifier status");
  assertEqual(missingIdentifierBody.error, "Missing badgeId or payloadDigest query parameter", "missing identifier error");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/trust/badges/verify"]?.get?.summary,
    "Badge issuance verifier",
    "OpenAPI badge verifier path"
  );
}

function createRequest(params) {
  const url = new URL("https://nocksperimental.com/api/trust/badges/verify");

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
