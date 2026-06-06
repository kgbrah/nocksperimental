import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const sourceAnchors = [
  {
    id: "bridge-withdrawals-spec",
    path: "crates/bridge/docs/bridge-withdrawals.md",
    authority: "canonical-bridge-withdrawal-spec",
    role: "End-to-end withdrawal protocol and implementation status.",
    evidence:
      "Defines Base burn ingestion, kernel pending/commit effects, proposal assembly, sequencer authorization, confirmation, and journal persistence.",
    url: "https://github.com/nockchain/nockchain/blob/master/crates/bridge/docs/bridge-withdrawals.md"
  },
  {
    id: "bridge-architecture",
    path: "crates/bridge/docs/architecture.md",
    authority: "scoped-runtime-architecture",
    role: "Bridge component map and deposit/withdrawal runtime boundaries.",
    evidence:
      "Documents contracts, Hoon kernel, Rust observers, gRPC interfaces, signing/posting loops, and withdrawal effect handling.",
    url: "https://github.com/nockchain/nockchain/blob/master/crates/bridge/docs/architecture.md"
  },
  {
    id: "bridge-runtime",
    path: "crates/bridge/src/withdrawal/runtime.rs",
    authority: "rust-runtime-source",
    role: "Runtime loop orchestration for withdrawal activation, assembly, signing, and submission.",
    evidence:
      "Spawns activation restore, assembly, signing, and submission loops after activation readiness is proven.",
    url: "https://github.com/nockchain/nockchain/blob/master/crates/bridge/src/withdrawal/runtime.rs"
  },
  {
    id: "withdrawal-submission",
    path: "crates/bridge/src/withdrawal/submission.rs",
    authority: "rust-submission-source",
    role: "Sequencer-owned authorization/submission/confirmation lifecycle.",
    evidence:
      "Submission is downstream of sequencer authorization and must not be treated as consensus finality until confirmation is observed.",
    url: "https://github.com/nockchain/nockchain/blob/master/crates/bridge/src/withdrawal/submission.rs"
  },
  {
    id: "bridge-sequencer-crate",
    path: "crates/nockchain-bridge-sequencer/src/main.rs",
    authority: "sequencer-binary-source",
    role: "Dedicated Nockchain API node hosted withdrawal sequencer service.",
    evidence:
      "New sequencer crate owns withdrawal ordering, authorization, in-flight state, and confirmation polling from the colocated public API.",
    url: "https://github.com/nockchain/nockchain/blob/master/crates/nockchain-bridge-sequencer/src/main.rs"
  },
  {
    id: "wallet-tx-builder-fixture",
    path: "crates/wallet-tx-builder/tests/fixtures/withdrawal_tx_fixtures.jam",
    authority: "tx-builder-fixture",
    role: "Fixture coverage for bridge-owned withdrawal transaction construction.",
    evidence:
      "Withdrawal transaction fixtures anchor planner/fee/signature behavior that settlement evidence should cite.",
    url: "https://github.com/nockchain/nockchain/blob/master/crates/wallet-tx-builder/tests/fixtures/withdrawal_tx_fixtures.jam"
  },
  {
    id: "hoon-bridge-kernel",
    path: "hoon/apps/bridge/bridge.hoon",
    authority: "deterministic-kernel-source",
    role: "Hoon bridge state machine that reconciles withdrawal settlement with kernel state.",
    evidence:
      "Kernel seams include pending withdrawal requests, proposal-building causes, signing causes, and settlement reconciliation.",
    url: "https://github.com/nockchain/nockchain/blob/master/hoon/apps/bridge/bridge.hoon"
  }
] as const;

const withdrawalFlow = [
  {
    id: "base-burn",
    actor: "Base contracts",
    summary: "User burns wrapped NOCK through Nock.sol::burn and MessageInbox.notifyBurn records the burn-side initiation.",
    receiptEvidence: "Base tx hash, log index, lock root, amount, Base block hash, and bridge contract addresses."
  },
  {
    id: "kernel-pending",
    actor: "Hoon bridge kernel",
    summary:
      "Base observer feeds the burn batch into the kernel, which emits base-block-withdrawals-pending and requires an explicit commit ack.",
    receiptEvidence: "as_of Base hash, base_event_id, pending request count, and base-block-withdrawals-committed ack."
  },
  {
    id: "proposal-built",
    actor: "Rust withdrawal assembly plus kernel tx-builder",
    summary:
      "Runtime selects bridge-owned notes, pokes create-withdrawal-tx, and persists the exact withdrawal-proposal-built envelope.",
    receiptEvidence: "withdrawal id, epoch, snapshot height/block id, proposal hash, transaction name, selected input note commitments."
  },
  {
    id: "sequencer-authorized",
    actor: "Withdrawal sequencer",
    summary:
      "Peer canonicalization is not submit-ready; the sequencer authorizes one fully signed proposal and owns in-flight ordering.",
    receiptEvidence: "commit certificate, signer set, authorized transaction name, sequencer journal object id, and in-flight state."
  },
  {
    id: "confirmed-settlement",
    actor: "Nockchain API node and bridge kernel",
    summary:
      "Sequencer observes confirmed inclusion from the public API and the kernel later reconciles counterpart identity, destination, and amount bounds.",
    receiptEvidence: "confirmed height, confirmed block id, tx acceptance vs confirmation distinction, and kernel reconciliation status."
  }
] as const;

const safetyInvariants = [
  "A local submitted event is advisory; confirmed inclusion is chain-observable.",
  "Withdrawal execution fails closed if blockchain constants cannot be fetched or do not match kernel state.",
  "Do not treat peer-canonical as submit-ready; sequencer authorization requires full witness signatures.",
  "Only one withdrawal may be sequencer-authorized, submitted, and unconfirmed at a time.",
  "Reserved input notes are released only after sequencer-confirmed settlement, not after local submit attempts.",
  "The withdrawal journal is append-only; mutable projections must be rebuildable from the journal."
] as const;

const receiptFields = [
  "nockchainCommit",
  "nockchainBuild",
  "latestCommitReleased",
  "bridgeWithdrawalId",
  "baseEventId",
  "baseBatchEnd",
  "lockRoot",
  "withdrawalProposalHash",
  "withdrawalEpoch",
  "snapshotHeight",
  "snapshotBlockId",
  "sequencerAuthorizationState",
  "sequencerJournalObject",
  "sequencerJournalId",
  "withdrawalJournalMirror",
  "blockchainConstantsSource",
  "colocatedPublicApiEndpoint",
  "confirmedHeight",
  "confirmedBlockId",
  "inclusionConfirmationDepth",
  "kernelReconciliationStatus"
] as const;

const sequencerOperationalContract = {
  serviceName: "nockchain-bridge-sequencer",
  sourceDocs: [
    "crates/bridge/docs/bridge-withdrawals.md",
    "crates/bridge/src/withdrawal/submission.rs",
    "crates/nockchain-bridge-sequencer/src/main.rs"
  ],
  deployment: {
    mustRunOn: "designated Nockchain API node",
    bindings: [
      "requires --bind-public-grpc-addr for the colocated public Nockchain API",
      "withdrawal sequencer listens on private gRPC port + 100",
      "public Nockchain client endpoint is derived from the public gRPC bind address",
      "Base confirmed-height watcher must initialize before sequencer RPC serves"
    ],
    nonGoals: [
      "no automatic submission failover when the sequencer is unavailable",
      "no receipt should treat local submission as consensus finality",
      "no raw journal credentials or signing keys should appear in evidence"
    ]
  },
  cliFlags: [
    "--base-ws-url",
    "--base-confirmation-depth",
    "--withdrawal-handoff-window-blocks",
    "--withdrawal-retry-after-base-blocks",
    "--authorized-submit-retry-after-base-blocks",
    "--sequencer-config-path",
    "--sequencer-journal-object-store-endpoint",
    "--sequencer-journal-object-store-bucket",
    "--sequencer-journal-object-store-region",
    "--sequencer-journal-object-store-prefix",
    "--sequencer-journal-id",
    "--sequencer-journal-object-store-access-key-id",
    "--sequencer-journal-object-store-secret-access-key"
  ],
  journal: {
    mode: "append-only durable lifecycle mirror",
    objectStore: "R2/S3-compatible object store",
    envVars: [
      "WITHDRAWAL_SEQUENCER_JOURNAL_OBJECT_STORE_ENDPOINT",
      "WITHDRAWAL_SEQUENCER_JOURNAL_OBJECT_STORE_BUCKET",
      "WITHDRAWAL_SEQUENCER_JOURNAL_OBJECT_STORE_REGION",
      "WITHDRAWAL_SEQUENCER_JOURNAL_OBJECT_STORE_PREFIX",
      "WITHDRAWAL_SEQUENCER_JOURNAL_ID",
      "WITHDRAWAL_SEQUENCER_JOURNAL_OBJECT_STORE_ACCESS_KEY_ID",
      "WITHDRAWAL_SEQUENCER_JOURNAL_OBJECT_STORE_SECRET_ACCESS_KEY",
      "WITHDRAWAL_SEQUENCER_JOURNAL_SIGNING_KEY"
    ],
    safetyRules: [
      "Do not put sequencer journal access keys or signing key material into receipts, support bundles, or public APIs.",
      "If the durable mirror is enabled and a lifecycle event cannot be written remotely, the local sequencer state transition must abort.",
      "Do not configure journal object expiration until checkpoint recovery exists.",
      "Receipts may cite journal id, object prefix, verifier address, event id, and event hash, but not secrets."
    ]
  },
  lifecycleStates: [
    {
      id: "registered",
      owner: "sequencer",
      meaning: "Withdrawal nonce and identity are known to the sequencer ordering frontier.",
      receiptEvidence: "withdrawal id, withdrawal_nonce, registered-at source, sequencer endpoint."
    },
    {
      id: "prepared",
      owner: "bridge node",
      meaning: "A local proposal was built but has not become peer-canonical.",
      receiptEvidence: "epoch, proposal hash, transaction name, snapshot height, selected input notes."
    },
    {
      id: "peerCanonical",
      owner: "bridge peers plus sequencer",
      meaning: "A threshold commit certificate fixes the proposal hash for the withdrawal epoch.",
      receiptEvidence: "commit certificate, signer set, proposal hash, epoch, withdrawal id."
    },
    {
      id: "authorized",
      owner: "sequencer",
      meaning: "The sequencer accepted a fully signed submit-ready proposal, not merely a peer-chosen candidate.",
      receiptEvidence: "authorized transaction name, proposal hash, witness/signature completeness, journal event id."
    },
    {
      id: "submitted",
      owner: "sequencer",
      meaning: "A local submit RPC was attempted after authorization; this is advisory until mempool or block evidence is observed.",
      receiptEvidence: "submitted raw tx id, submit attempt time, public API endpoint, journal event id."
    },
    {
      id: "mempoolAccepted",
      owner: "public Nockchain API",
      meaning: "The public API reports transaction acceptance, which is diagnostic but not block inclusion.",
      receiptEvidence: "tx-accepted result, raw tx id, observed-at, API endpoint."
    },
    {
      id: "confirmed",
      owner: "public Nockchain API plus sequencer",
      meaning: "The authorized raw transaction was observed in a block with configured confirmation depth.",
      receiptEvidence: "confirmed height, block id, tip height, confirmation depth, journal event id."
    },
    {
      id: "kernelReconciled",
      owner: "Hoon bridge kernel",
      meaning: "Kernel settlement reconciliation matched counterpart identity, destination, and amount bounds.",
      receiptEvidence: "kernel reconciliation status, counterpart identity, destination equality, amount bound check."
    }
  ],
  confirmationEvidence: [
    "tx-accepted is diagnostic; confirmed inclusion requires get_transaction_block plus confirmation depth.",
    "The sequencer confirmation loop reads the colocated public Nockchain API and records confirmation before clearing in-flight state.",
    "Kernel reconciliation is a second check after confirmed Nockchain settlement, not the first owner of block inclusion."
  ],
  receiptFields: [
    "sequencerServiceName",
    "sequencerEndpoint",
    "sequencerConfigPath",
    "sequencerJournalId",
    "sequencerJournalVerifierAddress",
    "sequencerJournalEventId",
    "sequencerJournalEventHash",
    "baseConfirmationDepth",
    "withdrawalHandoffWindowBlocks",
    "sequencerFrontierWithdrawalNonce",
    "mempoolAcceptedAt",
    "submittedRawTxId",
    "colocatedPublicApiEndpoint",
    "inclusionConfirmationDepth"
  ]
} as const;

function releaseCommitSha() {
  return nockchainUpstreamIntelligence.latestRelease.tag.replace(/^build-/, "");
}

export function createNockchainBridgeTrace() {
  const upstream = nockchainUpstreamIntelligence;
  const releaseSha = releaseCommitSha();
  const latestCommitReleased = releaseSha === upstream.latestCommit.sha;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/bridge`,
    generatedAt: "2026-06-05T23:59:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      sourceCommitUrl: upstream.latestCommit.url
    },
    releaseDrift: {
      latestCommitReleased,
      defaultBranchAheadOfRelease: !latestCommitReleased,
      releaseCommitSha: releaseSha,
      releaseCommitShortSha: releaseSha.slice(0, 12),
      explanation: latestCommitReleased
        ? "The latest public build release contains the bridge withdrawal execution commit, so receipts can cite a matching commit/build pair while still preserving sequencer authorization, proposal, and journal provenance."
        : "The default branch has bridge withdrawal execution work that is not yet represented by the latest public build release tag."
    },
    sourceAnchors,
    changedSurfaces: {
      crates: [
        "crates/bridge",
        "crates/bridge-dev",
        "crates/nockchain-bridge-sequencer",
        "crates/wallet-tx-builder",
        "crates/nockchain-types",
        "crates/nockapp"
      ],
      docs: [
        "crates/bridge/docs/bridge-withdrawals.md",
        "crates/bridge/docs/architecture.md",
        "crates/bridge/docs/node-runbook.md",
        "crates/bridge/docs/release-punchlist.md",
        "docs/pma/BRIDGE-PMA-GROWTH-FINDINGS-2026-06-02.md"
      ],
      hoon: [
        "hoon/apps/bridge/base.hoon",
        "hoon/apps/bridge/bridge.hoon",
        "hoon/apps/bridge/nock.hoon",
        "hoon/apps/bridge/types.hoon",
        "hoon/apps/wallet/wallet.hoon"
      ],
      testsAndFixtures: [
        "crates/bridge/tests/withdrawal_tests.rs",
        "crates/bridge/test-fixtures/transactions/9MpGym52AumtwyBxYPyVsWHvcamUYwZkc1Nq7w3cFGF28u8ceVDwt3e.tx",
        "crates/wallet-tx-builder/tests/fixtures/withdrawal_tx_fixtures.jam",
        "crates/nockchain-types/tests/spend1_signature_verification_v1.rs"
      ]
    },
    withdrawalFlow,
    safetyInvariants,
    receiptFields,
    sequencerOperationalContract,
    operatorChecklist: [
      "Do not treat peer-canonical as submit-ready; sequencer authorization requires full witness signatures.",
      "Record whether evidence was produced from the default-branch commit or the latest public build release.",
      "Capture blockchain-constants source and mismatch status before interpreting withdrawal tx-builder or fee evidence.",
      "Preserve sequencer journal mirror metadata when testing withdrawal lifecycle state.",
      "Separate tx-accepted diagnostics from confirmed inclusion and kernel settlement reconciliation."
    ],
    nocksperimentalImplications: [
      "VESL and x402 settlement receipts need bridge withdrawal provenance fields before claiming end-to-end payout behavior.",
      "Fakenet/local test receipts should show whether bridge withdrawal evidence came from the latest released build, a default-branch commit, or a local fork.",
      "Future bridge test functions should verify sequencer authorization, journal mirroring, and confirmed inclusion independently.",
      "Nockchain expertise pages should treat bridge crate docs as scoped runtime authority, not protocol activation authority."
    ],
    links: {
      upstream: upstream.canonicalUrl,
      commit: upstream.latestCommit.url,
      release: upstream.latestRelease.url,
      bridgePage: `${registryCanonicalBaseUrl}/nockchain/bridge`,
      sourceTrace: `${registryCanonicalBaseUrl}/api/nockchain/bridge-source`,
      watch: `${registryCanonicalBaseUrl}/api/nockchain/watch`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      wallet: `${registryCanonicalBaseUrl}/api/nockchain/wallet`,
      zorp: `${registryCanonicalBaseUrl}/api/nockchain/zorp`,
      bridgeWithdrawalsSpec:
        "https://github.com/nockchain/nockchain/blob/master/crates/bridge/docs/bridge-withdrawals.md",
      bridgeArchitecture:
        "https://github.com/nockchain/nockchain/blob/master/crates/bridge/docs/architecture.md"
    }
  };
}
