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
  const { GET } = loadTypeScriptModule("src/app/api/nockchain/nockup/source/route.ts");
  const response = await GET();
  const body = await response.json();

  assertEqual(response.status, 200, "nockup source status");
  assertEqual(body.version, "v0", "nockup source version");
  assertEqual(body.service, "nocksperimental", "service name");
  assertEqual(body.subject, "nocksperimental.com", "subject");
  assertEqual(
    body.canonicalUrl,
    "https://nocksperimental.com/api/nockchain/nockup/source",
    "canonical URL"
  );
  assertEqual(body.upstream.commit.shortSha, "33ba97b1e206", "upstream commit");
  assertEqual(
    body.upstream.release.tag,
    "build-33ba97b1e206dd89b15c61b72b7802caf2136c18",
    "upstream release"
  );

  assertGreaterThan(body.sourceAnchors.length, 9, "nockup source anchor count");
  assertSourceAnchor(body, "nockup-readme-contract", "crates/nockup/README.md", "nockup project init");
  assertSourceAnchor(body, "nockup-manifest-schema", "crates/nockup/src/manifest.rs", "NockAppManifest");
  assertSourceAnchor(body, "nockup-template-init", "crates/nockup/src/commands/init.rs", "create_template_context");
  assertSourceAnchor(body, "nockup-template-cache", "crates/nockup/src/commands/common.rs", "download_templates");
  assertSourceAnchor(body, "nockup-toolchain-channel", "crates/nockup/src/commands/common.rs", "download_toolchain_files");
  assertSourceAnchor(body, "nockup-dependency-resolver", "crates/nockup/src/resolver/engine.rs", "Resolver::resolve");
  assertSourceAnchor(body, "nockup-registry-install-path", "crates/nockup/src/resolver/registry.rs", "RegistryEntry");
  assertSourceAnchor(body, "nockup-resolved-graph-order", "crates/nockup/src/resolver/types.rs", "ResolvedGraph::compute_install_order");
  assertSourceAnchor(body, "nockup-package-install-links", "crates/nockup/src/commands/package/install.rs", "link_registry_package");
  assertSourceAnchor(body, "nockup-cache-index", "crates/nockup/src/cache.rs", "PackageCache::cache_package");
  assertSourceAnchor(body, "nockup-git-fetcher", "crates/nockup/src/git_fetcher.rs", "GitFetcher::fetch");

  assertNockupCapability(body, "manifest-template-selection", "nockup-manifest-schema");
  assertNockupCapability(body, "template-cache-and-toolchain-channel", "nockup-template-cache");
  assertNockupCapability(body, "handlebars-project-scaffold", "nockup-template-init");
  assertNockupCapability(body, "dependency-resolution-and-lockfile", "nockup-dependency-resolver");
  assertNockupCapability(body, "registry-install-path-symlinks", "nockup-registry-install-path");
  assertNockupCapability(body, "git-cache-and-exact-commit", "nockup-git-fetcher");
  assertNockupCapability(body, "experimental-untrusted-code-warning", "nockup-readme-contract");

  assertIncludes(body.receiptContract.requiredFields, "nockupCommit", "receipt nockup commit");
  assertIncludes(body.receiptContract.requiredFields, "nockchainBuild", "receipt nockchain build");
  assertIncludes(body.receiptContract.requiredFields, "templateName", "receipt template name");
  assertIncludes(body.receiptContract.requiredFields, "templateCommit", "receipt template commit");
  assertIncludes(body.receiptContract.requiredFields, "manifestHash", "receipt manifest hash");
  assertIncludes(body.receiptContract.requiredFields, "dependencySpecs", "receipt dependency specs");
  assertIncludes(body.receiptContract.requiredFields, "resolvedPackageCommits", "receipt package commits");
  assertIncludes(body.receiptContract.requiredFields, "lockfileHash", "receipt lockfile hash");
  assertIncludes(body.receiptContract.requiredFields, "cacheChannel", "receipt cache channel");
  assertIncludes(body.receiptContract.requiredFields, "validationStatus", "receipt validation status");
  assertIncludes(body.receiptContract.forbiddenFields, "rawTemplateArchive", "forbid raw template archive");
  assertIncludes(body.receiptContract.forbiddenFields, "rawGitCheckout", "forbid raw git checkout");
  assertIncludes(body.receiptContract.forbiddenFields, "rawNockappToml", "forbid raw nockapp manifest");
  assertIncludes(body.receiptContract.forbiddenFields, "rawHoonSource", "forbid raw hoon source");
  assertIncludes(body.receiptContract.forbiddenFields, "rawCompiledJam", "forbid raw jam");
  assertIncludes(body.receiptContract.forbiddenFields, "gpgPrivateKey", "forbid GPG private key");

  assertIncludes(body.localVerification.recommendedCommands, "cargo check -p nockup", "Nockup check command");
  assertIncludes(body.localVerification.recommendedCommands, "cargo test -p nockup", "Nockup test command");
  assertEqual(body.localVerification.status, "source-inspected", "local verification status");
  assertGreaterThan(body.nocksperimentalImplications.length, 3, "Nocksperimental implication count");
  assertIncludes(body.upstreamWatch.openPullRequests, 125, "watch PR 125");
  assertIncludes(body.upstreamWatch.openPullRequests, 120, "watch PR 120");

  assertEqual(body.links.page, "https://nocksperimental.com/nockchain/nockup/source", "page link");
  assertEqual(body.links.upstream, "https://github.com/nockchain/nockchain", "upstream link");
  assertEqual(body.links.nockupValidationSubmit, "https://nocksperimental.com/api/nockchain/nockup/submit", "Nockup submit link");
  assertEqual(body.links.registry, "https://nocksperimental.com/api/registry", "registry link");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(
    registryBody,
    "nockchain-nockup-source-trace",
    "/api/nockchain/nockup/source",
    "Nockchain Nockup source trace"
  );

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(
    wellKnownBody.links.nockchainNockupSourceTrace,
    "https://nocksperimental.com/api/nockchain/nockup/source",
    "well-known Nockup source link"
  );
  assertIncludes(wellKnownBody.capabilities, "nockchain-nockup-source-trace", "Nockup source capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(
    openApiBody.paths["/api/nockchain/nockup/source"]?.get?.summary,
    "Nockchain Nockup source trace",
    "OpenAPI Nockup source path"
  );

  const checkpoint = await loadTypeScriptModule("src/app/api/registry/checkpoint/route.ts").GET();
  const checkpointBody = await checkpoint.json();
  assertGreaterThan(checkpointBody.counts.nockchainNockupSourceAnchors, 9, "checkpoint Nockup anchor count");
  assertEqual(
    checkpointBody.counts.nockchainNockupSourceCapabilities,
    body.nockupCapabilities.length,
    "checkpoint Nockup capability count"
  );
  assertStartsWith(checkpointBody.roots.nockchainNockupSourceTrace, "sha256:", "checkpoint Nockup root");
  assertEqual(checkpointBody.checks.nockchainNockupSourceTraceAvailable, true, "checkpoint Nockup source check");
  assertIncludes(
    checkpointBody.nockchainNockupSourceTrace.sourceAnchors,
    "nockup-manifest-schema",
    "checkpoint manifest anchor"
  );
  assertIncludes(
    checkpointBody.nockchainNockupSourceTrace.nockupCapabilityIds,
    "registry-install-path-symlinks",
    "checkpoint install path capability"
  );
  assertIncludes(
    checkpointBody.nockchainNockupSourceTrace.receiptFields,
    "templateCommit",
    "checkpoint Nockup receipt field"
  );
  assertIncludes(
    checkpointBody.nockchainNockupSourceTrace.forbiddenFields,
    "rawCompiledJam",
    "checkpoint Nockup forbidden jam"
  );
  assertEqual(
    checkpointBody.links.nockchainNockupSourceTrace,
    "https://nocksperimental.com/api/nockchain/nockup/source",
    "checkpoint Nockup source link"
  );

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(
    packageJson.scripts["test:nockchain-nockup-source-api"],
    "node scripts/test-nockchain-nockup-source-api.mjs",
    "package Nockup source API test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:nockchain-nockup-source-api",
    "full test includes Nockup source API test"
  );

  const smokeSource = readFileSync(path.join(process.cwd(), "scripts/smoke-cloudflare-preview.mjs"), "utf8");
  assertIncludes(smokeSource, "/api/nockchain/nockup/source", "Cloudflare smoke includes Nockup source API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "Nockchain Nockup Source Trace", "README documents Nockup source trace");
  assertIncludes(readme, "/api/nockchain/nockup/source", "README documents Nockup source API");
}

function assertSourceAnchor(body, id, file, symbol) {
  const anchor = body.sourceAnchors.find((candidate) => candidate.id === id);

  if (!anchor) {
    throw new Error(`Missing source anchor: ${id}`);
  }

  assertEqual(anchor.file, file, `${id} file`);
  assertIncludes(anchor.symbols, symbol, `${id} symbol`);
  assertGreaterThan(anchor.sourceUrls.length, 0, `${id} source URL`);
  assertGreaterThan(anchor.receiptFields.length, 0, `${id} receipt fields`);
}

function assertNockupCapability(body, id, sourceAnchorId) {
  const capability = body.nockupCapabilities.find((candidate) => candidate.id === id);

  if (!capability) {
    throw new Error(`Missing Nockup capability: ${id}`);
  }

  assertIncludes(capability.sourceAnchorIds, sourceAnchorId, `${id} source anchor`);
  assertGreaterThan(capability.receiptFields.length, 0, `${id} receipt fields`);
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

  const dirname = path.dirname(modulePath);
  const localRequire = createLocalRequire(dirname);
  const compiled = new Function("exports", "require", "module", "__filename", "__dirname", output);
  compiled(compiledModule.exports, localRequire, compiledModule, modulePath, dirname);

  return compiledModule.exports;
}

function createLocalRequire(dirname) {
  return (specifier) => {
    if (specifier === "next/server") {
      return {
        NextResponse: {
          json(body, init = {}) {
            return Response.json(body, init);
          }
        }
      };
    }

    if (specifier.startsWith("@/")) {
      return loadAliasModule(specifier);
    }

    if (specifier.startsWith(".")) {
      const resolvedPath = path.resolve(dirname, specifier);
      const candidates = [resolvedPath, `${resolvedPath}.ts`, `${resolvedPath}.tsx`, `${resolvedPath}.js`];
      const found = candidates.find((candidate) => existsSync(candidate));

      if (found && (found.endsWith(".ts") || found.endsWith(".tsx"))) {
        return loadTypeScriptModule(path.relative(process.cwd(), found));
      }
    }

    return require(specifier);
  };
}

function loadAliasModule(specifier) {
  const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
  const jsonPath = `${aliasPath}.json`;
  const tsPath = `${aliasPath}.ts`;
  const tsxPath = `${aliasPath}.tsx`;

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
    return require(aliasPath);
  }

  if (existsSync(aliasPath) && [".ts", ".tsx"].includes(path.extname(aliasPath))) {
    return loadTypeScriptModule(path.relative(process.cwd(), aliasPath));
  }

  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }

  if (existsSync(tsPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
  }

  if (existsSync(tsxPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsxPath));
  }

  throw new Error(`Unsupported module alias: ${specifier}`);
}
