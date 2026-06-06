#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

const rawDocsBaseUrl = "https://raw.githubusercontent.com/nockchain/nockchain/master";
const compareFields = ["path", "tier", "sha256"];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const spine = loadTypeScriptModule(
    "src/lib/nockchain-knowledge-spine.ts"
  ).createNockchainKnowledgeSpine();
  const githubSnapshot = options.fixturePath
    ? loadFixture(options.fixturePath)
    : await fetchGithubDocuments(spine.documentFingerprints);
  const report = createDriftReport(spine, githubSnapshot);

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

async function fetchGithubDocuments(localDocuments) {
  const documents = [];

  for (const doc of localDocuments) {
    const sourceUrl = createRawSourceUrl(doc.path);
    const response = await fetch(sourceUrl, {
      headers: {
        accept: "text/plain",
        "user-agent": "nocksperimental-nockchain-docs-drift-check"
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub raw document returned ${response.status}: ${sourceUrl}`);
    }

    const text = await response.text();
    documents.push({
      path: doc.path,
      sha256: createSha256(text),
      bytes: Buffer.byteLength(text, "utf8"),
      sourceUrl
    });
  }

  return { documents };
}

function loadFixture(fixturePath) {
  const fixture = JSON.parse(readFileSync(path.resolve(fixturePath), "utf8"));

  if (!Array.isArray(fixture.documents)) {
    throw new Error("Fixture must contain a documents array");
  }

  return fixture;
}

function createDriftReport(spine, githubSnapshot) {
  const localDocuments = spine.documentFingerprints
    .map(normalizeLocalDocument)
    .sort(compareDocumentPaths);
  const githubDocuments = githubSnapshot.documents
    .map(normalizeGithubDocument)
    .sort(compareDocumentPaths);
  const drift = compareDocuments(localDocuments, githubDocuments);
  const tier0Paths = localDocuments
    .filter((doc) => doc.tier === "tier0")
    .map((doc) => doc.path);
  const githubPaths = new Set(githubDocuments.map((doc) => doc.path));
  const checks = {
    documentCountsMatch: localDocuments.length === githubDocuments.length,
    documentPathsMatch:
      drift.missingLocalDocuments.length === 0 && drift.extraLocalDocuments.length === 0,
    documentHashesMatch: drift.documentHashDrift.length === 0,
    tier0DocumentsPresent: tier0Paths.every((docPath) => githubPaths.has(docPath))
  };
  const status = Object.values(checks).every(Boolean) ? "in-sync" : "drift";

  return {
    version: "v0",
    status,
    observedAt: new Date().toISOString(),
    sourceUrls: localDocuments.map((doc) => doc.sourceUrl),
    interpretation:
      "Compares Nocksperimental's pinned Nockchain Tier 0 and promoted Tier 1 document fingerprints against raw GitHub master docs.",
    snapshot: {
      localDocumentCount: localDocuments.length,
      githubDocumentCount: githubDocuments.length,
      tier0Count: tier0Paths.length,
      tier1Count: localDocuments.filter((doc) => doc.tier === "tier1").length,
      localCommit: spine.upstream.commit.sha,
      localRelease: spine.upstream.release.tag,
      readOrderHead: spine.authorityReadOrder[0] ?? null,
      compareFields
    },
    checks,
    drift,
    nextActions: [
      "Refresh src/lib/nockchain-knowledge-spine.ts before using Nockchain docs as receipt authority.",
      "Re-run knowledge spine, docs atlas, registry checkpoint, and OpenAPI tests after changing document fingerprints.",
      "Treat changed document hashes as source identity drift first; interpret protocol or runtime semantics only after reviewing the changed upstream docs."
    ]
  };
}

function compareDocuments(localDocuments, githubDocuments) {
  const localByPath = new Map(localDocuments.map((doc) => [doc.path, doc]));
  const githubByPath = new Map(githubDocuments.map((doc) => [doc.path, doc]));
  const missingLocalDocuments = githubDocuments
    .filter((doc) => !localByPath.has(doc.path))
    .map((doc) => doc.path)
    .sort();
  const extraLocalDocuments = localDocuments
    .filter((doc) => !githubByPath.has(doc.path))
    .map((doc) => doc.path)
    .sort();
  const documentHashDrift = [];

  for (const [docPath, localDocument] of localByPath) {
    const githubDocument = githubByPath.get(docPath);

    if (!githubDocument || localDocument.sha256 === githubDocument.sha256) {
      continue;
    }

    documentHashDrift.push({
      path: docPath,
      local: localDocument.sha256,
      github: githubDocument.sha256
    });
  }

  return { missingLocalDocuments, extraLocalDocuments, documentHashDrift };
}

function normalizeLocalDocument(doc) {
  return {
    path: doc.path,
    tier: doc.tier,
    sha256: doc.sha256,
    sourceUrl: createRawSourceUrl(doc.path)
  };
}

function normalizeGithubDocument(doc) {
  if (typeof doc.path !== "string" || typeof doc.sha256 !== "string") {
    throw new Error("Each fixture document must include path and sha256");
  }

  return {
    path: doc.path,
    sha256: doc.sha256,
    bytes: doc.bytes ?? null,
    sourceUrl: doc.sourceUrl ?? createRawSourceUrl(doc.path)
  };
}

function compareDocumentPaths(left, right) {
  return left.path.localeCompare(right.path);
}

function createRawSourceUrl(docPath) {
  return `${rawDocsBaseUrl}/${docPath}`;
}

function createSha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function printTextReport(report) {
  console.log(`Nockchain docs drift: ${report.status}`);
  console.log(`Local documents: ${report.snapshot.localDocumentCount}`);
  console.log(`GitHub documents: ${report.snapshot.githubDocumentCount}`);
  console.log(`Read order head: ${report.snapshot.readOrderHead}`);

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
