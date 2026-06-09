#!/usr/bin/env node

// Regression guard for the unauthenticated receipt-overwrite IDOR (authz sweep R1):
// evidence receipts are content-addressed and were persisted with an unconditional
// put(), so any caller who landed on an existing key (fakenet: trivially, via the
// publicly-echoed endpoint/wallet/reportIds; vesl/nockup: via a hash collision) could
// clobber another submitter's signed receipt. The stores are now CREATE-ONLY: the
// first write wins and is immutable.
//
// Part 1 — store-level: persisting a second receipt under an existing key returns the
//          existing (first) receipt and never overwrites it, across all three stores.
// Part 2 — fakenet end-to-end: two DISTINCT accepted submissions that derive the same
//          receiptId (same endpoint/wallet/reportIds, different report bodies) do not
//          clobber — the citable receipt URL keeps the first submitter's content.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

// Evidence-receipt signing is fail-closed without a production seed. This suite signs DEMO
// receipts; opt in explicitly (signatures are non-authoritative — dev keys are not a trust anchor).
process.env.NOCKS_ALLOW_DEV_SIGNING = "1";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await assertStoreCreateOnly();
  await assertFakenetReceiptIdReflectsBody();
  console.log("receipt create-only: all assertions passed");
}

async function assertStoreCreateOnly() {
  const stores = [
    {
      label: "fakenet",
      mod: "src/lib/fakenet-receipt-store.ts",
      persist: "persistFakenetEvidenceReceipt",
      read: "readFakenetEvidenceReceipt"
    },
    {
      label: "vesl",
      mod: "src/lib/vesl-receipt-store.ts",
      persist: "persistVeslEvidenceReceipt",
      read: "readVeslEvidenceReceipt"
    },
    {
      label: "nockup",
      mod: "src/lib/nockup-receipt-store.ts",
      persist: "persistNockupValidationReceipt",
      read: "readNockupValidationReceipt"
    }
  ];

  for (const store of stores) {
    const mod = loadTypeScriptModule(store.mod);
    const persist = mod[store.persist];
    const read = mod[store.read];
    const receiptId = `create-only-${store.label}-collision`;

    const first = { accepted: true, receiptId, status: "verified", verified: true, summary: { marker: "FIRST" } };
    const second = { accepted: true, receiptId, status: "attention", verified: false, summary: { marker: "SECOND" } };

    const storedFirst = await persist(first);
    assertEqual(storedFirst.summary.marker, "FIRST", `${store.label}: first receipt persisted`);
    assertEqual(storedFirst.storage.persisted, true, `${store.label}: first receipt marked persisted`);

    // A second, DIFFERENT receipt under the same id must NOT overwrite the first.
    const storedSecond = await persist(second);
    assertEqual(storedSecond.summary.marker, "FIRST", `${store.label}: second persist returns the existing (first) receipt`);
    assertEqual(storedSecond.status, "verified", `${store.label}: second persist did not clobber status`);

    const readBack = (await read(receiptId)).receipt;
    assertEqual(readBack.summary.marker, "FIRST", `${store.label}: stored receipt is still the first submitter's content`);
  }
}

async function assertFakenetReceiptIdReflectsBody() {
  const { POST } = loadTypeScriptModule("src/app/api/fakenet/evidence/submit/route.ts");
  const url = "https://nocksperimental.com/api/fakenet/evidence/submit";
  const endpoint = "127.0.0.1:5555";
  const walletAddress = "AU6cMNQ9vMyBwSGkwTghPsTGf6uLREziKnpDrM3y6Jk2zNsvRWdYFVx";
  const reportId = "lab_create-only-body_submit";

  // R1b: the fakenet receiptId is now derived from the FULL submission body. Two
  // submissions sharing endpoint/wallet/reportId but differing in a persisted field
  // (fixtureId/app) no longer collide on the same content-addressed key — the coarse
  // {endpoint, walletAddress, reportIds} key that enabled the overwrite is gone.
  const victim = fakenetSubmission({ endpoint, walletAddress, reportId, fixtureId: "VICTIM-FIXTURE", appSlug: "victim-app" });
  const other = fakenetSubmission({ endpoint, walletAddress, reportId, fixtureId: "OTHER-FIXTURE", appSlug: "other-app" });

  const victimReceipt = await postJson(POST, url, victim);
  const otherReceipt = await postJson(POST, url, other);
  assertEqual(victimReceipt.accepted, true, "victim fakenet submission accepted");
  assertEqual(otherReceipt.accepted, true, "second fakenet submission accepted");
  assertTrue(Boolean(victimReceipt.receiptId), "victim submission produced a receiptId");
  assertTrue(
    victimReceipt.receiptId !== otherReceipt.receiptId,
    "different submission bodies derive DIFFERENT receiptIds (no coarse-key collision)"
  );
  // The receiptId is a 256-bit secureId digest, not the old 8-hex stableId.
  assertTrue(
    /^fakenet_submission_[0-9a-f]{64}$/.test(victimReceipt.receiptId),
    "receiptId is a 256-bit secureId digest"
  );

  // Idempotent create-only: resubmitting the EXACT victim body lands on the same key
  // and returns the existing receipt — the store never overwrites it.
  const resubmit = await postJson(POST, url, victim);
  assertEqual(resubmit.receiptId, victimReceipt.receiptId, "identical resubmission keeps the same receiptId");
  assertTrue(
    JSON.stringify(resubmit).includes("VICTIM-FIXTURE"),
    "identical resubmission returns the original (immutable) receipt"
  );

  const { GET: getReceipt } = loadTypeScriptModule("src/app/api/fakenet/evidence/receipts/[receiptId]/route.ts");
  const detail = await (
    await getReceipt(new Request(`https://nocksperimental.com/api/fakenet/evidence/receipts/${victimReceipt.receiptId}`), {
      params: { receiptId: victimReceipt.receiptId }
    })
  ).json();
  assertTrue(
    JSON.stringify(detail).includes("VICTIM-FIXTURE") && !JSON.stringify(detail).includes("OTHER-FIXTURE"),
    "citable receipt URL serves the victim's evidence (the other body got its own separate id)"
  );
}

function fakenetSubmission({ endpoint, walletAddress, reportId, fixtureId, appSlug }) {
  return {
    connection: { endpoint, walletAddress, networkId: "local-devnet" },
    reports: [
      {
        reportId,
        fixtureId,
        generatedAt: "2026-06-05T14:50:00.000Z",
        app: { name: appSlug, slug: appSlug, version: "0.0.1", kernel: "nockchain-local-fakenet" },
        environment: { mode: "local-fakenet", grpcEndpoint: endpoint, balanceCheck: { address: walletAddress } },
        summary: {
          status: "pass",
          stepsPassed: 1,
          stepsFailed: 0,
          invariantsPassed: 0,
          invariantsFailed: 0,
          alertsClear: 0,
          alertsTriggered: 0,
          snapshotsCaptured: 2,
          durationMs: 12
        },
        invariantPacks: [],
        steps: [
          {
            id: `${appSlug}-step`,
            type: "fakenet",
            title: appSlug,
            status: "pass",
            expectation: "fakenet check passes",
            observed: "fakenet check passed",
            adapter: {
              kind: "local-fakenet",
              grpcEndpoint: endpoint,
              reachable: true,
              balance: { status: "pass", address: walletAddress, amount: "10", unit: "NOCK", checkedAt: "2026-06-05T14:50:00.000Z", error: null }
            },
            beforeHash: "before",
            afterHash: "after",
            stateDiffs: [],
            durationMs: 12
          }
        ],
        invariants: [],
        alerts: [],
        adapterObservations: [],
        stateSnapshots: [],
        stateDiffs: [],
        nextActions: []
      }
    ]
  };
}

async function postJson(POST, url, body) {
  const response = await POST(
    new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  );
  return response.json();
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

    if (specifier === "@opennextjs/cloudflare") {
      return {
        getCloudflareContext: () => {
          throw new Error("Cloudflare context is unavailable in script tests.");
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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(value, label) {
  if (!value) {
    throw new Error(`${label}: expected truthy`);
  }
}
