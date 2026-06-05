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
  assertEqual(body.monitorBrief.generatedAt, "2026-06-05T23:58:00.000Z", "monitor brief timestamp");
  assertEqual(body.monitorBrief.snapshot.publicRepoCount, 10, "monitor brief repo count");
  assertEqual(body.monitorBrief.snapshot.activeCoreRepos, 1, "monitor brief active core repos");
  assertEqual(body.monitorBrief.snapshot.archivedLineageRepos, 2, "monitor brief archived lineage repos");
  assertIncludes(body.monitorBrief.priorityRepos, "zorp-corp/jock-lang", "priority tracks Jock");
  assertIncludes(body.monitorBrief.priorityRepos, "zorp-corp/nockapp", "priority tracks NockApp lineage");
  assertIncludes(body.monitorBrief.priorityRepos, "zorp-corp/sword", "priority tracks Sword lineage");
  assertIncludes(body.monitorBrief.priorityRepos, "nockchain/nockchain", "priority tracks canonical Nockchain");
  assertIncludes(body.monitorBrief.riskFlags, "legacy-repos-are-lineage-not-authority", "lineage risk flag");
  assertIncludes(body.monitorBrief.riskFlags, "state-jam-folder-is-metadata-only", "state-jam risk flag");
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
  assertIncludes(page, "Monitor Brief", "Zorp page renders monitor brief");
  assertIncludes(page, "zorp-corp/jock-lang", "Zorp page renders Jock priority");
  assertIncludes(page, "zorp-corp/nockapp", "Zorp page renders NockApp lineage priority");
  assertIncludes(page, "zorp-corp/sword", "Zorp page renders Sword lineage priority");
  assertIncludes(page, "nockchain/nockchain", "Zorp page renders canonical Nockchain priority");
  assertIncludes(page, "state-jam folder, not a VESL folder", "Zorp page preserves Drive correction");
  assertIncludes(page, "legacy-repos-are-lineage-not-authority", "Zorp page renders lineage risk flag");
  assertIncludes(page, "state-jam-folder-is-metadata-only", "Zorp page renders state-jam risk flag");
  assertIncludes(page, 'href="/api/nockchain/zorp"', "Zorp page links API");
  assertIncludes(page, 'href="/nockchain"', "Zorp page links parent");
  assertIncludes(nockchainPage, 'href="/nockchain/zorp"', "Nockchain page links Zorp page");
  assertIncludes(readme, "/nockchain/zorp", "README documents Zorp page");
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
