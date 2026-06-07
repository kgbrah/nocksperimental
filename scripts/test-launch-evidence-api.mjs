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
  assertLaunchEvidenceSchema();

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

  const privateCase = index.cases.find((candidate) => candidate.visibility === "private");
  assertNonEmpty(privateCase?.caseId, "private launch evidence fixture id");
  assertNonEmpty(privateCase?.report.reportHash, "private launch evidence fixture report hash");
  assertNonEmpty(privateCase?.report.snapshotRoot, "private launch evidence fixture snapshot root");

  assertFreshnessSurface(index);

  const verifiedFreshCase = index.cases.find(
    (candidate) => candidate.report.summaryStatus === "verified"
  );
  const watchCase = index.cases.find((candidate) => candidate.report.summaryStatus === "watch");
  assertNonEmpty(verifiedFreshCase?.caseId, "verified launch evidence case id");
  assertNonEmpty(watchCase?.caseId, "watch launch evidence case id");
  assertEqual(verifiedFreshCase.freshness, "fresh", "verified case pins to current commit and is fresh");
  assertEqual(watchCase.freshness, "stale", "watch/pre-launch case pins to older commit and is stale");

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
  assertEqual(goodVerification.freshness, firstCase.freshness, "verification surfaces case freshness");
  assertNonEmpty(goodVerification.sourceAnchor?.commit, "verification surfaces source anchor commit");
  assertEqual(
    goodVerification.sourceAnchor.commit,
    firstCase.sourceAnchor.commit,
    "verification source anchor matches case source anchor"
  );

  const badVerification = launchEvidence.verifyLaunchEvidenceReport({
    caseId: firstCase.caseId,
    reportHash: "sha256:bad-report-hash",
    snapshotRoot: firstCase.report.snapshotRoot
  });
  assertEqual(badVerification.verified, false, "bad launch evidence verification");

  await assertLaunchEvidenceRoutes(firstCase, privateCase);
  await assertRegistrySurfaces(firstCase);
  assertPackageAndDocs();
}

async function assertLaunchEvidenceRoutes(firstCase, privateCase) {
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
  assertEqual(detailBody.caseId, firstCase.caseId, "launch evidence detail case id");
  assertEqual(detailBody.report.reportHash, firstCase.report.reportHash, "launch evidence detail report hash");
  assertEqual(detailBody.case, undefined, "launch evidence detail omits duplicate case wrapper");

  const missingResponse = await getCase(
    new Request("https://nocksperimental.com/api/launch-evidence/missing-launch-case"),
    createContext({ caseId: "missing-launch-case" })
  );
  const missingBody = await missingResponse.json();

  assertEqual(missingResponse.status, 404, "missing launch evidence case status");
  assertEqual(missingBody.error, "Launch Evidence case not found.", "missing launch evidence case error");

  const privateDetailResponse = await getCase(
    new Request(`https://nocksperimental.com/api/launch-evidence/${privateCase.caseId}`),
    createContext({ caseId: privateCase.caseId })
  );
  const privateDetailBody = await privateDetailResponse.json();

  assertEqual(privateDetailResponse.status, 404, "private launch evidence case status");
  assertEqual(privateDetailBody.error, "Launch Evidence case not found.", "private launch evidence case error");

  const { GET: verifyReportByQuery, POST: verifyReport } = loadTypeScriptModule(
    "src/app/api/launch-evidence/verify/route.ts"
  );
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

  const goodQuery = new URLSearchParams({
    caseId: firstCase.caseId,
    reportHash: firstCase.report.reportHash,
    snapshotRoot: firstCase.report.snapshotRoot
  });
  const goodQueryResponse = await verifyReportByQuery(
    new Request(`https://nocksperimental.com/api/launch-evidence/verify?${goodQuery}`)
  );
  const goodQueryBody = await goodQueryResponse.json();

  assertEqual(goodQueryResponse.status, 200, "launch evidence GET verifier status");
  assertEqual(goodQueryBody.verified, true, "launch evidence GET verifier good result");

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

  const privateCaseIdResponse = await verifyReport(
    new Request("https://nocksperimental.com/api/launch-evidence/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        caseId: privateCase.caseId
      })
    })
  );
  const privateCaseIdBody = await privateCaseIdResponse.json();

  assertPrivateVerificationMiss(privateCaseIdResponse, privateCaseIdBody, "private caseId verification");
  assertEqual(privateCaseIdBody.caseId, privateCase.caseId, "private caseId verification echoes supplied case id");

  const privateReportHashResponse = await verifyReport(
    new Request("https://nocksperimental.com/api/launch-evidence/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        reportHash: privateCase.report.reportHash
      })
    })
  );
  const privateReportHashBody = await privateReportHashResponse.json();

  assertPrivateVerificationMiss(privateReportHashResponse, privateReportHashBody, "private reportHash verification");
  assertEqual(privateReportHashBody.caseId, null, "private reportHash verification hides case id");

  const privateSnapshotRootResponse = await verifyReportByQuery(
    new Request(
      `https://nocksperimental.com/api/launch-evidence/verify?snapshotRoot=${encodeURIComponent(
        privateCase.report.snapshotRoot
      )}`
    )
  );
  const privateSnapshotRootBody = await privateSnapshotRootResponse.json();

  assertPrivateVerificationMiss(privateSnapshotRootResponse, privateSnapshotRootBody, "private snapshotRoot verification");
  assertEqual(privateSnapshotRootBody.caseId, null, "private snapshotRoot verification hides case id");
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
    "OpenAPI launch evidence verifier POST summary"
  );
  assertEqual(
    openApiBody.paths["/api/launch-evidence/verify"]?.get?.summary,
    "Verify Launch Evidence report",
    "OpenAPI launch evidence verifier GET summary"
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
  assertIncludes(readme, "Private Launch Evidence cases", "README Launch Evidence private case note");
}

function assertLaunchEvidenceSchema() {
  const schema = JSON.parse(readFileSync(path.join(process.cwd(), "schemas/nockapp-launch-evidence.schema.json"), "utf8"));
  const data = JSON.parse(readFileSync(path.join(process.cwd(), "src/data/launch-evidence.json"), "utf8"));
  const errors = validateSchemaNode(schema, data, schema, "$");

  if (errors.length > 0) {
    throw new Error(`Launch Evidence seed data failed schema validation:\n${errors.join("\n")}`);
  }
}

function validateSchemaNode(schemaNode, value, rootSchema, location) {
  const resolvedSchema = schemaNode.$ref ? resolveSchemaRef(schemaNode.$ref, rootSchema) : schemaNode;
  const errors = [];

  if (resolvedSchema.enum && !resolvedSchema.enum.includes(value)) {
    errors.push(`${location}: expected one of ${resolvedSchema.enum.join(", ")}, got ${JSON.stringify(value)}`);
    return errors;
  }

  if (resolvedSchema.type && !matchesSchemaType(value, resolvedSchema.type)) {
    errors.push(`${location}: expected type ${JSON.stringify(resolvedSchema.type)}, got ${value === null ? "null" : typeof value}`);
    return errors;
  }

  if (resolvedSchema.format === "date-time" && typeof value === "string" && Number.isNaN(Date.parse(value))) {
    errors.push(`${location}: expected date-time string, got ${JSON.stringify(value)}`);
  }

  if (resolvedSchema.type === "object" && value && typeof value === "object" && !Array.isArray(value)) {
    const properties = resolvedSchema.properties ?? {};

    for (const requiredKey of resolvedSchema.required ?? []) {
      if (!(requiredKey in value)) {
        errors.push(`${location}: missing required property ${requiredKey}`);
      }
    }

    if (resolvedSchema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) {
          errors.push(`${location}: unexpected property ${key}`);
        }
      }
    }

    for (const [key, childSchema] of Object.entries(properties)) {
      if (key in value) {
        errors.push(...validateSchemaNode(childSchema, value[key], rootSchema, `${location}.${key}`));
      }
    }
  }

  if (resolvedSchema.type === "array" && Array.isArray(value)) {
    value.forEach((entry, index) => {
      errors.push(...validateSchemaNode(resolvedSchema.items, entry, rootSchema, `${location}[${index}]`));
    });
  }

  return errors;
}

function resolveSchemaRef(ref, rootSchema) {
  if (!ref.startsWith("#/$defs/")) {
    throw new Error(`Unsupported schema ref: ${ref}`);
  }

  const key = ref.slice("#/$defs/".length);
  const resolved = rootSchema.$defs?.[key];

  if (!resolved) {
    throw new Error(`Missing schema ref: ${ref}`);
  }

  return resolved;
}

function matchesSchemaType(value, type) {
  const types = Array.isArray(type) ? type : [type];

  return types.some((candidate) => {
    if (candidate === "array") {
      return Array.isArray(value);
    }

    if (candidate === "null") {
      return value === null;
    }

    if (candidate === "object") {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    return typeof value === candidate;
  });
}

function assertFreshnessSurface(index) {
  const validFreshness = new Set(["fresh", "stale", "unknown"]);

  assertNonEmpty(index.upstreamAnchor?.commit, "launch evidence index upstream anchor commit");

  for (const launchCase of index.cases) {
    assertNonEmpty(
      launchCase.sourceAnchor?.commit,
      `launch evidence case ${launchCase.caseId} source anchor commit`
    );
    assertNonEmpty(
      launchCase.sourceAnchor?.build,
      `launch evidence case ${launchCase.caseId} source anchor build`
    );

    if (!validFreshness.has(launchCase.freshness)) {
      throw new Error(
        `launch evidence case ${launchCase.caseId} freshness: expected fresh|stale|unknown, got ${JSON.stringify(launchCase.freshness)}`
      );
    }
  }

  const summary = index.freshnessSummary;

  if (!summary || typeof summary !== "object") {
    throw new Error(`launch evidence index freshnessSummary: expected object, got ${JSON.stringify(summary)}`);
  }

  for (const key of ["fresh", "stale", "unknown"]) {
    if (typeof summary[key] !== "number") {
      throw new Error(`launch evidence index freshnessSummary.${key}: expected number, got ${JSON.stringify(summary[key])}`);
    }
  }

  const summaryTotal = summary.fresh + summary.stale + summary.unknown;
  assertEqual(summaryTotal, index.cases.length, "launch evidence freshnessSummary totals match case count");
  assertGreaterThan(summary.fresh, 0, "launch evidence freshnessSummary fresh count");
  assertGreaterThan(summary.stale, 0, "launch evidence freshnessSummary stale count");
}

function assertPrivateVerificationMiss(response, body, label) {
  assertEqual(response.status, 200, `${label} status`);
  assertEqual(body.verified, false, `${label} verified result`);
  assertEqual(body.reportSlug, null, `${label} report slug`);
  assertEqual(body.report, null, `${label} report`);
  assertEqual(body.links.case, null, `${label} case link`);
  assertEqual(body.links.api, null, `${label} API link`);
  assertEqual(body.checks.caseMatched, false, `${label} case match`);
  assertEqual(body.checks.reportHashMatched, false, `${label} report hash match`);
  assertEqual(body.checks.snapshotRootMatched, false, `${label} snapshot root match`);
  assertEqual(body.checks.publicOrShared, false, `${label} public/shared check`);
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
