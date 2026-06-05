#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const port = process.env.NOCKS_CLOUDFLARE_SMOKE_PORT
    ? Number(process.env.NOCKS_CLOUDFLARE_SMOKE_PORT)
    : await findAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  await run(npx, ["opennextjs-cloudflare", "build"]);

  const preview = spawn(npx, ["opennextjs-cloudflare", "preview", "--port", String(port)], {
    detached: process.platform !== "win32",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const previewExited = new Promise((resolve) => {
    preview.once("exit", resolve);
  });

  const logs = [];
  const collectLog = (chunk) => {
    logs.push(chunk.toString());
    if (logs.length > 80) {
      logs.shift();
    }
  };

  preview.stdout.on("data", collectLog);
  preview.stderr.on("data", collectLog);

  try {
    await waitForPreview(preview, `${baseUrl}/`);
    await expectStatus(`${baseUrl}/`, 200, "home page");
    await expectStatus(`${baseUrl}/.well-known/nocksperimental.json`, 200, "well-known registry manifest");
    await expectStatus(`${baseUrl}/openapi.json`, 200, "OpenAPI spec");
    await expectStatus(`${baseUrl}/api/health`, 200, "health API");
    await expectNockchainUpstream(`${baseUrl}/api/nockchain/upstream`);
    await expectStatus(`${baseUrl}/api/nockchain/docs-atlas`, 200, "Nockchain docs and protocol atlas API");
    await expectStatus(`${baseUrl}/api/nockchain/zorp`, 200, "Zorp/Nockchain upstream map API");
    await expectStatus(`${baseUrl}/api/nockchain/state-jams`, 200, "Nockchain state-jam provenance API");
    await expectStatus(`${baseUrl}/api/nockchain/rust-atlas`, 200, "Nockchain Rust workspace atlas API");
    await expectStatus(`${baseUrl}/api/nockchain/operations`, 200, "Nockchain operations atlas API");
    await expectStatus(`${baseUrl}/api/nockchain/wallet`, 200, "Nockchain wallet/API atlas");
    await expectStatus(`${baseUrl}/fakenet`, 200, "local fakenet readiness page");
    await expectStatus(`${baseUrl}/api/fakenet`, 200, "local fakenet readiness API");
    await expectStatus(
      `${baseUrl}/api/fakenet/connect?endpoint=127.0.0.1%3A5555&walletAddress=532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ`,
      200,
      "bring your own fakenet connection profile"
    );
    await expectStatus(`${baseUrl}/api/fakenet/commands`, 200, "local fakenet command kit API");
    await expectStatus(`${baseUrl}/api/fakenet/diagnostics`, 200, "local fakenet diagnostics API");
    await expectStatus(`${baseUrl}/api/fakenet/support-bundle`, 200, "local fakenet support bundle API");
    await expectStatus(`${baseUrl}/api/fakenet/support-bundle.md`, 200, "local fakenet support bundle markdown");
    await expectStatus(`${baseUrl}/api/fakenet/evidence`, 200, "local fakenet evidence capsule");
    await expectFakenetEvidenceSubmission(baseUrl);
    await expectVeslEvidenceSubmission(baseUrl);
    await expectNockupValidationSubmission(baseUrl);
    await expectLocalFakenetEvidenceVerification(baseUrl);
    await expectStatus(`${baseUrl}/api/fakenet/runbook.sh`, 200, "local fakenet shell runbook");
    await expectStatus(`${baseUrl}/registry`, 200, "registry page");
    await expectStatus(`${baseUrl}/api/registry`, 200, "registry manifest API");
    await expectStatus(`${baseUrl}/api/registry/checkpoint`, 200, "registry checkpoint API");
    await expectStatus(`${baseUrl}/nockchain`, 200, "Nockchain evidence page");
    await expectStatus(`${baseUrl}/nockchain/zorp`, 200, "Zorp intelligence page");
    await expectStatus(`${baseUrl}/nockchain/rust`, 200, "Nockchain Rust atlas page");
    await expectStatus(`${baseUrl}/nockchain/operations`, 200, "Nockchain operations page");
    await expectStatus(`${baseUrl}/nockchain/wallet`, 200, "Nockchain wallet page");
    await expectStatus(`${baseUrl}/workspaces`, 200, "workspaces page");
    await expectStatus(`${baseUrl}/api/workspaces`, 200, "workspaces API");
    await expectStatus(
      `${baseUrl}/workspaces/launch-lab-private`,
      200,
      "workspace detail page"
    );
    await expectStatus(
      `${baseUrl}/api/workspaces/launch-lab-private`,
      200,
      "workspace detail API"
    );
    await expectStatus(
      `${baseUrl}/api/workspaces/launch-lab-private/evidence`,
      200,
      "workspace evidence capsule"
    );
    await expectWorkspaceEvidenceVerification(baseUrl);
    await expectStatus(
      `${baseUrl}/api/workspaces/launch-lab-private/upload-policy`,
      200,
      "workspace upload policy"
    );
    await expectWorkspaceUploadPolicy(baseUrl);
    await expectStatus(
      `${baseUrl}/api/workspaces/launch-lab-private/upload-token`,
      401,
      "protected workspace upload token gate"
    );
    await expectWorkspaceUploadTokenGate(baseUrl);
    await expectStatus(
      `${baseUrl}/api/workspaces/upload-token/verify`,
      200,
      "workspace upload token verifier"
    );
    await expectWorkspaceUploadTokenVerification(baseUrl);
    await expectStatus(`${baseUrl}/verify`, 200, "verification page");
    await expectStatus(`${baseUrl}/api/verify`, 200, "verification index API");
    await expectGeneratedReports(`${baseUrl}/api/reports/generated`);
    await expectStatus(`${baseUrl}/api/trust`, 200, "trust API");
    await expectStatus(`${baseUrl}/trust/feed`, 200, "trust feed page");
    await expectTrustFeedFakenetEvidence(`${baseUrl}/api/trust/feed`);
    await expectStatus(
      `${baseUrl}/api/trust/badges/badge-payment-flow-verified/verification`,
      200,
      "badge verification bundle"
    );
    await expectStatus(
      `${baseUrl}/api/trust/badges/badge-payment-flow-verified/embed`,
      200,
      "badge embed bundle"
    );
    await expectStatus(
      `${baseUrl}/trust/badges/badge-payment-flow-verified`,
      200,
      "badge detail page"
    );
    await expectStatus(
      `${baseUrl}/trust/solver-scores/solver-score-solver-a-v0`,
      200,
      "solver score detail page"
    );
    await expectStatus(
      `${baseUrl}/api/trust/solver-scores/solver-score-solver-a-v0`,
      200,
      "solver score detail API"
    );
    await expectStatus(
      `${baseUrl}/trust/token-compatibility/token-compat-mock-v0`,
      200,
      "token compatibility detail page"
    );
    await expectStatus(
      `${baseUrl}/api/trust/token-compatibility/token-compat-mock-v0`,
      200,
      "token compatibility detail API"
    );
    await expectStatus(
      `${baseUrl}/trust/compute-benchmarks/compute-profile-alpha-v0`,
      200,
      "compute benchmark detail page"
    );
    await expectStatus(
      `${baseUrl}/api/trust/compute-benchmarks/compute-profile-alpha-v0`,
      200,
      "compute benchmark detail API"
    );
    await expectStatus(
      `${baseUrl}/trust/updates/update-score-history-v0`,
      200,
      "trust update detail page"
    );
    await expectStatus(
      `${baseUrl}/api/trust/updates/update-score-history-v0`,
      200,
      "trust update detail API"
    );
    await expectStatus(
      `${baseUrl}/trust/consumers/consumer-audit-fund`,
      200,
      "trust consumer detail page"
    );
    await expectStatus(
      `${baseUrl}/api/trust/consumers/consumer-audit-fund`,
      200,
      "trust consumer detail API"
    );
    await expectTrustUpdateVerification(baseUrl, "update-score-history-v0");
    await expectBadgeVerification(baseUrl, "badge-payment-flow-verified");
    await expectStatus(
      `${baseUrl}/api/reports/generated/payment-flow/provenance`,
      200,
      "generated report provenance"
    );
    await expectStatus(
      `${baseUrl}/api/reports/generated/payment-flow/evidence`,
      200,
      "generated report evidence"
    );
    await expectGeneratedReportVerification(baseUrl, "payment-flow");
    await expectStatus(`${baseUrl}/api/trust/updates/audit`, 401, "protected audit API");
    console.log(`Cloudflare preview smoke passed at ${baseUrl}`);
  } catch (error) {
    const previewLogs = logs.join("").trim();
    throw new Error(`${error.message}${previewLogs ? `\n\nPreview logs:\n${previewLogs}` : ""}`);
  } finally {
    await stopPreview(preview, previewExited);
  }
}

async function expectBadgeVerification(baseUrl, badgeId) {
  const bundleResponse = await fetch(`${baseUrl}/api/trust/badges/${badgeId}/verification`);
  const bundle = await bundleResponse.json();
  const verifyUrl = new URL(`${baseUrl}/api/trust/badges/verify`);

  verifyUrl.searchParams.set("badgeId", badgeId);
  verifyUrl.searchParams.set("payloadDigest", bundle.issuance.payloadDigest);
  verifyUrl.searchParams.set("signature", bundle.issuance.signature);
  verifyUrl.searchParams.set("issuerKeyId", bundle.issuance.issuerKeyId);

  const verifyResponse = await fetch(verifyUrl);
  const verification = await verifyResponse.json();

  if (verifyResponse.status !== 200 || verification.verified !== true) {
    throw new Error(
      `badge verifier: expected verified HTTP 200; got ${verifyResponse.status} ${JSON.stringify(verification).slice(0, 500)}`
    );
  }
}

async function expectGeneratedReportVerification(baseUrl, appSlug) {
  const evidenceResponse = await fetch(`${baseUrl}/api/reports/generated/${appSlug}/evidence`);
  const evidence = await evidenceResponse.json();
  const verifyUrl = new URL(`${baseUrl}/api/reports/generated/verify`);

  verifyUrl.searchParams.set("reportHash", evidence.artifacts.reportHash);
  verifyUrl.searchParams.set("snapshotRoot", evidence.artifacts.snapshotRoot);
  verifyUrl.searchParams.set("appSlug", appSlug);

  const verifyResponse = await fetch(verifyUrl);
  const verification = await verifyResponse.json();

  if (verifyResponse.status !== 200 || verification.verified !== true) {
    throw new Error(
      `generated report verifier: expected verified HTTP 200; got ${verifyResponse.status} ${JSON.stringify(verification).slice(0, 500)}`
    );
  }
}

async function expectTrustUpdateVerification(baseUrl, updateId) {
  const entryResponse = await fetch(`${baseUrl}/api/trust/updates/${updateId}`);
  const entryDetail = await entryResponse.json();
  const entry = entryDetail.entry;

  if (entryResponse.status !== 200 || !entry?.entryHash || !entry?.rootHash || !entry?.signature?.signature) {
    throw new Error(
      `trust update verifier: missing entry inputs; got ${entryResponse.status} ${JSON.stringify(entryDetail).slice(0, 500)}`
    );
  }

  const verifyUrl = new URL(`${baseUrl}/api/trust/updates/verify`);
  verifyUrl.searchParams.set("updateId", entry.id);
  verifyUrl.searchParams.set("entryHash", entry.entryHash);
  verifyUrl.searchParams.set("rootHash", entry.rootHash);
  verifyUrl.searchParams.set("signature", entry.signature.signature);
  verifyUrl.searchParams.set("issuerKeyId", entry.signature.issuerKeyId);

  const verifyResponse = await fetch(verifyUrl);
  const verification = await verifyResponse.json();

  if (verifyResponse.status !== 200 || verification.verified !== true) {
    throw new Error(
      `trust update verifier: expected verified HTTP 200; got ${verifyResponse.status} ${JSON.stringify(verification).slice(0, 500)}`
    );
  }
}

async function expectFakenetEvidenceSubmission(baseUrl) {
  const walletAddress = "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ";
  const response = await fetch(`${baseUrl}/api/fakenet/evidence/submit`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      connection: {
        endpoint: "127.0.0.1:5555",
        walletAddress,
        networkId: "local-fakenet"
      },
      reports: [
        {
          reportId: "lab_local-fakenet-health-v0_smoke",
          fixtureId: "local-fakenet-health-v0",
          generatedAt: "2026-06-05T14:50:00.000Z",
          app: {
            name: "Local Fakenet Health",
            slug: "local-fakenet-health",
            version: "0.0.1",
            kernel: "nockchain-local-fakenet"
          },
          environment: {
            mode: "local-fakenet",
            grpcEndpoint: "127.0.0.1:5555",
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
            durationMs: 10
          },
          invariantPacks: [],
          steps: [
            {
              id: "probe-local-fakenet",
              type: "fakenet",
              title: "Probe local fakenet",
              status: "pass",
              expectation: "fakenet endpoint accepts TCP connections",
              observed: "fakenet endpoint accepted TCP connections",
              adapter: {
                kind: "local-fakenet",
                grpcEndpoint: "127.0.0.1:5555",
                reachable: true
              },
              beforeHash: "before",
              afterHash: "after",
              stateDiffs: [],
              durationMs: 10
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
    })
  });
  const receipt = await response.json();

  if (
    response.status !== 200 ||
    receipt.verified !== true ||
    receipt.storage?.persisted !== true ||
    !receipt.receiptId?.startsWith("fakenet_submission_")
  ) {
    throw new Error(
      `fakenet evidence submission: expected verified receipt HTTP 200; got ${response.status} ${JSON.stringify(receipt).slice(0, 500)}`
    );
  }

  const listResponse = await fetch(`${baseUrl}/api/fakenet/evidence/receipts`);
  const receiptList = await listResponse.json();
  const indexedReceipt = receiptList.receipts?.find((candidate) => candidate.receiptId === receipt.receiptId);

  if (listResponse.status !== 200 || !indexedReceipt) {
    throw new Error(
      `fakenet evidence receipts: expected submitted receipt in index; got ${listResponse.status} ${JSON.stringify(receiptList).slice(0, 500)}`
    );
  }

  const detailResponse = await fetch(`${baseUrl}/api/fakenet/evidence/receipts/${receipt.receiptId}`);
  const detail = await detailResponse.json();

  if (detailResponse.status !== 200 || detail.receiptId !== receipt.receiptId) {
    throw new Error(
      `fakenet evidence receipt detail: expected submitted receipt; got ${detailResponse.status} ${JSON.stringify(detail).slice(0, 500)}`
    );
  }
}

async function expectVeslEvidenceSubmission(baseUrl) {
  const response = await fetch(`${baseUrl}/api/vesl/evidence/submit`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      connection: {
        project: "vesl-smoke",
        repo: "zkvesl/vesl-nockup",
        template: "vesl",
        settlementMode: "local",
        chainEndpoint: "http://127.0.0.1:5555"
      },
      verifyJam: {
        status: "fresh",
        projectPath: ".",
        outJam: "out.jam",
        fingerprint: "sha256:vesl-smoke-fresh"
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
    })
  });
  const receipt = await response.json();

  if (
    response.status !== 200 ||
    receipt.verified !== true ||
    receipt.storage?.persisted !== true ||
    !receipt.receiptId?.startsWith("vesl_submission_")
  ) {
    throw new Error(
      `VESL evidence submission: expected verified receipt HTTP 200; got ${response.status} ${JSON.stringify(receipt).slice(0, 500)}`
    );
  }

  const listResponse = await fetch(`${baseUrl}/api/vesl/evidence/receipts`);
  const receiptList = await listResponse.json();
  const indexedReceipt = receiptList.receipts?.find((candidate) => candidate.receiptId === receipt.receiptId);

  if (listResponse.status !== 200 || !indexedReceipt) {
    throw new Error(
      `VESL evidence receipts: expected submitted receipt in index; got ${listResponse.status} ${JSON.stringify(receiptList).slice(0, 500)}`
    );
  }

  const detailResponse = await fetch(`${baseUrl}/api/vesl/evidence/receipts/${receipt.receiptId}`);
  const detail = await detailResponse.json();

  if (detailResponse.status !== 200 || detail.receiptId !== receipt.receiptId) {
    throw new Error(
      `VESL evidence receipt detail: expected submitted receipt; got ${detailResponse.status} ${JSON.stringify(detail).slice(0, 500)}`
    );
  }
}

async function expectNockupValidationSubmission(baseUrl) {
  const response = await fetch(`${baseUrl}/api/nockchain/nockup/submit`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      project: {
        name: "nockup-smoke",
        repo: "kgbrah/nockup-smoke",
        template: "basic",
        installPath: "apps/nockup-smoke",
        nockupVersion: "upstream-master",
        commit: "5d022ced55040221e8b6fcfd78114189fbae91a0"
      },
      commands: [
        {
          id: "nockup-new",
          command: "nockup new nockup-smoke --template basic --install-path apps/nockup-smoke",
          status: "pass",
          exitCode: 0,
          completedAt: "2026-06-05T20:00:03.000Z",
          outputHash: "sha256:nockup-smoke-new"
        },
        {
          id: "nockup-build",
          command: "nockup build nockup-smoke",
          status: "pass",
          exitCode: 0,
          completedAt: "2026-06-05T20:00:10.000Z",
          outputHash: "sha256:nockup-smoke-build"
        },
        {
          id: "nockup-run",
          command: "nockup run nockup-smoke",
          status: "pass",
          exitCode: 0,
          completedAt: "2026-06-05T20:00:20.000Z",
          outputHash: "sha256:nockup-smoke-run"
        }
      ],
      artifacts: [
        {
          path: "apps/nockup-smoke/out.jam",
          kind: "jam",
          hash: "sha256:nockup-smoke-jam",
          producedBy: "nockup-build"
        }
      ],
      fakenet: {
        endpoint: "http://127.0.0.1:5555",
        networkId: "local-fakenet",
        walletAddress: "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ",
        accepted: true
      }
    })
  });
  const receipt = await response.json();

  if (
    response.status !== 200 ||
    receipt.verified !== true ||
    receipt.storage?.persisted !== true ||
    !receipt.receiptId?.startsWith("nockup_validation_")
  ) {
    throw new Error(
      `Nockup validation submission: expected verified receipt HTTP 200; got ${response.status} ${JSON.stringify(receipt).slice(0, 500)}`
    );
  }

  const listResponse = await fetch(`${baseUrl}/api/nockchain/nockup/receipts`);
  const receiptList = await listResponse.json();
  const indexedReceipt = receiptList.receipts?.find((candidate) => candidate.receiptId === receipt.receiptId);

  if (listResponse.status !== 200 || !indexedReceipt) {
    throw new Error(
      `Nockup validation receipts: expected submitted receipt in index; got ${listResponse.status} ${JSON.stringify(receiptList).slice(0, 500)}`
    );
  }

  const detailResponse = await fetch(`${baseUrl}/api/nockchain/nockup/receipts/${receipt.receiptId}`);
  const detail = await detailResponse.json();

  if (detailResponse.status !== 200 || detail.receiptId !== receipt.receiptId) {
    throw new Error(
      `Nockup validation receipt detail: expected submitted receipt; got ${detailResponse.status} ${JSON.stringify(detail).slice(0, 500)}`
    );
  }
}

async function expectLocalFakenetEvidenceVerification(baseUrl) {
  const evidenceResponse = await fetch(`${baseUrl}/api/fakenet/evidence`);
  const evidence = await evidenceResponse.json();
  const reportId = evidence.verifier?.inputs?.reportIds?.[0];

  if (evidenceResponse.status !== 200 || !evidence.generatedAt || !reportId) {
    throw new Error(
      `local fakenet evidence verifier: missing sample input; got ${evidenceResponse.status} ${JSON.stringify(evidence).slice(0, 500)}`
    );
  }

  const verifyUrl = new URL(`${baseUrl}/api/fakenet/evidence/verify`);
  verifyUrl.searchParams.set("generatedAt", evidence.generatedAt);
  verifyUrl.searchParams.set("reportId", reportId);

  if (evidence.verifier.inputs.grpcEndpoint) {
    verifyUrl.searchParams.set("grpcEndpoint", evidence.verifier.inputs.grpcEndpoint);
  }

  if (evidence.verifier.inputs.walletAddress) {
    verifyUrl.searchParams.set("walletAddress", evidence.verifier.inputs.walletAddress);
  }

  if (evidence.verifier.inputs.blockCommitment) {
    verifyUrl.searchParams.set("blockCommitment", evidence.verifier.inputs.blockCommitment);
  }

  const verifyResponse = await fetch(verifyUrl);
  const verification = await verifyResponse.json();

  if (
    verifyResponse.status !== 200 ||
    verification.checks?.generatedAtMatched !== true ||
    verification.checks?.reportIdsMatched !== true ||
    verification.verified !== evidence.verifier.ready
  ) {
    throw new Error(
      `local fakenet evidence verifier: expected current evidence match; got ${verifyResponse.status} ${JSON.stringify(verification).slice(0, 500)}`
    );
  }
}

async function expectWorkspaceEvidenceVerification(baseUrl) {
  const evidenceResponse = await fetch(`${baseUrl}/api/workspaces/launch-lab-private/evidence`);
  const evidence = await evidenceResponse.json();
  const reportId = evidence.verifier?.inputs?.reportIds?.[0];

  if (evidenceResponse.status !== 200 || !evidence.workspace?.slug || !reportId) {
    throw new Error(
      `workspace evidence verifier: missing sample input; got ${evidenceResponse.status} ${JSON.stringify(evidence).slice(0, 500)}`
    );
  }

  const verifyUrl = new URL(`${baseUrl}/api/workspaces/evidence/verify`);
  verifyUrl.searchParams.set("workspaceSlug", evidence.workspace.slug);
  verifyUrl.searchParams.set("reportId", reportId);

  const badgeId = evidence.verifier.inputs.badgeIds?.[0];
  if (badgeId) {
    verifyUrl.searchParams.set("badgeId", badgeId);
  }

  if (evidence.verifier.inputs.latestSnapshotRoot) {
    verifyUrl.searchParams.set("latestSnapshotRoot", evidence.verifier.inputs.latestSnapshotRoot);
  }

  const verifyResponse = await fetch(verifyUrl);
  const verification = await verifyResponse.json();

  if (
    verifyResponse.status !== 200 ||
    verification.checks?.workspaceMatched !== true ||
    verification.checks?.reportIdsMatched !== true ||
    verification.verified !== evidence.verifier.ready
  ) {
    throw new Error(
      `workspace evidence verifier: expected current evidence match; got ${verifyResponse.status} ${JSON.stringify(verification).slice(0, 500)}`
    );
  }
}

async function expectWorkspaceUploadPolicy(baseUrl) {
  const response = await fetch(`${baseUrl}/api/workspaces/launch-lab-private/upload-policy`);
  const policy = await response.json();

  if (
    response.status !== 200 ||
    policy.status !== "auth-required" ||
    policy.token?.issuanceStatus !== "not-issued" ||
    policy.token?.authenticationRequired !== true ||
    !policy.reportContract?.requiredFields?.includes("reportHash") ||
    !policy.links?.evidence?.endsWith("/api/workspaces/launch-lab-private/evidence")
  ) {
    throw new Error(
      `workspace upload policy: expected auth-gated policy; got ${response.status} ${JSON.stringify(policy).slice(0, 500)}`
    );
  }
}

async function expectWorkspaceUploadTokenGate(baseUrl) {
  const response = await fetch(`${baseUrl}/api/workspaces/launch-lab-private/upload-token`);
  const body = await response.json();

  if (
    response.status !== 401 ||
    body.error !== "unauthorized workspace upload token" ||
    body.authenticationRequired !== true ||
    body.tokenValue !== undefined ||
    body.links?.policy !== "/api/workspaces/launch-lab-private/upload-policy"
  ) {
    throw new Error(
      `workspace upload token gate: expected protected challenge boundary; got ${response.status} ${JSON.stringify(body).slice(0, 500)}`
    );
  }
}

async function expectWorkspaceUploadTokenVerification(baseUrl) {
  const response = await fetch(`${baseUrl}/api/workspaces/upload-token/verify`);
  const body = await response.json();

  if (
    response.status !== 200 ||
    body.verified !== false ||
    body.query?.tokenPresent !== false ||
    body.checks?.tokenProvided !== false ||
    body.token?.tokenValue !== undefined
  ) {
    throw new Error(
      `workspace upload token verifier: expected missing-token rejection; got ${response.status} ${JSON.stringify(body).slice(0, 500)}`
    );
  }
}

async function expectTrustFeedFakenetEvidence(url) {
  const response = await fetch(url);
  const body = await response.text();

  if (response.status !== 200) {
    throw new Error(`trust event feed: expected HTTP 200, got ${response.status}; body: ${body.slice(0, 500)}`);
  }

  const feed = JSON.parse(body);
  const fakenetEvent = feed.events?.find((event) => event.type === "local-fakenet-evidence");

  if (
    feed.counts?.localFakenetEvidence !== 1 ||
    !fakenetEvent?.evidence?.rootHash?.startsWith("sha256:")
  ) {
    throw new Error(
      `trust event feed: expected local fakenet evidence event with root; body: ${JSON.stringify({
        counts: feed.counts,
        fakenetEvent
      }).slice(0, 500)}`
    );
  }
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (typeof address === "object" && address?.port) {
          resolve(address.port);
          return;
        }

        reject(new Error("Unable to reserve a local preview port"));
      });
    });
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: process.env, stdio: "inherit" });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function waitForPreview(preview, url) {
  let exited = false;
  let exitCode = null;

  preview.on("exit", (code) => {
    exited = true;
    exitCode = code;
  });

  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (exited) {
      throw new Error(`Cloudflare preview exited before readiness with code ${exitCode}`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Preview is still starting.
    }

    await delay(1000);
  }

  throw new Error(`Timed out waiting for Cloudflare preview at ${url}`);
}

async function expectStatus(url, expectedStatus, label) {
  const response = await fetch(url);

  if (response.status !== expectedStatus) {
    const body = await response.text().catch(() => "");
    const bodyDetail = body ? `; body: ${body.slice(0, 500)}` : "";

    throw new Error(`${label}: expected HTTP ${expectedStatus}, got ${response.status}${bodyDetail}`);
  }
}

async function expectGeneratedReports(url) {
  const response = await fetch(url);
  const body = await response.text();

  if (response.status !== 200) {
    throw new Error(`generated report index: expected HTTP 200, got ${response.status}; body: ${body.slice(0, 500)}`);
  }

  const reportIndex = JSON.parse(body);

  if (reportIndex.totals?.reportCount < 1) {
    throw new Error(
      `generated report index: expected at least one report; body: ${JSON.stringify({
        status: reportIndex.status,
        manifestPath: reportIndex.manifestPath,
        totals: reportIndex.totals
      })}`
    );
  }
}

async function expectNockchainUpstream(url) {
  const response = await fetch(url);
  const body = await response.text();

  if (response.status !== 200) {
    throw new Error(`Nockchain upstream intelligence: expected HTTP 200, got ${response.status}; body: ${body.slice(0, 500)}`);
  }

  const upstream = JSON.parse(body);

  if (
    upstream.repository?.fullName !== "nockchain/nockchain" ||
    upstream.latestCommit?.shortSha !== "5d022ced5504" ||
    !upstream.docs?.canonicalSpine?.some((doc) => doc.path === "PROTOCOL.md") ||
    !upstream.workspace?.crateGroups?.chainRuntime?.includes("nockchain")
  ) {
    throw new Error(
      `Nockchain upstream intelligence: unexpected body ${JSON.stringify({
        repository: upstream.repository,
        latestCommit: upstream.latestCommit,
        docs: upstream.docs?.canonicalSpine,
        chainRuntime: upstream.workspace?.crateGroups?.chainRuntime
      }).slice(0, 500)}`
    );
  }
}

async function stopPreview(preview, previewExited) {
  if (preview.exitCode !== null) {
    return;
  }

  signalPreview(preview, "SIGTERM");
  await Promise.race([previewExited, delay(3000)]);

  if (preview.exitCode !== null) {
    return;
  }

  signalPreview(preview, "SIGKILL");
  await Promise.race([previewExited, delay(1000)]);
}

function signalPreview(preview, signal) {
  try {
    if (process.platform !== "win32" && preview.pid) {
      process.kill(-preview.pid, signal);
      return;
    }

    preview.kill(signal);
  } catch (error) {
    if (error.code !== "ESRCH") {
      throw error;
    }
  }
}
