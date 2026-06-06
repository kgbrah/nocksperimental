#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const scriptPath = "scripts/check-zorp-org-drift.mjs";
  assertFile(scriptPath);

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["check:zorp-org-drift"],
    "node scripts/check-zorp-org-drift.mjs",
    "package Zorp org drift check script"
  );
  assertEqual(
    packageJson.scripts["test:zorp-org-drift-check"],
    "node scripts/test-zorp-org-drift-check.mjs",
    "package Zorp org drift check test"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:zorp-org-drift-check",
    "full test includes Zorp org drift check"
  );

  const { GET } = loadTypeScriptModule("src/app/api/nockchain/zorp/route.ts");
  const response = await GET();
  const zorp = await response.json();
  const fixturePath = writeFixture(zorp);

  const passing = spawnSync(process.execPath, [scriptPath, "--fixture", fixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(passing.status, 0, "matching fixture exit status");
  const passingBody = JSON.parse(passing.stdout);
  assertEqual(passingBody.status, "in-sync", "matching fixture status");
  assertEqual(
    passingBody.sourcePolicy,
    "lineage-and-authoring-signal",
    "matching fixture source policy"
  );
  assertEqual(passingBody.snapshot.localRepoCount, 10, "matching fixture local repo count");
  assertEqual(passingBody.snapshot.githubRepoCount, 10, "matching fixture GitHub repo count");
  assertEqual(passingBody.checks.repoNamesMatch, true, "matching fixture repo names");
  assertEqual(passingBody.checks.metadataMatches, true, "matching fixture metadata");
  assertEqual(
    passingBody.checks.stateJamDriveClassified,
    true,
    "matching fixture preserves state-jam classification"
  );
  assertEqual(passingBody.impact.impactedRepos.length, 0, "matching fixture has no impacted repos");
  assertIncludes(
    passingBody.sourceUrls,
    "https://api.github.com/orgs/zorp-corp/repos?per_page=100&sort=updated&type=public",
    "drift check documents Zorp org API source"
  );

  const driftFixturePath = writeFixture(zorp, {
    mutateRepo: "zorp-corp/jock-lang",
    mutateUpdatedAt: "2026-06-06T06:06:06Z"
  });
  const drifting = spawnSync(process.execPath, [scriptPath, "--fixture", driftFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(drifting.status, 1, "drifting fixture exit status");
  const driftingBody = JSON.parse(drifting.stdout);
  assertEqual(driftingBody.status, "drift", "drifting fixture status");
  assertIncludes(
    driftingBody.drift.metadataDrift.map((entry) => `${entry.repo}:${entry.field}`),
    "zorp-corp/jock-lang:updatedAt",
    "drift detects jock-lang updatedAt change"
  );
  assertIncludes(
    driftingBody.impact.impactedRepos,
    "zorp-corp/jock-lang",
    "drift impact includes jock-lang"
  );
  assertIncludes(
    driftingBody.impact.impactedReviewClassIds,
    "zorp-authoring",
    "jock-lang drift routes to authoring review class"
  );
  assertIncludes(
    driftingBody.impact.impactedRouteIds,
    "authoring-fixture-review",
    "jock-lang drift routes to fixture review"
  );
  assertIncludes(
    driftingBody.impact.impactedWatchMatrixIds,
    "authoring-fixtures",
    "jock-lang drift routes to authoring watch matrix"
  );
  assertIncludes(
    driftingBody.impact.impactedTargetSurfaces,
    "nockupValidation",
    "jock-lang drift names nockup validation surface"
  );
  assertIncludes(
    driftingBody.impact.impactedVerificationCommands,
    "npm run test:nockup-validation",
    "jock-lang drift names nockup verification command"
  );
  const jockImpact = findRepoImpact(driftingBody, "zorp-corp/jock-lang");
  assertEqual(
    jockImpact.sourceAuthority,
    "lineage-and-authoring-signal",
    "jock-lang drift source authority"
  );

  const missingFixturePath = writeFixture(zorp, { omitRepo: "zorp-corp/sword" });
  const missing = spawnSync(process.execPath, [scriptPath, "--fixture", missingFixturePath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assertEqual(missing.status, 1, "missing fixture exit status");
  const missingBody = JSON.parse(missing.stdout);
  assertEqual(missingBody.status, "drift", "missing fixture status");
  assertIncludes(missingBody.drift.extraLocalRepos, "zorp-corp/sword", "drift detects extra local repo");
  assertIncludes(
    missingBody.impact.impactedReviewClassIds,
    "zorp-lineage",
    "sword drift routes to lineage review class"
  );
  assertIncludes(
    missingBody.impact.impactedRouteIds,
    "pma-runtime-vocabulary-review",
    "sword drift routes to PMA vocabulary review"
  );
  assertIncludes(
    missingBody.impact.impactedTargetSurfaces,
    "stateJamRegistry",
    "sword drift names state-jam registry surface"
  );
  assertIncludes(
    missingBody.impact.impactedVerificationCommands,
    "npm run test:nockchain-pma-source-api",
    "sword drift names PMA verification command"
  );

  assertEqual(zorp.driftCheck.command, "npm run check:zorp-org-drift -- --json", "Zorp drift command");
  assertIncludes(zorp.driftCheck.compareFields, "updatedAt", "Zorp drift compare fields");
  assertIncludes(zorp.driftCheck.sourceUrls, "https://github.com/zorp-corp", "Zorp drift GitHub link");

  const runbook = await loadTypeScriptModule("src/app/api/nockchain/zorp/monitor/route.ts").GET();
  const runbookBody = await runbook.json();
  assertIncludes(
    runbookBody.localVerification.recommendedCommands,
    "npm run check:zorp-org-drift -- --json",
    "runbook recommends Zorp org drift check"
  );
  assertIncludes(
    runbookBody.monitorRunTemplates.map((template) => template.id),
    "zorp-org-drift-check",
    "runbook exposes Zorp org drift template"
  );

  const apiTest = readText("scripts/test-zorp-upstream-api.mjs");
  assertIncludes(apiTest, "driftCheck", "Zorp upstream API test covers drift check");

  const pageTest = readText("scripts/test-zorp-intelligence-page.mjs");
  assertIncludes(pageTest, "Drift Check", "Zorp page test covers drift check");

  const readme = readText("README.md");
  assertIncludes(readme, "check:zorp-org-drift", "README documents Zorp org drift check");
}

function writeFixture(zorp, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "zorp-org-drift-"));
  const fixturePath = path.join(dir, "github.json");
  const repos = zorp.repositories
    .filter((repo) => repo.fullName !== options.omitRepo)
    .map((repo) => {
      const updatedAt =
        repo.fullName === options.mutateRepo && options.mutateUpdatedAt
          ? options.mutateUpdatedAt
          : repo.updatedAt;

      return {
        name: repo.name,
        full_name: repo.fullName,
        html_url: repo.url,
        description: repo.description,
        archived: repo.archived,
        fork: repo.fork,
        language: repo.language,
        updated_at: updatedAt,
        pushed_at: repo.pushedAt,
        stargazers_count: repo.stars,
        open_issues_count: repo.openIssues,
        default_branch: repo.defaultBranch
      };
    });

  writeFileSync(fixturePath, JSON.stringify({ repos }, null, 2));

  return fixturePath;
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

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertFile(relativePath) {
  if (!existsSync(path.join(process.cwd(), relativePath))) {
    throw new Error(`Missing file: ${relativePath}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(collection, expected, label) {
  if (!collection?.includes?.(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}

function findRepoImpact(report, repoFullName) {
  const repoImpact = report.impact.repoImpacts.find((entry) => entry.repoFullName === repoFullName);

  if (!repoImpact) {
    throw new Error(`Missing repo impact for ${repoFullName}`);
  }

  return repoImpact;
}
