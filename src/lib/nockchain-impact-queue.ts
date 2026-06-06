import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { createNockchainPrRadar } from "@/lib/nockchain-pr-radar";
import { createNockchainStateJamRegistry } from "@/lib/nockchain-state-jams";
import { createNockchainWatchBoard } from "@/lib/nockchain-watch";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";
import { createZorpUpstreamMap } from "@/lib/zorp-upstream";

type ImpactPriority = "immediate" | "high" | "medium" | "watch";
type ImpactSourceType =
  | "released-commit"
  | "open-pr"
  | "state-artifact-provenance"
  | "zorp-lineage";

type NockchainImpactItem = {
  id: string;
  label: string;
  priority: ImpactPriority;
  sourceType: ImpactSourceType;
  sourceIds: string[];
  sourceUrls: string[];
  evidenceClass: string;
  upstreamSignal: string;
  whyItMatters: string;
  nocksperimentalAction: string;
  targetSurfaces: string[];
  receiptFields: string[];
  forbiddenFields: string[];
  verificationGates: string[];
};

const forbiddenRawStateFields = [
  "rawStateJam",
  "rawPmaSlab",
  "walletSeedPhrase",
  "privateSpendKey",
  "rawExportJam",
  "sequencerJournalSigningKey"
];

const sourcePriorityOrder: Record<ImpactPriority, number> = {
  immediate: 0,
  high: 1,
  medium: 2,
  watch: 3
};

export function createNockchainImpactQueue() {
  const upstream = nockchainUpstreamIntelligence;
  const prRadar = createNockchainPrRadar();
  const watch = createNockchainWatchBoard();
  const zorp = createZorpUpstreamMap();
  const stateJams = createNockchainStateJamRegistry();
  const prByNumber = (number: number) =>
    prRadar.pullRequests.find((pullRequest) => pullRequest.number === number);
  const watchById = (id: string) => watch.watchQueue.find((item) => item.id === id);
  const stateJamSource = stateJams.sources[0];
  const jockRepo = zorp.repositories.find((repo) => repo.fullName === "zorp-corp/jock-lang");
  const knockSourceNote = zorp.sourceNotes.find((note) => note.id === "knock-formal-semantics");
  const spparkSourceNote = zorp.sourceNotes.find((note) => note.id === "sppark-proof-primitives");
  const unsortedImpactItems: NockchainImpactItem[] = [
    {
      id: "bridge-withdrawal-release",
      label: "Bridge withdrawal execution release",
      priority: "immediate",
      sourceType: "released-commit",
      sourceIds: [`commit:${upstream.latestCommit.shortSha}`, `release:${upstream.latestRelease.tag}`],
      sourceUrls: [upstream.latestCommit.url, upstream.latestRelease.url],
      evidenceClass: "runtime-protocol",
      upstreamSignal: upstream.latestCommit.message,
      whyItMatters:
        "The latest released build includes bridge withdrawal execution, so Nocksperimental bridge and settlement receipts need a commit/build anchor before treating results as comparable.",
      nocksperimentalAction:
        "Refresh bridge withdrawal execution receipts, source anchors, sequencer journal provenance, and VESL-adjacent settlement notes against the released withdrawal execution build.",
      targetSurfaces: ["bridgeReceipts", "nockchainBridgeSourceTrace", "launchEvidence", "veslEvidenceBridge"],
      receiptFields: [
        "bridgeWithdrawalExecutionCommit",
        "bridgeWithdrawalReleaseTag",
        "sequencerJournalRoot",
        "withdrawalExecutionEffect"
      ],
      forbiddenFields: ["sequencerJournalSigningKey", "bridgeNodePrivateKey"],
      verificationGates: ["test:nockchain-bridge-source-api", "test:nockchain-bridge-trace"]
    },
    {
      id: "nockup-template-manifests",
      label: "Nockup template manifest rendering",
      priority: "high",
      sourceType: "open-pr",
      sourceIds: ["pr:125"],
      sourceUrls: [prByNumber(125)?.url ?? `${upstream.repository.url}/pull/125`],
      evidenceClass: "fixture-authoring",
      upstreamSignal: prByNumber(125)?.title ?? "fix(nockup): render template manifests from hbs sources",
      whyItMatters:
        "Template manifest rendering can change scaffold file identity, generated reports, and which Nockup fixture hashes a receipt should cite.",
      nocksperimentalAction:
        "Review PR #125 before changing Nockup validation fixture manifest assumptions or accepting scaffold receipts as stable.",
      targetSurfaces: ["nockupValidation", "generatedLabReports", "fixtureDocs"],
      receiptFields: ["templateManifestSource", "templateManifestHash", "nockupTemplateRevision"],
      forbiddenFields: ["rawStateJam"],
      verificationGates: ["test:nockup-validation", "test:generated-reports"]
    },
    {
      id: "wallet-blob-memo",
      label: "Wallet blobs and memo transaction metadata",
      priority: "high",
      sourceType: "open-pr",
      sourceIds: ["pr:116"],
      sourceUrls: [prByNumber(116)?.url ?? `${upstream.repository.url}/pull/116`],
      evidenceClass: "wallet-api",
      upstreamSignal: prByNumber(116)?.title ?? "feat(wallet): support blobs and memo on transactions in wallet cli",
      whyItMatters:
        "Wallet blob and memo support changes transaction evidence fields while keeping note, seed, and spend-key material private.",
      nocksperimentalAction:
        "Add transaction metadata receipt fields only after PR #116 is reviewed and wallet command behavior is pinned to a Nockchain build.",
      targetSurfaces: ["nockchainWalletAtlas", "localFakenetCommands", "balanceEvidence"],
      receiptFields: ["transactionBlobHash", "memoPresence", "walletEndpointMode", "walletCommandBuild"],
      forbiddenFields: ["walletSeedPhrase", "privateSpendKey", "rawTransactionJam"],
      verificationGates: ["test:nockchain-wallet-atlas", "test:local-fakenet-commands-api"]
    },
    {
      id: "nockapp-export-state",
      label: "Public NockApp export state",
      priority: "high",
      sourceType: "open-pr",
      sourceIds: ["pr:119"],
      sourceUrls: [prByNumber(119)?.url ?? `${upstream.repository.url}/pull/119`],
      evidenceClass: "nockapp-state",
      upstreamSignal: prByNumber(119)?.title ?? "feat(nockapp): public NockApp::export_state for live-app snapshot",
      whyItMatters:
        "Live NockApp state export could make snapshot receipts more useful, but raw export jams must stay out of public APIs and git.",
      nocksperimentalAction:
        "Prepare source-traced export-state metadata fields while forbidding raw export jam payloads in receipts and registries.",
      targetSurfaces: ["nockchainNockAppSourceTrace", "stateJamRegistry", "localFakenetEvidence"],
      receiptFields: ["exportStateCommit", "exportStateHash", "nockappKernelIdentity"],
      forbiddenFields: ["rawExportJam", "rawPmaSlab", "rawStateJam"],
      verificationGates: ["test:nockchain-nockapp-source-api", "test:nockchain-state-jams-api"]
    },
    {
      id: "pma-state-jam-provenance",
      label: "PMA and state-jam provenance",
      priority: "immediate",
      sourceType: "state-artifact-provenance",
      sourceIds: ["drive:1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw", "pr:113", "pr:112", "pr:107", "pr:104"],
      sourceUrls: [
        stateJamSource?.url ?? "https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw",
        `${upstream.repository.url}/pull/113`,
        `${upstream.repository.url}/pull/112`,
        `${upstream.repository.url}/pull/107`,
        `${upstream.repository.url}/pull/104`
      ],
      evidenceClass: "state-provenance",
      upstreamSignal:
        watchById("state-jam-drive-inventory")?.latestSignal ??
        "Zorp/Nockchain state-jam Drive folder is watched as metadata-only provenance.",
      whyItMatters:
        "State artifacts can change local replay, sync, balance, and support-bundle interpretation; they need metadata and hashes, not raw artifact storage.",
      nocksperimentalAction:
        "Inventory state-jam artifacts by source URL, filename, size, hash, network, height or event boundary, and producing build before trusting them.",
      targetSurfaces: ["stateJamRegistry", "nockchainOperationsAtlas", "localFakenetEvidence"],
      receiptFields: ["stateJamFingerprint", "checkpointHeight", "eventBoundary", "stateProducerBuild"],
      forbiddenFields: ["rawPmaSlab", "rawStateJam", "walletSeedPhrase", "privateSpendKey"],
      verificationGates: ["test:nockchain-state-jams-api", "test:nockchain-operations-atlas"]
    },
    {
      id: "fakenet-sync-gossip",
      label: "Fakenet sync and gossip suppression",
      priority: "high",
      sourceType: "open-pr",
      sourceIds: ["signal:5d022ced5504", "pr:93"],
      sourceUrls: [`${upstream.repository.url}/commit/5d022ced5504`, `${upstream.repository.url}/pull/93`],
      evidenceClass: "fakenet-mining",
      upstreamSignal:
        watchById("libp2p-behind-tip-gossip")?.latestSignal ??
        "libp2p suppresses outgoing gossip while catching up behind tip.",
      whyItMatters:
        "Wrong block commitments, empty routing tables, and zero peers need sync/peer/tip context before they are treated as test failures.",
      nocksperimentalAction:
        "Keep fakenet diagnostics tied to peer count, routing table state, catch-up status, wallet endpoint mode, and block commitment evidence.",
      targetSurfaces: ["nockchainSyncGossipTrace", "localFakenetDiagnostics", "localFakenetEvidence"],
      receiptFields: ["peerCount", "routingTableSize", "catchUpStatus", "blockCommitment"],
      forbiddenFields: ["rawPmaSlab", "rawStateJam"],
      verificationGates: ["test:nockchain-sync-gossip-trace", "test:local-fakenet-diagnostics-api"]
    },
    {
      id: "zorp-jock-authoring",
      label: "Zorp Jock authoring lineage",
      priority: "medium",
      sourceType: "zorp-lineage",
      sourceIds: ["repo:zorp-corp/jock-lang"],
      sourceUrls: [jockRepo?.url ?? "https://github.com/zorp-corp/jock-lang"],
      evidenceClass: "ecosystem-lineage",
      upstreamSignal: `${jockRepo?.fullName ?? "zorp-corp/jock-lang"} pushed ${jockRepo?.pushedAt ?? "unknown"}`,
      whyItMatters:
        "Jock is not current protocol authority, but it can shape higher-level Nock application fixture authoring and future NockApp examples.",
      nocksperimentalAction:
        "Use Jock changes as fixture-authoring signals only after mapping them to current Nockchain/NockApp source authority.",
      targetSurfaces: ["fixtureDocs", "nockupValidation", "nockchainNockAppAtlas"],
      receiptFields: ["fixtureAuthoringSignal", "sourceRepo", "sourceRepoPushedAt"],
      forbiddenFields: ["rawStateJam"],
      verificationGates: ["test:zorp-upstream-api", "test:nockchain-nockapp-page"]
    },
    {
      id: "nockchain-benchmarking",
      label: "Nockchain benchmarking and AI PoW puzzle",
      priority: "high",
      sourceType: "open-pr",
      sourceIds: ["pr:126", "pr:124", "repo:zorp-corp/knock", "repo:zorp-corp/sppark"],
      sourceUrls: [
        prByNumber(126)?.url ?? `${upstream.repository.url}/pull/126`,
        prByNumber(124)?.url ?? `${upstream.repository.url}/pull/124`,
        knockSourceNote?.sourceUrl ?? "https://github.com/zorp-corp/knock/blob/master/README.md",
        spparkSourceNote?.sourceUrl ?? "https://github.com/zorp-corp/sppark/blob/main/README.md"
      ],
      evidenceClass: "compute-benchmark",
      upstreamSignal:
        `${prByNumber(126)?.title ?? "nockchain-bench"}; ${prByNumber(124)?.title ?? "AI PoW Puzzle for AI Compute Network"}`,
      whyItMatters:
        "Benchmarking and puzzle work can become compute/proof evidence surfaces when interpreted with formal Nock semantics and proof-primitives lineage, without changing current Nockchain protocol behavior.",
      nocksperimentalAction:
        "Track benchmark harnesses and AI PoW puzzle work as future compute evidence, with Knock and sppark context separated from canonical protocol claims.",
      targetSurfaces: [
        "computeBenchmarkProfiles",
        "trustComputeBenchmarks",
        "nockchainRustAtlas",
        "nockchainKnowledgeSpine",
        "trustSignals"
      ],
      receiptFields: [
        "benchmarkHarnessCommit",
        "proofPuzzleSource",
        "formalSemanticsSource",
        "proofPrimitiveSource",
        "computeProfileHash"
      ],
      forbiddenFields: ["rawPmaSlab", "privateSpendKey"],
      verificationGates: [
        "test:compute-benchmark-detail-page",
        "test:nockchain-rust-atlas-api",
        "test:zorp-upstream-api"
      ]
    }
  ];
  const impactItems = [...unsortedImpactItems].sort(
    (left, right) => sourcePriorityOrder[left.priority] - sourcePriorityOrder[right.priority]
  );

  const sourceTypes = Array.from(new Set(impactItems.map((item) => item.sourceType)));
  const immediateItems = impactItems.filter((item) => item.priority === "immediate");
  const highPriorityItems = impactItems.filter((item) => item.priority === "high");

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/impact`,
    generatedAt: "2026-06-06T06:20:00.000Z",
    upstream: {
      repository: upstream.repository,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      sourceAuthority: "nockchain-zorp-impact-queue"
    },
    snapshot: {
      totalItems: impactItems.length,
      immediateCount: immediateItems.length,
      highCount: highPriorityItems.length,
      sourceTypes,
      latestPrUpdatedAt: prRadar.snapshot.latestUpdatedAt,
      watchStatus: watch.status,
      zorpPublicRepoCount: zorp.organization.publicRepoCount
    },
    impactItems,
    actionLanes: [
      createActionLane("runtime-protocol", "Runtime and protocol releases", "immediate", impactItems, [
        "bridge-withdrawal-release",
        "fakenet-sync-gossip"
      ]),
      createActionLane("state-provenance", "State artifact provenance", "immediate", impactItems, [
        "pma-state-jam-provenance",
        "nockapp-export-state"
      ]),
      createActionLane("fixture-authoring", "Fixture and Nockup authoring", "high", impactItems, [
        "nockup-template-manifests",
        "zorp-jock-authoring"
      ]),
      createActionLane("wallet-api", "Wallet and API evidence", "high", impactItems, ["wallet-blob-memo"]),
      createActionLane("ecosystem-lineage", "Ecosystem and benchmark signals", "medium", impactItems, [
        "zorp-jock-authoring",
        "nockchain-benchmarking"
      ])
    ],
    queueContract: {
      requiredFields: [
        "sourceIds",
        "sourceType",
        "sourceUrls",
        "evidenceClass",
        "targetSurfaces",
        "receiptFields",
        "forbiddenFields",
        "verificationGates",
        "nocksperimentalAction"
      ],
      forbiddenFields: forbiddenRawStateFields,
      reviewRules: [
        "Open PRs are early-warning signals, not merged protocol behavior.",
        "Released commits can update receipt expectations only when the build/release tag is recorded.",
        "Zorp public repos are lineage and authoring signals unless canonical Nockchain docs promote them.",
        "State-jam and PMA sources must remain metadata-only unless a local operator explicitly handles raw artifacts outside public registries."
      ]
    },
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/impact`,
      watch: `${registryCanonicalBaseUrl}/api/nockchain/watch`,
      prRadar: `${registryCanonicalBaseUrl}/api/nockchain/pr-radar`,
      stateJams: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
      zorp: `${registryCanonicalBaseUrl}/api/nockchain/zorp`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}

function createActionLane(
  id: string,
  label: string,
  escalation: "immediate" | "high" | "medium",
  impactItems: NockchainImpactItem[],
  impactItemIds: string[]
) {
  const laneItems = impactItems.filter((item) => impactItemIds.includes(item.id));

  return {
    id,
    label,
    escalation,
    impactItemIds,
    targetSurfaces: Array.from(new Set(laneItems.flatMap((item) => item.targetSurfaces))),
    receiptFields: Array.from(new Set(laneItems.flatMap((item) => item.receiptFields))),
    verificationGates: Array.from(new Set(laneItems.flatMap((item) => item.verificationGates)))
  };
}
