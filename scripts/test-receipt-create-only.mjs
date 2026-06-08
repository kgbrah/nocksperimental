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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await assertStoreCreateOnly();
  await assertFakenetCollisionDoesNotClobber();
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

async function assertFakenetCollisionDoesNotClobber() {
  const { POST } = loadTypeScriptModule("src/app/api/fakenet/evidence/submit/route.ts");
  const url = "https://nocksperimental.com/api/fakenet/evidence/submit";
  const endpoint = "127.0.0.1:5555";
  const walletAddress = "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ";
  const reportId = "lab_create-only-collision_submit";

  // Victim submission and attacker submission share endpoint/wallet/reportId (the only
  // fields that derive the fakenet receiptId) but differ in everything else.
  const victim = fakenetSubmission({ endpoint, walletAddress, reportId, fixtureId: "VICTIM-FIXTURE", appSlug: "victim-app" });
  const attacker = fakenetSubmission({ endpoint, walletAddress, reportId, fixtureId: "ATTACKER-FIXTURE", appSlug: "attacker-app" });

  const victimReceipt = await postJson(POST, url, victim);
  assertEqual(victimReceipt.accepted, true, "victim fakenet submission accepted");
  const receiptId = victimReceipt.receiptId;
  assertTrue(Boolean(receiptId), "victim submission produced a receiptId");

  const attackerReceipt = await postJson(POST, url, attacker);
  // Same derived receiptId (collision), but create-only must keep the victim's content.
  assertEqual(attackerReceipt.receiptId, receiptId, "attacker submission collides on the same receiptId");
  assertTrue(
    JSON.stringify(attackerReceipt).includes("VICTIM-FIXTURE"),
    "colliding submission returns the victim's receipt content (not clobbered)"
  );
  assertTrue(
    !JSON.stringify(attackerReceipt).includes("ATTACKER-FIXTURE"),
    "attacker's forged content did not replace the stored receipt"
  );

  const { GET: getReceipt } = loadTypeScriptModule("src/app/api/fakenet/evidence/receipts/[receiptId]/route.ts");
  const detail = await (
    await getReceipt(new Request(`https://nocksperimental.com/api/fakenet/evidence/receipts/${receiptId}`), {
      params: { receiptId }
    })
  ).json();
  assertTrue(
    JSON.stringify(detail).includes("VICTIM-FIXTURE") && !JSON.stringify(detail).includes("ATTACKER-FIXTURE"),
    "citable receipt URL still serves the victim's original signed evidence"
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
