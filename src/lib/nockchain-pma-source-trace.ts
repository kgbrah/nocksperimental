import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const upstreamFileBaseUrl =
  "https://github.com/nockchain/nockchain/blob/33ba97b1e206dd89b15c61b72b7802caf2136c18";

function sourceUrl(file: string, start: number, end: number) {
  return `${upstreamFileBaseUrl}/${file}#L${start}-L${end}`;
}

const sourceAnchors = [
  {
    id: "pma-metadata-trailer",
    file: "crates/nockvm/rust/nockvm/src/pma.rs",
    lineRange: "418-583",
    symbols: [
      "Pma",
      "Pma::read_file_metadata",
      "read_file_metadata_from_reader",
      "metadata_from_v2_trailer",
      "metadata_from_legacy_trailer"
    ],
    sourceUrls: [sourceUrl("crates/nockvm/rust/nockvm/src/pma.rs", 418, 583)],
    role:
      "Reads and validates PMA file metadata from the v2 or legacy trailer before any snapshot or state artifact can be trusted.",
    evidence:
      "The reader rejects too-small files, mismatched data_words, bad PMA magic, unsupported versions, and alloc offsets that exceed data words.",
    receiptFields: ["pmaMetadataVersion", "pmaDataWords", "pmaAllocWords", "pmaFileBytes"]
  },
  {
    id: "pma-open-growth-recovery",
    file: "crates/nockvm/rust/nockvm/src/pma.rs",
    lineRange: "585-760",
    symbols: [
      "Pma::open",
      "Pma::open_with_min",
      "open_with_min_inner",
      "recover_metadata_from_growth_journal",
      "recover_metadata_from_migration_journal"
    ],
    sourceUrls: [sourceUrl("crates/nockvm/rust/nockvm/src/pma.rs", 585, 760)],
    role:
      "Opens an existing PMA without shrinking it, preserves or raises its virtual reservation, migrates legacy metadata, and recovers from growth or migration journals.",
    evidence:
      "Open preserves existing reservations, refuses invalid metadata, migrates v1 trailers, and clears growth/migration journals after successful open.",
    receiptFields: ["pmaReservedWords", "pmaGrowthJournalRecovered", "pmaMigrationJournalRecovered"]
  },
  {
    id: "snapshot-verify-ready",
    file: "crates/nockapp/src/snapshot.rs",
    lineRange: "291-417",
    symbols: [
      "verify_snapshot",
      "SnapshotManifest::read_from_path",
      "Pma::read_file_metadata",
      "PmaDirectReader::from_path"
    ],
    sourceUrls: [sourceUrl("crates/nockapp/src/snapshot.rs", 291, 417)],
    role:
      "Verifies snapshot manifests against PMA metadata, used-prefix hash, kernel root, cold offset, and optional full structure checks.",
    evidence:
      "Verification fails on pma_words mismatch, alloc_words mismatch, used_blake3 mismatch, invalid kernel root, invalid cold offset, or structure validation failure.",
    receiptFields: ["snapshotManifestPath", "snapshotUsedBlake3", "snapshotVerifyMode"]
  },
  {
    id: "snapshot-create-ready",
    file: "crates/nockapp/src/snapshot.rs",
    lineRange: "540-637",
    symbols: [
      "create_ready_snapshot",
      "pma.sync_used_data",
      "pma.sync_trailer",
      "snapshot_source_pma_fdatasync",
      "event_log.insert_ready_snapshot"
    ],
    sourceUrls: [sourceUrl("crates/nockapp/src/snapshot.rs", 540, 637)],
    role:
      "Creates a ready snapshot by syncing the source PMA, copying it through a temporary path, hashing the used prefix, writing the manifest, verifying it, and inserting the ready snapshot record.",
    evidence:
      "The source PMA is fdatasynced before copy, the copied snapshot is verified before trust, and the event log records the active ready snapshot metadata.",
    receiptFields: ["snapshotKind", "snapshotEventNum", "snapshotUsedBlake3", "eventBoundary"]
  },
  {
    id: "event-log-replay-boundary",
    file: "crates/nockapp/src/event_log.rs",
    lineRange: "261-414",
    symbols: [
      "EventLog::open",
      "EventLog::append_event",
      "EventLog::quick_check",
      "EventLog::insert_ready_snapshot",
      "EventLog::replay_events_after"
    ],
    sourceUrls: [sourceUrl("crates/nockapp/src/event_log.rs", 261, 414)],
    role:
      "Persists accepted events in SQLite, records ready snapshots, and replays only contiguous event numbers after a snapshot boundary.",
    evidence:
      "Replay detects sequence gaps, quick_check validates SQLite health, and ready snapshots carry event_num, alloc_words, kernel_root_raw, cold_offset, and used_blake3.",
    receiptFields: ["eventLogPath", "eventLogMaxEventNum", "eventReplayStart", "eventReplayGapDetected"]
  },
  {
    id: "kernel-event-log-restore",
    file: "crates/nockapp/src/kernel/form.rs",
    lineRange: "780-1085",
    symbols: [
      "SerfThread::new_with_event_log",
      "EventLog::open",
      "PmaPersistMetadata::new",
      "SerfThread::replay_event_jobs"
    ],
    sourceUrls: [
      sourceUrl("crates/nockapp/src/kernel/form.rs", 780, 852),
      sourceUrl("crates/nockapp/src/kernel/form.rs", 1040, 1085)
    ],
    role:
      "Wires restored snapshot metadata and event-log replay into kernel startup so a hot state can resume from a verified boundary.",
    evidence:
      "Snapshot manifest metadata is synthesized into PMA metadata, EventLog opens before Serf startup, and replay jobs are sent through the Serf replay action.",
    receiptFields: ["restoreManifestEventNum", "pmaPersistMetadataEventNum", "eventReplayApplied"]
  }
] as const;

const durabilityFlow = [
  {
    id: "metadata-trailer-read",
    label: "Read PMA metadata trailer",
    sourceAnchorIds: ["pma-metadata-trailer"],
    evidence: "PMA trailer data proves pmaMetadataVersion, data words, alloc words, and file byte length.",
    receiptFields: ["pmaMetadataVersion", "pmaDataWords", "pmaAllocWords"]
  },
  {
    id: "journal-recovery",
    label: "Recover interrupted growth or migration",
    sourceAnchorIds: ["pma-open-growth-recovery"],
    evidence: "PMA open can recover from growth and migration journals before the file is mapped for use.",
    receiptFields: ["pmaReservedWords", "pmaGrowthJournalRecovered", "pmaMigrationJournalRecovered"]
  },
  {
    id: "source-pma-sync",
    label: "Sync source PMA before snapshot",
    sourceAnchorIds: ["snapshot-create-ready"],
    evidence: "create_ready_snapshot calls pma.sync_used_data, pma.sync_trailer, and snapshot_source_pma_fdatasync.",
    receiptFields: ["snapshotKind", "snapshotEventNum", "eventBoundary"]
  },
  {
    id: "snapshot-copy-verify",
    label: "Copy and verify snapshot",
    sourceAnchorIds: ["snapshot-create-ready", "snapshot-verify-ready"],
    evidence: "The snapshot copy is replaced atomically, hashed by used prefix, written to a manifest, and checked by verify_snapshot before trust.",
    receiptFields: ["snapshotManifestPath", "snapshotUsedBlake3", "snapshotVerifyMode"]
  },
  {
    id: "event-log-replay",
    label: "Replay events after boundary",
    sourceAnchorIds: ["event-log-replay-boundary", "kernel-event-log-restore"],
    evidence: "EventLog::replay_events_after returns contiguous jobs after the snapshot event boundary and rejects event sequence gaps.",
    receiptFields: ["eventLogMaxEventNum", "eventReplayStart", "eventReplayGapDetected"]
  }
] as const;

const snapshotVerification = {
  sourceAnchorIds: ["snapshot-verify-ready", "snapshot-create-ready"],
  requiredChecks: [
    "manifest-pma-words-match",
    "manifest-alloc-words-match",
    "used-blake3-prefix-match",
    "kernel-root-raw-valid",
    "cold-offset-valid",
    "event-log-ready-snapshot-record"
  ],
  receiptFields: [
    "snapshotManifestPath",
    "snapshotKind",
    "snapshotEventNum",
    "snapshotUsedBlake3",
    "snapshotVerifyMode"
  ],
  interpretation:
    "A snapshot is receipt-worthy only after manifest, PMA metadata, used-prefix hash, root/cold-offset checks, and ready snapshot event-log metadata agree."
} as const;

const eventLogContract = {
  sourceAnchorIds: ["event-log-replay-boundary", "kernel-event-log-restore"],
  sqliteFiles: ["event-log.sqlite3", "event-log.sqlite3-wal", "event-log.sqlite3-shm"],
  replayGuards: [
    "contiguous-event-num-sequence",
    "sqlite-pragma-quick-check",
    "active-snapshot-id-meta"
  ],
  receiptFields: ["eventLogPath", "eventLogMaxEventNum", "eventReplayStart", "eventReplayGapDetected"],
  interpretation:
    "Nocksperimental should record event-log identity and replay boundary metadata, but never store the raw SQLite database or sidecars."
} as const;

const receiptContract = {
  requiredFields: [
    "pmaMetadataVersion",
    "pmaDataWords",
    "pmaAllocWords",
    "pmaReservedWords",
    "snapshotManifestPath",
    "snapshotUsedBlake3",
    "eventLogMaxEventNum",
    "eventBoundary",
    "stateJamFingerprint",
    "nockchainCommit",
    "nockchainBuild"
  ],
  forbiddenFields: [
    "rawPmaSlab",
    "rawSnapshotPma",
    "rawEventLogSqlite",
    "rawStateJam",
    "walletSeedPhrase"
  ],
  reviewRules: [
    "A PMA/source trace receipt needs source file and symbol anchors, not raw chain state.",
    "Snapshot evidence must include manifest identity and used-prefix hash before it can support a state-jam claim.",
    "Event-log evidence must name the event boundary and replay/gap status instead of embedding SQLite bytes.",
    "State-jam fingerprints should be joined with producing Nockchain commit/build before a fakenet test trusts them."
  ]
} as const;

const operatorGuards = [
  "stop-node-before-copying-state",
  "record-producing-build-and-event-boundary",
  "never-publish-raw-pma-or-event-log",
  "verify-snapshot-before-trusting-state-jam"
] as const;

export function createNockchainPmaSourceTrace() {
  const upstream = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/pma`,
    generatedAt: "2026-06-06T06:18:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      sourceCommitUrl: upstream.latestCommit.url,
      crateSurfaces: ["nockvm", "nockapp"]
    },
    sourceAnchors,
    durabilityFlow,
    snapshotVerification,
    eventLogContract,
    receiptContract,
    operatorGuards,
    nocksperimentalImplications: [
      "State-jam receipts should cite PMA metadata, snapshot manifest, event boundary, and producing build before trusting bootstrap state.",
      "Fakenet support bundles can include PMA/source trace ids without attaching raw slabs, SQLite event logs, or state jams.",
      "Bring-your-own fakenet evidence should preserve whether state came from checkpoint bootstrap, verified snapshot, PMA fast path, or event-log replay.",
      "Future NockApp export-state receipts should reuse the same raw-artifact denylist."
    ],
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/pma`,
      upstream: upstream.canonicalUrl,
      repository: upstream.links.repository,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      rustSource: `${registryCanonicalBaseUrl}/api/nockchain/rust-source`,
      nockappSource: `${registryCanonicalBaseUrl}/api/nockchain/nockapp-source`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}
