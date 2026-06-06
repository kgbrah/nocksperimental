import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";
import { zorpStateJamDriveFolderUrl } from "@/lib/nockchain-state-jams";

const sourceCommitSha = nockchainUpstreamIntelligence.latestCommit.sha;
const sourceBlobUrl = (path: string, lineRange: string) =>
  `https://github.com/nockchain/nockchain/blob/${sourceCommitSha}/${path}#${lineRange}`;
const sourceTreeUrl = (path: string) =>
  `https://github.com/nockchain/nockchain/tree/${sourceCommitSha}/${path}`;

const sourceAnchors = [
  {
    id: "nockapp-runtime",
    label: "NockApp runtime",
    upstreamFile: "crates/nockapp/src/nockapp/mod.rs",
    upstreamSymbols: ["NockApp", "NockApp::new", "NockApp::work", "NockApp::get_handle"],
    lineRange: "L35-L240",
    upstreamUrl: sourceBlobUrl("crates/nockapp/src/nockapp/mod.rs", "L35-L240"),
    exposure: "runtime-internal",
    evidenceBoundary:
      "Owns kernel state, task management, action channels, effects, metrics, signal handling, and exit state for a live NockApp.",
    evidenceUse:
      "Use as the canonical source for whether an observed poke, peek, export, or driver interaction belongs to current nockchain/nockchain runtime behavior.",
    receiptFields: ["nockchainCommit", "nockchainBuild", "kernel", "nockAppSource"],
    riskPosture:
      "Treat archived Zorp NockApp repositories as lineage only; current runtime claims must cite this source and build."
  },
  {
    id: "driver-io-action",
    label: "Driver IO action",
    upstreamFile: "crates/nockapp/src/nockapp/driver.rs",
    upstreamSymbols: ["IOAction", "NockAppHandle", "PokeResult"],
    lineRange: "L29-L119",
    upstreamUrl: sourceBlobUrl("crates/nockapp/src/nockapp/driver.rs", "L29-L119"),
    exposure: "driver-boundary",
    evidenceBoundary:
      "Typed action boundary for driver-originated pokes and peeks, including ack/result channels and poke timeouts.",
    evidenceUse:
      "Use when converting local fakenet, user-connected fakenet, Nockup, or future direct runtime probes into receipt fields.",
    receiptFields: ["pokePath", "peekPath", "pokeTimeout", "pokeAck", "resultChannel"],
    riskPosture:
      "Do not collapse driver sends, runtime dispatch, and effect observation into one transcript; each boundary has separate evidence semantics."
  },
  {
    id: "action-dispatch",
    label: "Action dispatch",
    upstreamFile: "crates/nockapp/src/nockapp/mod.rs",
    upstreamSymbols: ["handle_action", "IOAction::Poke", "IOAction::Peek"],
    lineRange: "L488-L506",
    upstreamUrl: sourceBlobUrl("crates/nockapp/src/nockapp/mod.rs", "L488-L506"),
    exposure: "runtime-internal",
    evidenceBoundary:
      "Runtime dispatch point that routes IOAction::Poke to the poke handler and IOAction::Peek to the peek handler.",
    evidenceUse:
      "Use to explain why a receipt must say whether it observed a state-changing poke or a read-only peek.",
    receiptFields: ["actionKind", "pokePath", "peekPath", "nockchainCommit"],
    riskPosture:
      "Evidence that only says command succeeded is under-specified unless the runtime action kind and source anchor are preserved."
  },
  {
    id: "poke-effect-broadcast",
    label: "Poke effect broadcast",
    upstreamFile: "crates/nockapp/src/nockapp/mod.rs",
    upstreamSymbols: ["handle_poke", "PokeResult::Ack", "PokeResult::Nack"],
    lineRange: "L508-L551",
    upstreamUrl: sourceBlobUrl("crates/nockapp/src/nockapp/mod.rs", "L508-L551"),
    exposure: "state-transition",
    evidenceBoundary:
      "State-changing runtime handler that applies a poke, sends Ack or Nack, and broadcasts effects on success.",
    evidenceUse:
      "Use when a Nocksperimental receipt claims a poke broadcasts effects, changes state, or proves an effect tag was observed.",
    receiptFields: [
      "pokePath",
      "pokeAck",
      "effectTag",
      "stateRootBefore",
      "stateRootAfter",
      "nockchainCommit"
    ],
    riskPosture:
      "A poke receipt should preserve ack/nack and effect evidence; effect output alone is not enough to prove a clean state transition."
  },
  {
    id: "peek-result-boundary",
    label: "Peek result boundary",
    upstreamFile: "crates/nockapp/src/nockapp/mod.rs",
    upstreamSymbols: ["handle_peek", "NockApp::peek", "NockApp::peek_handle"],
    lineRange: "L286-L302",
    upstreamUrl: sourceBlobUrl("crates/nockapp/src/nockapp/mod.rs", "L286-L302"),
    exposure: "read-only-observation",
    evidenceBoundary:
      "Read-only runtime handler that returns optional state from a path without claiming a state transition.",
    evidenceUse:
      "Use for fakenet balance, route-table, app-state, or wallet-adjacent peeks where observation must stay separate from mutation.",
    receiptFields: ["peekPath", "stateRootAtPeek", "peekResultHash", "endpointMode"],
    riskPosture:
      "A peek can support observation evidence, not transition evidence; pair it with tip, endpoint, and state context."
  },
  {
    id: "wire-repr",
    label: "Wire representation",
    upstreamFile: "crates/nockapp/src/nockapp/wire.rs",
    upstreamSymbols: ["Wire", "WireRepr", "WireRepr::tags_as_csv"],
    lineRange: "L13-L56",
    upstreamUrl: sourceBlobUrl("crates/nockapp/src/nockapp/wire.rs", "L13-L56"),
    exposure: "wire-format",
    evidenceBoundary:
      "Structured source/version/tags boundary for identifying poke/effect wires without using raw nouns as public evidence.",
    evidenceUse:
      "Use when receipts need stable source/version/tags fields for gRPC, system, or app-specific wires.",
    receiptFields: ["wireSource", "wireVersion", "wireTags", "wireTagsCsv"],
    riskPosture:
      "Wire metadata is useful evidence context, but raw payloads still need hashing or redaction before publication."
  },
  {
    id: "exported-state-format",
    label: "Exported state format",
    upstreamFile: "crates/nockapp/src/nockapp/export.rs",
    upstreamSymbols: ["ExportedState", "ExportedState::encode", "ExportedState::decode"],
    lineRange: "L21-L129",
    upstreamUrl: sourceBlobUrl("crates/nockapp/src/nockapp/export.rs", "L21-L129"),
    exposure: "state-export-format",
    evidenceBoundary:
      "Metadata-bearing state export format with magic, version, kernel hash, event number, and jam bytes.",
    evidenceUse:
      "Use to publish state-export provenance and hashes without publishing raw state jams or raw exported state.",
    receiptFields: ["exportMagic", "exportVersion", "kernelHash", "eventNum", "jamHash"],
    riskPosture:
      "Store export metadata and hashes only. Raw export jams are state artifacts and belong outside public receipts."
  },
  {
    id: "checkpoint-bootstrap",
    label: "Checkpoint bootstrap",
    upstreamFile: "crates/nockapp/src/nockapp/save.rs",
    upstreamSymbols: ["CheckpointBootstrapReader", "SaveableCheckpoint", "JAM_MAGIC_BYTES"],
    lineRange: "L17-L152",
    upstreamUrl: sourceBlobUrl("crates/nockapp/src/nockapp/save.rs", "L17-L152"),
    exposure: "checkpoint-boundary",
    evidenceBoundary:
      "Checkpoint and CHKJAM bootstrap boundary for state loading, snapshot versions, and safe startup context.",
    evidenceUse:
      "Use when a state-jam or checkpoint-backed test needs to explain exactly which bootstrap artifact class was used.",
    receiptFields: ["checkpointHash", "checkpointVersion", "checkpointHeight", "stateJamFingerprint"],
    riskPosture:
      "Checkpoint identity belongs in receipts; raw checkpoints and state jams should remain private or separately permissioned."
  },
  {
    id: "event-log-sqlite",
    label: "Event log SQLite boundary",
    upstreamFile: "crates/nockapp/src/event_log.rs",
    upstreamSymbols: ["EventLog", "EventLogEntry", "ReadySnapshotRecord"],
    lineRange: "L33-L278",
    upstreamUrl: sourceBlobUrl("crates/nockapp/src/event_log.rs", "L33-L278"),
    exposure: "durability-boundary",
    evidenceBoundary:
      "SQLite event and snapshot boundary for replay ranges, active snapshots, sequence checks, and ready snapshot metadata.",
    evidenceUse:
      "Use when interpreting PMA/state-jam provenance, replay gaps, or snapshot identity without storing raw event logs.",
    receiptFields: [
      "eventLogBoundary",
      "snapshotId",
      "eventNum",
      "replayStartEvent",
      "replayEndEvent"
    ],
    riskPosture:
      "Event logs may contain operational state; receipts should carry counts, ids, ranges, and hashes, not raw rows."
  },
  {
    id: "private-grpc-boundary",
    label: "Private gRPC boundary",
    upstreamFile: "crates/nockapp-grpc/src/services/private_nockapp/driver.rs",
    upstreamSymbols: ["grpc_server_driver", "PrivateGrpcEffect", "grpc_listener_driver"],
    lineRange: "L31-L144",
    upstreamUrl: sourceBlobUrl(
      "crates/nockapp-grpc/src/services/private_nockapp/driver.rs",
      "L31-L144"
    ),
    exposure: "private-local-admin",
    evidenceBoundary:
      "Private local/admin gRPC boundary for pokes, peeks, and effect-backed callbacks into a NockApp.",
    evidenceUse:
      "Use to label local fakenet and future direct NockApp probe receipts as private endpoint evidence, not public API evidence.",
    receiptFields: ["grpcEndpoint", "endpointMode", "pokePath", "peekPath", "effectTag"],
    riskPosture:
      "Do NOT expose this private gRPC driver to an untrusted network; use local-only binding, SSH tunnel, VPN, or firewall controls."
  },
  {
    id: "public-grpc-boundary",
    label: "Public Nockchain gRPC boundary",
    upstreamFile: "crates/nockapp-grpc/src/services/public_nockchain/v2/driver.rs",
    upstreamSymbols: ["PublicNockchainEffect", "public_nockchain_server_driver"],
    lineRange: "L14-L109",
    upstreamUrl: sourceBlobUrl(
      "crates/nockapp-grpc/src/services/public_nockchain/v2/driver.rs",
      "L14-L109"
    ),
    exposure: "public-read-gated",
    evidenceBoundary:
      "Public-facing Nockchain driver surface that handles wallet transaction effects separately from private NockApp admin calls.",
    evidenceUse:
      "Use to separate public transaction/broadcast evidence from private poke/peek runtime evidence.",
    receiptFields: ["publicApiEndpoint", "walletSendTx", "txAccepted", "nockchainBuild"],
    riskPosture:
      "Public API evidence needs node/build/cache context and should not be interpreted as private runtime authority."
  },
  {
    id: "pma-regression-suite",
    label: "PMA regression suite",
    upstreamFile: "crates/nockapp/tests/pma_regressions",
    upstreamSymbols: ["pma_regressions"],
    lineRange: "L1-L11",
    upstreamUrl: sourceTreeUrl("crates/nockapp/tests/pma_regressions"),
    exposure: "upstream-test-suite",
    evidenceBoundary:
      "Regression tests for PMA metadata, checkpoint bootstrap size, replay boundaries, resize behavior, stale checkpoint refusal, and snapshot restore.",
    evidenceUse:
      "Use as upstream test evidence for PMA and state-jam handling assumptions, while keeping raw PMA slabs and event logs out of receipts.",
    receiptFields: ["pmaBoundary", "checkpointHash", "snapshotId", "eventLogBoundary"],
    riskPosture:
      "Treat tests as behavioral support for receipt interpretation, not as permission to publish raw local state artifacts."
  }
] as const;

const runtimeFlow = [
  {
    id: "driver-sends-action",
    sourceAnchorId: "driver-io-action",
    label: "Driver sends action",
    interpretation:
      "A probe begins as a typed IOAction with separate poke ack or peek result channels.",
    receiptImplication:
      "Record actionKind, pokePath or peekPath, endpoint mode, and Nockchain commit before interpreting output."
  },
  {
    id: "nockapp-dispatches-action",
    sourceAnchorId: "action-dispatch",
    label: "NockApp dispatches action",
    interpretation:
      "The runtime dispatch point proves pokes and peeks pass through different handlers.",
    receiptImplication:
      "Receipts must not blur read-only observations and state-changing transitions."
  },
  {
    id: "poke-produces-effects",
    sourceAnchorId: "poke-effect-broadcast",
    label: "Poke produces effects",
    interpretation:
      "Successful pokes send Ack and broadcast effects; failures send Nack and do not support success claims.",
    receiptImplication:
      "Bind pokeAck, effectTag, and before/after state roots to any state transition claim."
  },
  {
    id: "peek-returns-optional-state",
    sourceAnchorId: "peek-result-boundary",
    label: "Peek returns optional state",
    interpretation:
      "Peeks are read-only and may return no value when the path cannot be resolved.",
    receiptImplication:
      "Hash peek results and record stateRootAtPeek, but do not claim mutation."
  },
  {
    id: "state-export-encodes-loadstate",
    sourceAnchorId: "exported-state-format",
    label: "State export encodes loadstate",
    interpretation:
      "State exports include identity metadata and jammed loadstate payloads.",
    receiptImplication:
      "Publish export metadata and hashes, never raw state-export jam bytes."
  },
  {
    id: "event-log-preserves-replay-boundary",
    sourceAnchorId: "event-log-sqlite",
    label: "Event log preserves replay boundary",
    interpretation:
      "Event logs and ready snapshots define replay ranges and state-continuity checks.",
    receiptImplication:
      "Record event ranges, snapshotId, and eventLogBoundary without storing raw SQLite event rows."
  }
] as const;

const sourceTraceContract = {
  requiredFields: [
    "nockchainCommit",
    "nockchainBuild",
    "upstreamFile",
    "upstreamSymbol",
    "lineRange",
    "evidenceBoundary",
    "receiptFieldMapping",
    "stateArtifactPolicy"
  ],
  optionalFields: [
    "zorpLineageSource",
    "stateJamSourceUrl",
    "githubPullRequest",
    "localVerificationCommand",
    "rustCrate"
  ],
  forbiddenFields: [
    "rawPmaSlab",
    "rawEventLog",
    "rawCheckpoint",
    "rawStateJam",
    "rawExportJam",
    "walletSeedPhrase",
    "walletPrivateKey",
    "apiToken"
  ],
  interpretationRules: [
    "Use nockchain/nockchain source anchors for current runtime claims.",
    "Use zorp-corp/nockapp, zorp-corp/sword, and zorp-corp/jock-lang as lineage or authoring signals only.",
    "Treat the Zorp Drive folder as metadata-only state-jam provenance, not as a public raw artifact store.",
    "Separate private gRPC runtime evidence from public Nockchain API evidence.",
    "Hash or summarize state artifacts; never publish raw PMA, event log, checkpoint, export, or state-jam bytes."
  ]
} as const;

const pendingWatchItems = [
  {
    prNumber: 119,
    title: "feat(nockapp): public NockApp::export_state for live-app snapshot",
    url: "https://github.com/nockchain/nockchain/pull/119",
    status: "open",
    relevance:
      "Would make live NockApp snapshot/export evidence more direct, so Nocksperimental should update state-export receipts when it lands.",
    targetSurfaces: ["nockchainNockAppSourceTrace", "nockchainNockAppAtlas", "stateJamRegistry"]
  },
  {
    prNumber: 125,
    title: "fix(nockup): render template manifests from hbs sources",
    url: "https://github.com/nockchain/nockchain/pull/125",
    status: "open",
    relevance:
      "Template manifest rendering can change fixture provenance and Nockup validation receipt fields.",
    targetSurfaces: ["nockupValidationReceipts", "nockchainNockAppAtlas"]
  },
  {
    prNumber: 126,
    title: "nockchain-bench",
    url: "https://github.com/nockchain/nockchain/pull/126",
    status: "open",
    relevance:
      "Benchmark surfaces may become useful for Nocksperimental compute/proof and runtime performance receipts.",
    targetSurfaces: ["computeBenchmarkProfiles", "nockchainRustAtlas"]
  }
] as const;

const zorpMonitorContext = {
  organization: "zorp-corp",
  orgUrl: "https://github.com/zorp-corp",
  stateJamDrive: {
    sourceUrl: zorpStateJamDriveFolderUrl,
    sourceRole: "zorp-state-jam-provenance",
    artifactPolicy: "metadata-only"
  },
  currentInterpretation:
    "Zorp is the Nockchain development lineage and organization context; current protocol and runtime behavior still resolves through nockchain/nockchain source and releases.",
  monitoredRepositories: [
    {
      fullName: "zorp-corp/jock-lang",
      signal: "active language-authoring signal",
      use: "Watch for authoring patterns that can become future NockApp fixture templates."
    },
    {
      fullName: "zorp-corp/nockapp",
      signal: "archived NockApp lineage",
      use: "Use for vocabulary and history only; current behavior must cite nockchain/nockchain."
    },
    {
      fullName: "zorp-corp/sword",
      signal: "archived runtime persistence lineage",
      use: "Use to interpret PMA and runtime history without overriding current NockVM/NockApp sources."
    },
    {
      fullName: "zorp-corp/sppark",
      signal: "proof-tooling fork",
      use: "Monitor for proof or accelerator signals that could matter to later compute evidence."
    }
  ],
  monitorRules: [
    "Escalate nockchain/nockchain commit, release, protocol, fakenet, PMA, wallet, nockup, or bridge changes immediately.",
    "Escalate Zorp repo changes when they affect Nock authoring, NockApp fixtures, PMA/state, proof tooling, or state-jam provenance.",
    "Inventory the Drive state-jam folder by filename, hash, size, network, height or event boundary, producer, and Nockchain build before using it."
  ]
} as const;

export function createNockchainNockAppSourceTrace() {
  const upstream = nockchainUpstreamIntelligence;
  const receiptFields = Array.from(
    new Set(sourceAnchors.flatMap((anchor) => Array.from(anchor.receiptFields)))
  );

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/nockapp-source`,
    generatedAt: "2026-06-06T00:35:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      crateGroup: "nockAppRuntime",
      sourceCommitUrl: upstream.latestCommit.url
    },
    sourceAnchors,
    runtimeFlow,
    sourceTraceContract,
    receiptFieldMapping: {
      receiptFields,
      privateEndpointFields: ["grpcEndpoint", "endpointMode", "pokePath", "peekPath"],
      stateArtifactFields: [
        "stateJamFingerprint",
        "checkpointHash",
        "snapshotId",
        "eventLogBoundary",
        "jamHash"
      ],
      forbiddenFields: sourceTraceContract.forbiddenFields
    },
    pendingWatchItems,
    zorpMonitorContext,
    stateArtifactPolicy: {
      mode: "metadata-only",
      stateJamDriveFolder: zorpStateJamDriveFolderUrl,
      neverStore: sourceTraceContract.forbiddenFields,
      requiredMetadata: [
        "sourceUrl",
        "filename",
        "size",
        "hash",
        "network",
        "heightOrEventBoundary",
        "producer",
        "nockchainCommit",
        "nockchainBuild"
      ]
    },
    nocksperimentalNextUses: [
      "Attach sourceAnchorId to future fakenet poke/peek receipts.",
      "Map state-jam and checkpoint tests to export/event-log/checkpoint source anchors without storing raw state.",
      "Update receipt fields when PR #119 makes public live-app snapshot exports available.",
      "Use Zorp repo changes as monitored lineage or fixture-authoring signals while keeping nockchain/nockchain as current authority."
    ],
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/nockapp/source`,
      nockAppAtlas: `${registryCanonicalBaseUrl}/api/nockchain/nockapp-atlas`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      zorp: `${registryCanonicalBaseUrl}/api/nockchain/zorp`,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      watch: `${registryCanonicalBaseUrl}/api/nockchain/watch`,
      upstream: upstream.canonicalUrl,
      release: upstream.latestRelease.url,
      exportStatePr: "https://github.com/nockchain/nockchain/pull/119"
    }
  };
}
