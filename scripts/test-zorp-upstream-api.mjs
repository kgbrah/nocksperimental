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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/zorp/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "Zorp upstream status");
  assertEqual(body.version, "v0", "Zorp upstream version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(body.canonicalUrl, "https://nocksperimental.com/api/nockchain/zorp", "canonical URL");
  assertEqual(body.scannedAt, "2026-06-05T20:15:00.000Z", "scan timestamp");

  assertEqual(body.organization.slug, "zorp-corp", "Zorp organization slug");
  assertEqual(body.organization.publicRepoCount, 10, "Zorp public repo count");
  assertEqual(body.organization.links.github, "https://github.com/zorp-corp", "Zorp GitHub link");
  assertEqual(body.organization.links.website, "https://zorp.io", "Zorp website link");

  assertEqual(body.nockchain.repository.fullName, "nockchain/nockchain", "canonical Nockchain repo");
  assertEqual(body.nockchain.repository.defaultBranch, "master", "canonical default branch");
  assertEqual(body.nockchain.latestCommit.shortSha, "33ba97b1e206", "Nockchain latest commit");
  assertEqual(
    body.nockchain.latestRelease.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "Nockchain latest release"
  );
  assertEqual(
    body.sourceAuthority.protocol.sourceRole,
    "canonical-protocol-authority",
    "protocol authority role"
  );
  assertEqual(
    body.sourceAuthority.protocol.repository,
    "nockchain/nockchain",
    "protocol authority repository"
  );
  assertIncludes(
    body.sourceAuthority.protocol.authorityDocs,
    "PROTOCOL.md",
    "protocol authority includes PROTOCOL.md"
  );
  assertEqual(
    body.sourceAuthority.zorpOrg.sourceRole,
    "lineage-and-authoring-signal",
    "Zorp source authority role"
  );
  assertEqual(body.sourceAuthority.zorpOrg.organization, "zorp-corp", "Zorp source authority org");
  assertIncludes(
    body.sourceAuthority.zorpOrg.primaryRepos,
    "zorp-corp/jock-lang",
    "Zorp authority tracks jock-lang"
  );
  assertEqual(
    body.sourceAuthority.stateJams.sourceRole,
    "state-artifact-provenance",
    "state-jam source authority role"
  );
  assertEqual(
    body.sourceAuthority.stateJams.url,
    "https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw",
    "state-jam source authority URL"
  );
  assertIncludes(
    body.sourceAuthority.decisionRules,
    "Use nockchain/nockchain Tier 0 docs for protocol claims.",
    "source authority protocol rule"
  );
  assertIncludes(
    body.sourceAuthority.decisionRules,
    "Use the Drive folder only as metadata-backed state-jam provenance, not as VESL evidence.",
    "source authority Drive rule"
  );

  const jock = findRepo(body, "jock-lang");
  assertEqual(jock.archived, false, "jock-lang active status");
  assertEqual(jock.primarySignal, "language-authoring", "jock-lang primary signal");
  assertIncludes(jock.nocksperimentalUse, "high-level Nock application authoring", "jock-lang relevance");

  const nockapp = findRepo(body, "nockapp");
  assertEqual(nockapp.archived, true, "nockapp archive status");
  assertEqual(nockapp.primarySignal, "nockapp-lineage", "nockapp lineage signal");
  assertIncludes(nockapp.nocksperimentalUse, "NockApp runtime lineage", "nockapp relevance");

  const sword = findRepo(body, "sword");
  assertEqual(sword.archived, true, "sword archive status");
  assertEqual(sword.primarySignal, "runtime-lineage", "sword runtime signal");
  assertIncludes(sword.nocksperimentalUse, "runtime persistence", "sword relevance");

  assertIncludes(body.layers.map((layer) => layer.id), "protocol-runtime", "protocol layer");
  assertIncludes(body.layers.map((layer) => layer.id), "language-authoring", "language layer");
  assertIncludes(body.layers.map((layer) => layer.id), "nockapp-lineage", "nockapp lineage layer");
  assertIncludes(body.layers.map((layer) => layer.id), "formal-semantics", "formal semantics layer");

  assertEqual(body.stateJamDrive.sourceType, "zorp-nockchain-state-jam-folder", "state-jam source type");
  assertIncludes(body.stateJamDrive.classification, "not a VESL folder", "state-jam not VESL classification");
  assertEqual(
    body.stateJamDrive.url,
    "https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw",
    "state-jam Drive URL"
  );

  assertEqual(body.monitor.active, true, "monitor active");
  assertEqual(
    body.monitor.automationId,
    "watch-zorp-nockchain-repos-and-state-jams",
    "monitor automation id"
  );
  assertEqual(body.monitor.interval, "FREQ=HOURLY;INTERVAL=6", "monitor interval");
  assertIncludes(body.monitor.watchedSources, "https://github.com/zorp-corp", "Zorp monitor source");
  assertIncludes(body.monitor.watchedSources, "https://github.com/nockchain/nockchain", "Nockchain monitor source");
  assertIncludes(body.monitor.watchedSources, body.stateJamDrive.url, "Drive monitor source");
  assertIncludes(body.monitor.highSignalChanges, "Jock language/compiler changes", "Jock monitor signal");

  assertEqual(body.repositoryWatchMatrix.length, 5, "Zorp repository watch matrix entry count");
  const canonicalRuntime = findWatchMatrixEntry(body, "canonical-runtime");
  assertEqual(canonicalRuntime.escalation, "immediate", "canonical runtime escalation");
  assertIncludes(
    canonicalRuntime.sources,
    "nockchain/nockchain",
    "canonical runtime tracks Nockchain"
  );
  assertIncludes(
    canonicalRuntime.triggers,
    "nockchain release/build tag change",
    "canonical runtime release trigger"
  );
  assertIncludes(
    canonicalRuntime.nocksperimentalActions,
    "Refresh upstream commit, release, protocol, PMA, fakenet, wallet, and bridge receipt fields before treating new evidence as comparable.",
    "canonical runtime action"
  );
  assertIncludes(canonicalRuntime.receiptFields, "nockchainCommit", "canonical runtime receipt field");
  assertIncludes(canonicalRuntime.receiptFields, "protocolTrack", "canonical runtime protocol field");

  const authoringFixtures = findWatchMatrixEntry(body, "authoring-fixtures");
  assertEqual(authoringFixtures.escalation, "review", "authoring fixtures escalation");
  assertIncludes(authoringFixtures.sources, "zorp-corp/jock-lang", "authoring fixtures tracks Jock");
  assertIncludes(
    authoringFixtures.nocksperimentalActions,
    "Review fixture authoring assumptions and decide whether Jock changes should become new NockApp lab templates.",
    "authoring fixtures action"
  );

  const lineageRuntime = findWatchMatrixEntry(body, "lineage-runtime");
  assertIncludes(lineageRuntime.sources, "zorp-corp/nockapp", "lineage runtime tracks NockApp");
  assertIncludes(lineageRuntime.sources, "zorp-corp/sword", "lineage runtime tracks Sword");
  assertEqual(lineageRuntime.escalation, "context-only", "lineage runtime escalation");

  const proofSemantics = findWatchMatrixEntry(body, "proof-and-semantics");
  assertIncludes(proofSemantics.sources, "zorp-corp/knock", "proof semantics tracks Knock");
  assertIncludes(proofSemantics.sources, "zorp-corp/sppark", "proof semantics tracks SPARK");

  const lowSignalTooling = findWatchMatrixEntry(body, "low-signal-tooling");
  assertIncludes(
    lowSignalTooling.sources,
    "zorp-corp/create-pull-request",
    "low signal tooling tracks automation fork"
  );
  assertIncludes(
    lowSignalTooling.sources,
    "zorp-corp/criterion-compare-action",
    "low signal tooling tracks benchmark action"
  );

  assertIncludes(
    body.nocksperimentalImplications.nextProductSlices,
    "Expose Zorp repo and state-jam provenance beside Nockchain receipts.",
    "Zorp provenance product slice"
  );
  assertIncludes(
    body.nocksperimentalImplications.receiptFields,
    "zorpSource",
    "Zorp source receipt field"
  );

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(registryBody, "zorp-upstream", "/api/nockchain/zorp", "Zorp/Nockchain upstream map");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.zorpUpstream,
    "https://nocksperimental.com/api/nockchain/zorp",
    "well-known Zorp upstream link"
  );
  assertIncludes(wellKnownBody.capabilities, "zorp-nockchain-upstream-map", "Zorp upstream capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/zorp"]?.get?.summary,
    "Zorp/Nockchain upstream map",
    "OpenAPI Zorp upstream path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertEqual(checkpointBody.counts.zorpRepositories, 10, "checkpoint Zorp repo count");
  assertEqual(checkpointBody.counts.zorpWatchMatrixEntries, 5, "checkpoint Zorp watch matrix count");
  assertStartsWith(checkpointBody.roots.zorpUpstream, "sha256:", "checkpoint Zorp root");
  assertEqual(
    checkpointBody.checks.zorpWatchMatrixAvailable,
    true,
    "checkpoint Zorp watch matrix check"
  );
  assertIncludes(
    checkpointBody.zorpUpstream.watchMatrixEntryIds,
    "canonical-runtime",
    "checkpoint Zorp watch matrix canonical entry"
  );
  assertIncludes(
    checkpointBody.zorpUpstream.watchMatrixEntryIds,
    "authoring-fixtures",
    "checkpoint Zorp watch matrix authoring entry"
  );
  assertIncludes(
    checkpointBody.zorpUpstream.sourceAuthorityRoles,
    "canonical-protocol-authority",
    "checkpoint source authority protocol role"
  );
  assertIncludes(
    checkpointBody.zorpUpstream.sourceAuthorityRoles,
    "state-artifact-provenance",
    "checkpoint source authority state role"
  );
  assertEqual(
    checkpointBody.links.zorpUpstream,
    "https://nocksperimental.com/api/nockchain/zorp",
    "checkpoint Zorp link"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:zorp-upstream-api"],
    "node scripts/test-zorp-upstream-api.mjs",
    "package Zorp upstream test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:zorp-upstream-api", "full test includes Zorp upstream test");

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/zorp", "Cloudflare smoke includes Zorp upstream API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Zorp/Nockchain Upstream Map", "README documents Zorp upstream map");
  assertIncludes(readme, "/api/nockchain/zorp", "README documents Zorp upstream endpoint");

  const research = readFileSync(path.join(process.cwd(), "docs/research/zorp-nockchain.md"), "utf8");
  assertIncludes(research, "state-jam folder, not a VESL folder", "research doc corrects Drive folder");
  assertIncludes(research, "zorp-corp/jock-lang", "research doc tracks jock-lang");
  assertIncludes(research, "Source Authority Matrix", "research doc explains source authority matrix");
}

function findRepo(body, name) {
  const repo = body.repositories.find((candidate) => candidate.name === name);

  if (!repo) {
    throw new Error(`Missing Zorp repo: ${name}`);
  }

  return repo;
}

function findWatchMatrixEntry(body, id) {
  const entry = body.repositoryWatchMatrix.find((candidate) => candidate.id === id);

  if (!entry) {
    throw new Error(`Missing Zorp watch matrix entry: ${id}`);
  }

  return entry;
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

function assertEndpoint(registryBody, id, pathName, description) {
  const endpoint = registryBody.endpoints.find((candidate) => candidate.id === id);

  if (!endpoint) {
    throw new Error(`Missing registry endpoint: ${id}`);
  }

  assertEqual(endpoint.path, pathName, `${id} path`);
  assertEqual(endpoint.description, description, `${id} description`);
  assertEqual(endpoint.url, `https://nocksperimental.com${pathName}`, `${id} URL`);
}

function assertIncludes(collection, expected, label) {
  if (!collection?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertStartsWith(actual, prefix, label) {
  if (typeof actual !== "string" || !actual.startsWith(prefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(prefix)}`);
  }
}
