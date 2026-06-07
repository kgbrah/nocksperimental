import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const sourceCommitSha = nockchainUpstreamIntelligence.latestCommit.sha;
const sourceBlobUrl = (path: string, lineRange: string) =>
  `https://github.com/nockchain/nockchain/blob/${sourceCommitSha}/${path}#${lineRange}`;

const sourceAnchors = [
  {
    id: "bridge-withdrawals-spec",
    label: "Bridge withdrawals spec",
    upstreamFile: "crates/bridge/docs/bridge-withdrawals.md",
    upstreamSymbols: ["bridge-withdrawals", "peer-canonical", "kernel reconciliation"],
    lineRange: "L199-L280",
    upstreamUrl: sourceBlobUrl("crates/bridge/docs/bridge-withdrawals.md", "L199-L280"),
    exposure: "scoped-bridge-authority",
    evidenceBoundary:
      "Canonical bridge withdrawal spec for peer-canonical proposals, sequencer authorization, submission, confirmation, and kernel reconciliation.",
    evidenceUse:
      "Use when a receipt must explain that peer canonicalization is not enough for submit-ready withdrawal evidence.",
    receiptFields: [
      "withdrawalId",
      "proposalHash",
      "sequencerState",
      "confirmedHeight",
      "confirmedBlockId",
      "kernelReconciliationStatus"
    ],
    riskPosture:
      "Bridge claims belong to the bridge runbook/spec family and current Rust source, not generic protocol assumptions alone."
  },
  {
    id: "runtime-loop-bootstrap",
    label: "Runtime loop bootstrap",
    upstreamFile: "crates/bridge/src/withdrawal/runtime.rs",
    upstreamSymbols: ["bootstrap_runtime", "spawn_runtime_loops", "WithdrawalRuntimeContext"],
    lineRange: "L25-L101",
    upstreamUrl: sourceBlobUrl("crates/bridge/src/withdrawal/runtime.rs", "L25-L101"),
    exposure: "runtime-orchestration",
    evidenceBoundary:
      "Bootstraps withdrawal restore and starts activation-gated assembly, signing, and submission loops.",
    evidenceUse:
      "Use to prove bridge withdrawal execution is active only after activation readiness and restore have completed.",
    receiptFields: [
      "withdrawalActivationCutoff",
      "activationRestored",
      "assemblyLoopStarted",
      "signingLoopStarted",
      "submissionLoopStarted"
    ],
    riskPosture:
      "A bridge node process being up does not prove withdrawal loops are active; receipts need activation and restore context."
  },
  {
    id: "withdrawal-kernel-port",
    label: "Withdrawal kernel port",
    upstreamFile: "crates/bridge/src/withdrawal/assembly.rs",
    upstreamSymbols: ["WithdrawalKernelPort", "BridgeRuntimeHandle"],
    lineRange: "L70-L162",
    upstreamUrl: sourceBlobUrl("crates/bridge/src/withdrawal/assembly.rs", "L70-L162"),
    exposure: "kernel-poke-peek-boundary",
    evidenceBoundary:
      "Typed Rust boundary for poking create-withdrawal-tx/sign-tx and peeking/acking Base withdrawal state in the Hoon bridge kernel.",
    evidenceUse:
      "Use to connect kernel effects to Rust receipt fields without publishing raw noun slabs or transaction jams.",
    receiptFields: [
      "baseBlockWithdrawalsPending",
      "baseBlockWithdrawalsCommitted",
      "createWithdrawalTx",
      "signTx",
      "kernelProjectionCursor"
    ],
    riskPosture:
      "Kernel pokes and peeks must be recorded as structured evidence; raw Nock nouns and local slabs stay out of public receipts."
  },
  {
    id: "execution-driver-effects",
    label: "Execution driver effects",
    upstreamFile: "crates/bridge/src/withdrawal/assembly.rs",
    upstreamSymbols: ["create_withdrawal_execution_driver", "WithdrawalExecutionEffect"],
    lineRange: "L529-L789",
    upstreamUrl: sourceBlobUrl("crates/bridge/src/withdrawal/assembly.rs", "L529-L789"),
    exposure: "kernel-effect-driver",
    evidenceBoundary:
      "Consumes withdrawal-related kernel effects and converts them into durable Rust proposal state, peer broadcasts, or local stop on durable conflict.",
    evidenceUse:
      "Use to map withdrawalProposalBuilt, withdrawalTxSigned, and Base pending effects into receipt-safe transition evidence.",
    receiptFields: [
      "withdrawalProposalBuilt",
      "withdrawalTxSigned",
      "baseBlockWithdrawalsPending",
      "acceptedPeers",
      "canonicalized",
      "localStopReason"
    ],
    riskPosture:
      "Effect decoding errors and durable conflicts are operator evidence; do not silently turn them into success receipts."
  },
  {
    id: "assembly-tick",
    label: "Assembly tick",
    upstreamFile: "crates/bridge/src/withdrawal/assembly.rs",
    upstreamSymbols: ["withdrawal_assembly_tick_once", "WithdrawalAssemblyTickOutcome"],
    lineRange: "L864-L940",
    upstreamUrl: sourceBlobUrl("crates/bridge/src/withdrawal/assembly.rs", "L864-L940"),
    exposure: "proposal-assembly",
    evidenceBoundary:
      "Selects the next stageable withdrawal, enforces deterministic proposer ownership, refreshes the bridge note snapshot, subtracts sequencer-reserved inputs, and asks the kernel to build a proposal.",
    evidenceUse:
      "Use when proving a withdrawal proposal was assembled from a safe snapshot and unreserved bridge-owned notes.",
    receiptFields: [
      "withdrawalId",
      "withdrawalEpoch",
      "selectedInputs",
      "snapshotHeight",
      "snapshotBlockId",
      "reservedInputNames"
    ],
    riskPosture:
      "Proposal assembly evidence is incomplete without snapshot identity and sequencer-reserved input context."
  },
  {
    id: "submission-tick",
    label: "Submission tick",
    upstreamFile: "crates/bridge/src/withdrawal/submission.rs",
    upstreamSymbols: ["withdrawal_submission_tick_once", "WithdrawalSubmissionTickOutcome"],
    lineRange: "L660-L796",
    upstreamUrl: sourceBlobUrl("crates/bridge/src/withdrawal/submission.rs", "L660-L796"),
    exposure: "bridge-side-submission",
    evidenceBoundary:
      "Bridge-side tick registers the sequencer frontier, authorizes fully signed peer-canonical proposals, and asks the sequencer to submit authorized proposals.",
    evidenceUse:
      "Use to distinguish authorizing a proposal from mempool acceptance or confirmed inclusion.",
    receiptFields: [
      "sequencerAuthorizationState",
      "commitCertificate",
      "mempoolAccepted",
      "frontierNonce",
      "callerNodeId"
    ],
    riskPosture:
      "Peer-canonical and authorized are separate states; submitted or mempool-accepted is still not final settlement evidence."
  },
  {
    id: "public-submitter",
    label: "Public Nockchain submitter",
    upstreamFile: "crates/bridge/src/withdrawal/submission.rs",
    upstreamSymbols: ["PublicNockchainWithdrawalSubmitter", "WithdrawalSubmitPort"],
    lineRange: "L380-L611",
    upstreamUrl: sourceBlobUrl("crates/bridge/src/withdrawal/submission.rs", "L380-L611"),
    exposure: "public-nockchain-api",
    evidenceBoundary:
      "Submits authorized raw transactions through the public Nockchain API and separately checks tx acceptance, block inclusion, and tip height.",
    evidenceUse:
      "Use to keep txAccepted, includedBlock, and current tip evidence separate in bridge receipts.",
    receiptFields: [
      "publicApiEndpoint",
      "submittedRawTxId",
      "txAccepted",
      "includedBlock",
      "tipHeight"
    ],
    riskPosture:
      "Mempool acceptance is diagnostic; confirmed settlement needs inclusion and configured confirmation depth."
  },
  {
    id: "confirmation-loop",
    label: "Sequencer confirmation loop",
    upstreamFile: "crates/bridge/src/withdrawal/submission.rs",
    upstreamSymbols: [
      "withdrawal_sequencer_confirmation_tick_once",
      "run_withdrawal_sequencer_confirmation_loop"
    ],
    lineRange: "L849-L949",
    upstreamUrl: sourceBlobUrl("crates/bridge/src/withdrawal/submission.rs", "L849-L949"),
    exposure: "sequencer-confirmation",
    evidenceBoundary:
      "Sequencer-owned confirmation poll checks included block and current tip height, then records confirmed lifecycle state when confirmation depth is satisfied.",
    evidenceUse:
      "Use when a receipt claims confirmation depth rather than mere tx acceptance.",
    receiptFields: [
      "confirmedHeight",
      "confirmedBlockId",
      "includedHeight",
      "includedBlockId",
      "confirmationDepth"
    ],
    riskPosture:
      "Receipts must not call a withdrawal confirmed until this boundary records block inclusion with depth."
  },
  {
    id: "orphan-retry-loop",
    label: "Orphan retry loop",
    upstreamFile: "crates/bridge/src/withdrawal/submission.rs",
    upstreamSymbols: [
      "withdrawal_sequencer_orphan_retry_tick_once",
      "run_withdrawal_sequencer_orphan_retry_loop"
    ],
    lineRange: "L951-L1076",
    upstreamUrl: sourceBlobUrl("crates/bridge/src/withdrawal/submission.rs", "L951-L1076"),
    exposure: "sequencer-retry",
    evidenceBoundary:
      "Resubmits exact authorized raw transactions for stale mempool-accepted withdrawals that have not appeared in an included block.",
    evidenceUse:
      "Use when support bundles need to explain retry attempts without publishing the raw transaction payload.",
    receiptFields: [
      "retryAfterBaseBlocks",
      "lastSubmitAttemptBaseHeight",
      "mempoolRetryAttempted",
      "retryError",
      "submittedRawTxId"
    ],
    riskPosture:
      "Retry metadata is evidence; raw authorized transactions remain sensitive and should be hashed or referenced, not published."
  },
  {
    id: "sequencer-rpc-service",
    label: "Sequencer RPC service",
    upstreamFile: "crates/bridge/src/withdrawal/sequencer/rpc.rs",
    upstreamSymbols: ["WithdrawalSequencerRpcService", "register_withdrawal"],
    lineRange: "L92-L230",
    upstreamUrl: sourceBlobUrl("crates/bridge/src/withdrawal/sequencer/rpc.rs", "L92-L230"),
    exposure: "api-node-private-sequencer",
    evidenceBoundary:
      "API-node-hosted private sequencer RPC service that validates caller turn, Base withdrawal facts, and submission retry windows.",
    evidenceUse:
      "Use to label sequencer evidence as private RPC evidence, not public user-facing Nockchain API evidence.",
    receiptFields: [
      "sequencerEndpoint",
      "callerNodeId",
      "expectedProposer",
      "baseWithdrawalVerified",
      "handoffWindowBlocks"
    ],
    riskPosture:
      "caller_node_id is currently trusted because bridge nodes run on a VPN; receipts preserve the sequencer endpoint and caller identity so evidence carries that trust context. Future gate: when bridge withdrawal receipts become independently signed, they MUST carry a machine-readable callerAuthBasis (the cryptographic reason the caller was authorized) so an offline verifier can assess caller authorization without trusting the VPN network perimeter."
  },
  {
    id: "sequencer-store",
    label: "Sequencer store",
    upstreamFile: "crates/bridge/src/withdrawal/sequencer/store.rs",
    upstreamSymbols: [
      "WithdrawalSequencerStore",
      "sequencer_authorize_proposal",
      "record_tx_confirmed"
    ],
    lineRange: "L437-L940",
    upstreamUrl: sourceBlobUrl("crates/bridge/src/withdrawal/sequencer/store.rs", "L437-L940"),
    exposure: "durable-sequencer-state",
    evidenceBoundary:
      "SQLite projection plus journal-backed sequencer state for ordered withdrawals, reserved inputs, authorization, submit outcome, mempool acceptance, retries, and confirmation.",
    evidenceUse:
      "Use to explain single-flight withdrawal behavior and durable reserved-input ownership.",
    receiptFields: [
      "singleFlightWithdrawal",
      "reservedInputNames",
      "withdrawalNonce",
      "proposalHash",
      "sequencerState",
      "confirmedHeight",
      "confirmedBlockId"
    ],
    riskPosture:
      "If sequencer state and journal continuity disagree, evidence should fail closed until recovery/replay explains the projection."
  },
  {
    id: "sequencer-journal",
    label: "Sequencer journal",
    upstreamFile: "crates/bridge/src/withdrawal/sequencer/journal.rs",
    upstreamSymbols: ["SequencerJournalRecord", "SequencerJournalEventType", "SequencerJournal"],
    lineRange: "L28-L123",
    upstreamUrl: sourceBlobUrl("crates/bridge/src/withdrawal/sequencer/journal.rs", "L28-L123"),
    exposure: "append-only-journal",
    evidenceBoundary:
      "Append-only journal record identity for sequencer events, previous-event linkage, record hashes, optional signature, and event type.",
    evidenceUse:
      "Use to publish durable journal metadata and verification context without publishing secrets or raw transaction jams.",
    receiptFields: [
      "sequencerJournalId",
      "journalSequence",
      "previousEventId",
      "recordHash",
      "eventType",
      "signature"
    ],
    riskPosture:
      "Journal object ids and hashes are receipt-safe; sequencer journal signing keys and object-store secrets must never enter receipts."
  },
  {
    id: "bridge-dev-scenario-readme",
    label: "Bridge-dev scenario README",
    upstreamFile: "crates/bridge-dev/tests/README.md",
    upstreamSymbols: ["bridge-dev Scenario Tests", "BRIDGE_DEV_RUN_E2E", "BRIDGE_R2_RUN_E2E"],
    lineRange: "L1-L66",
    upstreamUrl: sourceBlobUrl("crates/bridge-dev/tests/README.md", "L1-L66"),
    exposure: "external-state-e2e-fixture",
    evidenceBoundary:
      "Ignored bridge-dev scenarios run against fresh Tenderly VNET state and release-built bridge binaries; they are opt-in external-state fixtures, not default CI.",
    evidenceUse:
      "Use to label scenario receipts with command, opt-in gate, Tenderly/R2 boundary, and hashed artifact provenance without storing credentials.",
    receiptFields: [
      "scenarioName",
      "scenarioRunRootHash",
      "scenarioPortOffset",
      "tenderlyVnetId",
      "bridgeDevRunE2e",
      "r2JournalEventPrefixHash",
      "scenarioArtifactHash"
    ],
    riskPosture:
      "Bridge-dev scenarios may prove live integration behavior, but receipts must redact Tenderly credentials, private keys, raw VNET env files, R2 tokens, and raw object-store journal payloads."
  },
  {
    id: "bridge-dev-withdrawal-scenarios",
    label: "Bridge-dev withdrawal scenarios",
    upstreamFile: "crates/bridge-dev/tests/scenarios.rs",
    upstreamSymbols: [
      "withdrawal_happy_path_reaches_executed",
      "withdrawal_sequencer_rebuilds_from_r2_after_sqlite_wipe",
      "two_node_degraded_withdrawal_still_executes"
    ],
    lineRange: "L953-L1125",
    upstreamUrl: sourceBlobUrl("crates/bridge-dev/tests/scenarios.rs", "L953-L1125"),
    exposure: "withdrawal-e2e-fixture",
    evidenceBoundary:
      "Opt-in withdrawal scenarios cover happy path execution, bridge restart, sequencer restart, R2 journal replay after SQLite wipe, full bridge downtime recovery, and degraded two-node execution.",
    evidenceUse:
      "Use when an external scenario receipt needs to prove withdrawal phase progression and recovery mode without publishing raw authorized transactions or scenario secrets.",
    receiptFields: [
      "withdrawalScenarioPhase",
      "proposalHash",
      "authorizedTransactionName",
      "sequencedState",
      "handoffOwner",
      "scenarioRecoveryMode",
      "componentStopSet"
    ],
    riskPosture:
      "Scenario output should be reduced to stable names, hashes, phases, and recovery classification before entering Nocksperimental evidence."
  }
] as const;

const executionFlow = [
  {
    id: "base-burn-pending",
    sourceAnchorId: "bridge-withdrawals-spec",
    label: "Base burn becomes pending withdrawal",
    interpretation:
      "Base burn events become kernel-tracked withdrawal requests keyed by as_of Base hash and base_event_id.",
    receiptImplication:
      "Record Base tx/log identity, lock root, base_event_id, base_batch_end, and kernel pending/commit ack."
  },
  {
    id: "kernel-effects-to-driver",
    sourceAnchorId: "execution-driver-effects",
    label: "Kernel effects enter Rust driver",
    interpretation:
      "Withdrawal kernel effects are decoded and persisted by Rust before peer or sequencer state advances.",
    receiptImplication:
      "Record the effect type and durable persistence outcome before treating a proposal as live."
  },
  {
    id: "assembly-builds-proposal",
    sourceAnchorId: "assembly-tick",
    label: "Assembly builds proposal",
    interpretation:
      "A deterministic proposer uses safe snapshot data and sequencer-reserved-input context to request a kernel-built proposal.",
    receiptImplication:
      "Bind proposal hash to snapshot height/block id, selected inputs, and reserved-input exclusions."
  },
  {
    id: "peer-canonical-not-submit-ready",
    sourceAnchorId: "sequencer-store",
    label: "Peer canonical is not submit-ready",
    interpretation:
      "Peer canonicalization fixes a proposal hash, but sequencer authorization is still required before submission.",
    receiptImplication:
      "Do not mark a withdrawal submit-ready unless sequencerState is authorized or later."
  },
  {
    id: "sequencer-authorizes",
    sourceAnchorId: "submission-tick",
    label: "Sequencer authorizes",
    interpretation:
      "The bridge-side submission tick asks the sequencer to authorize a fully signed canonical proposal.",
    receiptImplication:
      "Record commit certificate, caller node id, sequencer endpoint, and authorization state."
  },
  {
    id: "sequencer-submits",
    sourceAnchorId: "public-submitter",
    label: "Sequencer submits",
    interpretation:
      "The sequencer submits the exact authorized raw transaction through the colocated public Nockchain API.",
    receiptImplication:
      "Record submittedRawTxId and txAccepted separately from confirmed block evidence."
  },
  {
    id: "sequencer-confirms",
    sourceAnchorId: "confirmation-loop",
    label: "Sequencer confirms",
    interpretation:
      "The confirmation loop records confirmed lifecycle state only after included block and tip-depth checks.",
    receiptImplication:
      "Record confirmedHeight, confirmedBlockId, includedHeight, tipHeight, and confirmationDepth."
  },
  {
    id: "kernel-reconciles",
    sourceAnchorId: "bridge-withdrawals-spec",
    label: "Kernel reconciles",
    interpretation:
      "Kernel reconciliation independently checks counterpart identity, destination, and amount bounds after Nockchain settlement.",
    receiptImplication:
      "Record kernelReconciliationStatus in addition to sequencer confirmation."
  }
] as const;

const externalScenarioEvidenceContract = {
  command: "cargo test -p bridge-dev --test scenarios -- --ignored --test-threads=1",
  buildCommand: "cargo build --release -p bridge -p nockchain-bridge-sequencer -p nockchain-wallet",
  gating: {
    mode: "opt-in-external-state",
    defaultCi: "forbidden",
    testThreads: 1,
    sourceAnchorIds: ["bridge-dev-scenario-readme", "bridge-dev-withdrawal-scenarios"]
  },
  requiredEnv: [
    "BRIDGE_DEV_RUN_E2E",
    "TENDERLY_ACCESS_KEY",
    "TENDERLY_ACCOUNT_ID",
    "TENDERLY_PROJECT_SLUG",
    "TENDERLY_TEST_PRIVATE_KEY"
  ],
  optionalEnv: [
    "BRIDGE_DEV_E2E_PORT_OFFSET",
    "BRIDGE_DEV_TEST_RUN_ROOT",
    "BRIDGE_DEV_PORT_OFFSET",
    "BRIDGE_DEV_FAKENET_GENESIS_JAM",
    "BRIDGE_DEV_FAKENET_POW_LEN",
    "BRIDGE_DEV_FAKENET_LOG_DIFFICULTY",
    "BRIDGE_DEV_BASE_BLOCKS_CHUNK",
    "BRIDGE_NOCK_OBSERVER_POLL_MILLIS",
    "BRIDGE_DEV_BRIDGE_SAVE_INTERVAL_MILLIS"
  ],
  r2Env: [
    "BRIDGE_R2_RUN_E2E",
    "BRIDGE_R2_TEST_URL",
    "BRIDGE_R2_TEST_ENDPOINT",
    "BRIDGE_R2_TEST_BUCKET",
    "BRIDGE_R2_TEST_REGION",
    "BRIDGE_R2_TEST_PREFIX",
    "BRIDGE_R2_TEST_TOKEN",
    "BRIDGE_R2_TEST_ACCESS_KEY_ID",
    "BRIDGE_R2_TEST_SECRET_ACCESS_KEY",
    "BRIDGE_R2_KEEP_OBJECTS"
  ],
  scenarioIds: [
    "fresh-vnet-boot",
    "deposit-happy-path",
    "deposit-downtime-recovery",
    "all-bridge-restart-after-deposit",
    "multiple-deposits",
    "withdrawal-happy-path",
    "withdrawal-ready-restart",
    "withdrawal-submitted-sequencer-restart",
    "withdrawal-r2-sequencer-recovery",
    "withdrawal-bridge-downtime",
    "two-node-degraded-withdrawal",
    "two-node-degraded-deposit"
  ],
  receiptSafeFields: [
    "scenarioName",
    "scenarioRunId",
    "scenarioRunRootHash",
    "scenarioPortOffset",
    "componentStopSet",
    "withdrawalScenarioPhase",
    "proposalHash",
    "authorizedTransactionName",
    "sequencedState",
    "handoffOwner",
    "scenarioRecoveryMode",
    "r2JournalIdHash",
    "r2JournalEventPrefixHash",
    "scenarioArtifactHash"
  ],
  forbiddenFields: [
    "tenderlyAccessKey",
    "tenderlyTestPrivateKey",
    "r2TestToken",
    "r2AccessKeyId",
    "r2SecretAccessKey",
    "sequencerJournalObjectStoreSecretAccessKey",
    "bridgeDevOwnerPrivateKey",
    "rawTenderlyVnetEnv",
    "rawScenarioStdout",
    "rawScenarioStderr",
    "rawR2JournalObject",
    "rawAuthorizedRawTx"
  ],
  interpretationRules: [
    "Bridge-dev scenarios are opt-in external-state fixtures, not default CI proof.",
    "A passing scenario can support integration evidence only with commit, release build, command, env gate, and artifact hashes.",
    "Tenderly, R2, wallet, owner, sequencer journal, and raw transaction secrets stay outside public receipts.",
    "R2-backed recovery evidence should publish hashed journal ids or prefixes, never raw object keys with credentials."
  ],
  verificationGates: [
    "test:nockchain-bridge-source-api",
    "test:nockchain-bridge-trace",
    "cargo test -p bridge-dev --test scenarios -- --ignored --test-threads=1"
  ]
} as const;

const sourceDriftCheck = {
  command: "npm run check:nockchain-bridge-source-drift -- --json",
  script: "scripts/check-nockchain-bridge-source-drift.mjs",
  testCommand: "npm run test:nockchain-bridge-source-drift-check",
  sourceAnchorIds: sourceAnchors.map((anchor) => anchor.id),
  compareFields: [
    "upstreamCommit",
    "sourceAnchorId",
    "sourceSha256",
    "sourceBytes",
    "requiredSymbols",
    "externalScenarioContract"
  ],
  targetSurfaces: [
    "nockchainBridgeSourceTrace",
    "nockchainRustSourceGuide",
    "veslEvidenceBridge",
    "launchEvidence",
    "registryCheckpoint"
  ],
  interpretation:
    "Compares commit-pinned bridge source files and bridge-dev scenario fixtures against current upstream master before bridge receipts rely on these source anchors."
} as const;

const sourceTraceContract = {
  requiredFields: [
    "nockchainCommit",
    "nockchainBuild",
    "upstreamFile",
    "upstreamSymbol",
    "lineRange",
    "withdrawalId",
    "baseEventId",
    "proposalHash",
    "sequencerState",
    "journalEventId",
    "confirmationEvidence"
  ],
  optionalFields: [
    "sequencerEndpoint",
    "sequencerJournalId",
    "includedHeight",
    "includedBlockId",
    "kernelReconciliationStatus",
    "reservedInputNames",
    "retryAfterBaseBlocks",
    "scenarioName",
    "scenarioRunRootHash",
    "scenarioArtifactHash",
    "r2JournalIdHash",
    "r2JournalEventPrefixHash"
  ],
  forbiddenFields: [
    "rawTransactionJam",
    "rawAuthorizedRawTx",
    "sequencerJournalSigningKey",
    "sequencerObjectStoreSecret",
    "bridgeNodePrivateKey",
    "walletSeedPhrase",
    "walletPrivateKey",
    "tenderlyAccessKey",
    "tenderlyTestPrivateKey",
    "r2TestToken",
    "r2AccessKeyId",
    "r2SecretAccessKey",
    "sequencerJournalObjectStoreSecretAccessKey",
    "bridgeDevOwnerPrivateKey",
    "rawTenderlyVnetEnv",
    "rawScenarioStdout",
    "rawScenarioStderr",
    "rawR2JournalObject"
  ],
  interpretationRules: [
    "Use bridge docs and current bridge Rust source for bridge-specific operational claims.",
    "Treat peer-canonical as a proposal-hash agreement, not submission authorization.",
    "Treat tx-accepted as diagnostic and submitted as advisory until confirmation depth is observed.",
    "Treat sequencer journal records as append-only metadata; never publish signing keys or object-store secrets.",
    "Keep kernel reconciliation separate from sequencer confirmation evidence.",
    "Bridge-dev scenarios are opt-in external-state fixtures, not default CI proof."
  ]
} as const;

const upstreamSignals = [
  {
    prNumber: 127,
    title: "bridge: add end-to-end withdrawal execution",
    status: "merged",
    commit: nockchainUpstreamIntelligence.latestCommit.sha,
    url: "https://github.com/nockchain/nockchain/pull/127",
    relevance:
      "Introduced the current bridge withdrawal execution path that this source trace maps into Nocksperimental receipt fields."
  },
  {
    prNumber: 126,
    title: "nockchain-bench",
    status: "open",
    url: "https://github.com/nockchain/nockchain/pull/126",
    relevance:
      "Potential future benchmark evidence source for bridge/runtime performance receipts."
  }
] as const;

const operatorInvariants = [
  "peer-canonical is not submit-ready",
  "submitted is advisory until confirmation depth",
  "sequencer journal secrets never enter receipts",
  "reserved inputs are sequencer-owned until confirmed settlement",
  "kernel reconciliation is separate from sequencer confirmation"
] as const;

export function createNockchainBridgeSourceTrace() {
  const upstream = nockchainUpstreamIntelligence;
  const receiptFields = Array.from(
    new Set(sourceAnchors.flatMap((anchor) => Array.from(anchor.receiptFields)))
  );

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/bridge-source`,
    generatedAt: "2026-06-06T05:10:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      crate: "bridge",
      sourceCommitUrl: upstream.latestCommit.url
    },
    sourceAnchors,
    executionFlow,
    sourceTraceContract,
    externalScenarioEvidenceContract,
    sourceDriftCheck,
    receiptFieldMapping: {
      receiptFields,
      lifecycleFields: [
        "sequencerState",
        "proposalHash",
        "journalEventId",
        "confirmedHeight",
        "kernelReconciliationStatus"
      ],
      publicApiFields: ["txAccepted", "includedBlock", "tipHeight", "confirmationDepth"],
      forbiddenFields: sourceTraceContract.forbiddenFields
    },
    upstreamSignals,
    operatorInvariants,
    nocksperimentalNextUses: [
      "Attach bridge sourceAnchorId fields to Launch Evidence bridge withdrawal receipts.",
      "Use the sequencer journal fields to distinguish append-only lifecycle metadata from raw transaction artifacts.",
      "Add bridge support-bundle checks for peer-canonical, authorized, mempool-accepted, confirmed, and kernel-reconciled states.",
      "Use bridge-dev scenario receipts only as opt-in external-state evidence with redacted Tenderly/R2 fields and hashed artifacts.",
      "Monitor PR #126 for benchmark evidence that could extend bridge runtime performance receipts."
    ],
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/bridge/source`,
      bridgeTrace: `${registryCanonicalBaseUrl}/api/nockchain/bridge`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      upstream: upstream.canonicalUrl,
      release: upstream.latestRelease.url,
      bridgePr127: "https://github.com/nockchain/nockchain/pull/127",
      bridgeDevScenarios:
        "https://github.com/nockchain/nockchain/blob/33ba97b1e206dd89b15c61b72b7802caf2136c18/crates/bridge-dev/tests/README.md",
      bridgeDocs:
        "https://github.com/nockchain/nockchain/blob/33ba97b1e206dd89b15c61b72b7802caf2136c18/crates/bridge/docs/bridge-withdrawals.md"
    }
  };
}
