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
  const { verifyBadgeSignature } = loadTypeScriptModule("src/lib/trust-badge-crypto.ts");
  const { publicKeyForKeyId } = loadTypeScriptModule("src/lib/trust-issuer-keys.ts");

  const {
    verifyFakenetEvidenceSubmission,
    verifyFakenetReceiptSignature
  } = loadTypeScriptModule("src/lib/fakenet-evidence-submission.ts");
  const {
    verifyVeslEvidenceSubmission,
    verifyVeslReceiptSignature
  } = loadTypeScriptModule("src/lib/vesl-evidence-submission.ts");
  const {
    verifyNockupValidationSubmission,
    verifyNockupReceiptSignature
  } = loadTypeScriptModule("src/lib/nockup-validation-submission.ts");

  const fakenetReceipt = verifyFakenetEvidenceSubmission(createFakenetInput());
  assertEqual(fakenetReceipt.accepted, true, "fakenet receipt accepted");
  assertEqual(Boolean(fakenetReceipt.signature), true, "fakenet receipt has a signature block");
  assertSignedReceipt(
    fakenetReceipt,
    verifyFakenetReceiptSignature,
    verifyBadgeSignature,
    publicKeyForKeyId,
    "fakenet"
  );

  const veslReceipt = verifyVeslEvidenceSubmission(createVeslInput());
  assertEqual(veslReceipt.accepted, true, "vesl receipt accepted");
  assertEqual(Boolean(veslReceipt.signature), true, "vesl receipt has a signature block");
  assertSignedReceipt(
    veslReceipt,
    verifyVeslReceiptSignature,
    verifyBadgeSignature,
    publicKeyForKeyId,
    "vesl"
  );

  const nockupReceipt = verifyNockupValidationSubmission(createNockupInput());
  assertEqual(nockupReceipt.accepted, true, "nockup receipt accepted");
  assertEqual(Boolean(nockupReceipt.signature), true, "nockup receipt has a signature block");
  assertSignedReceipt(
    nockupReceipt,
    verifyNockupReceiptSignature,
    verifyBadgeSignature,
    publicKeyForKeyId,
    "nockup"
  );

  // Rejected submissions leave the signature null (mirrors receiptId === null).
  const rejectedFakenet = verifyFakenetEvidenceSubmission({ connection: {}, reports: [] });
  assertEqual(rejectedFakenet.accepted, false, "rejected fakenet submission not accepted");
  assertEqual(rejectedFakenet.receiptId, null, "rejected fakenet receiptId null");
  assertEqual(rejectedFakenet.signature, null, "rejected fakenet signature null");
  assertEqual(
    verifyFakenetReceiptSignature(rejectedFakenet),
    false,
    "rejected fakenet receipt fails signature verification"
  );

  // Production signing path (COR-A): when NOCKS_BADGE_ISSUER_SIGNING_SEED (+ key
  // id) is set, every signer must stamp the production keyId and the published
  // public key for that keyId must verify the signature. The dev path stamps the
  // committed dev key and verifies against the committed registry; this asserts
  // the env path no longer signs with an unpublished key while stamping the dev
  // key id (the original divergence bug).
  runProductionSigningPath();

  const packageJson = JSON.parse(readText("package.json"));
  assertEqual(
    packageJson.scripts["test:evidence-receipt-signing"],
    "node scripts/test-evidence-receipt-signing.mjs",
    "package evidence receipt signing test script"
  );
  assertIncludes(
    packageJson.scripts.test,
    "npm run test:evidence-receipt-signing",
    "full test includes evidence receipt signing test"
  );
}

function assertSignedReceipt(receipt, verifyReceiptSignature, verifyBadgeSignature, publicKeyForKeyId, label) {
  assertEqual(receipt.signature.algorithm, "ed25519", `${label} signature algorithm`);
  assertNonEmpty(receipt.signature.issuerKeyId, `${label} signature issuer key id`);
  assertStartsWith(receipt.signature.payloadDigest, "sha256:", `${label} signature payload digest`);
  assertNonEmpty(receipt.signature.signature, `${label} signature value`);

  // Good verify: the pure helper recomputes the explicit field list and verifies true.
  assertEqual(verifyReceiptSignature(receipt), true, `${label} valid receipt signature verifies`);

  // Tampered payload fails: mutating a signed field breaks verification.
  const tampered = { ...receipt, generatedAt: "1999-01-01T00:00:00.000Z" };
  assertEqual(
    verifyReceiptSignature(tampered),
    false,
    `${label} tampered receipt fails verification`
  );

  // Wrong key fails: verifying against a different issuer key's public key fails.
  const otherKeyId = "nocksperimental-registry-ed25519-dev-v0";
  const otherPublicKey = publicKeyForKeyId(otherKeyId);
  assertNonEmpty(otherPublicKey, `${label} other issuer public key resolves`);
  assertEqual(otherKeyId !== receipt.signature.issuerKeyId, true, `${label} other key differs from signer`);

  const signedPayload = receiptSignedPayload(receipt, label);
  assertEqual(
    verifyBadgeSignature({
      payload: signedPayload,
      signature: receipt.signature.signature,
      publicKeySpkiBase64: otherPublicKey
    }),
    false,
    `${label} wrong issuer key fails verification`
  );

  // Sanity: the same payload verifies against the correct signer's public key.
  const signerPublicKey = publicKeyForKeyId(receipt.signature.issuerKeyId);
  assertEqual(
    verifyBadgeSignature({
      payload: signedPayload,
      signature: receipt.signature.signature,
      publicKeySpkiBase64: signerPublicKey
    }),
    true,
    `${label} correct issuer key verifies`
  );
}

function runProductionSigningPath() {
  // A distinct production seed (not a committed dev seed) and a production keyId
  // not present in the committed registry, so the env overlay's add-key branch is
  // exercised and verification must resolve the env-derived public key.
  const prodSeed = "9900000000000000000000000000000000000000000000000000000000000099";
  const prodKeyId = "nocksperimental-registry-ed25519-prod-test";

  const previousSeed = process.env.NOCKS_BADGE_ISSUER_SIGNING_SEED;
  const previousKeyId = process.env.NOCKS_BADGE_ISSUER_KEY_ID;

  process.env.NOCKS_BADGE_ISSUER_SIGNING_SEED = prodSeed;
  process.env.NOCKS_BADGE_ISSUER_KEY_ID = prodKeyId;

  try {
    const { verifyBadgeSignature, publicKeySpkiFromSeed } =
      loadTypeScriptModule("src/lib/trust-badge-crypto.ts");
    const { publicKeyForKeyId } = loadTypeScriptModule("src/lib/trust-issuer-keys.ts");

    const { verifyFakenetEvidenceSubmission } =
      loadTypeScriptModule("src/lib/fakenet-evidence-submission.ts");
    const { verifyVeslEvidenceSubmission } =
      loadTypeScriptModule("src/lib/vesl-evidence-submission.ts");
    const { verifyNockupValidationSubmission } =
      loadTypeScriptModule("src/lib/nockup-validation-submission.ts");

    // The published public key for the production keyId must equal the seed's SPKI.
    assertEqual(
      publicKeyForKeyId(prodKeyId),
      publicKeySpkiFromSeed(prodSeed),
      "production keyId resolves to the env seed's published public key"
    );

    const cases = [
      ["fakenet", verifyFakenetEvidenceSubmission(createFakenetInput())],
      ["vesl", verifyVeslEvidenceSubmission(createVeslInput())],
      ["nockup", verifyNockupValidationSubmission(createNockupInput())]
    ];

    for (const [label, receipt] of cases) {
      assertEqual(receipt.accepted, true, `${label} prod receipt accepted`);
      assertEqual(
        receipt.signature.issuerKeyId,
        prodKeyId,
        `${label} prod receipt stamps production keyId`
      );

      const publicKey = publicKeyForKeyId(receipt.signature.issuerKeyId);
      assertNonEmpty(publicKey, `${label} prod receipt issuer key resolves`);

      assertEqual(
        verifyBadgeSignature({
          payload: receiptSignedPayload(receipt, label),
          signature: receipt.signature.signature,
          publicKeySpkiBase64: publicKey
        }),
        true,
        `${label} prod receipt verifies against published issuer key`
      );
    }
  } finally {
    restoreEnv("NOCKS_BADGE_ISSUER_SIGNING_SEED", previousSeed);
    restoreEnv("NOCKS_BADGE_ISSUER_KEY_ID", previousKeyId);
  }
}

function restoreEnv(name, previousValue) {
  if (previousValue === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = previousValue;
  }
}

function receiptSignedPayload(receipt, label) {
  if (label === "fakenet") {
    return {
      receiptId: receipt.receiptId,
      generatedAt: receipt.generatedAt,
      endpoint: receipt.summary.endpoint,
      walletAddress: receipt.summary.walletAddress,
      reportIds: receipt.reports.map((report) => report.reportId).filter(Boolean),
      status: receipt.status
    };
  }

  return {
    receiptId: receipt.receiptId,
    generatedAt: receipt.generatedAt,
    evidenceHash: receipt.summary.evidenceHash,
    project: receipt.summary.project,
    status: receipt.status
  };
}

function createFakenetInput() {
  const walletAddress = "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ";
  const endpoint = "127.0.0.1:5555";

  return {
    connection: {
      endpoint,
      walletAddress,
      networkId: "local-devnet",
      label: "Local devnet"
    },
    reports: [
      createFakenetReport({
        reportId: "lab_local-fakenet-health-v0_sign",
        fixtureId: "local-fakenet-health-v0",
        appSlug: "local-fakenet-health",
        endpoint,
        walletAddress
      })
    ]
  };
}

function createFakenetReport({ reportId, fixtureId, appSlug, endpoint, walletAddress }) {
  return {
    reportId,
    fixtureId,
    generatedAt: "2026-06-05T14:50:00.000Z",
    app: {
      name: appSlug,
      slug: appSlug,
      version: "0.0.1",
      kernel: "nockchain-local-fakenet"
    },
    environment: {
      mode: "local-fakenet",
      grpcEndpoint: endpoint,
      balanceCheck: {
        address: walletAddress
      }
    },
    summary: {
      status: "pass",
      stepsPassed: 1,
      stepsFailed: 0,
      invariantsPassed: 0,
      invariantsFailed: 0,
      alertsClear: 0,
      alertsTriggered: 0,
      snapshotsCaptured: 1,
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
          balance: {
            status: "pass",
            address: walletAddress,
            amount: "10",
            unit: "NOCK",
            checkedAt: "2026-06-05T14:50:00.000Z",
            error: null
          }
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
  };
}

function createVeslInput() {
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
        observedAt: "2026-06-05T15:00:00.000Z"
      },
      {
        id: "effect-settle-noted",
        tag: "%settle-noted",
        source: "vesl-test watch",
        observedAt: "2026-06-05T15:00:02.000Z"
      }
    ],
    peeks: [
      {
        id: "peek-settle-registered",
        path: "[%settle-registered 1 ~]",
        status: "present",
        source: "vesl-test inspect peek"
      }
    ],
    hull: {
      health: {
        status: "ok"
      }
    }
  };
}

function createNockupInput() {
  return {
    project: {
      name: "counter-nockapp",
      repo: "kgbrah/counter-nockapp",
      template: "basic",
      installPath: "apps/counter",
      nockupVersion: "upstream-master",
      commit: "33ba97b1e206dd89b15c61b72b7802caf2136c18"
    },
    commands: [
      {
        id: "nockup-new",
        command: "nockup new counter-nockapp --template basic --install-path apps/counter",
        status: "pass",
        exitCode: 0,
        startedAt: "2026-06-05T20:00:00.000Z",
        completedAt: "2026-06-05T20:00:03.000Z",
        outputHash: "sha256:nockup-new-output"
      },
      {
        id: "nockup-build",
        command: "nockup build counter-nockapp",
        status: "pass",
        exitCode: 0,
        completedAt: "2026-06-05T20:00:10.000Z",
        outputHash: "sha256:nockup-build-output"
      },
      {
        id: "nockup-run",
        command: "nockup run counter-nockapp",
        status: "pass",
        exitCode: 0,
        completedAt: "2026-06-05T20:00:20.000Z",
        outputHash: "sha256:nockup-run-output"
      }
    ],
    artifacts: [
      {
        path: "apps/counter/out.jam",
        kind: "jam",
        hash: "sha256:counter-out-jam",
        size: 1234,
        producedBy: "nockup-build"
      }
    ],
    fakenet: {
      endpoint: "http://127.0.0.1:5555",
      networkId: "local-fakenet",
      walletAddress: "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ",
      accepted: true
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
    if (specifier.startsWith("@/")) {
      const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
      const tsPath = `${aliasPath}.ts`;
      const jsonPath = `${aliasPath}.json`;
      if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") return require(aliasPath);
      if (existsSync(tsPath)) return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
      if (existsSync(jsonPath)) return require(jsonPath);
      throw new Error(`Unsupported module alias: ${specifier}`);
    }
    return require(specifier);
  };
}

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(collection, expected, label) {
  if (!collection?.includes?.(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(collection)} to include ${JSON.stringify(expected)}`);
  }
}

function assertStartsWith(actual, expectedPrefix, label) {
  if (typeof actual !== "string" || !actual.startsWith(expectedPrefix)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to start with ${JSON.stringify(expectedPrefix)}`);
  }
}

function assertNonEmpty(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label}: expected non-empty string`);
  }
}
