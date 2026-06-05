#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

main();

function main() {
  const packageJson = readJson("package.json");
  const wrangler = readJson("wrangler.jsonc");
  const nextConfig = readText("next.config.ts");
  const openNextConfig = readText("open-next.config.ts");
  const gitignore = readText(".gitignore");
  const headers = readText("public/_headers");
  const deploymentDocs = readText("docs/deployment.md");
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");

  assertEqual(packageJson.scripts["smoke:cloudflare"], "node scripts/smoke-cloudflare-preview.mjs", "Cloudflare smoke script");
  assertFile("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(packageJson.scripts.preview, "opennextjs-cloudflare build", "preview builds OpenNext bundle");
  assertIncludes(packageJson.scripts.preview, "opennextjs-cloudflare preview", "preview runs Worker preview");
  assertIncludes(packageJson.scripts.deploy, "opennextjs-cloudflare build", "deploy builds OpenNext bundle");
  assertIncludes(packageJson.scripts.deploy, "opennextjs-cloudflare deploy", "deploy publishes Worker");
  assertIncludes(packageJson.dependencies["@opennextjs/cloudflare"], "^", "OpenNext Cloudflare dependency");
  assertIncludes(packageJson.devDependencies.wrangler, "^", "Wrangler dev dependency");

  assertEqual(wrangler.name, "nocksperimental", "Worker name");
  assertEqual(wrangler.main, ".open-next/worker.js", "Worker entrypoint");
  assertEqual(wrangler.assets.directory, ".open-next/assets", "Worker assets directory");
  assertEqual(wrangler.assets.binding, "ASSETS", "Worker assets binding");
  assertEqual(wrangler.kv_namespaces[0].binding, "NOCKS_FAKENET_RECEIPTS", "fakenet receipts KV binding");
  assertEqual(wrangler.kv_namespaces[1].binding, "NOCKS_VESL_RECEIPTS", "VESL receipts KV binding");
  assertEqual(wrangler.kv_namespaces[2].binding, "NOCKS_NOCKUP_RECEIPTS", "Nockup receipts KV binding");
  assertEqual(wrangler.routes[0].pattern, "nocksperimental.com", "production custom domain");
  assertEqual(wrangler.routes[0].custom_domain, true, "production custom domain flag");
  assertIncludes(wrangler.compatibility_flags, "nodejs_compat", "Node compatibility flag");
  assertEqual(wrangler.services[0].binding, "WORKER_SELF_REFERENCE", "Worker self-reference binding");
  assertEqual(wrangler.services[0].service, "nocksperimental", "Worker self-reference service");
  assertEqual(wrangler.images.binding, "IMAGES", "Cloudflare Images binding");
  assertEqual(wrangler.observability.enabled, true, "Worker observability");

  assertIncludes(nextConfig, "@opennextjs/cloudflare", "Next config initializes OpenNext dev shim");
  assertIncludes(openNextConfig, "defineCloudflareConfig", "OpenNext Cloudflare config");
  assertIncludes(gitignore, ".open-next/", "OpenNext output ignored");
  assertIncludes(gitignore, ".wrangler/", "Wrangler output ignored");
  assertIncludes(gitignore, ".dev.vars*", "local Cloudflare vars ignored");
  assertIncludes(headers, "/_next/static/*", "static asset headers path");
  assertIncludes(headers, "max-age=31536000", "immutable static asset cache");
  assertIncludes(smokeScript, "/.well-known/nocksperimental.json", "Cloudflare smoke checks well-known manifest");
  assertIncludes(smokeScript, "/openapi.json", "Cloudflare smoke checks OpenAPI spec");
  assertIncludes(smokeScript, "/api/health", "Cloudflare smoke checks health API");
  assertIncludes(smokeScript, "/api/nockchain/upstream", "Cloudflare smoke checks Nockchain upstream intelligence");
  assertIncludes(smokeScript, "/fakenet", "Cloudflare smoke checks fakenet readiness page");
  assertIncludes(smokeScript, "/api/fakenet", "Cloudflare smoke checks fakenet readiness API");
  assertIncludes(smokeScript, "/api/fakenet/evidence/receipts", "Cloudflare smoke checks fakenet receipt persistence");
  assertIncludes(smokeScript, "/api/vesl/evidence/submit", "Cloudflare smoke checks VESL evidence submit");
  assertIncludes(smokeScript, "/api/vesl/evidence/receipts", "Cloudflare smoke checks VESL receipt persistence");
  assertIncludes(smokeScript, "/api/nockchain/nockup/submit", "Cloudflare smoke checks Nockup validation submit");
  assertIncludes(smokeScript, "/api/nockchain/nockup/receipts", "Cloudflare smoke checks Nockup receipt persistence");
  assertIncludes(smokeScript, "/api/registry", "Cloudflare smoke checks registry manifest");
  assertIncludes(smokeScript, "/api/registry/checkpoint", "Cloudflare smoke checks registry checkpoint");
  assertIncludes(smokeScript, "/verify", "Cloudflare smoke checks verification page");
  assertIncludes(smokeScript, "/api/verify", "Cloudflare smoke checks verification index");
  assertIncludes(smokeScript, "/api/trust/feed", "Cloudflare smoke checks trust feed");
  assertIncludes(
    smokeScript,
    "/api/trust/badges/badge-payment-flow-verified/verification",
    "Cloudflare smoke checks badge verification"
  );
  assertIncludes(
    smokeScript,
    "/api/trust/badges/badge-payment-flow-verified/embed",
    "Cloudflare smoke checks badge embed"
  );
  assertIncludes(
    smokeScript,
    "/api/trust/badges/verify",
    "Cloudflare smoke checks badge verifier"
  );
  assertIncludes(
    smokeScript,
    "/api/reports/generated/payment-flow/provenance",
    "Cloudflare smoke checks report provenance"
  );
  assertIncludes(
    smokeScript,
    "/api/reports/generated/payment-flow/evidence",
    "Cloudflare smoke checks report evidence"
  );
  assertIncludes(
    smokeScript,
    "/api/reports/generated/verify",
    "Cloudflare smoke checks report verifier"
  );
  assertIncludes(deploymentDocs, "nocksperimental.com", "deployment docs production domain");
  assertIncludes(deploymentDocs, "wrangler login", "deployment docs auth step");
  assertIncludes(deploymentDocs, "/.well-known/nocksperimental.json", "deployment docs well-known manifest");
  assertIncludes(deploymentDocs, "/openapi.json", "deployment docs OpenAPI spec");
  assertIncludes(deploymentDocs, "/api/health", "deployment docs health endpoint");
  assertIncludes(deploymentDocs, "/api/nockchain/upstream", "deployment docs Nockchain upstream endpoint");
  assertIncludes(deploymentDocs, "/fakenet", "deployment docs fakenet readiness page");
  assertIncludes(deploymentDocs, "/api/fakenet", "deployment docs fakenet readiness endpoint");
  assertIncludes(deploymentDocs, "NOCKS_FAKENET_RECEIPTS", "deployment docs fakenet receipts KV binding");
  assertIncludes(deploymentDocs, "/api/fakenet/evidence/receipts", "deployment docs fakenet receipt persistence");
  assertIncludes(deploymentDocs, "NOCKS_VESL_RECEIPTS", "deployment docs VESL receipts KV binding");
  assertIncludes(deploymentDocs, "/api/vesl/evidence/receipts", "deployment docs VESL receipt persistence");
  assertIncludes(deploymentDocs, "NOCKS_NOCKUP_RECEIPTS", "deployment docs Nockup receipts KV binding");
  assertIncludes(deploymentDocs, "/api/nockchain/nockup/receipts", "deployment docs Nockup receipt persistence");
  assertIncludes(deploymentDocs, "/api/registry", "deployment docs registry endpoint");
  assertIncludes(deploymentDocs, "/api/registry/checkpoint", "deployment docs registry checkpoint");
  assertIncludes(deploymentDocs, "/verify", "deployment docs verification page");
  assertIncludes(deploymentDocs, "/api/verify", "deployment docs verification index");
  assertIncludes(deploymentDocs, "/api/trust/feed", "deployment docs trust feed");
  assertIncludes(deploymentDocs, "/api/trust/badges/badge-payment-flow-verified/verification", "deployment docs badge verification");
  assertIncludes(deploymentDocs, "/api/trust/badges/badge-payment-flow-verified/embed", "deployment docs badge embed");
  assertIncludes(deploymentDocs, "/api/trust/badges/verify", "deployment docs badge verifier");
  assertIncludes(deploymentDocs, "/api/reports/generated/payment-flow/provenance", "deployment docs report provenance");
  assertIncludes(deploymentDocs, "/api/reports/generated/payment-flow/evidence", "deployment docs report evidence");
  assertIncludes(deploymentDocs, "/api/reports/generated/verify", "deployment docs report verifier");
  assertIncludes(deploymentDocs, "npm run smoke:cloudflare", "deployment docs smoke command");
  assertIncludes(deploymentDocs, "npm run deploy", "deployment docs deploy command");
}

function readText(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }

  return readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function assertFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
