#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

const zorpOrgApiUrl =
  "https://api.github.com/orgs/zorp-corp/repos?per_page=100&sort=updated&type=public";
const zorpGithubUrl = "https://github.com/zorp-corp";
const stateJamDriveUrl =
  "https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw";
const compareFields = [
  "name",
  "url",
  "description",
  "archived",
  "fork",
  "language",
  "updatedAt",
  "pushedAt",
  "stars",
  "openIssues",
  "defaultBranch"
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const zorp = loadTypeScriptModule("src/lib/zorp-upstream.ts").createZorpUpstreamMap();
  const runbook =
    loadTypeScriptModule("src/lib/zorp-monitor-runbook.ts").createZorpMonitorRunbook();
  const github = options.fixturePath
    ? loadFixture(options.fixturePath)
    : await fetchGithubSnapshot();
  const report = createDriftReport(zorp, github, runbook);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printTextReport(report);
  }

  if (report.status !== "in-sync") {
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  const options = {
    fixturePath: "",
    json: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--fixture") {
      const fixturePath = args[index + 1];

      if (!fixturePath) {
        throw new Error("--fixture requires a path");
      }

      options.fixturePath = fixturePath;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

async function fetchGithubSnapshot() {
  const response = await fetch(zorpOrgApiUrl, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "nocksperimental-zorp-org-drift-check"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub Zorp org API returned ${response.status}`);
  }

  return { repos: await response.json() };
}

function loadFixture(fixturePath) {
  const fixture = JSON.parse(readFileSync(path.resolve(fixturePath), "utf8"));

  if (!Array.isArray(fixture.repos)) {
    throw new Error("Fixture must contain a repos array");
  }

  return fixture;
}

function createDriftReport(zorp, github, runbook) {
  const localRepos = zorp.repositories.map(normalizeLocalRepo).sort(compareRepoNames);
  const githubRepos = github.repos.map(normalizeGithubRepo).sort(compareRepoNames);
  const repoDrift = compareRepos(localRepos, githubRepos);
  const impact = createImpactReport(zorp, runbook, repoDrift);
  const stateJamDriveClassified =
    zorp.stateJamDrive.sourceType === "zorp-nockchain-state-jam-folder" &&
    zorp.stateJamDrive.artifactPolicy === "metadata-only" &&
    zorp.stateJamDrive.classification.includes("not a VESL folder");
  const checks = {
    repoCountsMatch: localRepos.length === githubRepos.length,
    repoNamesMatch: repoDrift.missingLocalRepos.length === 0 && repoDrift.extraLocalRepos.length === 0,
    metadataMatches: repoDrift.metadataDrift.length === 0,
    stateJamDriveClassified
  };
  const status = Object.values(checks).every(Boolean) ? "in-sync" : "drift";

  return {
    version: "v0",
    status,
    observedAt: new Date().toISOString(),
    sourcePolicy: zorp.sourceAuthority.zorpOrg.sourceRole,
    sourceUrls: [zorpOrgApiUrl, zorpGithubUrl, stateJamDriveUrl],
    interpretation:
      "Zorp org drift is lineage and authoring signal drift. Treat protocol/runtime behavior as canonical only after checking nockchain/nockchain.",
    snapshot: {
      localRepoCount: localRepos.length,
      githubRepoCount: githubRepos.length,
      localLatestUpdatedAt: localRepos.map((repo) => repo.updatedAt).sort().at(-1),
      githubLatestUpdatedAt: githubRepos.map((repo) => repo.updatedAt).sort().at(-1),
      priorityRepos: zorp.monitorBrief.priorityRepos,
      stateJamDriveUrl,
      stateJamClassification: zorp.stateJamDrive.classification
    },
    checks,
    drift: repoDrift,
    impact,
    nextActions: [
      "Classify drift as authoring, lineage, state-artifact provenance, or low-signal tooling before changing product behavior.",
      "Promote only the affected Nocksperimental surface and run the verification command named by the Zorp monitor runbook.",
      "Keep raw State Jam, PMA, checkpoint, wallet, and key material out of git and public APIs.",
      ...impact.impactedVerificationCommands.map(
        (command) => `Run impacted verification command: ${command}`
      )
    ].filter(Boolean)
  };
}

function compareRepos(localRepos, githubRepos) {
  const localByName = new Map(localRepos.map((repo) => [repo.fullName, repo]));
  const githubByName = new Map(githubRepos.map((repo) => [repo.fullName, repo]));
  const missingLocalRepos = githubRepos
    .filter((repo) => !localByName.has(repo.fullName))
    .map((repo) => repo.fullName)
    .sort();
  const extraLocalRepos = localRepos
    .filter((repo) => !githubByName.has(repo.fullName))
    .map((repo) => repo.fullName)
    .sort();
  const metadataDrift = [];

  for (const [fullName, localRepo] of localByName) {
    const githubRepo = githubByName.get(fullName);

    if (!githubRepo) {
      continue;
    }

    for (const field of compareFields) {
      if (localRepo[field] !== githubRepo[field]) {
        metadataDrift.push({
          repo: fullName,
          field,
          local: localRepo[field],
          github: githubRepo[field]
        });
      }
    }
  }

  return { missingLocalRepos, extraLocalRepos, metadataDrift };
}

function createImpactReport(zorp, runbook, repoDrift) {
  const impactedRepos = uniqueSorted([
    ...repoDrift.missingLocalRepos,
    ...repoDrift.extraLocalRepos,
    ...repoDrift.metadataDrift.map((entry) => entry.repo)
  ]);
  const repoImpacts = impactedRepos.map((repoFullName) =>
    createRepoImpact(zorp, runbook, repoFullName)
  );

  return {
    impactedRepos,
    impactedSourceAuthorities: uniqueSorted(repoImpacts.map((entry) => entry.sourceAuthority)),
    impactedReviewClassIds: uniqueSorted(repoImpacts.flatMap((entry) => entry.reviewClassIds)),
    impactedRouteIds: uniqueSorted(repoImpacts.flatMap((entry) => entry.sourceRouteIds)),
    impactedWatchMatrixIds: uniqueSorted(repoImpacts.flatMap((entry) => entry.watchMatrixIds)),
    impactedRunbookRouteIds: uniqueSorted(repoImpacts.flatMap((entry) => entry.runbookRouteIds)),
    impactedTargetSurfaces: uniqueSorted(repoImpacts.flatMap((entry) => entry.targetSurfaces)),
    impactedReceiptFields: uniqueSorted(repoImpacts.flatMap((entry) => entry.receiptFields)),
    impactedVerificationCommands: uniqueSorted(
      repoImpacts.flatMap((entry) => entry.verificationCommands)
    ),
    repoImpacts
  };
}

function createRepoImpact(zorp, runbook, repoFullName) {
  const repo = zorp.repositories.find((entry) => entry.fullName === repoFullName);
  const sourceAuthority = sourceAuthorityForRepo(zorp, repoFullName);
  const reviewClasses = reviewClassesForRepo(zorp, repo);
  const sourceRoutes = zorp.collaborationFlywheel.sourceRoutes.filter(
    (route) => route.source === repoFullName
  );
  const watchMatrixEntries = zorp.repositoryWatchMatrix.filter((entry) =>
    entry.sources.includes(repoFullName)
  );
  const initialTargetSurfaces = uniqueSorted([
    ...reviewClasses.flatMap((entry) => entry.targetSurfaces ?? []),
    ...sourceRoutes.flatMap((entry) => entry.targetSurfaces ?? [])
  ]);
  const runbookRoutes = (runbook.routeMatrix ?? []).filter(
    (route) =>
      (route.triggers ?? []).some((trigger) => trigger.includes(repoFullName)) ||
      hasIntersection(route.targetSurfaces ?? [], initialTargetSurfaces)
  );
  const targetSurfaces = uniqueSorted([
    ...initialTargetSurfaces,
    ...runbookRoutes.flatMap((entry) => entry.targetSurfaces ?? [])
  ]);

  return {
    repoFullName,
    primarySignal: repo?.primarySignal ?? "unknown",
    sourceAuthority,
    reviewClassIds: uniqueSorted(reviewClasses.map((entry) => entry.id)),
    sourceRouteIds: uniqueSorted(sourceRoutes.map((entry) => entry.routeId)),
    watchMatrixIds: uniqueSorted(watchMatrixEntries.map((entry) => entry.id)),
    runbookRouteIds: uniqueSorted(runbookRoutes.map((entry) => entry.id)),
    targetSurfaces,
    receiptFields: uniqueSorted(watchMatrixEntries.flatMap((entry) => entry.receiptFields ?? [])),
    verificationCommands: uniqueSorted(
      runbookRoutes.flatMap((entry) => entry.verificationCommands ?? [])
    ),
    interpretation:
      sourceRoutes.map((entry) => entry.collaborationUse).find(Boolean) ??
      repo?.nocksperimentalUse ??
      "Review this Zorp source before changing Nocksperimental receipt assumptions."
  };
}

function sourceAuthorityForRepo(zorp, repoFullName) {
  if (repoFullName === zorp.nockchain.repository.fullName) {
    return zorp.sourceAuthority.protocol.sourceRole;
  }

  return zorp.sourceAuthority.zorpOrg.sourceRole;
}

function reviewClassesForRepo(zorp, repo) {
  if (!repo) {
    return [];
  }

  const explicitMatches = zorp.monitorReviewContract.classes.filter((entry) =>
    (entry.sourceSignals ?? []).includes(repo.fullName)
  );

  if (explicitMatches.length > 0) {
    return explicitMatches;
  }

  const fallbackIdsBySignal = {
    "language-authoring": ["zorp-authoring"],
    "nockapp-lineage": ["zorp-lineage"],
    "runtime-lineage": ["zorp-lineage"],
    "formal-semantics": ["zorp-lineage"],
    "proof-tooling": ["low-signal-tooling"],
    "build-tooling": ["low-signal-tooling"],
    "automation-tooling": ["low-signal-tooling"],
    "hoon-examples": ["low-signal-tooling"],
    "ci-tooling": ["low-signal-tooling"],
    "benchmark-tooling": ["low-signal-tooling"]
  };
  const fallbackIds = fallbackIdsBySignal[repo.primarySignal] ?? ["low-signal-tooling"];

  return zorp.monitorReviewContract.classes.filter((entry) => fallbackIds.includes(entry.id));
}

function hasIntersection(left, right) {
  const rightSet = new Set(right);

  return left.some((value) => rightSet.has(value));
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter((value) => value !== undefined && value !== null))).sort();
}

function normalizeLocalRepo(repo) {
  return {
    name: repo.name,
    fullName: repo.fullName,
    url: repo.url,
    description: repo.description ?? null,
    archived: repo.archived,
    fork: repo.fork,
    language: repo.language ?? null,
    updatedAt: repo.updatedAt,
    pushedAt: repo.pushedAt,
    stars: repo.stars,
    openIssues: repo.openIssues,
    defaultBranch: repo.defaultBranch
  };
}

function normalizeGithubRepo(repo) {
  return {
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    description: repo.description ?? null,
    archived: repo.archived,
    fork: repo.fork,
    language: repo.language ?? null,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    stars: repo.stargazers_count,
    openIssues: repo.open_issues_count,
    defaultBranch: repo.default_branch
  };
}

function compareRepoNames(left, right) {
  return left.fullName.localeCompare(right.fullName);
}

function printTextReport(report) {
  console.log(`Zorp org drift: ${report.status}`);
  console.log(`Local repos: ${report.snapshot.localRepoCount}`);
  console.log(`GitHub repos: ${report.snapshot.githubRepoCount}`);
  console.log(`Latest local update: ${report.snapshot.localLatestUpdatedAt}`);
  console.log(`Latest GitHub update: ${report.snapshot.githubLatestUpdatedAt}`);

  if (report.status === "in-sync") {
    return;
  }

  console.log(JSON.stringify(report.drift, null, 2));
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  if (!existsSync(modulePath)) {
    throw new Error(`Missing required module: ${relativePath}`);
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
