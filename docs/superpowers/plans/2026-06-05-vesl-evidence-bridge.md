# VESL Evidence Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first API-first VESL evidence bridge that accepts VESL lifecycle evidence, normalizes it into a Nocksperimental lab report, persists a public receipt, and exposes discovery/docs for collaboration.

**Architecture:** Add a VESL-specific verifier/normalizer, a dedicated VESL receipt store backed by `NOCKS_VESL_RECEIPTS`, and four public `/api/vesl/evidence/*` routes. Reuse the existing registry/OpenAPI/smoke patterns without adding a UI page in this slice.

**Tech Stack:** Next.js route handlers, TypeScript, Cloudflare Workers KV through OpenNext `getCloudflareContext`, existing script-based test harnesses, Wrangler.

---

## File Structure

- Create `src/lib/vesl-evidence-submission.ts`
  - Defines the VESL input shape, validates evidence, builds a `LabRunReport`, and returns a receipt.
- Create `src/lib/vesl-receipt-store.ts`
  - Persists accepted VESL receipts to `NOCKS_VESL_RECEIPTS` with memory fallback for tests.
- Create `src/app/api/vesl/evidence/submit/route.ts`
  - `GET` help and `POST` submit/persist.
- Create `src/app/api/vesl/evidence/receipts/route.ts`
  - Lists persisted VESL receipts.
- Create `src/app/api/vesl/evidence/receipts/[receiptId]/route.ts`
  - Reads one persisted VESL receipt.
- Create `scripts/test-vesl-evidence-submit-api.mjs`
  - Focused RED/GREEN test for submit, list, detail, discovery, docs, and config.
- Modify `package.json`
  - Adds `test:vesl-evidence-submit` and includes it in `npm test`.
- Modify `src/lib/registry-manifest.ts`
  - Adds VESL submit/list endpoints and `.well-known` links/capabilities.
- Modify `src/lib/openapi-spec.ts`
  - Adds VESL receipt detail path.
- Modify `scripts/smoke-cloudflare-preview.mjs`
  - Submits a minimal VESL receipt and reads it back in Worker preview.
- Modify `scripts/test-cloudflare-deployment.mjs`
  - Asserts `NOCKS_VESL_RECEIPTS` binding and smoke/docs coverage.
- Modify `README.md` and `docs/deployment.md`
  - Documents the VESL bridge, routes, and KV binding.
- Modify `wrangler.jsonc`
  - Adds `NOCKS_VESL_RECEIPTS` after the Cloudflare KV namespace is created.

## Task 1: Write the Failing VESL Evidence API Test

**Files:**
- Create: `scripts/test-vesl-evidence-submit-api.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create the failing script test**

Create `scripts/test-vesl-evidence-submit-api.mjs` with this structure:

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
  const { POST } = loadTypeScriptModule("src/app/api/vesl/evidence/submit/route.ts");
  const payload = createVeslPayload();

  const response = await POST(new Request("https://nocksperimental.com/api/vesl/evidence/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }));
  const receipt = await response.json();

  assertEqual(response.status, 200, "submit status");
  assertEqual(receipt.version, "v0", "receipt version");
  assertEqual(receipt.service, "nocksperimental", "service");
  assertEqual(receipt.subject, "nocksperimental.com", "subject");
  assertEqual(receipt.canonicalUrl, "https://nocksperimental.com/api/vesl/evidence/submit", "canonical URL");
  assertEqual(receipt.accepted, true, "accepted");
  assertEqual(receipt.verified, true, "verified");
  assertStartsWith(receipt.receiptId, "vesl_submission_", "receipt id");
  assertEqual(receipt.summary.project, "vesl-demo", "project summary");
  assertEqual(receipt.summary.requiredEffectsPresent, true, "required effects");
  assertEqual(receipt.report.app.slug, "vesl-evidence-bridge", "report app slug");
  assertEqual(receipt.report.environment.mode, "vesl-local", "report environment mode");
  assertEqual(receipt.storage.persisted, true, "receipt persisted");
  assertEqual(receipt.storage.backend, "memory", "test storage backend");
  assertIncludes(receipt.links.receipt, `/api/vesl/evidence/receipts/${receipt.receiptId}`, "receipt detail link");

  const { GET: listReceipts } = loadTypeScriptModule("src/app/api/vesl/evidence/receipts/route.ts");
  const listResponse = await listReceipts();
  const list = await listResponse.json();
  const indexedReceipt = list.receipts.find((candidate) => candidate.receiptId === receipt.receiptId);

  assertEqual(listResponse.status, 200, "receipt list status");
  assertEqual(Boolean(indexedReceipt), true, "receipt indexed");

  const { GET: getReceipt } = loadTypeScriptModule("src/app/api/vesl/evidence/receipts/[receiptId]/route.ts");
  const detailResponse = await getReceipt(
    new Request(`https://nocksperimental.com/api/vesl/evidence/receipts/${receipt.receiptId}`),
    { params: { receiptId: receipt.receiptId } }
  );
  const detail = await detailResponse.json();

  assertEqual(detailResponse.status, 200, "detail status");
  assertEqual(detail.receiptId, receipt.receiptId, "detail id");

  const badResponse = await POST(new Request("https://nocksperimental.com/api/vesl/evidence/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ connection: { project: "empty-vesl" } })
  }));
  const badReceipt = await badResponse.json();

  assertEqual(badResponse.status, 400, "bad submit status");
  assertEqual(badReceipt.accepted, false, "bad submit rejected");
  assertIncludes(badReceipt.errors.join("\\n"), "At least one VESL evidence source is required.", "bad error");

  const registry = await loadTypeScriptModule("src/app/api/registry/route.ts").GET();
  const registryBody = await registry.json();
  assertEndpoint(registryBody, "vesl-evidence-submit", "/api/vesl/evidence/submit", "Submit VESL lifecycle evidence");
  assertEndpoint(registryBody, "vesl-evidence-receipts", "/api/vesl/evidence/receipts", "List persisted VESL evidence receipts");

  const wellKnown = await loadTypeScriptModule("src/app/.well-known/nocksperimental.json/route.ts").GET();
  const wellKnownBody = await wellKnown.json();
  assertEqual(wellKnownBody.links.veslEvidenceSubmit, "https://nocksperimental.com/api/vesl/evidence/submit", "well-known submit link");
  assertIncludes(wellKnownBody.capabilities, "vesl-evidence-bridge", "well-known VESL capability");

  const openApi = await loadTypeScriptModule("src/app/openapi.json/route.ts").GET();
  const openApiBody = await openApi.json();
  assertEqual(openApiBody.paths["/api/vesl/evidence/submit"]?.post?.summary, "Submit VESL lifecycle evidence", "OpenAPI submit");
  assertEqual(openApiBody.paths["/api/vesl/evidence/receipts"]?.get?.summary, "List persisted VESL evidence receipts", "OpenAPI list");
  assertEqual(openApiBody.paths["/api/vesl/evidence/receipts/{receiptId}"]?.get?.summary, "Read persisted VESL evidence receipt", "OpenAPI detail");

  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertEqual(packageJson.scripts["test:vesl-evidence-submit"], "node scripts/test-vesl-evidence-submit-api.mjs", "package script");
  assertIncludes(packageJson.scripts.test, "npm run test:vesl-evidence-submit", "full test includes VESL test");

  const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
  assertIncludes(readme, "/api/vesl/evidence/submit", "README VESL submit docs");
  assertIncludes(readme, "VESL Evidence Bridge", "README VESL heading");

  const wrangler = readFileSync(path.join(process.cwd(), "wrangler.jsonc"), "utf8");
  assertIncludes(wrangler, "NOCKS_VESL_RECEIPTS", "wrangler VESL KV binding");
}
```

Also include helper functions in that file: `createVeslPayload`, `loadTypeScriptModule`, `createModuleRequire`, `loadAliasModule`, `assertEndpoint`, `assertStartsWith`, `assertIncludes`, and `assertEqual`. The `createModuleRequire` helper must stub `next/server` and `@opennextjs/cloudflare` the same way `scripts/test-fakenet-evidence-submit-api.mjs` does.

- [ ] **Step 2: Add the npm script before implementation**

Modify `package.json`:

```json
"test:vesl-evidence-submit": "node scripts/test-vesl-evidence-submit-api.mjs"
```

Insert `npm run test:vesl-evidence-submit` into the main `test` script immediately after `npm run test:fakenet-evidence-submit`.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
env PATH=/home/kgbrah/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin npm run test:vesl-evidence-submit
```

Expected: FAIL because `src/app/api/vesl/evidence/submit/route.ts` does not exist.

## Task 2: Implement VESL Submission and Receipt Persistence

**Files:**
- Create: `src/lib/vesl-evidence-submission.ts`
- Create: `src/lib/vesl-receipt-store.ts`
- Create: `src/app/api/vesl/evidence/submit/route.ts`
- Create: `src/app/api/vesl/evidence/receipts/route.ts`
- Create: `src/app/api/vesl/evidence/receipts/[receiptId]/route.ts`

- [ ] **Step 1: Implement `src/lib/vesl-evidence-submission.ts`**

Export:

```typescript
export type VeslEvidenceSubmissionInput = {
  connection?: {
    project?: string | null;
    repo?: string | null;
    template?: string | null;
    settlementMode?: string | null;
    chainEndpoint?: string | null;
  } | null;
  verifyJam?: {
    status?: string | null;
    projectPath?: string | null;
    outJam?: string | null;
    fingerprint?: string | null;
  } | null;
  effects?: unknown;
  peeks?: unknown;
  hull?: {
    health?: Record<string, unknown> | null;
    status?: Record<string, unknown> | null;
    verify?: Record<string, unknown> | null;
    tx?: Record<string, unknown> | null;
  } | null;
  fakenet?: {
    endpoint?: string | null;
    walletAddress?: string | null;
    txId?: string | null;
    accepted?: boolean | null;
  } | null;
};

export type VeslEvidenceReceipt = ReturnType<typeof verifyVeslEvidenceSubmission>;
export function verifyVeslEvidenceSubmission(input: VeslEvidenceSubmissionInput) { ... }
export function createVeslEvidenceSubmissionHelp() { ... }
```

`verifyVeslEvidenceSubmission` must return `accepted`, `verified`, `status`, `receiptId`, `generatedAt`, `summary`, `checks`, `errors`, `report`, and `links`. Build `report` as a `LabRunReport` with `environment.mode` equal to `"vesl-local"` unless `connection.settlementMode === "fakenet"`, in which case use `"vesl-fakenet"`.

- [ ] **Step 2: Implement `src/lib/vesl-receipt-store.ts`**

Copy the fakenet receipt-store pattern with these VESL-specific names:

```typescript
export const veslReceiptBindingName = "NOCKS_VESL_RECEIPTS";
const receiptKeyPrefix = "vesl:receipt:";
export async function persistVeslEvidenceReceipt(receipt: VeslEvidenceReceipt) { ... }
export async function listVeslEvidenceReceipts(limit = 25) { ... }
export async function readVeslEvidenceReceipt(receiptId: string) { ... }
```

Use `getCloudflareContext({ async: true })`, cast `context.env` to `Record<string, unknown>`, and fall back to an in-memory `Map` when no KV binding exists.

- [ ] **Step 3: Implement submit/list/detail route handlers**

`src/app/api/vesl/evidence/submit/route.ts`:

```typescript
import { NextResponse } from "next/server";
import {
  createVeslEvidenceSubmissionHelp,
  verifyVeslEvidenceSubmission
} from "@/lib/vesl-evidence-submission";
import { persistVeslEvidenceReceipt } from "@/lib/vesl-receipt-store";

export function GET() {
  return NextResponse.json(createVeslEvidenceSubmissionHelp());
}

export async function POST(request: Request) {
  const body = (await request.json()) as Parameters<typeof verifyVeslEvidenceSubmission>[0];
  const receipt = await persistVeslEvidenceReceipt(verifyVeslEvidenceSubmission(body));

  return NextResponse.json(receipt, {
    status: receipt.accepted ? 200 : 400
  });
}
```

List/detail routes mirror the fakenet receipt routes, replacing fakenet paths and functions with VESL paths and functions.

- [ ] **Step 4: Run the focused test and verify GREEN for core behavior**

Run:

```bash
env PATH=/home/kgbrah/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin npm run test:vesl-evidence-submit
```

Expected: FAIL only on registry/OpenAPI/docs/config assertions that have not been wired yet.

## Task 3: Wire Discovery, Docs, Config, and Smoke

**Files:**
- Modify: `src/lib/registry-manifest.ts`
- Modify: `src/lib/openapi-spec.ts`
- Modify: `README.md`
- Modify: `docs/deployment.md`
- Modify: `wrangler.jsonc`
- Modify: `scripts/smoke-cloudflare-preview.mjs`
- Modify: `scripts/test-cloudflare-deployment.mjs`

- [ ] **Step 1: Add registry endpoints and well-known links**

Add registry entries:

```typescript
{
  id: "vesl-evidence-submit",
  path: "/api/vesl/evidence/submit",
  description: "Submit VESL lifecycle evidence"
},
{
  id: "vesl-evidence-receipts",
  path: "/api/vesl/evidence/receipts",
  description: "List persisted VESL evidence receipts"
}
```

Add `.well-known` links:

```typescript
veslEvidenceSubmit: endpointUrl("vesl-evidence-submit"),
veslEvidenceReceipts: endpointUrl("vesl-evidence-receipts")
```

Add capabilities:

```typescript
"vesl-evidence-bridge",
"vesl-evidence-receipts"
```

- [ ] **Step 2: Add OpenAPI receipt detail endpoint**

Add:

```typescript
const veslEvidenceReceiptDetailEndpoint = {
  id: "vesl-evidence-receipt-detail",
  path: "/api/vesl/evidence/receipts/{receiptId}",
  description: "Read persisted VESL evidence receipt"
};
```

Include it in the OpenAPI endpoint list.

- [ ] **Step 3: Add POST support for VESL submit**

Modify the OpenAPI post condition to include `/api/vesl/evidence/submit`, with a `400` response description of `"Invalid VESL evidence submission"`.

- [ ] **Step 4: Add Wrangler binding**

Add this placeholder first:

```jsonc
{
  "binding": "NOCKS_VESL_RECEIPTS"
}
```

After tests pass locally, create the namespace with:

```bash
npx wrangler kv namespace create NOCKS_VESL_RECEIPTS
```

Patch the returned `id` into `wrangler.jsonc`.

- [ ] **Step 5: Extend docs**

Add README section:

```markdown
## VESL Evidence Bridge

The VESL evidence bridge accepts lifecycle evidence from `vesl-test`, `vesl-hull`, and optional fakenet settlement runs, normalizes it into a Nocksperimental lab report, and persists a public receipt.

- `/api/vesl/evidence/submit`
- `/api/vesl/evidence/receipts`
- `/api/vesl/evidence/receipts/[receiptId]`
```

Add deployment docs sentence:

```markdown
Persisted VESL evidence receipts use the `NOCKS_VESL_RECEIPTS` Workers KV binding.
```

- [ ] **Step 6: Extend Cloudflare smoke**

Add a helper `expectVeslEvidenceSubmission(baseUrl)` that posts a minimal VESL payload, asserts `receipt.storage.persisted === true`, fetches `/api/vesl/evidence/receipts`, and fetches the detail URL.

- [ ] **Step 7: Run focused and related tests**

Run:

```bash
env PATH=/home/kgbrah/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin npm run test:vesl-evidence-submit && npm run test:registry-manifest && npm run test:well-known-manifest && npm run test:openapi-spec && npm run test:cloudflare-deployment
```

Expected: PASS.

## Task 4: Verify, Provision, Deploy, and Commit

**Files:**
- Modify: `wrangler.jsonc` after namespace creation.
- Generated build output is not committed.

- [ ] **Step 1: Run source verification**

Run:

```bash
env PATH=/home/kgbrah/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin npm test && npm run lint && npm run build
```

Expected: PASS. If `next-env.d.ts` flips from `.next/dev/types/routes.d.ts` to `.next/types/routes.d.ts`, restore only that generated line with `apply_patch`.

- [ ] **Step 2: Create KV namespace**

Run:

```bash
env PATH=/home/kgbrah/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin npx wrangler kv namespace create NOCKS_VESL_RECEIPTS
```

Expected: Wrangler prints a namespace id. Patch that id into `wrangler.jsonc`.

- [ ] **Step 3: Run Worker smoke**

Run:

```bash
env PATH=/home/kgbrah/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin npm run smoke:cloudflare
```

Expected: PASS and the smoke script reads back the VESL receipt.

- [ ] **Step 4: Deploy**

Run:

```bash
env PATH=/home/kgbrah/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin npm run deploy
```

Expected: PASS and deployed Worker lists `NOCKS_VESL_RECEIPTS` as a KV binding.

- [ ] **Step 5: Live verification**

Post the same minimal VESL payload to:

```text
https://nocksperimental.com/api/vesl/evidence/submit
```

Then fetch:

```text
https://nocksperimental.com/api/vesl/evidence/receipts
https://nocksperimental.com/api/vesl/evidence/receipts/{receiptId}
```

Expected: submit `200`, list contains the receipt, detail `200`, and `storage.backend === "kv"`.

- [ ] **Step 6: Sync CodeGraph**

Run:

```bash
PATH=/home/kgbrah/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin codegraph sync . && codegraph status .
```

Expected: index up to date.

- [ ] **Step 7: Commit and push**

Run:

```bash
git add README.md docs/deployment.md docs/superpowers/plans/2026-06-05-vesl-evidence-bridge.md package.json scripts/smoke-cloudflare-preview.mjs scripts/test-cloudflare-deployment.mjs scripts/test-vesl-evidence-submit-api.mjs src/app/api/vesl src/lib/vesl-evidence-submission.ts src/lib/vesl-receipt-store.ts src/lib/registry-manifest.ts src/lib/openapi-spec.ts wrangler.jsonc
git commit -m "add VESL evidence bridge receipts"
```

Push from Windows Git if WSL HTTPS hangs:

```powershell
git -c safe.directory='%(prefix)///wsl.localhost/Ubuntu-22.04/home/kgbrah/nocklab/nocksperimental' -C '\\wsl.localhost\Ubuntu-22.04\home\kgbrah\nocklab\nocksperimental' push origin main
```

Expected: `main` pushed to GitHub.

## Self-Review

- Spec coverage: The plan implements API-first VESL submit/list/detail, dedicated KV persistence, registry/OpenAPI/docs, smoke coverage, live deploy, and upstream-collab groundwork.
- Placeholder scan: No `TBD`, `TODO`, or ambiguous implementation placeholders are intentionally left.
- Type consistency: The plan uses `VeslEvidenceSubmissionInput`, `VeslEvidenceReceipt`, `persistVeslEvidenceReceipt`, `listVeslEvidenceReceipts`, and `readVeslEvidenceReceipt` consistently across modules and routes.
