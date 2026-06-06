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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/zorp/monitor/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "Zorp monitor runbook status");
  assertEqual(body.version, "v0", "Zorp monitor runbook version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/zorp/monitor",
    "canonical URL"
  );

  assertEqual(body.automation.active, true, "monitor automation active");
  assertEqual(
    body.automation.automationId,
    "monitor-zorp-and-nockchain-sources",
    "monitor automation id"
  );
  assertEqual(body.automation.interval, "FREQ=HOURLY;INTERVAL=6", "monitor automation interval");
  assertIncludes(body.automation.supersededAutomationIds, "watch-vesl-drive-folder", "superseded VESL-named automation");
  assertIncludes(body.automation.supersededAutomationIds, "zorp-nockchain-watch", "superseded daily automation");

  assertEqual(body.currentSnapshot.zorp.publicRepoCount, 10, "Zorp repo count");
  assertEqual(body.currentSnapshot.nockchain.commit.shortSha, "33ba97b1e206", "Nockchain pinned commit");
  assertEqual(
    body.currentSnapshot.nockchain.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "Nockchain pinned release"
  );
  assertEqual(
    body.currentSnapshot.stateJamDrive.classification,
    "Zorp/Nockchain state-jam folder, not a VESL folder.",
    "state-jam drive classification"
  );

  assertIncludes(body.watchedSources.map((source) => source.id), "zorp-github-org", "watches Zorp org");
  assertIncludes(
    body.watchedSources.map((source) => source.id),
    "zorp-nockchain-legacy-redirect",
    "watches legacy redirect"
  );
  assertIncludes(
    body.watchedSources.map((source) => source.id),
    "canonical-nockchain-repository",
    "watches canonical Nockchain"
  );
  assertIncludes(
    body.watchedSources.map((source) => source.id),
    "zorp-state-jam-drive",
    "watches state-jam drive"
  );

  assertIncludes(
    body.findingSchema.requiredFields,
    "upstreamSourceUrl",
    "finding schema source URL"
  );
  assertIncludes(body.findingSchema.requiredFields, "sourceAuthority", "finding schema source authority");
  assertIncludes(body.findingSchema.requiredFields, "nocksperimentalSurface", "finding schema target surface");
  assertIncludes(body.findingSchema.requiredFields, "verificationCommand", "finding schema verification command");
  assertIncludes(body.findingSchema.requiredFields, "rawArtifactPolicy", "finding schema raw artifact policy");
  assertIncludes(body.findingSchema.forbiddenFields, "rawStateJam", "forbid raw state jam");
  assertIncludes(body.findingSchema.forbiddenFields, "rawPmaSlab", "forbid raw PMA slab");
  assertIncludes(body.findingSchema.forbiddenFields, "walletSeedPhrase", "forbid wallet seed phrase");

  assertIncludes(
    body.classificationFlow.map((step) => step.id),
    "classify-source-authority",
    "classification flow source authority step"
  );
  assertIncludes(
    body.classificationFlow.map((step) => step.id),
    "route-to-nocksperimental-surface",
    "classification flow route step"
  );
  assertMonitorClass(body, "canonical-nockchain", "immediate", "nockchainWatch");
  assertMonitorClass(body, "zorp-authoring", "review", "nockupValidation");
  assertMonitorClass(body, "zorp-lineage", "context-only", "zorpUpstream");
  assertMonitorClass(body, "state-artifact-provenance", "immediate", "stateJamRegistry");

  assertRouteMatrix(body, "canonical-nockchain-runtime", "nockchainMiningSourceTrace");
  assertRouteMatrix(body, "zorp-authoring-fixtures", "nockupValidation");
  assertRouteMatrix(body, "state-jam-artifacts", "nockchainPmaSourceTrace");
  assertRouteMatrix(body, "lineage-runtime-context", "docsResearch");

  assertIncludes(
    body.monitorRunTemplates.map((template) => template.id),
    "zorp-org-repo-update",
    "Zorp org monitor template"
  );
  assertIncludes(
    body.monitorRunTemplates.map((template) => template.id),
    "zorp-org-drift-check",
    "Zorp org drift monitor template"
  );
  assertIncludes(
    body.monitorRunTemplates.map((template) => template.id),
    "canonical-nockchain-release",
    "canonical release monitor template"
  );
  assertIncludes(
    body.monitorRunTemplates.map((template) => template.id),
    "drive-state-jam-artifact",
    "Drive state-jam monitor template"
  );
  assertIncludes(
    body.localVerification.recommendedCommands,
    "node scripts/run-zorp-monitor-snapshot.mjs --json",
    "local snapshot command"
  );
  assertIncludes(
    body.localVerification.recommendedCommands,
    "npm run check:zorp-org-drift -- --json",
    "local Zorp org drift command"
  );

  assertFile("scripts/run-zorp-monitor-snapshot.mjs");
  const snapshotScript = readText("scripts/run-zorp-monitor-snapshot.mjs");
  assertIncludes(snapshotScript, "api.github.com/orgs/zorp-corp/repos", "snapshot script checks Zorp repos");
  assertIncludes(snapshotScript, "api.github.com/repos/nockchain/nockchain/releases/latest", "snapshot script checks Nockchain release");
  assertIncludes(snapshotScript, "drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw", "snapshot script preserves Drive URL");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "zorp-monitor-runbook",
    "/api/nockchain/zorp/monitor",
    "Zorp and Nockchain monitor runbook"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.zorpMonitorRunbook,
    "https://nocksperimental.com/api/nockchain/zorp/monitor",
    "well-known Zorp monitor link"
  );
  assertIncludes(wellKnownBody.capabilities, "zorp-monitor-runbook", "Zorp monitor capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/zorp/monitor"]?.get?.summary,
    "Zorp and Nockchain monitor runbook",
    "OpenAPI Zorp monitor path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.zorpMonitorRunbookClasses, body.monitorClasses.length, "checkpoint monitor class count");
  assertEqual(
    checkpointBody.counts.zorpMonitorRunbookRouteMatrixEntries,
    body.routeMatrix.length,
    "checkpoint monitor route matrix count"
  );
  assertStartsWith(checkpointBody.roots.zorpMonitorRunbook, "sha256:", "checkpoint monitor root");
  assertEqual(checkpointBody.checks.zorpMonitorRunbookAvailable, true, "checkpoint monitor check");
  assertIncludes(
    checkpointBody.zorpMonitorRunbook.routeMatrixIds,
    "canonical-nockchain-runtime",
    "checkpoint monitor route matrix"
  );
  assertEqual(
    checkpointBody.links.zorpMonitorRunbook,
    "https://nocksperimental.com/api/nockchain/zorp/monitor",
    "checkpoint monitor link"
  );

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:zorp-monitor-runbook-api"],
    "node scripts/test-zorp-monitor-runbook-api.mjs",
    "package Zorp monitor API test"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:zorp-monitor-runbook-api", "full test includes Zorp monitor API");

  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  assertIncludes(smokeScript, "/api/nockchain/zorp/monitor", "Cloudflare smoke includes Zorp monitor API");

  const readme = readText("README.md");
  assertIncludes(readme, "Zorp Monitor Runbook", "README documents Zorp monitor runbook");
  assertIncludes(readme, "/api/nockchain/zorp/monitor", "README documents Zorp monitor API");
}

function assertMonitorClass(body, id, escalation, targetSurface) {
  const monitorClass = body.monitorClasses.find((candidate) => candidate.id === id);

  if (!monitorClass) {
    throw new Error(`Missing monitor class: ${id}`);
  }

  assertEqual(monitorClass.escalation, escalation, `${id} escalation`);
  assertIncludes(monitorClass.targetSurfaces, targetSurface, `${id} target surface`);
}

function assertRouteMatrix(body, id, targetSurface) {
  const matrixEntry = body.routeMatrix.find((candidate) => candidate.id === id);

  if (!matrixEntry) {
    throw new Error(`Missing route matrix entry: ${id}`);
  }

  assertIncludes(matrixEntry.targetSurfaces, targetSurface, `${id} target surface`);
  assertGreaterThan(matrixEntry.verificationCommands.length, 0, `${id} verification commands`);
}

function assertEndpoint(registry, id, pathName, description) {
  const endpoint = registry.endpoints.find((candidate) => candidate.id === id);

  if (!endpoint) {
    throw new Error(`Missing registry endpoint: ${id}`);
  }

  assertEqual(endpoint.path, pathName, `${id} path`);
  assertEqual(endpoint.description, description, `${id} description`);
  assertEqual(endpoint.url, `https://nocksperimental.com${pathName}`, `${id} URL`);
}

function readText(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }

  return readFileSync(filePath, "utf8");
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

function assertStartsWith(actual, expected, label) {
  if (!actual?.startsWith(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expected)}`);
  }
}

function assertGreaterThan(actual, expected, label) {
  if (!(actual > expected)) {
    throw new Error(`${label}: expected ${actual} to be greater than ${expected}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function loadTypeScriptModule(filePath) {
  const modulePath = path.join(process.cwd(), filePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  if (!existsSync(modulePath)) {
    throw new Error(`Missing required module: ${filePath}`);
  }

  const compiledModule = { exports: {} };
  moduleCache.set(modulePath, compiledModule);

  const source = readFileSync(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      baseUrl: process.cwd(),
      paths: {
        "@/*": ["src/*"]
      }
    },
    fileName: modulePath
  }).outputText;

  const moduleRequire = createModuleRequire(modulePath);
  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiledModule.exports, moduleRequire, compiledModule, modulePath, path.dirname(modulePath));

  return compiledModule.exports;
}

function createModuleRequire(modulePath) {
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

    if (specifier.startsWith(".")) {
      const resolvedPath = path.resolve(path.dirname(modulePath), specifier);
      const tsPath = `${resolvedPath}.ts`;
      if (existsSync(tsPath)) {
        return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
      }
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
