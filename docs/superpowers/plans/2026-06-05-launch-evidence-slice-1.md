# Launch Evidence Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Launch Evidence case model, report surface, verifier, and discovery entries for NockApp builders and auditors.

**Architecture:** Add a static Launch Evidence registry that references existing workspaces, generated lab reports, fakenet receipts, and VESL receipts without introducing billing or mutable uploads yet. Expose it through focused lib helpers, API routes, public/private-facing pages, OpenAPI, `.well-known`, and verification index entries.

**Tech Stack:** Next.js App Router route handlers/pages, TypeScript, static JSON data, existing script-based Node tests, CodeGraph for structural navigation, Cloudflare/OpenNext discovery patterns already in the repo.

---

## Scope

This plan implements Slice 1 from `docs/superpowers/specs/2026-06-05-launch-evidence-design.md`.

Included:

- static Launch Evidence case data
- launch readiness report model
- API index/detail/verify routes
- public Launch Evidence pages
- workspace detail links to launch cases
- registry, `.well-known`, OpenAPI, and verification-index entries
- README documentation
- focused tests and verification script

Not included:

- live billing
- live self-serve upload storage
- human review queue
- badge issuance workflow
- operator/miner evidence cases
- paid API entitlements

## Mandatory Preflight

Run these before editing. If another agent has overlapping work, stop and coordinate.

- [ ] **Step 1: Refresh remote state**

Run:

```powershell
git -C C:\Users\kg333\nocksperimental fetch --all --prune
```

Expected: command completes without errors.

- [ ] **Step 2: Check local status and branches**

Run:

```powershell
git -C C:\Users\kg333\nocksperimental status --short --branch
git -C C:\Users\kg333\nocksperimental branch --all --verbose --no-abbrev
```

Expected: no dirty files unless they belong to the current task.

- [ ] **Step 3: Check GitHub coordination surfaces**

Run:

```powershell
gh pr list -R kgbrah/nocksperimental --state all --limit 30
gh issue list -R kgbrah/nocksperimental --state all --limit 30
```

Expected: no PR or issue already implementing Launch Evidence Slice 1.

- [ ] **Step 4: Confirm CodeGraph is current**

Run:

```powershell
codegraph index
```

Then use:

```text
codegraph_status(projectPath="C:\Users\kg333\nocksperimental")
codegraph_context(projectPath="C:\Users\kg333\nocksperimental", task="Implement Launch Evidence Slice 1 using workspaces, reports, registry, OpenAPI, verification, VESL receipts, and fakenet receipts.")
```

Expected: CodeGraph reports the current tree and includes `src/lib/vesl-evidence-submission.ts`.

## File Structure

- Create `schemas/nockapp-launch-evidence.schema.json`
  - JSON schema for the static Launch Evidence registry.
- Create `src/data/launch-evidence.json`
  - Static sample cases, submissions, reports, and payment metadata.
- Create `src/lib/launch-evidence.ts`
  - Types, loaders, lookup helpers, summary helpers, and verifier helpers.
- Create `src/app/api/launch-evidence/route.ts`
  - Lists cases and report summaries.
- Create `src/app/api/launch-evidence/[caseId]/route.ts`
  - Reads one case by id.
- Create `src/app/api/launch-evidence/verify/route.ts`
  - Verifies a case/report by case id, report hash, or snapshot root.
- Create `src/app/launch-evidence/page.tsx`
  - Public index page for Launch Evidence reports.
- Create `src/app/launch-evidence/[caseId]/page.tsx`
  - Public detail page for one Launch Evidence case.
- Create `scripts/test-launch-evidence-api.mjs`
  - Focused API, schema, discovery, and verifier test.
- Create `scripts/test-launch-evidence-pages.mjs`
  - Static page source smoke test.
- Create `scripts/verify-launch-evidence.mjs`
  - Aggregated verification command for this slice.
- Modify `package.json`
  - Adds focused scripts and includes them in `npm test`.
- Modify `README.md`
  - Adds Launch Evidence quickstart and routes.
- Modify `src/lib/registry-manifest.ts`
  - Adds registry endpoints, `.well-known` links, capabilities, and counts.
- Modify `src/lib/openapi-spec.ts`
  - Adds Launch Evidence API paths.
- Modify `src/lib/verification-index.ts`
  - Adds Launch Evidence verifier entry.
- Modify `src/app/workspaces/[workspaceSlug]/page.tsx`
  - Adds links from private workspace detail to related Launch Evidence cases.

## Task 1: Write The Failing Launch Evidence API Test

**Files:**

- Create: `scripts/test-launch-evidence-api.mjs`
- Create: `scripts/test-launch-evidence-pages.mjs`
- Create: `scripts/verify-launch-evidence.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create `scripts/test-launch-evidence-api.mjs`**

Use this exact file:

```javascript
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

  assertEqual(index.version, "v0", "index version");
  assertEqual(index.service, "nocksperimental", "index service");
  assertGreaterThan(index.totalCases, 0, "case count");
  assertGreaterThan(index.totalReports, 0, "report count");
  assertIncludes(index.capabilities, "launch-evidence-reports", "index capability");

  const firstCase = index.cases[0];
  assertNonEmpty(firstCase.caseId, "first case id");
  assertNonEmpty(firstCase.workspaceSlug, "first workspace slug");
  assertNonEmpty(firstCase.report.reportSlug, "first report slug");
  assertNonEmpty(firstCase.report.reportHash, "first report hash");
  assertNonEmpty(firstCase.report.snapshotRoot, "first snapshot root");
  assertEqual(firstCase.customerLane, "builder-auditor", "first case lane");

  const detail = launchEvidence.launchEvidenceCaseForId(firstCase.caseId);

  assertEqual(detail.caseId, firstCase.caseId, "detail case id");
  assertEqual(detail.report.reportHash, firstCase.report.reportHash, "detail report hash");
  assertGreaterThan(detail.submissions.length, 0, "detail submissions");

  const workspaceCases = launchEvidence.launchEvidenceCasesForWorkspace(firstCase.workspaceSlug);
  assertGreaterThan(workspaceCases.length, 0, "workspace case count");

  const verification = launchEvidence.verifyLaunchEvidenceReport({
    caseId: firstCase.caseId,
    reportHash: firstCase.report.reportHash,
    snapshotRoot: firstCase.report.snapshotRoot
  });

  assertEqual(verification.verified, true, "verification status");
  assertEqual(verification.caseId, firstCase.caseId, "verification case id");
  assertEqual(verification.checks.caseMatched, true, "verification case matched");
  assertEqual(verification.checks.reportHashMatched, true, "verification report hash matched");
  assertEqual(verification.checks.snapshotRootMatched, true, "verification snapshot root matched");

  const badVerification = launchEvidence.verifyLaunchEvidenceReport({
    caseId: firstCase.caseId,
    reportHash: "sha256:not-real",
    snapshotRoot: firstCase.report.snapshotRoot
  });

  assertEqual(badVerification.verified, false, "bad verification status");
  assertEqual(badVerification.checks.reportHashMatched, false, "bad report hash matched");

  const { GET: getIndex } = loadTypeScriptModule("src/app/api/launch-evidence/route.ts");
  const indexResponse = await getIndex();
  const indexBody = await indexResponse.json();

  assertEqual(indexResponse.status, 200, "index API status");
  assertEqual(indexBody.totalCases, index.totalCases, "index API total cases");

  const { GET: getDetail } = loadTypeScriptModule("src/app/api/launch-evidence/[caseId]/route.ts");
  const detailResponse = await getDetail(
    new Request(`https://nocksperimental.com/api/launch-evidence/${firstCase.caseId}`),
    { params: { caseId: firstCase.caseId } }
  );
  const detailBody = await detailResponse.json();

  assertEqual(detailResponse.status, 200, "detail API status");
  assertEqual(detailBody.caseId, firstCase.caseId, "detail API case id");

  const missingResponse = await getDetail(
    new Request("https://nocksperimental.com/api/launch-evidence/missing-case"),
    { params: { caseId: "missing-case" } }
  );
  const missingBody = await missingResponse.json();

  assertEqual(missingResponse.status, 404, "missing API status");
  assertEqual(missingBody.error, "Launch Evidence case not found.", "missing API error");

  const { GET: verify } = loadTypeScriptModule("src/app/api/launch-evidence/verify/route.ts");
  const verifyUrl = new URL("https://nocksperimental.com/api/launch-evidence/verify");
  verifyUrl.searchParams.set("caseId", firstCase.caseId);
  verifyUrl.searchParams.set("reportHash", firstCase.report.reportHash);
  verifyUrl.searchParams.set("snapshotRoot", firstCase.report.snapshotRoot);
  const verifyResponse = await verify(new Request(verifyUrl));
  const verifyBody = await verifyResponse.json();

  assertEqual(verifyResponse.status, 200, "verify API status");
  assertEqual(verifyBody.verified, true, "verify API verified");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(registryBody, "launch-evidence", "/api/launch-evidence", "Launch Evidence case registry");
  assertEndpoint(registryBody, "launch-evidence-verifier", "/api/launch-evidence/verify", "Launch Evidence report verifier");
  assertGreaterThan(registryBody.counts.launchEvidenceCases, 0, "registry launch evidence count");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(wellKnownBody.links.launchEvidence, "https://nocksperimental.com/api/launch-evidence", "well-known Launch Evidence link");
  assertEqual(wellKnownBody.links.launchEvidenceVerifier, "https://nocksperimental.com/api/launch-evidence/verify", "well-known verifier link");
  assertIncludes(wellKnownBody.capabilities, "launch-evidence-reports", "well-known Launch Evidence capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(openApiBody.paths["/api/launch-evidence"]?.get?.summary, "Launch Evidence case registry", "OpenAPI index");
  assertEqual(openApiBody.paths["/api/launch-evidence/{caseId}"]?.get?.summary, "Launch Evidence case detail", "OpenAPI detail");
  assertEqual(openApiBody.paths["/api/launch-evidence/verify"]?.get?.summary, "Launch Evidence report verifier", "OpenAPI verifier");

  const verificationIndex = await loadTypeScriptModule("src/app/api/verify/route.ts").GET();
  const verificationBody = await verificationIndex.json();
  assertVerifier(verificationBody, "launch-evidence", "/api/launch-evidence/verify");

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(packageJson.scripts["test:launch-evidence-api"], "node scripts/test-launch-evidence-api.mjs", "package API script");
  assertEqual(packageJson.scripts["verify:launch-evidence"], "node scripts/verify-launch-evidence.mjs", "package verify script");
  assertIncludes(packageJson.scripts.test, "npm run test:launch-evidence-api", "full test includes Launch Evidence API");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "## Launch Evidence", "README Launch Evidence heading");
  assertIncludes(readme, "/api/launch-evidence/verify", "README Launch Evidence verifier docs");
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
            status: init.status ?? 200,
            json: async () => body
          })
        }
      };
    }

    if (specifier === "next/navigation") {
      return {
        notFound: () => {
          const error = new Error("NEXT_NOT_FOUND");
          error.code = "NEXT_NOT_FOUND";
          throw error;
        }
      };
    }

    if (specifier === "next/link") {
      return function Link(props) {
        return props.children;
      };
    }

    if (specifier === "lucide-react") {
      return new Proxy({}, {
        get: () => function Icon() {
          return null;
        }
      });
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
  assertEqual(endpoint?.description, description, `${id} endpoint description`);
}

function assertVerifier(body, id, pathName) {
  const verifier = body.verifiers.find((candidate) => candidate.id === id);

  assertEqual(verifier?.path, pathName, `${id} verifier path`);
  assertEqual(verifier?.url, `https://nocksperimental.com${pathName}`, `${id} verifier URL`);
}

function assertFileExists(relativePath) {
  if (!existsSync(path.join(process.cwd(), relativePath))) {
    throw new Error(`Expected file to exist: ${relativePath}`);
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

function assertIncludes(haystack, needle, label) {
  if (!haystack?.includes?.(needle)) {
    throw new Error(`${label}: expected ${JSON.stringify(haystack)} to include ${JSON.stringify(needle)}`);
  }
}

function assertNonEmpty(actual, label) {
  if (typeof actual !== "string" || actual.length === 0) {
    throw new Error(`${label}: expected non-empty string, got ${JSON.stringify(actual)}`);
  }
}
```

- [ ] **Step 2: Create `scripts/test-launch-evidence-pages.mjs`**

Use this exact file:

```javascript
#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";

const files = [
  "src/app/launch-evidence/page.tsx",
  "src/app/launch-evidence/[caseId]/page.tsx",
  "src/app/workspaces/[workspaceSlug]/page.tsx"
];

for (const file of files) {
  const source = readFileSync(path.join(process.cwd(), file), "utf8");

  assertIncludes(source, "Launch Evidence", `${file} Launch Evidence text`);
}

assertIncludes(
  readFileSync(path.join(process.cwd(), "src/app/launch-evidence/page.tsx"), "utf8"),
  "createLaunchEvidenceIndex",
  "Launch Evidence page uses index helper"
);

assertIncludes(
  readFileSync(path.join(process.cwd(), "src/app/launch-evidence/[caseId]/page.tsx"), "utf8"),
  "launchEvidenceCaseForId",
  "Launch Evidence detail page uses detail helper"
);

assertIncludes(
  readFileSync(path.join(process.cwd(), "src/app/workspaces/[workspaceSlug]/page.tsx"), "utf8"),
  "launchEvidenceCasesForWorkspace",
  "Workspace detail page links Launch Evidence cases"
);

function assertIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}
```

- [ ] **Step 3: Create `scripts/verify-launch-evidence.mjs`**

Use this exact file:

```javascript
#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

const commands = [
  ["npm", ["run", "test:launch-evidence-api"]],
  ["npm", ["run", "test:launch-evidence-pages"]],
  ["npm", ["run", "test:registry-manifest"]],
  ["npm", ["run", "test:well-known-manifest"]],
  ["npm", ["run", "test:openapi-spec"]],
  ["npm", ["run", "test:verification-index-api"]]
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
```

- [ ] **Step 4: Add package scripts**

Modify `package.json` scripts:

```json
"test:launch-evidence-api": "node scripts/test-launch-evidence-api.mjs",
"test:launch-evidence-pages": "node scripts/test-launch-evidence-pages.mjs",
"verify:launch-evidence": "node scripts/verify-launch-evidence.mjs"
```

Insert these in the main `test` script after `npm run test:vesl-evidence-submit`:

```text
npm run test:launch-evidence-api && npm run test:launch-evidence-pages
```

- [ ] **Step 5: Run the focused test and verify RED**

Run:

```powershell
npm run test:launch-evidence-api
```

Expected: FAIL with the first missing file from this set:

```text
schemas/nockapp-launch-evidence.schema.json
src/data/launch-evidence.json
src/lib/launch-evidence.ts
```

- [ ] **Step 6: Commit the RED tests**

Run:

```powershell
git -C C:\Users\kg333\nocksperimental add package.json scripts/test-launch-evidence-api.mjs scripts/test-launch-evidence-pages.mjs scripts/verify-launch-evidence.mjs
git -C C:\Users\kg333\nocksperimental commit -m "test launch evidence slice"
```

Expected: commit succeeds with only test/script/package changes.

## Task 2: Add Static Launch Evidence Data And Model

**Files:**

- Create: `schemas/nockapp-launch-evidence.schema.json`
- Create: `src/data/launch-evidence.json`
- Create: `src/lib/launch-evidence.ts`

- [ ] **Step 1: Create `schemas/nockapp-launch-evidence.schema.json`**

Use this exact schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://nocksperimental.com/schemas/nockapp-launch-evidence.schema.json",
  "title": "Nocksperimental Launch Evidence Registry",
  "type": "object",
  "required": ["version", "cases", "submissions", "reports"],
  "properties": {
    "version": { "type": "string" },
    "cases": {
      "type": "array",
      "items": { "$ref": "#/$defs/case" }
    },
    "submissions": {
      "type": "array",
      "items": { "$ref": "#/$defs/submission" }
    },
    "reports": {
      "type": "array",
      "items": { "$ref": "#/$defs/report" }
    }
  },
  "$defs": {
    "case": {
      "type": "object",
      "required": [
        "caseId",
        "workspaceSlug",
        "subjectSlug",
        "subjectType",
        "customerLane",
        "status",
        "visibility",
        "createdAt",
        "updatedAt",
        "requestedBy",
        "payment",
        "evidenceIds",
        "reportSlug",
        "badgeId"
      ],
      "properties": {
        "caseId": { "type": "string" },
        "workspaceSlug": { "type": "string" },
        "subjectSlug": { "type": "string" },
        "subjectName": { "type": "string" },
        "subjectType": {
          "enum": ["nockapp", "template", "token", "bridge", "operator", "other"]
        },
        "customerLane": {
          "enum": ["builder-auditor", "operator", "integrator"]
        },
        "status": {
          "enum": ["draft", "submitted", "reviewing", "verified", "watch", "blocked", "closed"]
        },
        "visibility": {
          "enum": ["private", "shared-link", "public"]
        },
        "createdAt": { "type": "string", "format": "date-time" },
        "updatedAt": { "type": "string", "format": "date-time" },
        "requestedBy": { "type": "string" },
        "payment": {
          "type": "object",
          "required": ["status", "rail", "amount", "currency"],
          "properties": {
            "status": { "enum": ["prospective", "quoted", "invoiced", "paid", "waived"] },
            "rail": { "enum": ["manual", "usd", "nock", "x402", "none"] },
            "amount": { "type": ["number", "null"] },
            "currency": { "type": ["string", "null"] },
            "reference": { "type": ["string", "null"] }
          }
        },
        "evidenceIds": {
          "type": "array",
          "items": { "type": "string" }
        },
        "reportSlug": { "type": "string" },
        "badgeId": { "type": ["string", "null"] }
      }
    },
    "submission": {
      "type": "object",
      "required": [
        "evidenceId",
        "caseId",
        "sourceKind",
        "submittedAt",
        "submittedBy",
        "status",
        "reportHash",
        "snapshotRoot",
        "receiptId",
        "redactionSummary"
      ],
      "properties": {
        "evidenceId": { "type": "string" },
        "caseId": { "type": "string" },
        "sourceKind": {
          "enum": ["lab", "fakenet", "vesl", "workspace-upload", "nockup", "state-export", "manual"]
        },
        "sourceUrl": { "type": ["string", "null"] },
        "submittedAt": { "type": "string", "format": "date-time" },
        "submittedBy": { "type": "string" },
        "status": { "enum": ["accepted", "attention", "rejected", "verified"] },
        "reportHash": { "type": "string" },
        "snapshotRoot": { "type": "string" },
        "receiptId": { "type": ["string", "null"] },
        "redactionSummary": { "type": "string" }
      }
    },
    "report": {
      "type": "object",
      "required": [
        "reportSlug",
        "caseId",
        "summaryStatus",
        "score",
        "requiredChecks",
        "recommendedChecks",
        "evidenceSummary",
        "reviewerNotes",
        "publicSummary",
        "generatedAt",
        "reportHash",
        "snapshotRoot"
      ],
      "properties": {
        "reportSlug": { "type": "string" },
        "caseId": { "type": "string" },
        "summaryStatus": { "enum": ["verified", "watch", "blocked"] },
        "score": { "type": "number" },
        "requiredChecks": {
          "type": "array",
          "items": { "$ref": "#/$defs/check" }
        },
        "recommendedChecks": {
          "type": "array",
          "items": { "$ref": "#/$defs/check" }
        },
        "evidenceSummary": { "type": "string" },
        "reviewerNotes": { "type": "string" },
        "publicSummary": { "type": "string" },
        "generatedAt": { "type": "string", "format": "date-time" },
        "reportHash": { "type": "string" },
        "snapshotRoot": { "type": "string" }
      }
    },
    "check": {
      "type": "object",
      "required": ["id", "label", "status", "summary"],
      "properties": {
        "id": { "type": "string" },
        "label": { "type": "string" },
        "status": { "enum": ["pass", "warn", "fail"] },
        "summary": { "type": "string" }
      }
    }
  }
}
```

- [ ] **Step 2: Create `src/data/launch-evidence.json`**

Use this exact seed data:

```json
{
  "version": "v0",
  "cases": [
    {
      "caseId": "case-vesl-demo-launch-001",
      "workspaceSlug": "launch-lab-private",
      "subjectSlug": "vesl-demo",
      "subjectName": "VESL Demo App",
      "subjectType": "nockapp",
      "customerLane": "builder-auditor",
      "status": "verified",
      "visibility": "public",
      "createdAt": "2026-06-05T18:00:00.000Z",
      "updatedAt": "2026-06-05T18:20:00.000Z",
      "requestedBy": "nocksperimental",
      "payment": {
        "status": "waived",
        "rail": "none",
        "amount": null,
        "currency": null,
        "reference": "founder-demo"
      },
      "evidenceIds": [
        "evidence-vesl-demo-lab-001",
        "evidence-vesl-demo-fakenet-001",
        "evidence-vesl-demo-vesl-001"
      ],
      "reportSlug": "launch-vesl-demo-001",
      "badgeId": "badge-payment-flow-verified"
    },
    {
      "caseId": "case-payment-flow-prelaunch-001",
      "workspaceSlug": "launch-lab-private",
      "subjectSlug": "payment-flow",
      "subjectName": "Payment Flow NockApp",
      "subjectType": "nockapp",
      "customerLane": "builder-auditor",
      "status": "watch",
      "visibility": "shared-link",
      "createdAt": "2026-06-05T18:30:00.000Z",
      "updatedAt": "2026-06-05T18:45:00.000Z",
      "requestedBy": "nocksperimental",
      "payment": {
        "status": "quoted",
        "rail": "manual",
        "amount": 2500,
        "currency": "USD",
        "reference": "manual-quote-launch-001"
      },
      "evidenceIds": [
        "evidence-payment-flow-lab-001",
        "evidence-payment-flow-workspace-001"
      ],
      "reportSlug": "launch-payment-flow-001",
      "badgeId": null
    }
  ],
  "submissions": [
    {
      "evidenceId": "evidence-vesl-demo-lab-001",
      "caseId": "case-vesl-demo-launch-001",
      "sourceKind": "lab",
      "sourceUrl": "/api/reports/generated/payment-flow",
      "submittedAt": "2026-06-05T18:05:00.000Z",
      "submittedBy": "nocklab",
      "status": "verified",
      "reportHash": "sha256:4cade57672628cbe3441d134eff67d6c589a8d94c70ff989a61da26d67430c91",
      "snapshotRoot": "3a6d6bff59cb624f",
      "receiptId": null,
      "redactionSummary": "No private keys, seeds, or environment dumps included."
    },
    {
      "evidenceId": "evidence-vesl-demo-fakenet-001",
      "caseId": "case-vesl-demo-launch-001",
      "sourceKind": "fakenet",
      "sourceUrl": "/api/fakenet/evidence",
      "submittedAt": "2026-06-05T18:08:00.000Z",
      "submittedBy": "fakenet-adapter",
      "status": "accepted",
      "reportHash": "sha256:8eb7d3fff4f531eaa72893ce022df3b196edb72278d5043619c25c37a8688044",
      "snapshotRoot": "local-fakenet-root-v0",
      "receiptId": null,
      "redactionSummary": "Wallet address and endpoint only; no signing material included."
    },
    {
      "evidenceId": "evidence-vesl-demo-vesl-001",
      "caseId": "case-vesl-demo-launch-001",
      "sourceKind": "vesl",
      "sourceUrl": "/api/vesl/evidence/submit",
      "submittedAt": "2026-06-05T18:12:00.000Z",
      "submittedBy": "vesl-test",
      "status": "verified",
      "reportHash": "sha256:vesl-demo-report-v0",
      "snapshotRoot": "vesl-demo-snapshot-root-v0",
      "receiptId": "vesl_submission_demo",
      "redactionSummary": "Lifecycle tags, peek status, and hull health only."
    },
    {
      "evidenceId": "evidence-payment-flow-lab-001",
      "caseId": "case-payment-flow-prelaunch-001",
      "sourceKind": "lab",
      "sourceUrl": "/api/reports/generated/payment-flow",
      "submittedAt": "2026-06-05T18:35:00.000Z",
      "submittedBy": "nocklab",
      "status": "verified",
      "reportHash": "sha256:4cade57672628cbe3441d134eff67d6c589a8d94c70ff989a61da26d67430c91",
      "snapshotRoot": "3a6d6bff59cb624f",
      "receiptId": null,
      "redactionSummary": "Generated report hash and snapshot root only."
    },
    {
      "evidenceId": "evidence-payment-flow-workspace-001",
      "caseId": "case-payment-flow-prelaunch-001",
      "sourceKind": "workspace-upload",
      "sourceUrl": "/api/workspaces/launch-lab-private/evidence",
      "submittedAt": "2026-06-05T18:40:00.000Z",
      "submittedBy": "workspace-upload-token",
      "status": "attention",
      "reportHash": "sha256:workspace-payment-flow-v0",
      "snapshotRoot": "workspace-payment-root-v0",
      "receiptId": null,
      "redactionSummary": "Upload policy accepted metadata; reviewer notes pending."
    }
  ],
  "reports": [
    {
      "reportSlug": "launch-vesl-demo-001",
      "caseId": "case-vesl-demo-launch-001",
      "summaryStatus": "verified",
      "score": 92,
      "requiredChecks": [
        {
          "id": "lab-report-linked",
          "label": "Lab report linked",
          "status": "pass",
          "summary": "Generated lab report hash and snapshot root are present."
        },
        {
          "id": "fakenet-evidence-linked",
          "label": "Fakenet evidence linked",
          "status": "pass",
          "summary": "Fakenet readiness evidence is attached to the case."
        },
        {
          "id": "vesl-lifecycle-linked",
          "label": "VESL lifecycle evidence linked",
          "status": "pass",
          "summary": "VESL evidence includes lifecycle checks and settlement effects."
        },
        {
          "id": "secret-redaction",
          "label": "Secret redaction",
          "status": "pass",
          "summary": "Submissions report no private keys, seeds, or API secrets."
        }
      ],
      "recommendedChecks": [
        {
          "id": "badge-ready",
          "label": "Badge ready",
          "status": "pass",
          "summary": "The case is eligible for public badge display."
        },
        {
          "id": "payment-rail",
          "label": "Payment rail",
          "status": "warn",
          "summary": "Payment was waived for this founder demo; paid rail metadata remains provider-neutral."
        }
      ],
      "evidenceSummary": "VESL Demo App has lab, fakenet, and VESL lifecycle evidence attached.",
      "reviewerNotes": "Founder demo proves Launch Evidence can aggregate existing Nocksperimental evidence primitives.",
      "publicSummary": "Launch evidence verified for a VESL-style NockApp lifecycle demo.",
      "generatedAt": "2026-06-05T18:20:00.000Z",
      "reportHash": "sha256:launch-vesl-demo-001",
      "snapshotRoot": "launch-vesl-demo-root-001"
    },
    {
      "reportSlug": "launch-payment-flow-001",
      "caseId": "case-payment-flow-prelaunch-001",
      "summaryStatus": "watch",
      "score": 78,
      "requiredChecks": [
        {
          "id": "lab-report-linked",
          "label": "Lab report linked",
          "status": "pass",
          "summary": "Generated payment-flow lab report is linked."
        },
        {
          "id": "workspace-upload-linked",
          "label": "Workspace upload linked",
          "status": "warn",
          "summary": "Workspace upload metadata is present but still needs reviewer confirmation."
        },
        {
          "id": "secret-redaction",
          "label": "Secret redaction",
          "status": "pass",
          "summary": "No secret-like material is referenced by the static case."
        }
      ],
      "recommendedChecks": [
        {
          "id": "vesl-lifecycle",
          "label": "VESL lifecycle",
          "status": "warn",
          "summary": "No VESL lifecycle receipt is linked yet."
        },
        {
          "id": "badge-ready",
          "label": "Badge ready",
          "status": "warn",
          "summary": "Badge issuance should wait for reviewer confirmation."
        }
      ],
      "evidenceSummary": "Payment Flow has lab evidence and workspace upload metadata, with reviewer confirmation pending.",
      "reviewerNotes": "Keep in watch state until lifecycle or reviewer evidence is attached.",
      "publicSummary": "Pre-launch payment-flow evidence is present but not badge-ready.",
      "generatedAt": "2026-06-05T18:45:00.000Z",
      "reportHash": "sha256:launch-payment-flow-001",
      "snapshotRoot": "launch-payment-flow-root-001"
    }
  ]
}
```

- [ ] **Step 3: Create `src/lib/launch-evidence.ts`**

Use this exact module:

```typescript
import launchEvidenceData from "@/data/launch-evidence.json";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { privateWorkspaces } from "@/lib/report-history";

export type LaunchEvidenceSubjectType =
  | "nockapp"
  | "template"
  | "token"
  | "bridge"
  | "operator"
  | "other";
export type LaunchEvidenceCustomerLane = "builder-auditor" | "operator" | "integrator";
export type LaunchEvidenceCaseStatus =
  | "draft"
  | "submitted"
  | "reviewing"
  | "verified"
  | "watch"
  | "blocked"
  | "closed";
export type LaunchEvidenceVisibility = "private" | "shared-link" | "public";
export type LaunchEvidenceSubmissionSource =
  | "lab"
  | "fakenet"
  | "vesl"
  | "workspace-upload"
  | "nockup"
  | "state-export"
  | "manual";
export type LaunchEvidenceSubmissionStatus = "accepted" | "attention" | "rejected" | "verified";
export type LaunchReadinessStatus = "verified" | "watch" | "blocked";
export type LaunchEvidenceCheckStatus = "pass" | "warn" | "fail";

export type LaunchEvidencePayment = {
  status: "prospective" | "quoted" | "invoiced" | "paid" | "waived";
  rail: "manual" | "usd" | "nock" | "x402" | "none";
  amount: number | null;
  currency: string | null;
  reference: string | null;
};

export type LaunchEvidenceCase = {
  caseId: string;
  workspaceSlug: string;
  subjectSlug: string;
  subjectName: string;
  subjectType: LaunchEvidenceSubjectType;
  customerLane: LaunchEvidenceCustomerLane;
  status: LaunchEvidenceCaseStatus;
  visibility: LaunchEvidenceVisibility;
  createdAt: string;
  updatedAt: string;
  requestedBy: string;
  payment: LaunchEvidencePayment;
  evidenceIds: string[];
  reportSlug: string;
  badgeId: string | null;
};

export type LaunchEvidenceSubmission = {
  evidenceId: string;
  caseId: string;
  sourceKind: LaunchEvidenceSubmissionSource;
  sourceUrl: string | null;
  submittedAt: string;
  submittedBy: string;
  status: LaunchEvidenceSubmissionStatus;
  reportHash: string;
  snapshotRoot: string;
  receiptId: string | null;
  redactionSummary: string;
};

export type LaunchEvidenceCheck = {
  id: string;
  label: string;
  status: LaunchEvidenceCheckStatus;
  summary: string;
};

export type LaunchReadinessReport = {
  reportSlug: string;
  caseId: string;
  summaryStatus: LaunchReadinessStatus;
  score: number;
  requiredChecks: LaunchEvidenceCheck[];
  recommendedChecks: LaunchEvidenceCheck[];
  evidenceSummary: string;
  reviewerNotes: string;
  publicSummary: string;
  generatedAt: string;
  reportHash: string;
  snapshotRoot: string;
};

export type LaunchEvidenceRegistry = {
  version: string;
  cases: LaunchEvidenceCase[];
  submissions: LaunchEvidenceSubmission[];
  reports: LaunchReadinessReport[];
};

export type ResolvedLaunchEvidenceCase = LaunchEvidenceCase & {
  workspaceName: string | null;
  submissions: LaunchEvidenceSubmission[];
  report: LaunchReadinessReport;
  links: {
    api: string;
    page: string;
    verifier: string;
    workspace: string | null;
    badge: string | null;
  };
};

export type LaunchEvidenceVerificationInput = {
  caseId?: string | null;
  reportHash?: string | null;
  snapshotRoot?: string | null;
};

const registry = launchEvidenceData as LaunchEvidenceRegistry;

export const launchEvidenceCases = registry.cases.map(resolveLaunchEvidenceCase);

export function createLaunchEvidenceIndex() {
  const verifiedCases = launchEvidenceCases.filter((entry) => entry.report.summaryStatus === "verified");
  const watchCases = launchEvidenceCases.filter((entry) => entry.report.summaryStatus === "watch");
  const blockedCases = launchEvidenceCases.filter((entry) => entry.report.summaryStatus === "blocked");

  return {
    version: registry.version,
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/launch-evidence`,
    totalCases: launchEvidenceCases.length,
    totalReports: registry.reports.length,
    totals: {
      verified: verifiedCases.length,
      watch: watchCases.length,
      blocked: blockedCases.length,
      builderAuditor: launchEvidenceCases.filter((entry) => entry.customerLane === "builder-auditor").length,
      operator: launchEvidenceCases.filter((entry) => entry.customerLane === "operator").length,
      integrator: launchEvidenceCases.filter((entry) => entry.customerLane === "integrator").length
    },
    capabilities: [
      "launch-evidence-reports",
      "private-workspace-cases",
      "provider-neutral-payment-metadata",
      "public-launch-verification"
    ],
    cases: launchEvidenceCases
  };
}

export function launchEvidenceCaseForId(caseId: string) {
  return launchEvidenceCases.find((entry) => entry.caseId === caseId) ?? null;
}

export function launchEvidenceCasesForWorkspace(workspaceSlug: string) {
  return launchEvidenceCases.filter((entry) => entry.workspaceSlug === workspaceSlug);
}

export function verifyLaunchEvidenceReport(input: LaunchEvidenceVerificationInput) {
  const caseId = normalizeInput(input.caseId);
  const reportHash = normalizeInput(input.reportHash);
  const snapshotRoot = normalizeInput(input.snapshotRoot);
  const resolvedCase = caseId
    ? launchEvidenceCaseForId(caseId)
    : launchEvidenceCases.find((entry) =>
        Boolean(reportHash && entry.report.reportHash === reportHash) ||
        Boolean(snapshotRoot && entry.report.snapshotRoot === snapshotRoot)
      ) ?? null;
  const report = resolvedCase?.report ?? null;
  const checks = {
    caseMatched: Boolean(resolvedCase),
    reportHashMatched: Boolean(report && reportHash && report.reportHash === reportHash),
    snapshotRootMatched: Boolean(report && snapshotRoot && report.snapshotRoot === snapshotRoot),
    publicOrShared: Boolean(resolvedCase && resolvedCase.visibility !== "private")
  };
  const verified = checks.caseMatched && checks.reportHashMatched && checks.snapshotRootMatched;

  return {
    version: registry.version,
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/launch-evidence/verify`,
    verified,
    caseId: resolvedCase?.caseId ?? caseId,
    reportSlug: report?.reportSlug ?? null,
    query: {
      caseId,
      reportHash,
      snapshotRoot
    },
    checks,
    report: report
      ? {
          summaryStatus: report.summaryStatus,
          score: report.score,
          generatedAt: report.generatedAt,
          reportHash: report.reportHash,
          snapshotRoot: report.snapshotRoot
        }
      : null,
    links: {
      case: resolvedCase ? `${registryCanonicalBaseUrl}/launch-evidence/${resolvedCase.caseId}` : null,
      api: resolvedCase ? `${registryCanonicalBaseUrl}/api/launch-evidence/${resolvedCase.caseId}` : null
    }
  };
}

function resolveLaunchEvidenceCase(entry: LaunchEvidenceCase): ResolvedLaunchEvidenceCase {
  const report = registry.reports.find((candidate) => candidate.reportSlug === entry.reportSlug);

  if (!report) {
    throw new Error(`Launch Evidence case ${entry.caseId} references missing report ${entry.reportSlug}`);
  }

  const workspace = privateWorkspaces.find((candidate) => candidate.slug === entry.workspaceSlug);
  const submissions = registry.submissions.filter((submission) =>
    entry.evidenceIds.includes(submission.evidenceId)
  );

  return {
    ...entry,
    workspaceName: workspace?.name ?? null,
    submissions,
    report,
    links: {
      api: `/api/launch-evidence/${entry.caseId}`,
      page: `/launch-evidence/${entry.caseId}`,
      verifier:
        `/api/launch-evidence/verify?caseId=${encodeURIComponent(entry.caseId)}` +
        `&reportHash=${encodeURIComponent(report.reportHash)}` +
        `&snapshotRoot=${encodeURIComponent(report.snapshotRoot)}`,
      workspace: workspace ? `/workspaces/${workspace.slug}` : null,
      badge: entry.badgeId ? `/trust/badges/${entry.badgeId}` : null
    }
  };
}

function normalizeInput(value?: string | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
```

- [ ] **Step 4: Run the focused test**

Run:

```powershell
npm run test:launch-evidence-api
```

Expected: FAIL on missing API routes and discovery entries, not on the schema/data/lib assertions.

- [ ] **Step 5: Commit the model**

Run:

```powershell
git -C C:\Users\kg333\nocksperimental add schemas/nockapp-launch-evidence.schema.json src/data/launch-evidence.json src/lib/launch-evidence.ts
git -C C:\Users\kg333\nocksperimental commit -m "add launch evidence model"
```

Expected: commit succeeds with schema, data, and lib files.

## Task 3: Add Launch Evidence API Routes

**Files:**

- Create: `src/app/api/launch-evidence/route.ts`
- Create: `src/app/api/launch-evidence/[caseId]/route.ts`
- Create: `src/app/api/launch-evidence/verify/route.ts`

- [ ] **Step 1: Create the index route**

Create `src/app/api/launch-evidence/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createLaunchEvidenceIndex } from "@/lib/launch-evidence";

export function GET() {
  return NextResponse.json(createLaunchEvidenceIndex());
}
```

- [ ] **Step 2: Create the detail route**

Create `src/app/api/launch-evidence/[caseId]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { launchEvidenceCaseForId } from "@/lib/launch-evidence";

type LaunchEvidenceDetailRouteContext = {
  params: {
    caseId: string;
  };
};

export function GET(_request: Request, { params }: LaunchEvidenceDetailRouteContext) {
  const launchCase = launchEvidenceCaseForId(params.caseId);

  if (!launchCase) {
    return NextResponse.json(
      {
        version: "v0",
        error: "Launch Evidence case not found.",
        caseId: params.caseId
      },
      { status: 404 }
    );
  }

  return NextResponse.json(launchCase);
}
```

- [ ] **Step 3: Create the verifier route**

Create `src/app/api/launch-evidence/verify/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { verifyLaunchEvidenceReport } from "@/lib/launch-evidence";

export function GET(request: Request) {
  const url = new URL(request.url);
  const verification = verifyLaunchEvidenceReport({
    caseId: url.searchParams.get("caseId"),
    reportHash: url.searchParams.get("reportHash"),
    snapshotRoot: url.searchParams.get("snapshotRoot")
  });

  return NextResponse.json(verification, {
    status: verification.verified ? 200 : 404
  });
}
```

- [ ] **Step 4: Run the focused test**

Run:

```powershell
npm run test:launch-evidence-api
```

Expected: FAIL only on discovery, README, verification-index, and page assertions.

- [ ] **Step 5: Commit the routes**

Run:

```powershell
git -C C:\Users\kg333\nocksperimental add src/app/api/launch-evidence
git -C C:\Users\kg333\nocksperimental commit -m "add launch evidence API routes"
```

Expected: commit succeeds with the three route files.

## Task 4: Wire Registry, OpenAPI, And Verification Index

**Files:**

- Modify: `src/lib/registry-manifest.ts`
- Modify: `src/lib/openapi-spec.ts`
- Modify: `src/lib/verification-index.ts`

- [ ] **Step 1: Add Launch Evidence counts and endpoints to registry manifest**

In `src/lib/registry-manifest.ts`, add:

```typescript
import { createLaunchEvidenceIndex } from "@/lib/launch-evidence";
```

Add endpoints after `vesl-evidence-receipts`:

```typescript
{
  id: "launch-evidence",
  path: "/api/launch-evidence",
  description: "Launch Evidence case registry"
},
{
  id: "launch-evidence-verifier",
  path: "/api/launch-evidence/verify",
  description: "Launch Evidence report verifier"
}
```

Inside `createRegistryManifest`, add:

```typescript
const launchEvidence = createLaunchEvidenceIndex();
```

Add this count:

```typescript
launchEvidenceCases: launchEvidence.totalCases
```

Inside `createWellKnownRegistryManifest().links`, add:

```typescript
launchEvidence: endpointUrl("launch-evidence"),
launchEvidenceVerifier: endpointUrl("launch-evidence-verifier"),
```

Inside `capabilities`, add:

```typescript
"launch-evidence-reports",
"launch-evidence-verifier",
```

- [ ] **Step 2: Add OpenAPI detail path**

In `src/lib/openapi-spec.ts`, add:

```typescript
const launchEvidenceDetailEndpoint = {
  id: "launch-evidence-detail",
  path: "/api/launch-evidence/{caseId}",
  description: "Launch Evidence case detail"
};
```

Add `launchEvidenceDetailEndpoint` to the `endpoints` array after `...registryEndpoints`.

The `/api/launch-evidence` and `/api/launch-evidence/verify` paths come from `registryEndpoints`; only the `{caseId}` path needs a dedicated endpoint constant.

- [ ] **Step 3: Add Launch Evidence verifier**

In `src/lib/verification-index.ts`, add this verifier entry to `verificationEndpoints`:

```typescript
{
  id: "launch-evidence",
  path: "/api/launch-evidence/verify",
  description: "Verify Launch Evidence reports by case id, report hash, and snapshot root",
  queryParameters: ["caseId", "reportHash", "snapshotRoot"]
}
```

- [ ] **Step 4: Run discovery tests**

Run:

```powershell
npm run test:launch-evidence-api
npm run test:registry-manifest
npm run test:well-known-manifest
npm run test:openapi-spec
npm run test:verification-index-api
```

Expected: `test:launch-evidence-api` still fails on README/pages; discovery tests pass.

- [ ] **Step 5: Commit discovery wiring**

Run:

```powershell
git -C C:\Users\kg333\nocksperimental add src/lib/registry-manifest.ts src/lib/openapi-spec.ts src/lib/verification-index.ts
git -C C:\Users\kg333\nocksperimental commit -m "wire launch evidence discovery"
```

Expected: commit succeeds with the three modified lib files.

## Task 5: Add Launch Evidence Pages And Workspace Links

**Files:**

- Create: `src/app/launch-evidence/page.tsx`
- Create: `src/app/launch-evidence/[caseId]/page.tsx`
- Modify: `src/app/workspaces/[workspaceSlug]/page.tsx`

- [ ] **Step 1: Create the Launch Evidence index page**

Create `src/app/launch-evidence/page.tsx`:

```tsx
import {
  ArrowUpRight,
  BadgeCheck,
  FileCheck2,
  LockKeyhole,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createLaunchEvidenceIndex } from "@/lib/launch-evidence";

export default function LaunchEvidencePage() {
  const index = createLaunchEvidenceIndex();

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
            Launch Evidence
          </p>
          <h1 className="mt-2 text-4xl font-semibold">NockApp launch-readiness reports</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#3d3d35]">
            Private evidence workspaces, deterministic reports, signed receipts, and public
            verification surfaces for NockApp builders and auditors.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <Metric label="Cases" value={index.totalCases.toString()} />
            <Metric label="Verified" value={index.totals.verified.toString()} />
            <Metric label="Watch" value={index.totals.watch.toString()} />
            <Metric label="Builder lane" value={index.totals.builderAuditor.toString()} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:px-8">
        {index.cases.map((launchCase) => (
          <article
            className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
            key={launchCase.caseId}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                  {launchCase.customerLane} · {launchCase.subjectType}
                </p>
                <h2 className="mt-1 text-2xl font-semibold">{launchCase.subjectName}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#44443d]">
                  {launchCase.report.publicSummary}
                </p>
              </div>
              <StatusPill status={launchCase.report.summaryStatus} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Metric label="Score" value={launchCase.report.score.toString()} />
              <Metric label="Evidence" value={launchCase.submissions.length.toString()} />
              <Metric label="Payment" value={launchCase.payment.status} />
              <Metric label="Visibility" value={launchCase.visibility} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                className="inline-flex items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
                href={launchCase.links.page}
              >
                <FileCheck2 size={16} aria-hidden="true" />
                Open Case
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 border border-[#242424] bg-[#fdfbf4] px-4 py-2 text-sm font-medium"
                href={launchCase.links.verifier}
              >
                <ShieldCheck size={16} aria-hidden="true" />
                Verify
              </Link>
              {launchCase.links.workspace ? (
                <Link
                  className="inline-flex items-center gap-2 border border-[#242424] bg-[#fdfbf4] px-4 py-2 text-sm font-medium"
                  href={launchCase.links.workspace}
                >
                  <LockKeyhole size={16} aria-hidden="true" />
                  Workspace
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#e8ead7] px-3 py-2 font-mono text-xs uppercase">
      <BadgeCheck size={14} aria-hidden="true" />
      {status}
    </span>
  );
}
```

- [ ] **Step 2: Create the Launch Evidence detail page**

Create `src/app/launch-evidence/[caseId]/page.tsx`:

```tsx
import { ArrowLeft, ArrowUpRight, FileCheck2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { launchEvidenceCaseForId } from "@/lib/launch-evidence";

type LaunchEvidenceDetailPageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function LaunchEvidenceDetailPage({
  params
}: LaunchEvidenceDetailPageProps) {
  const { caseId } = await params;
  const launchCase = launchEvidenceCaseForId(caseId);

  if (!launchCase) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/launch-evidence">
            <ArrowLeft size={16} aria-hidden="true" />
            Launch Evidence
          </Link>
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
            {launchCase.caseId}
          </p>
          <h1 className="mt-2 text-4xl font-semibold">{launchCase.subjectName}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#3d3d35]">
            {launchCase.report.publicSummary}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <Metric label="Status" value={launchCase.report.summaryStatus} />
            <Metric label="Score" value={launchCase.report.score.toString()} />
            <Metric label="Evidence" value={launchCase.submissions.length.toString()} />
            <Metric label="Payment" value={launchCase.payment.status} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <article className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Launch Readiness</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#44443d]">{launchCase.report.evidenceSummary}</p>
          <p className="mt-3 border-t border-[#8b8b7a] pt-3 text-sm leading-6 text-[#44443d]">
            {launchCase.report.reviewerNotes}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href={launchCase.links.verifier}
            >
              <ShieldCheck size={16} aria-hidden="true" />
              Verify Report
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center gap-2 border border-[#242424] bg-[#fdfbf4] px-4 py-2 text-sm font-medium"
              href={launchCase.links.api}
            >
              Case JSON
            </Link>
          </div>
        </article>

        <div className="grid gap-4">
          <CheckList title="Required Checks" checks={launchCase.report.requiredChecks} />
          <CheckList title="Recommended Checks" checks={launchCase.report.recommendedChecks} />
          <article className="border border-[#242424] bg-[#fdfbf4] p-5">
            <h2 className="text-xl font-semibold">Evidence Sources</h2>
            <div className="mt-4 grid gap-3">
              {launchCase.submissions.map((submission) => (
                <div className="border border-[#8b8b7a] bg-white p-3" key={submission.evidenceId}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{submission.sourceKind}</p>
                      <p className="mt-1 font-mono text-xs text-[#25465d]">{submission.evidenceId}</p>
                    </div>
                    <span className="font-mono text-xs uppercase text-[#536023]">
                      {submission.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#44443d]">
                    {submission.redactionSummary}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

function CheckList({
  title,
  checks
}: {
  title: string;
  checks: Array<{ id: string; label: string; status: string; summary: string }>;
}) {
  return (
    <article className="border border-[#242424] bg-[#fdfbf4] p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3">
        {checks.map((check) => (
          <div className="border border-[#8b8b7a] bg-white p-3" key={check.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{check.label}</p>
              <span className="font-mono text-xs uppercase text-[#536023]">{check.status}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#44443d]">{check.summary}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
```

- [ ] **Step 3: Add workspace links**

In `src/app/workspaces/[workspaceSlug]/page.tsx`, add this import:

```typescript
import { launchEvidenceCasesForWorkspace } from "@/lib/launch-evidence";
```

After `const evidence = createWorkspaceEvidenceCapsule(workspace.slug);`, add:

```typescript
const launchCases = launchEvidenceCasesForWorkspace(workspace.slug);
```

Inside the Report Actions link grid, add:

```tsx
<Link
  className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-[#fdfbf4] px-4 py-3 text-sm font-medium"
  href="/launch-evidence"
>
  Launch Evidence
  <ArrowUpRight size={14} aria-hidden="true" />
</Link>
```

After the Report Actions article, add:

```tsx
{launchCases.length > 0 ? (
  <article className="mt-4 border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
    <h2 className="text-xl font-semibold">Launch Evidence</h2>
    <div className="mt-4 grid gap-3">
      {launchCases.map((launchCase) => (
        <Link
          className="flex items-center justify-between gap-3 border border-[#8b8b7a] bg-white p-3 text-sm font-medium"
          href={launchCase.links.page}
          key={launchCase.caseId}
        >
          <span>{launchCase.subjectName}</span>
          <span className="font-mono text-xs uppercase text-[#536023]">
            {launchCase.report.summaryStatus}
          </span>
        </Link>
      ))}
    </div>
  </article>
) : null}
```

- [ ] **Step 4: Run page tests**

Run:

```powershell
npm run test:launch-evidence-pages
npm run test:launch-evidence-api
```

Expected: `test:launch-evidence-pages` passes. `test:launch-evidence-api` fails only on README/package if package scripts were not committed in Task 1.

- [ ] **Step 5: Commit pages**

Run:

```powershell
git -C C:\Users\kg333\nocksperimental add src/app/launch-evidence src/app/workspaces/[workspaceSlug]/page.tsx
git -C C:\Users\kg333\nocksperimental commit -m "add launch evidence pages"
```

Expected: commit succeeds with two new page files and the workspace detail update.

## Task 6: Add README Docs And Final Verification

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Add Launch Evidence README section**

Add this section after the `## Trust and Verification` section:

```markdown
## Launch Evidence

Launch Evidence is the first paid Nocksperimental product lane for NockApp builders and auditors.
It aggregates lab reports, fakenet evidence, VESL lifecycle receipts, workspace uploads, and future
`nockup` or state-export evidence into a launch-readiness case.

Public routes:

- `/launch-evidence`
- `/launch-evidence/[caseId]`
- `/api/launch-evidence`
- `/api/launch-evidence/[caseId]`
- `/api/launch-evidence/verify`

Verify a report by case id, report hash, and snapshot root:

```bash
curl -G https://nocksperimental.com/api/launch-evidence/verify \
  --data-urlencode caseId=case-vesl-demo-launch-001 \
  --data-urlencode reportHash=sha256:launch-vesl-demo-001 \
  --data-urlencode snapshotRoot=launch-vesl-demo-root-001
```
```

- [ ] **Step 2: Run Launch Evidence verification**

Run:

```powershell
npm run verify:launch-evidence
```

Expected: PASS.

- [ ] **Step 3: Run related tests**

Run:

```powershell
npm run test:launch-evidence-api
npm run test:launch-evidence-pages
npm run test:registry-manifest
npm run test:well-known-manifest
npm run test:openapi-spec
npm run test:verification-index-api
npm run test:workspace-detail
```

Expected: PASS.

- [ ] **Step 4: Run full verification for shared surfaces**

Run:

```powershell
npm test
npm run lint
npm run build
```

Expected: PASS. If `next-env.d.ts` changes due Next build output, inspect it and restore unrelated generated path churn before committing.

- [ ] **Step 5: Sync CodeGraph**

Run:

```powershell
codegraph index
```

Expected: CodeGraph re-indexes the new Launch Evidence files.

- [ ] **Step 6: Commit docs and final wiring**

Run:

```powershell
git -C C:\Users\kg333\nocksperimental add README.md package.json scripts/test-launch-evidence-api.mjs scripts/test-launch-evidence-pages.mjs scripts/verify-launch-evidence.mjs schemas/nockapp-launch-evidence.schema.json src/data/launch-evidence.json src/lib/launch-evidence.ts src/lib/registry-manifest.ts src/lib/openapi-spec.ts src/lib/verification-index.ts src/app/api/launch-evidence src/app/launch-evidence src/app/workspaces/[workspaceSlug]/page.tsx
git -C C:\Users\kg333\nocksperimental commit -m "add launch evidence slice"
```

Expected: commit succeeds. If earlier task commits were made, this final commit may contain only README or verification cleanup.

- [ ] **Step 7: Push**

Run:

```powershell
git -C C:\Users\kg333\nocksperimental push origin main
```

Expected: `main` updates on GitHub.

## Self-Review

- Spec coverage: This plan implements Slice 1 from the Launch Evidence design: static case model, report model, workspace links, public/API verifier, discovery, docs, and tests.
- Scope control: Billing, live upload storage, badge request workflow, operator evidence, and paid API entitlements are intentionally deferred to later plans.
- Coordination coverage: The plan starts with remote, branch, PR, issue, and CodeGraph checks.
- Type consistency: The plan uses `LaunchEvidenceCase`, `LaunchEvidenceSubmission`, `LaunchReadinessReport`, `ResolvedLaunchEvidenceCase`, and `verifyLaunchEvidenceReport` consistently across data, lib, routes, and tests.
- In-flight work awareness: The plan builds on the already-landed VESL bridge instead of redoing it.
