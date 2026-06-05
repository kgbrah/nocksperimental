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
  assertFileExists("schemas/nockapp-launch-evidence.schema.json");
  assertFileExists("src/data/launch-evidence.json");

  const launchEvidence = loadTypeScriptModule("src/lib/launch-evidence.ts");
  const index = launchEvidence.createLaunchEvidenceIndex();

  assertEqual(index.version, "v0", "launch evidence index version");
  assertEqual(index.service, "nocksperimental", "launch evidence index service");
  assertGreaterThan(index.totalCases, 0, "launch evidence case count");
  assertGreaterThan(index.totalReports, 0, "launch evidence report count");
  assertIncludes(index.capabilities, "launch-evidence-reports", "launch evidence capability");

  const firstCase = index.cases[0];
  assertNonEmpty(firstCase.caseId, "first case id");
  assertNonEmpty(firstCase.workspaceSlug, "first case workspace slug");
  assertNonEmpty(firstCase.report.reportSlug, "first case report slug");
  assertNonEmpty(firstCase.report.reportHash, "first case report hash");
  assertNonEmpty(firstCase.report.snapshotRoot, "first case snapshot root");
  assertEqual(firstCase.customerLane, "builder-auditor", "first case customer lane");

  const foundCase = launchEvidence.launchEvidenceCaseForId(firstCase.caseId);
  assertEqual(foundCase?.caseId, firstCase.caseId, "case lookup by id");
  assertEqual(launchEvidence.launchEvidenceCaseForId("missing-launch-case"), null, "missing case lookup");

  const workspaceCases = launchEvidence.launchEvidenceCasesForWorkspace(firstCase.workspaceSlug);
  assertGreaterThan(workspaceCases.length, 0, "workspace case count");
  assertIncludes(
    workspaceCases.map((candidate) => candidate.caseId),
    firstCase.caseId,
    "workspace cases include first case"
  );

  const goodVerification = launchEvidence.verifyLaunchEvidenceReport({
    caseId: firstCase.caseId,
    reportHash: firstCase.report.reportHash,
    snapshotRoot: firstCase.report.snapshotRoot
  });
  assertEqual(goodVerification.verified, true, "good launch evidence verification");

  const badVerification = launchEvidence.verifyLaunchEvidenceReport({
    caseId: firstCase.caseId,
    reportHash: "sha256:bad-report-hash",
    snapshotRoot: firstCase.report.snapshotRoot
  });
  assertEqual(badVerification.verified, false, "bad launch evidence verification");

  await assertLaunchEvidenceRoutes(firstCase);
  await assertRegistrySurfaces(firstCase);
  assertPackageAndDocs();
}

async function assertLaunchEvidenceRoutes(firstCase) {
  const { GET: getIndex } = loadTypeScriptModule("src/app/api/launch-evidence/route.ts");
  const indexResponse = await getIndex();
  const indexBody = await indexResponse.json();

  assertEqual(indexResponse.status, 200, "launch evidence API index status");
  assertEqual(indexBody.version, "v0", "launch evidence API index version");
  assertEqual(indexBody.service, "nocksperimental", "launch evidence API index service");
  assertGreaterThan(indexBody.totalCases, 0, "launch evidence API total cases");
  assertIncludes(indexBody.capabilities, "launch-evidence-reports", "launch evidence API capability");

  const { GET: getCase } = loadTypeScriptModule("src/app/api/launch-evidence/[caseId]/route.ts");
  const detailResponse = await getCase(
    new Request(`https://nocksperimental.com/api/launch-evidence/${firstCase.caseId}`),
    createContext({ caseId: firstCase.caseId })
  );
  const detailBody = await detailResponse.json();

  assertEqual(detailResponse.status, 200, "launch evidence detail status");
  assertEqual(detailBody.case.caseId, firstCase.caseId, "launch evidence detail case id");
  assertEqual(detailBody.case.report.reportHash, firstCase.report.reportHash, "launch evidence detail report hash");

  const missingResponse = await getCase(
    new Request("https://nocksperimental.com/api/launch-evidence/missing-launch-case"),
    createContext({ caseId: "missing-launch-case" })
  );
  const missingBody = await missingResponse.json();

  assertEqual(missingResponse.status, 404, "missing launch evidence case status");
  assertEqual(missingBody.error, "Launch Evidence case not found.", "missing launch evidence case error");

  const { POST: verifyReport } = loadTypeScriptModule("src/app/api/launch-evidence/verify/route.ts");
  const goodResponse = await verifyReport(
    new Request("https://nocksperimental.com/api/launch-evidence/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        caseId: firstCase.caseId,
        reportHash: firstCase.report.reportHash,
        snapshotRoot: firstCase.report.snapshotRoot
      })
    })
  );
  const goodBody = await goodResponse.json();

  assertEqual(goodResponse.status, 200, "launch evidence verifier status");
  assertEqual(goodBody.version, "v0", "launch evidence verifier version");
  assertEqual(goodBody.verified, true, "launch evidence verifier good result");

  const badResponse = await verifyReport(
    new Request("https://nocksperimental.com/api/launch-evidence/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        caseId: firstCase.caseId,
        reportHash: "sha256:bad-report-hash",
        snapshotRoot: firstCase.report.snapshotRoot
      })
    })
  );
  const badBody = await badResponse.json();

  assertEqual(badResponse.status, 200, "launch evidence bad verifier status");
  assertEqual(badBody.verified, false, "launch evidence verifier bad result");
}

async function assertRegistrySurfaces(firstCase) {
  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();

  assertEndpoint(registryBody, "launch-evidence", "/api/launch-evidence");
  assertEndpoint(registryBody, "launch-evidence-verifier", "/api/launch-evidence/verify");
  assertGreaterThan(registryBody.counts.launchEvidenceCases, 0, "registry launch evidence case count");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();

  assertEqual(
    wellKnownBody.links.launchEvidence,
    "https://nocksperimental.com/api/launch-evidence",
    "well-known launch evidence link"
  );
  assertEqual(
    wellKnownBody.links.launchEvidenceVerifier,
    "https://nocksperimental.com/api/launch-evidence/verify",
    "well-known launch evidence verifier link"
  );
  assertIncludes(wellKnownBody.capabilities, "launch-evidence-reports", "well-known launch evidence capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();

  assertEqual(
    openApiBody.paths["/api/launch-evidence"]?.get?.summary,
    "Launch Evidence report index",
    "OpenAPI launch evidence index summary"
  );
  assertEqual(
    openApiBody.paths["/api/launch-evidence/{caseId}"]?.get?.summary,
    "Launch Evidence case detail",
    "OpenAPI launch evidence detail summary"
  );
  assertEqual(
    openApiBody.paths["/api/launch-evidence/verify"]?.post?.summary,
    "Verify Launch Evidence report",
    "OpenAPI launch evidence verifier summary"
  );

  const verificationIndex = await loadTypeScriptModule("src/app/api/verify/route.ts").GET();
  const verificationBody = await verificationIndex.json();

  assertVerifier(verificationBody, "launch-evidence", "/api/launch-evidence/verify");
  assertIncludes(verificationBody.samples.launchEvidence.url, firstCase.caseId, "verification sample case id");
}

function assertPackageAndDocs() {
  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));

  assertEqual(
    packageJson.scripts["test:launch-evidence-api"],
    "node scripts/test-launch-evidence-api.mjs",
    "package launch evidence API script"
  );
  assertEqual(
    packageJson.scripts["verify:launch-evidence"],
    "node scripts/verify-launch-evidence.mjs",
    "package launch evidence verify script"
  );
  assertIncludes(packageJson.scripts.test, "npm run test:launch-evidence-api", "full test includes launch evidence API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "## Launch Evidence", "README Launch Evidence section");
  assertIncludes(readme, "/api/launch-evidence/verify", "README Launch Evidence verifier endpoint");
}

function createContext(params) {
  return {
    params: Promise.resolve(params)
  };
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  assertFileExists(relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  const source = readFileSync(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
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

    if (specifier === "next/navigation") {
      return {
        notFound: () => {
          throw new Error("notFound");
        }
      };
    }

    if (specifier === "next/link") {
      return function Link(props) {
        return props;
      };
    }

    if (specifier === "lucide-react") {
      return new Proxy(
        {},
        {
          get: (_target, property) => function Icon(props) {
            return { icon: String(property), props };
          }
        }
      );
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

function assertEndpoint(body, id, pathName, description) {
  const endpoint = body.endpoints.find((candidate) => candidate.id === id);

  assertEqual(endpoint?.path, pathName, `${id} endpoint path`);
  assertEqual(endpoint?.url, `${body.canonicalBaseUrl}${pathName}`, `${id} endpoint URL`);

  if (description !== undefined) {
    assertEqual(endpoint?.description, description, `${id} endpoint description`);
  }
}

function assertVerifier(body, id, pathName, description) {
  const verifier = body.verifiers.find((candidate) => candidate.id === id);

  assertEqual(verifier?.path, pathName, `${id} verifier path`);
  assertEqual(verifier?.url, `https://nocksperimental.com${pathName}`, `${id} verifier URL`);

  if (description !== undefined) {
    assertEqual(verifier?.description, description, `${id} verifier description`);
  }
}

function assertFileExists(relativePath) {
  if (!existsSync(path.join(process.cwd(), relativePath))) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertGreaterThan(actual, expectedMinimum, label) {
  if (!(actual > expectedMinimum)) {
    throw new Error(`${label}: expected more than ${expectedMinimum}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function assertNonEmpty(actual, label) {
  if (typeof actual !== "string" || actual.length === 0) {
    throw new Error(`${label}: expected non-empty string, got ${JSON.stringify(actual)}`);
  }
}
