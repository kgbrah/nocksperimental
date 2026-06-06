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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/pr-radar/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "PR radar status");
  assertEqual(body.version, "v0", "PR radar version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/pr-radar",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );

  assertEqual(body.snapshot.openPullRequestCount, 35, "open PR count");
  assertEqual(body.snapshot.openIssueCount, 1, "open issue count");
  assertEqual(body.snapshot.draftCount, 11, "draft PR count");
  assertEqual(body.snapshot.highPriorityCount, 20, "high priority PR count");
  assertEqual(body.snapshot.latestUpdatedAt, "2026-06-06T00:07:44Z", "latest PR update");
  assertEqual(body.pullRequests.length, 35, "tracked PR count");
  assertEqual(body.openIssues.length, 1, "tracked issue count");

  assertPr(body, 125, "nockup-fixture-manifest", "high", true, "nockupValidation");
  assertPr(body, 113, "pma-runtime-persistence", "high", true, "stateJamRegistry");
  assertPr(body, 124, "compute-proof-puzzle", "high", false, "computeBenchmarkProfiles");
  assertPr(body, 126, "benchmarking", "high", false, "nockchainRustAtlas");
  assertPr(body, 116, "wallet-transaction-metadata", "high", false, "nockchainWalletAtlas");
  assertPr(body, 119, "nockapp-state-export", "high", false, "nockchainNockAppSourceTrace");
  assertPr(body, 103, "offline-wallet-signing", "high", false, "nockchainWalletAtlas");
  assertPr(body, 118, "runtime-stack-size", "high", false, "nockchainOperationsAtlas");
  assertPr(body, 112, "pma-runtime-persistence", "high", true, "stateJamRegistry");
  assertPr(body, 107, "pma-runtime-persistence", "high", true, "stateJamRegistry");
  assertPr(body, 104, "pma-runtime-persistence", "high", true, "stateJamRegistry");
  assertPr(body, 122, "nockup-install-path", "medium", false, "nockupValidation");
  assertPr(body, 120, "nockup-extension-hooks", "medium", false, "fixtureDocs");
  assertPr(body, 102, "x402-agentic-payments", "medium", false, "x402MeteredTrustApi");
  assertPr(body, 100, "pma-runtime-persistence", "high", true, "stateJamRegistry");
  assertPr(body, 101, "parser-arm-comparison", "watch", true, "nockchainHoonKernelAtlas");
  assertPr(body, 98, "hoon-parser-runtime", "watch", true, "nockchainHoonKernelAtlas");
  assertPr(body, 95, "jojo-repl-surface", "watch", false, "nockchainNockAppAtlas");
  assertPr(body, 94, "jam-cue-hardening", "high", false, "nockvmRuntimeSafety");
  assertPr(body, 93, "p2p-jam-cue-hardening", "high", false, "nockchainSyncGossipTrace");
  assertPr(body, 83, "grpc-message-size", "medium", false, "nockchainWalletAtlas");
  assertPr(body, 79, "peek-v1-transactions", "medium", false, "nockchainHoonKernelAtlas");
  assertPr(body, 88, "consensus-height-bounds", "medium", false, "nockchainProtocolTrace");

  const pr125 = findPr(body, 125);
  assertIncludes(pr125.title, "render template manifests", "PR 125 title");
  assertIncludes(pr125.nocksperimentalAction, "template manifest", "PR 125 action");
  assertIncludes(pr125.receiptFields, "templateManifestSource", "PR 125 receipt field");

  const pr116 = findPr(body, 116);
  assertIncludes(pr116.title, "blobs and memo", "PR 116 title");
  assertIncludes(pr116.receiptFields, "transactionBlobHash", "PR 116 blob field");
  assertIncludes(pr116.receiptFields, "memoPresence", "PR 116 memo field");

  const pr119 = findPr(body, 119);
  assertIncludes(pr119.receiptFields, "exportStateCommit", "PR 119 export state field");
  assertIncludes(pr119.forbiddenFields, "rawExportJam", "PR 119 forbids raw export jam");

  const pr113 = findPr(body, 113);
  assertIncludes(pr113.title, "PMA trailhead", "PR 113 title");
  assertIncludes(pr113.receiptFields, "pmaSnapshotRoot", "PR 113 PMA snapshot field");
  assertIncludes(pr113.forbiddenFields, "rawPmaSlab", "PR 113 forbids raw PMA slab");

  const pr103 = findPr(body, 103);
  assertIncludes(pr103.title, "Offline/cold wallet signing", "PR 103 title");
  assertIncludes(pr103.receiptFields, "signingMode", "PR 103 signing mode field");
  assertIncludes(pr103.forbiddenFields, "coldWalletPrivateKey", "PR 103 forbids cold wallet key");

  const pr94 = findPr(body, 94);
  assertIncludes(pr94.title, "integer overflow", "PR 94 title");
  assertIncludes(pr94.receiptFields, "jamCueInputLength", "PR 94 jam cue input field");
  assertIncludes(pr94.forbiddenFields, "rawJamPayload", "PR 94 forbids raw jam payload");

  const pr83 = findPr(body, 83);
  assertIncludes(pr83.title, "grpc", "PR 83 title");
  assertIncludes(pr83.receiptFields, "grpcMaxMessageBytes", "PR 83 gRPC limit field");

  const issue121 = findIssue(body, 121);
  assertEqual(issue121.riskClass, "runtime-stack-frame-safety", "issue 121 risk class");
  assertIncludes(issue121.targetSurfaces, "nockvmRuntimeSafety", "issue 121 target surface");
  assertIncludes(issue121.receiptFields, "stackFramePointerRange", "issue 121 receipt field");

  const riskClassIds = body.riskClasses.map((riskClass) => riskClass.id);
  assertIncludes(riskClassIds, "nockup-fixture-manifest", "nockup risk class");
  assertIncludes(riskClassIds, "wallet-transaction-metadata", "wallet risk class");
  assertIncludes(riskClassIds, "nockapp-state-export", "NockApp risk class");
  assertIncludes(riskClassIds, "consensus-height-bounds", "consensus risk class");
  assertIncludes(riskClassIds, "benchmarking", "benchmark risk class");
  assertIncludes(riskClassIds, "compute-proof-puzzle", "compute risk class");
  assertIncludes(riskClassIds, "pma-runtime-persistence", "PMA risk class");
  assertIncludes(riskClassIds, "offline-wallet-signing", "offline wallet risk class");
  assertIncludes(riskClassIds, "x402-agentic-payments", "x402 risk class");
  assertIncludes(riskClassIds, "runtime-stack-frame-safety", "runtime stack frame risk class");
  assertIncludes(riskClassIds, "jam-cue-hardening", "jam cue risk class");
  assertIncludes(riskClassIds, "p2p-jam-cue-hardening", "p2p jam cue risk class");
  assertIncludes(riskClassIds, "grpc-message-size", "gRPC risk class");
  assertIncludes(riskClassIds, "peek-v1-transactions", "peek v1 risk class");

  const walletClass = findRiskClass(body, "wallet-transaction-metadata");
  assertEqual(walletClass.escalation, "high", "wallet class escalation");
  assertIncludes(walletClass.targetSurfaces, "nockchainWalletAtlas", "wallet class target");

  assertIncludes(body.reviewContract.requiredFields, "prNumber", "contract requires PR number");
  assertIncludes(body.reviewContract.requiredFields, "riskClass", "contract requires risk class");
  assertIncludes(body.reviewContract.requiredFields, "targetSurfaces", "contract requires targets");
  assertIncludes(body.reviewContract.requiredFields, "openIssueNumber", "contract requires issue number when present");
  assertIncludes(body.reviewContract.requiredFields, "verificationCommand", "contract requires verification");
  assertIncludes(body.reviewContract.forbiddenFields, "rawStateJam", "contract forbids raw state jam");
  assertIncludes(body.reviewContract.forbiddenFields, "rawPmaSlab", "contract forbids raw PMA slab");
  assertIncludes(body.reviewContract.forbiddenFields, "walletSeedPhrase", "contract forbids wallet seed");
  assertIncludes(
    body.reviewContract.reviewRules,
    "Draft PRs can shape future tests but cannot be treated as merged behavior.",
    "contract draft rule"
  );
  assertEqual(body.driftCheck.status, "available", "drift check status");
  assertEqual(
    body.driftCheck.command,
    "npm run check:nockchain-pr-radar-drift -- --json",
    "drift check command"
  );
  assertEqual(
    body.driftCheck.testCommand,
    "npm run test:nockchain-pr-radar-drift-check",
    "drift check test command"
  );
  assertIncludes(
    body.driftCheck.sourceUrls,
    "https://api.github.com/repos/nockchain/nockchain/pulls?state=open&per_page=100&sort=updated&direction=desc",
    "drift check PR API source"
  );
  assertIncludes(body.driftCheck.compareFields, "updatedAt", "drift check updatedAt field");
  assertIncludes(body.driftCheck.compareFields, "draft", "drift check draft field");

  assertIncludes(
    body.operatorQueue,
    "Review PR #125 before changing Nockup validation fixture manifest assumptions.",
    "operator queue Nockup"
  );
  assertIncludes(
    body.operatorQueue,
    "Review PR #113/#112/#107/#104 before trusting PMA snapshot, event-log, or state-jam assumptions.",
    "operator queue PMA"
  );
  assertIncludes(
    body.operatorQueue,
    "Review PR #116 before publishing wallet transaction metadata receipts.",
    "operator queue wallet"
  );
  assertIncludes(
    body.operatorQueue,
    "Review PR #119 before trusting live NockApp state export snapshots.",
    "operator queue export state"
  );

  assertEqual(body.links.page, "https://nocksperimental.com/nockchain/pr-radar", "page link");
  assertEqual(body.links.watch, "https://nocksperimental.com/api/nockchain/watch", "watch link");
  assertEqual(body.links.nockup, "https://nocksperimental.com/api/nockchain/nockup/submit", "nockup link");
  assertEqual(body.links.wallet, "https://nocksperimental.com/api/nockchain/wallet", "wallet link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-pr-radar",
    "/api/nockchain/pr-radar",
    "Nockchain open PR radar"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainPrRadar,
    "https://nocksperimental.com/api/nockchain/pr-radar",
    "well-known PR radar link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-pr-radar", "PR radar capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/pr-radar"]?.get?.summary,
    "Nockchain open PR radar",
    "OpenAPI PR radar path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.nockchainOpenPullRequests, 35, "checkpoint PR count");
  assertEqual(checkpointBody.counts.nockchainOpenIssues, 1, "checkpoint issue count");
  assertGreaterThan(checkpointBody.counts.nockchainPrRiskClasses, 5, "checkpoint risk class count");
  assertStartsWith(checkpointBody.roots.nockchainPrRadar, "sha256:", "checkpoint PR radar root");
  assertEqual(checkpointBody.checks.nockchainPrRadarAvailable, true, "checkpoint PR radar check");
  assertIncludes(checkpointBody.nockchainPrRadar.highPriorityPrs, 116, "checkpoint high priority wallet PR");
  assertIncludes(checkpointBody.nockchainPrRadar.highPriorityPrs, 113, "checkpoint high priority PMA PR");
  assertIncludes(checkpointBody.nockchainPrRadar.highPriorityPrs, 94, "checkpoint high priority jam PR");
  assertIncludes(checkpointBody.nockchainPrRadar.openIssueNumbers, 121, "checkpoint open runtime issue");
  assertIncludes(
    checkpointBody.nockchainPrRadar.targetSurfaces,
    "nockchainWalletAtlas",
    "checkpoint wallet target"
  );
  assertIncludes(
    checkpointBody.nockchainPrRadar.targetSurfaces,
    "nockchainSyncGossipTrace",
    "checkpoint P2P target"
  );
  assertIncludes(
    checkpointBody.nockchainPrRadar.targetSurfaces,
    "stateJamRegistry",
    "checkpoint PMA target"
  );
  assertEqual(
    checkpointBody.nockchainPrRadar.driftCheckCommand,
    "npm run check:nockchain-pr-radar-drift -- --json",
    "checkpoint PR radar drift command"
  );
  assertIncludes(
    checkpointBody.nockchainPrRadar.driftCheckSourceUrls,
    "https://api.github.com/repos/nockchain/nockchain/issues?state=open&per_page=100&sort=updated&direction=desc",
    "checkpoint PR radar issues source"
  );
  assertEqual(
    checkpointBody.links.nockchainPrRadar,
    "https://nocksperimental.com/api/nockchain/pr-radar",
    "checkpoint PR radar link"
  );

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:nockchain-pr-radar-api"],
    "node scripts/test-nockchain-pr-radar-api.mjs",
    "package PR radar API test script"
  );
  assertEqual(
    packageJson.scripts["check:nockchain-pr-radar-drift"],
    "node scripts/check-nockchain-pr-radar-drift.mjs",
    "package PR radar drift check script"
  );
  assertEqual(
    packageJson.scripts["test:nockchain-pr-radar-drift-check"],
    "node scripts/test-nockchain-pr-radar-drift-check.mjs",
    "package PR radar drift check test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:nockchain-pr-radar-api", "full test includes PR radar API");
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-pr-radar-drift-check",
    "full test includes PR radar drift check"
  );

  const smokeSource = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smokeSource, "/api/nockchain/pr-radar", "Cloudflare smoke includes PR radar API");

  const readme = readText("README.md");
  assertIncludes(readme, "Nockchain PR Radar", "README documents PR radar");
  assertIncludes(readme, "/api/nockchain/pr-radar", "README documents PR radar API");
  assertIncludes(
    readme,
    "npm run check:nockchain-pr-radar-drift",
    "README documents PR radar drift check"
  );
}

function assertPr(body, number, riskClass, priority, draft, targetSurface) {
  const pr = findPr(body, number);

  assertEqual(pr.riskClass, riskClass, `PR ${number} risk class`);
  assertEqual(pr.priority, priority, `PR ${number} priority`);
  assertEqual(pr.draft, draft, `PR ${number} draft status`);
  assertIncludes(pr.targetSurfaces, targetSurface, `PR ${number} target surface`);
}

function findPr(body, number) {
  const pr = body.pullRequests.find((candidate) => candidate.number === number);

  if (!pr) {
    throw new Error(`Missing PR: ${number}`);
  }

  return pr;
}

function findRiskClass(body, id) {
  const riskClass = body.riskClasses.find((candidate) => candidate.id === id);

  if (!riskClass) {
    throw new Error(`Missing risk class: ${id}`);
  }

  return riskClass;
}

function findIssue(body, number) {
  const issue = body.openIssues.find((candidate) => candidate.number === number);

  if (!issue) {
    throw new Error(`Missing issue: ${number}`);
  }

  return issue;
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

  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }

  if (existsSync(tsPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
  }

  if (existsSync(aliasPath) && aliasPath.endsWith(".json")) {
    return require(aliasPath);
  }

  if (existsSync(aliasPath) && aliasPath.endsWith(".ts")) {
    return loadTypeScriptModule(path.relative(process.cwd(), aliasPath));
  }

  throw new Error(`Unsupported alias import in test: ${specifier}`);
}

function assertEndpoint(body, id, pathValue, description) {
  const endpoint = body.endpoints.find((candidate) => candidate.id === id);

  if (!endpoint) {
    throw new Error(`Missing endpoint: ${id}`);
  }

  assertEqual(endpoint.path, pathValue, `${id} path`);
  assertEqual(endpoint.description, description, `${id} description`);
}

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack, needle, label) {
  if (!haystack?.includes?.(needle)) {
    throw new Error(`${label}: expected ${JSON.stringify(haystack)} to include ${JSON.stringify(needle)}`);
  }
}

function assertStartsWith(value, prefix, label) {
  if (!value?.startsWith?.(prefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(value)} to start with ${JSON.stringify(prefix)}`);
  }
}

function assertGreaterThan(actual, floor, label) {
  if (!(actual > floor)) {
    throw new Error(`${label}: expected ${actual} to be greater than ${floor}`);
  }
}
