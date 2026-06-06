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
  assertEqual(body.monitorBrief.generatedAt, "2026-06-06T05:04:00.000Z", "monitor brief timestamp");
  assertEqual(body.monitorBrief.snapshot.publicRepoCount, 10, "monitor brief repo count");
  assertEqual(body.monitorBrief.snapshot.activeCoreRepos, 1, "monitor brief active core repos");
  assertEqual(body.monitorBrief.snapshot.archivedLineageRepos, 2, "monitor brief archived lineage repos");
  assertEqual(
    body.nockchain.canonicalRelocation.legacyUrl,
    "https://github.com/zorp-corp/nockchain",
    "monitor brief legacy Nockchain URL"
  );
  assertEqual(
    body.nockchain.canonicalRelocation.canonicalUrl,
    "https://github.com/nockchain/nockchain",
    "monitor brief canonical Nockchain URL"
  );
  assertIncludes(body.monitorBrief.priorityRepos, "zorp-corp/jock-lang", "priority tracks Jock");
  assertIncludes(body.monitorBrief.priorityRepos, "zorp-corp/nockapp", "priority tracks NockApp lineage");
  assertIncludes(body.monitorBrief.priorityRepos, "zorp-corp/sword", "priority tracks Sword lineage");
  assertIncludes(body.monitorBrief.priorityRepos, "nockchain/nockchain", "priority tracks canonical Nockchain");
  assertIncludes(body.monitorBrief.riskFlags, "legacy-repos-are-lineage-not-authority", "lineage risk flag");
  assertIncludes(
    body.monitorBrief.riskFlags,
    "zorp-corp-nockchain-redirects-to-canonical-nockchain-org",
    "legacy redirect risk flag"
  );
  assertIncludes(body.monitorBrief.riskFlags, "state-jam-folder-is-metadata-only", "state-jam risk flag");
  assertIncludes(
    body.monitorBrief.operatorActions,
    "Treat zorp-corp/nockchain as a legacy URL that redirects to nockchain/nockchain before making protocol claims.",
    "monitor brief redirect action"
  );
  assertIncludes(
    body.monitorBrief.operatorActions,
    "Promote Nockchain release, protocol-doc, fakenet, PMA, wallet, or libp2p changes into receipt fields before relying on test output.",
    "monitor brief Nockchain action"
  );
  assertIncludes(
    body.monitorBrief.operatorActions,
    "Treat zorp-corp/jock-lang changes as fixture-authoring signals and zorp-corp/nockapp or zorp-corp/sword changes as historical context.",
    "monitor brief Zorp action"
  );
  assertEqual(body.links.zorpIntelligence, "https://nocksperimental.com/nockchain/zorp", "Zorp page link");

  const pagePath = "src/app/nockchain/zorp/page.tsx";
  assertFile(pagePath);
  const page = readText(pagePath);
  const nockchainPage = readText("src/app/nockchain/page.tsx");
  const packageJson = JSON.parse(readText("package.json"));
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const readme = readText("README.md");

  assertIncludes(page, "createZorpUpstreamMap", "Zorp page uses upstream map");
  assertIncludes(page, "Zorp Intelligence", "Zorp page title");
  assertIncludes(page, "Source Authority", "Zorp page renders source authority");
  assertIncludes(page, "canonical-protocol-authority", "Zorp page renders protocol authority role");
  assertIncludes(page, "lineage-and-authoring-signal", "Zorp page renders Zorp authority role");
  assertIncludes(page, "state-artifact-provenance", "Zorp page renders state artifact authority role");
  assertIncludes(
    page,
    "zorp-corp/nockchain redirects to nockchain/nockchain",
    "Zorp page renders canonical relocation"
  );
  assertIncludes(page, "canonicalRelocation", "Zorp page labels canonical relocation");
  assertIncludes(page, "legacyUrl", "Zorp page renders legacy URL field");
  assertIncludes(page, "canonicalUrl", "Zorp page renders canonical URL field");
  assertIncludes(page, "Monitor Brief", "Zorp page renders monitor brief");
  assertIncludes(page, "zorp-corp/jock-lang", "Zorp page renders Jock priority");
  assertIncludes(page, "zorp-corp/nockapp", "Zorp page renders NockApp lineage priority");
  assertIncludes(page, "zorp-corp/sword", "Zorp page renders Sword lineage priority");
  assertIncludes(page, "nockchain/nockchain", "Zorp page renders canonical Nockchain priority");
  assertIncludes(page, "state-jam folder, not a VESL folder", "Zorp page preserves Drive correction");
  assertIncludes(page, "legacy-repos-are-lineage-not-authority", "Zorp page renders lineage risk flag");
  assertIncludes(
    page,
    "zorp-corp-nockchain-redirects-to-canonical-nockchain-org",
    "Zorp page renders legacy redirect risk flag"
  );
  assertIncludes(page, "state-jam-folder-is-metadata-only", "Zorp page renders state-jam risk flag");
  assertIncludes(page, "Drift Check", "Zorp page renders drift check");
  assertIncludes(
    page,
    "npm run check:zorp-org-drift -- --json",
    "Zorp page renders drift check command"
  );
  assertIncludes(
    page,
    "https://api.github.com/orgs/zorp-corp/repos?per_page=100&sort=updated&type=public",
    "Zorp page renders GitHub org API source"
  );
  assertIncludes(page, "defaultBranch", "Zorp page renders drift compare fields");
  assertIncludes(page, "Watch Matrix", "Zorp page renders watch matrix");
  assertIncludes(page, "canonical-runtime", "Zorp page renders canonical runtime matrix entry");
  assertIncludes(page, "authoring-fixtures", "Zorp page renders authoring fixtures matrix entry");
  assertIncludes(page, "lineage-runtime", "Zorp page renders lineage runtime matrix entry");
  assertIncludes(page, "proof-and-semantics", "Zorp page renders proof and semantics matrix entry");
  assertIncludes(page, "low-signal-tooling", "Zorp page renders low-signal tooling matrix entry");
  assertIncludes(page, "nockchain release/build tag change", "Zorp page renders canonical runtime trigger");
  assertIncludes(page, "Refresh upstream commit", "Zorp page renders matrix action");
  assertIncludes(page, "Source Notes", "Zorp page renders README-backed source notes");
  assertIncludes(page, "jock-language-preview", "Zorp page renders Jock source note");
  assertIncludes(page, "jock-compiles-to-nock", "Zorp page renders Jock source signal");
  assertIncludes(page, "nockapp-poke-peek-lineage", "Zorp page renders NockApp source note");
  assertIncludes(page, "pure-functional-state-machines", "Zorp page renders NockApp source signal");
  assertIncludes(page, "sword-persistence-lineage", "Zorp page renders Sword source note");
  assertIncludes(page, "automatic-persistence-lineage", "Zorp page renders Sword source signal");
  assertIncludes(page, "knock-formal-semantics", "Zorp page renders Knock source note");
  assertIncludes(page, "k-framework-nock-semantics", "Zorp page renders Knock source signal");
  assertIncludes(page, "sppark-proof-primitives", "Zorp page renders sppark source note");
  assertIncludes(
    page,
    "zero-knowledge-performance-primitives",
    "Zorp page renders sppark source signal"
  );
  assertIncludes(page, "Monitor Review Contract", "Zorp page renders monitor review contract");
  assertIncludes(page, "canonical-nockchain", "Zorp page renders canonical Nockchain review class");
  assertIncludes(page, "zorp-authoring", "Zorp page renders Zorp authoring review class");
  assertIncludes(page, "state-artifact-provenance", "Zorp page renders state artifact review class");
  assertIncludes(page, "nocksperimentalSurface", "Zorp page renders review evidence field");
  assertIncludes(page, "targetSurfaces", "Zorp page labels review target surfaces");
  assertIncludes(page, "Collaboration Flywheel", "Zorp page renders collaboration flywheel");
  assertIncludes(page, "zorp-monitor-to-fixture-flywheel", "Zorp page renders flywheel id");
  assertIncludes(page, "observe-upstream", "Zorp page renders observe phase");
  assertIncludes(page, "route-product-slice", "Zorp page renders product routing phase");
  assertIncludes(page, "share-collab-note", "Zorp page renders collab note phase");
  assertIncludes(page, "reviewDecision", "Zorp page renders flywheel evidence field");
  assertIncludes(page, "collaborationNoteUrl", "Zorp page renders collaboration note evidence field");
  assertIncludes(page, "rawStateJam", "Zorp page renders flywheel forbidden raw state field");
  assertIncludes(page, "canonical-runtime-refresh", "Zorp page renders canonical source route");
  assertIncludes(page, "authoring-fixture-review", "Zorp page renders Jock source route");
  assertIncludes(page, "state-jam-provenance-inventory", "Zorp page renders state-jam source route");
  assertIncludes(page, 'href="/api/nockchain/zorp"', "Zorp page links API");
  assertIncludes(page, 'href="/nockchain"', "Zorp page links parent");
  assertIncludes(nockchainPage, 'href="/nockchain/zorp"', "Nockchain page links Zorp page");
  assertIncludes(readme, "/nockchain/zorp", "README documents Zorp page");
  assertIncludes(readme, "legacy `zorp-corp/nockchain` redirect", "README documents legacy redirect");
  assertIncludes(readme, "source-authority matrix", "README documents Zorp source authority");
  assertIncludes(readme, "README-backed source notes", "README documents Zorp source notes");
  assertIncludes(readme, "Knock formal semantics", "README documents Knock source note");
  assertIncludes(readme, "sppark proof primitives", "README documents sppark source note");
  assertIncludes(readme, "monitor review contract", "README documents Zorp monitor review contract");
  assertIncludes(readme, "collaboration flywheel", "README documents Zorp collaboration flywheel");
  assertIncludes(readme, "authoring-fixture-review", "README documents Zorp authoring route");
  assertEqual(
    packageJson.scripts["test:zorp-intelligence-page"],
    "node scripts/test-zorp-intelligence-page.mjs",
    "package Zorp page test script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:zorp-intelligence-page", "full test includes Zorp page");
  assertIncludes(smokeScript, "/nockchain/zorp", "Cloudflare smoke checks Zorp page");
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
