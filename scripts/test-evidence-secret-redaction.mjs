#!/usr/bin/env node

// Regression guard for the secret-disclosure finding (gap G5): the secret-field
// scrubber must catch credential/transport/raw-payment key names that previously
// slipped its deny-list, and the VESL evidence receipt must never echo a submitted
// secret value verbatim — including via the per-step `observed` fields (hull-health
// and fakenet steps), which previously stringified attacker input with no redaction.
//
// Core invariant: no secret VALUE submitted under a secret-NAMED key may appear
// anywhere in JSON.stringify(receipt), and the noSecretFields gate must reject it.

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
  assertFileExists("src/lib/secret-field-scrubber.ts");
  assertFileExists("src/lib/vesl-evidence-submission.ts");
  assertFileExists("src/app/api/vesl/evidence/submit/route.ts");

  // 1) Scrubber unit coverage — the previously-missed key names must now match.
  const scrubber = loadTypeScriptModule("src/lib/secret-field-scrubber.ts");
  const nowCovered = [
    "signingKey",
    "sessionKey",
    "accessKey",
    "authorization",
    "bearer",
    "cookie",
    "credential",
    "passphrase",
    "txHash",
    "transactionHash",
    "rawTransaction",
    "rawTx",
    "rawJam",
    "rawPayload",
    "rawBytes",
    "rawHash"
  ];
  for (const key of nowCovered) {
    assertTrue(
      scrubber.containsSecretLikeField({ [key]: "x" }),
      `scrubber now flags secret-named key "${key}"`
    );
    const redacted = scrubber.redactSecretFields({ [key]: "TOP-SECRET-VALUE" });
    assertEqual(redacted[key], "[redacted]", `scrubber redacts "${key}"`);
    assertTrue(
      !JSON.stringify(redacted).includes("TOP-SECRET-VALUE"),
      `scrubber removes the value under "${key}"`
    );
  }
  // Previously-covered terms must still match (no regression).
  for (const key of ["privateKey", "secretKey", "apiKey", "seed", "mnemonic", "stateJam", "walletExport"]) {
    assertTrue(scrubber.containsSecretLikeField({ [key]: "x" }), `scrubber still flags "${key}"`);
  }
  // Innocuous evidence keys must NOT be flagged (avoid over-rejecting real submissions).
  for (const key of ["project", "endpoint", "commit", "status", "health", "fakenet", "txId", "network"]) {
    assertTrue(!scrubber.containsSecretLikeField({ [key]: "x" }), `scrubber does not over-flag "${key}"`);
  }

  // 2) End-to-end: a tainted submission must not leak any secret value, via the
  //    receipt body returned by the public POST route (covers gate + snapshot +
  //    the two per-step `observed` echo paths).
  const { POST } = loadTypeScriptModule("src/app/api/vesl/evidence/submit/route.ts");
  const url = "https://nocksperimental.com/api/vesl/evidence/submit";

  const sentinels = {
    signKey: "SENTINEL-signkey-9f3a7c",
    seed: "SENTINEL-seed-9f3a7c",
    auth: "SENTINEL-auth-9f3a7c",
    rawJam: "SENTINEL-rawjam-9f3a7c",
    txHash: "SENTINEL-txhash-9f3a7c"
  };

  const tainted = createVeslPayload();
  // hull.health flows into the `vesl-hull-health` step's `observed` (was unredacted).
  tainted.hull.health.signingKey = sentinels.signKey;
  tainted.hull.health.seed = sentinels.seed; // pattern-matched key in the echo path
  // fakenet flows into the `vesl-fakenet-settlement` step's `observed` (was unredacted).
  tainted.fakenet = {
    accepted: true,
    txId: "fakenet-tx-001",
    authorization: sentinels.auth,
    rawJam: sentinels.rawJam,
    txHash: sentinels.txHash
  };

  const taintedRes = await POST(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tainted)
    })
  );
  const taintedReceipt = await taintedRes.json();
  const serialized = JSON.stringify(taintedReceipt);

  for (const [name, value] of Object.entries(sentinels)) {
    assertTrue(
      !serialized.includes(value),
      `secret "${name}" value must not appear anywhere in the receipt (no-echo)`
    );
  }
  // The gate must reject (a secret-named key was present) -> 400 + accepted=false.
  assertEqual(taintedReceipt.accepted, false, "tainted submission is not accepted");
  assertEqual(taintedRes.status, 400, "tainted submission returns 400");
  // And the receipt must show the redaction actually fired somewhere.
  assertTrue(serialized.includes("[redacted]"), "tainted receipt contains redaction markers");

  // 3) Positive control: a clean submission still works and real (non-secret)
  //    hull-health data still flows through (redaction must not corrupt it).
  const cleanRes = await POST(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(createVeslPayload())
    })
  );
  const cleanReceipt = await cleanRes.json();
  assertEqual(cleanRes.status, 200, "clean submission returns 200");
  assertEqual(cleanReceipt.accepted, true, "clean submission is accepted");
  const hullStep = (cleanReceipt.report?.steps ?? []).find((step) => step.id === "vesl-hull-health");
  assertTrue(Boolean(hullStep), "clean receipt has the hull-health step");
  assertTrue(
    hullStep.observed.includes("ok"),
    "clean hull-health observed still carries the real status (redaction preserves non-secret data)"
  );

  console.log("evidence secret redaction: all assertions passed");
}

function createVeslPayload() {
  return {
    connection: {
      project: "vesl-demo",
      repo: "zkvesl/vesl-nockup",
      template: "vesl",
      settlementMode: "local",
      chainEndpoint: "http://127.0.0.1:5555"
    },
    verifyJam: {
      status: "fresh",
      projectPath: ".",
      outJam: "out.jam",
      fingerprint: "sha256:vesl-demo-fresh"
    },
    effects: [
      {
        id: "effect-settle-registered",
        tag: "%settle-registered",
        source: "vesl-test watch",
        observedAt: "2026-06-05T15:00:00.000Z",
        payload: { hull: 1 }
      },
      {
        id: "effect-settle-noted",
        tag: "%settle-noted",
        source: "vesl-test watch",
        observedAt: "2026-06-05T15:00:02.000Z",
        payload: { note: "demo-note" }
      }
    ],
    peeks: [
      {
        id: "peek-settle-registered",
        path: "[%settle-registered 1 ~]",
        status: "present",
        source: "vesl-test inspect peek",
        value: "[~ 1]"
      }
    ],
    hull: {
      health: { status: "ok" },
      status: {
        settlementMode: "local",
        activeGate: "default-hash",
        grafts: ["settle-graft", "registry-graft"]
      }
    }
  };
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

function assertTrue(value, label) {
  if (!value) {
    throw new Error(`${label}: expected truthy`);
  }
}
