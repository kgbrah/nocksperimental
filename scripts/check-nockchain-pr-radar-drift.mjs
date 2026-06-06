#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

const pullRequestsApiUrl =
  "https://api.github.com/repos/nockchain/nockchain/pulls?state=open&per_page=100&sort=updated&direction=desc";
const issuesApiUrl =
  "https://api.github.com/repos/nockchain/nockchain/issues?state=open&per_page=100&sort=updated&direction=desc";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const radar = loadTypeScriptModule("src/lib/nockchain-pr-radar.ts").createNockchainPrRadar();
  const github = options.fixturePath
    ? loadFixture(options.fixturePath)
    : await fetchGithubSnapshot();
  const report = createDriftReport(radar, github);

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
  const [pullsResponse, issuesResponse] = await Promise.all([
    fetch(pullRequestsApiUrl, {
      headers: { "user-agent": "nocksperimental-pr-radar-drift-check" }
    }),
    fetch(issuesApiUrl, {
      headers: { "user-agent": "nocksperimental-pr-radar-drift-check" }
    })
  ]);

  if (!pullsResponse.ok) {
    throw new Error(`GitHub pulls API returned ${pullsResponse.status}`);
  }

  if (!issuesResponse.ok) {
    throw new Error(`GitHub issues API returned ${issuesResponse.status}`);
  }

  const pulls = await pullsResponse.json();
  const issues = (await issuesResponse.json()).filter((issue) => !issue.pull_request);

  return { pulls, issues };
}

function loadFixture(fixturePath) {
  const fixture = JSON.parse(readFileSync(path.resolve(fixturePath), "utf8"));

  if (!Array.isArray(fixture.pulls) || !Array.isArray(fixture.issues)) {
    throw new Error("Fixture must contain pulls and issues arrays");
  }

  return fixture;
}

function createDriftReport(radar, github) {
  const localPullRequests = radar.pullRequests.map(normalizeLocalPullRequest);
  const githubPullRequests = github.pulls.map(normalizeGithubPullRequest);
  const localIssues = radar.openIssues.map(normalizeLocalIssue);
  const githubIssues = github.issues.map(normalizeGithubIssue);
  const prDrift = compareItems(localPullRequests, githubPullRequests);
  const issueDrift = compareItems(localIssues, githubIssues);
  const metadataDrift = [...prDrift.metadataDrift, ...issueDrift.metadataDrift];
  const checks = {
    prCountsMatch: localPullRequests.length === githubPullRequests.length,
    issueCountsMatch: localIssues.length === githubIssues.length,
    prNumbersMatch: prDrift.missingLocal.length === 0 && prDrift.extraLocal.length === 0,
    issueNumbersMatch: issueDrift.missingLocal.length === 0 && issueDrift.extraLocal.length === 0,
    metadataMatches: metadataDrift.length === 0
  };
  const status = Object.values(checks).every(Boolean) ? "in-sync" : "drift";

  return {
    version: "v0",
    status,
    observedAt: new Date().toISOString(),
    sourceUrls: [pullRequestsApiUrl, issuesApiUrl],
    snapshot: {
      localOpenPullRequestCount: localPullRequests.length,
      githubOpenPullRequestCount: githubPullRequests.length,
      localOpenIssueCount: localIssues.length,
      githubOpenIssueCount: githubIssues.length,
      openPullRequestCount: radar.snapshot.openPullRequestCount,
      openIssueCount: radar.snapshot.openIssueCount,
      latestLocalUpdatedAt: radar.snapshot.latestUpdatedAt,
      latestGithubUpdatedAt: [...githubPullRequests, ...githubIssues]
        .map((item) => item.updatedAt)
        .sort()
        .at(-1)
    },
    checks,
    drift: {
      missingLocalPrNumbers: prDrift.missingLocal,
      extraLocalPrNumbers: prDrift.extraLocal,
      missingLocalIssueNumbers: issueDrift.missingLocal,
      extraLocalIssueNumbers: issueDrift.extraLocal,
      metadataDrift
    }
  };
}

function compareItems(localItems, githubItems) {
  const localByNumber = new Map(localItems.map((item) => [item.number, item]));
  const githubByNumber = new Map(githubItems.map((item) => [item.number, item]));
  const missingLocal = githubItems
    .filter((item) => !localByNumber.has(item.number))
    .map((item) => item.number)
    .sort((left, right) => left - right);
  const extraLocal = localItems
    .filter((item) => !githubByNumber.has(item.number))
    .map((item) => item.number)
    .sort((left, right) => left - right);
  const metadataDrift = [];

  for (const [number, localItem] of localByNumber) {
    const githubItem = githubByNumber.get(number);

    if (!githubItem) {
      continue;
    }

    for (const field of ["title", "draft", "updatedAt", "author"]) {
      if (localItem[field] !== githubItem[field]) {
        metadataDrift.push({
          number,
          field,
          local: localItem[field],
          github: githubItem[field]
        });
      }
    }
  }

  return { missingLocal, extraLocal, metadataDrift };
}

function normalizeLocalPullRequest(pullRequest) {
  return {
    number: pullRequest.number,
    title: pullRequest.title,
    draft: pullRequest.draft,
    updatedAt: pullRequest.updatedAt,
    author: pullRequest.author
  };
}

function normalizeGithubPullRequest(pullRequest) {
  return {
    number: pullRequest.number,
    title: pullRequest.title,
    draft: pullRequest.draft,
    updatedAt: pullRequest.updated_at,
    author: pullRequest.user?.login ?? ""
  };
}

function normalizeLocalIssue(issue) {
  return {
    number: issue.number,
    title: issue.title,
    draft: false,
    updatedAt: issue.updatedAt,
    author: issue.author
  };
}

function normalizeGithubIssue(issue) {
  return {
    number: issue.number,
    title: issue.title,
    draft: false,
    updatedAt: issue.updated_at,
    author: issue.user?.login ?? ""
  };
}

function printTextReport(report) {
  console.log(`Nockchain PR radar drift: ${report.status}`);
  console.log(`Local PRs: ${report.snapshot.localOpenPullRequestCount}`);
  console.log(`GitHub PRs: ${report.snapshot.githubOpenPullRequestCount}`);
  console.log(`Local issues: ${report.snapshot.localOpenIssueCount}`);
  console.log(`GitHub issues: ${report.snapshot.githubOpenIssueCount}`);

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
