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
  assertWorkspaceEvidenceLibrary();
  await assertWorkspaceEvidenceApiRoutes();
  await assertVerificationIndexAndPage();
  await assertOpenApiPath();
  assertWorkspaceDetailPageLinks();
  assertSmokeDocsAndPackageScript();
}

function assertWorkspaceEvidenceLibrary() {
  const {
    createWorkspaceEvidenceCapsule,
    verifyWorkspaceEvidenceCapsule
  } = loadTypeScriptModule("src/lib/workspace-evidence.ts");

  const capsule = createWorkspaceEvidenceCapsule("launch-lab-private");

  assertEqual(capsule.version, "v0", "workspace evidence version");
  assertEqual(capsule.subject, "nocksperimental.com", "workspace evidence subject");
  assertEqual(capsule.workspace.slug, "launch-lab-private", "workspace evidence slug");
  assertEqual(capsule.workspace.name, "Launch Lab Private", "workspace evidence name");
  assertEqual(capsule.canonicalUrl, "https://nocksperimental.com/api/workspaces/launch-lab-private/evidence", "workspace evidence canonical URL");
  assertEqual(capsule.status, "verified", "workspace evidence status");
  assertEqual(capsule.summary.reportCount, 1, "workspace evidence report count");
  assertEqual(capsule.summary.verifiedReportCount, 1, "workspace evidence verified count");
  assertEqual(capsule.summary.unlinkedReportCount, 0, "workspace evidence unlinked count");
  assertEqual(capsule.verifier.ready, true, "workspace evidence verifier ready");
  assertEqual(capsule.verifier.inputs.workspaceSlug, "launch-lab-private", "workspace evidence verifier slug");
  assertEqual(capsule.verifier.inputs.reportIds[0], "hist-payment-prelaunch-001", "workspace evidence report input");
  assertEqual(capsule.verifier.inputs.badgeIds[0], "badge-payment-flow-verified", "workspace evidence badge input");
  assertEqual(capsule.verifier.inputs.latestSnapshotRoot, "3a6d6bff59cb624f", "workspace evidence snapshot root input");
  assertEqual(capsule.reports[0].links.generatedReport, "https://nocksperimental.com/reports/generated/payment-flow", "workspace evidence generated report link");
  assertEqual(capsule.reports[0].links.badge, "https://nocksperimental.com/trust/badges/badge-payment-flow-verified", "workspace evidence badge link");
  assertEqual(capsule.links.verify.startsWith("https://nocksperimental.com/api/workspaces/evidence/verify?"), true, "workspace evidence verify link");
  assertIncludes(capsule.links.verify, "workspaceSlug=launch-lab-private", "workspace evidence verify sample slug");
  assertIncludes(capsule.links.verify, "reportId=hist-payment-prelaunch-001", "workspace evidence verify sample report");
  assertIncludes(capsule.links.verify, "badgeId=badge-payment-flow-verified", "workspace evidence verify sample badge");

  const verification = verifyWorkspaceEvidenceCapsule({
    workspaceSlug: "launch-lab-private",
    reportIds: ["hist-payment-prelaunch-001"],
    badgeIds: ["badge-payment-flow-verified"],
    latestSnapshotRoot: "3a6d6bff59cb624f"
  });

  assertEqual(verification.verified, true, "workspace evidence verification result");
  assertEqual(verification.checks.workspaceMatched, true, "workspace evidence verification workspace match");
  assertEqual(verification.checks.reportIdsMatched, true, "workspace evidence verification report match");
  assertEqual(verification.checks.badgeIdsMatched, true, "workspace evidence verification badge match");
  assertEqual(verification.checks.latestSnapshotRootMatched, true, "workspace evidence verification snapshot match");
  assertEqual(verification.match.evidenceId, capsule.evidenceId, "workspace evidence verification match id");

  const mismatch = verifyWorkspaceEvidenceCapsule({
    workspaceSlug: "launch-lab-private",
    reportIds: ["wrong-report"],
    badgeIds: ["badge-payment-flow-verified"],
    latestSnapshotRoot: "3a6d6bff59cb624f"
  });

  assertEqual(mismatch.verified, false, "workspace evidence rejects mismatched report");
  assertEqual(mismatch.checks.reportIdsMatched, false, "workspace evidence mismatch report check");

  const missing = createWorkspaceEvidenceCapsule("missing-workspace");

  assertEqual(missing, null, "missing workspace evidence returns null");
}

async function assertWorkspaceEvidenceApiRoutes() {
  const { GET: getEvidence } = loadTypeScriptModule("src/app/api/workspaces/[workspaceSlug]/evidence/route.ts");
  const evidenceResponse = await getEvidence(createRequest(), createContext({ workspaceSlug: "launch-lab-private" }));
  const evidence = await evidenceResponse.json();

  assertEqual(evidenceResponse.status, 200, "workspace evidence API status");
  assertEqual(evidence.workspace.slug, "launch-lab-private", "workspace evidence API slug");
  assertEqual(evidence.verifier.ready, true, "workspace evidence API ready");

  const missingEvidenceResponse = await getEvidence(createRequest(), createContext({ workspaceSlug: "missing-workspace" }));
  const missingEvidence = await missingEvidenceResponse.json();

  assertEqual(missingEvidenceResponse.status, 404, "missing workspace evidence API status");
  assertEqual(missingEvidence.error, "Workspace not found", "missing workspace evidence error");

  const { GET: verifyEvidence } = loadTypeScriptModule("src/app/api/workspaces/evidence/verify/route.ts");
  const missingQueryResponse = await verifyEvidence(createRequest("https://nocksperimental.com/api/workspaces/evidence/verify"));
  const missingQuery = await missingQueryResponse.json();

  assertEqual(missingQueryResponse.status, 400, "workspace evidence verifier missing query status");
  assertEqual(missingQuery.error, "Missing workspaceSlug or reportId query parameter", "workspace evidence verifier missing query error");

  const verifyUrl = new URL("https://nocksperimental.com/api/workspaces/evidence/verify");
  verifyUrl.searchParams.set("workspaceSlug", "launch-lab-private");
  verifyUrl.searchParams.set("reportId", "hist-payment-prelaunch-001");
  verifyUrl.searchParams.set("badgeId", "badge-payment-flow-verified");
  verifyUrl.searchParams.set("latestSnapshotRoot", "3a6d6bff59cb624f");

  const verifyResponse = await verifyEvidence(createRequest(verifyUrl.toString()));
  const verification = await verifyResponse.json();

  assertEqual(verifyResponse.status, 200, "workspace evidence verifier status");
  assertEqual(verification.verified, true, "workspace evidence verifier verified");
  assertEqual(verification.match.workspaceSlug, "launch-lab-private", "workspace evidence verifier match slug");
}

async function assertVerificationIndexAndPage() {
  const { GET } = loadTypeScriptModule("src/app/api/verify/route.ts");
  const response = await GET();
  const body = await response.json();

  assertVerifier(
    body,
    "workspace-evidence",
    "/api/workspaces/evidence/verify",
    "Verify workspace evidence capsules by workspace, report, badge, and snapshot root"
  );
  assertEqual(body.samples.workspaceEvidence.workspaceSlug, "launch-lab-private", "workspace evidence sample slug");
  assertStartsWith(body.samples.workspaceEvidence.url, "https://nocksperimental.com/api/workspaces/evidence/verify?", "workspace evidence sample URL");
  assertIncludes(body.samples.workspaceEvidence.url, "workspaceSlug=launch-lab-private", "workspace evidence sample URL slug");
  assertIncludes(body.samples.workspaceEvidence.url, "reportId=hist-payment-prelaunch-001", "workspace evidence sample URL report");

  const page = readText("src/app/verify/page.tsx");

  assertIncludes(page, "samples.workspaceEvidence", "verification page workspace evidence sample");
  assertIncludes(page, 'label="Workspace evidence"', "verification page workspace evidence label");
  assertIncludes(page, 'icon="workspace"', "verification page workspace evidence icon");
}

async function assertOpenApiPath() {
  const { GET } = loadTypeScriptModule("src/app/openapi.json/route.ts");
  const response = await GET();
  const spec = await response.json();

  assertEqual(
    spec.paths["/api/workspaces/{workspaceSlug}/evidence"]?.get?.summary,
    "Workspace evidence capsule",
    "OpenAPI workspace evidence path"
  );
  assertEqual(
    spec.paths["/api/workspaces/evidence/verify"]?.get?.summary,
    "Workspace evidence verifier",
    "OpenAPI workspace evidence verifier path"
  );
}

function assertWorkspaceDetailPageLinks() {
  const page = readText("src/app/workspaces/[workspaceSlug]/page.tsx");

  assertIncludes(page, 'href={`/api/workspaces/${workspace.slug}/evidence`}', "workspace detail links evidence API");
  assertIncludes(page, "evidence.links.verify", "workspace detail links evidence verifier sample");
  assertIncludes(page, "Evidence Capsule", "workspace detail evidence action");
  assertIncludes(page, "Verify Evidence", "workspace detail verify action");
}

function assertSmokeDocsAndPackageScript() {
  const smokeScript = readText("scripts/smoke-cloudflare-preview.mjs");
  const deploymentDocs = readText("docs/deployment.md");
  const workspaceDocs = readText("docs/workspaces.md");
  const packageJson = JSON.parse(readText("package.json"));

  for (const pathName of [
    "/api/workspaces/launch-lab-private/evidence",
    "/api/workspaces/evidence/verify"
  ]) {
    assertIncludes(smokeScript, pathName, `Cloudflare smoke checks ${pathName}`);
    assertIncludes(deploymentDocs, pathName, `deployment docs mention ${pathName}`);
  }

  assertIncludes(smokeScript, "expectWorkspaceEvidenceVerification", "Cloudflare smoke verifies workspace evidence");
  assertIncludes(workspaceDocs, "workspace evidence capsule", "workspace docs mention evidence capsule");
  assertIncludes(
    packageJson.scripts.test,
    "test:workspace-evidence",
    "full test suite includes workspace evidence test"
  );
  assertEqual(
    packageJson.scripts["test:workspace-evidence"],
    "node scripts/test-workspace-evidence-api.mjs",
    "workspace evidence script"
  );
}

function createRequest(url = "https://nocksperimental.com/") {
  return { url };
}

function createContext(params) {
  return {
    params: Promise.resolve(params)
  };
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (!existsSync(modulePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }

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

    if (specifier === "next/navigation") {
      return {
        notFound: () => {
          throw new Error("notFound");
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

function assertVerifier(body, id, pathName, description) {
  const verifier = body.verifiers.find((candidate) => candidate.id === id);

  assertEqual(verifier?.path, pathName, `${id} verifier path`);
  assertEqual(verifier?.url, `https://nocksperimental.com${pathName}`, `${id} verifier URL`);
  assertEqual(verifier?.description, description, `${id} verifier description`);
  assertEqual(Array.isArray(verifier?.queryParameters), true, `${id} verifier query parameters`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertStartsWith(actual, expectedPrefix, label) {
  if (!actual?.startsWith(expectedPrefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expectedPrefix)}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}
