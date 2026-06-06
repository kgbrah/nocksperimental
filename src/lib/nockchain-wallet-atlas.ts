import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const localFakenetWalletAddress =
  "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ";
const localFakenetEndpoint = "127.0.0.1:5555";
const walletTransactionSourceCommit = "33ba97b1e206dd89b15c61b72b7802caf2136c18";
const walletTransactionReleaseBuild = `build-${walletTransactionSourceCommit}`;
const walletTransactionBlobBase =
  `https://github.com/nockchain/nockchain/blob/${walletTransactionSourceCommit}`;

const walletCommands = [
  {
    id: "show-balance",
    command: "nockchain-wallet show-balance",
    description: "Displays aggregate wallet balance, note count, and total nicks held.",
    evidenceUse: "Use for aggregate wallet balance evidence after recording endpoint and sync context.",
    risk: "sync-heavy command; stale endpoint or missing watched keys can make a balance look empty."
  },
  {
    id: "list-notes",
    command: "nockchain-wallet list-notes",
    description: "Lists all notes currently managed by the wallet, sorted by assets.",
    evidenceUse: "Use for note-level balance evidence when a naked aggregate total is not enough.",
    risk: "sync-heavy command; requires loaded keys or watched identifiers."
  },
  {
    id: "list-notes-by-address",
    command: "nockchain-wallet list-notes-by-address <base58-address>",
    description: "Lists notes for a specified public key or address.",
    evidenceUse: "Use to bind fakenet rewards or test balances to the wallet address under test.",
    risk: "the address must be present as a key or watch-only identifier before sync recognizes it."
  },
  {
    id: "watch-address",
    command: "nockchain-wallet watch address <base58-pkh-or-pubkey>",
    description: "Adds a watch-only address or public key without importing private signing material.",
    evidenceUse: "Use for public test wallets and shared fakenet balance checks.",
    risk: "watch-only balances are observable, not spendable."
  },
  {
    id: "export-keys",
    command: "nockchain-wallet export-keys",
    description: "Exports wallet keys to a jam file, defaulting to keys.export.",
    evidenceUse: "Use only outside Nocksperimental receipts for key backup or migration.",
    risk: "key backup material must never be stored in git, receipts, support bundles, or public artifacts."
  },
  {
    id: "create-tx",
    command: "nockchain-wallet create-tx --recipient '{\"kind\":\"p2pkh\",\"address\":\"<p2pkh-b58>\",\"amount\":10000}'",
    description: "Creates a transaction with auto-selected notes and planner-computed fee.",
    evidenceUse: "Use for transaction-construction provenance when testing wallet flows.",
    risk: "amounts are denominated in nicks and transaction files written under ./txs can contain sensitive intent."
  },
  {
    id: "send-tx",
    command: "nockchain-wallet send-tx ./txs/<transaction-name>.tx",
    description: "Broadcasts a signed transaction file.",
    evidenceUse: "Use only when a test explicitly needs submission evidence.",
    risk: "broadcasting is state-changing; receipts should record tx id, endpoint, and build context."
  },
  {
    id: "tx-accepted",
    command: "nockchain-wallet --client public tx-accepted <base58-tx-id>",
    description: "Checks whether a public API node accepted a transaction.",
    evidenceUse: "Use as a lightweight post-submit acceptance check; accepted does not prove block inclusion.",
    risk: "public API only; private API cannot be queried with this request."
  }
] as const;

const endpointModes = [
  {
    id: "public",
    label: "Public API",
    endpoint: "https://nockchain-api.zorp.io",
    commandPattern: "nockchain-wallet --client public --public-grpc-server-addr <url> <command>",
    defaultBehavior: "The wallet connects to Zorp's public Nockchain API server by default.",
    evidenceUse:
      "Use when a balance or tx-accepted check intentionally relies on a remote public API surface.",
    riskNotes: [
      "default public endpoint is remote",
      "public API behavior is alpha/test-grade",
      "record the public endpoint URL and upstream build before trusting output"
    ]
  },
  {
    id: "private",
    label: "Private local API",
    endpoint: localFakenetEndpoint,
    commandPattern: "nockchain-wallet --client private --private-grpc-server-port 5555 <command>",
    defaultBehavior: "The private client targets a local Nockchain instance, usually localhost:5555.",
    evidenceUse: "Use for local fakenet balance and note evidence on this laptop.",
    riskNotes: [
      "requires a local running nockchain instance",
      "endpoint reachability depends on WSL/localhost forwarding",
      "sync-heavy commands can fail if the local node is behind tip"
    ]
  }
] as const;

const triageScenarios = [
  {
    id: "balance-unknown",
    title: "Balance unknown",
    symptom: "balance command failed or produced ambiguous output",
    interpretation:
      "A balance is not meaningful until the wallet address, endpoint and sync context, client mode, and Nockchain build are known.",
    checks: [
      "Capture walletAddress, endpointMode, endpoint, command, outputHash, and Nockchain build.",
      "Regenerate balance evidence after changing peers, state jams, or endpoint mode.",
      "Prefer note-level evidence when aggregate balance output is surprising."
    ]
  },
  {
    id: "watch-only-missing",
    title: "Watch-only identifier missing",
    symptom: "address balance is empty even though the address should have funds",
    interpretation:
      "The wallet only syncs balances for loaded signing keys and watch-only identifier entries.",
    checks: [
      "Confirm the address was imported with nockchain-wallet watch address or watch pubkey.",
      "Use list-notes-by-address after adding the watch-only identifier.",
      "Do not import seed phrases merely to observe public test balances."
    ]
  },
  {
    id: "private-grpc-unreachable",
    title: "Private gRPC unreachable",
    symptom: "private wallet client cannot connect",
    interpretation:
      "The private client expects a local Nockchain instance reachable at 127.0.0.1:5555 unless a different private port is configured.",
    checks: [
      "Confirm the fakenet node was started with --bind-public-grpc-addr 127.0.0.1:5555.",
      "Check WSL localhost forwarding and whether the wallet command runs in the same network namespace.",
      "Use /api/fakenet/diagnostics before interpreting balance failures."
    ]
  },
  {
    id: "public-api-exposure-risk",
    title: "Public API exposure risk",
    symptom: "operator wants to expose nockchain-api publicly",
    interpretation:
      "nockchain-api is alpha/test-grade and currently documents no authentication, authorization, or rate limiting.",
    checks: [
      "Keep public API access behind trusted controls such as VPN, tunnel, mTLS proxy, or private network.",
      "Record observability and access-control posture in receipts that depend on public API output.",
      "Do not treat a public API response as protocol authority."
    ]
  },
  {
    id: "tx-accepted-public-only",
    title: "Transaction acceptance check is public-only",
    symptom: "tx-accepted was attempted against private API",
    interpretation:
      "The wallet docs state that tx-accepted asks a public API node whether it accepted a transaction; the private API cannot be queried with this request.",
    checks: [
      "Use --client public for tx-accepted checks.",
      "Treat true as accepted by the node, not proof of mempool residency or block inclusion.",
      "Record tx id, endpoint, and latest observed chain context."
    ]
  }
] as const;

const publicApiEvidenceContract = {
  sourceDoc: "crates/nockchain-api/README.md",
  services: ["NockchainService", "NockchainBlockService"],
  surfaces: [
    {
      id: "transaction-acceptance",
      label: "Transaction acceptance",
      evidenceMeaning:
        "The public API node reports that it accepted the transaction request.",
      endpoints: ["tx-accepted"],
      notProofOf: ["block inclusion", "mempool residency", "final settlement"],
      limits: ["accepted does not prove block inclusion"]
    },
    {
      id: "block-explorer-cache",
      label: "Block explorer cache",
      evidenceMeaning:
        "Explorer-style responses are cache-backed views of the reported heaviest chain.",
      endpoints: ["GetBlocks", "GetTransactionBlock", "GetTransactionDetails"],
      limits: [
        "does not stream mempool contents",
        "pending transactions are only reported as pending",
        "newest up to 1024 blocks become available first during cache warm-up",
        "older heights backfill after the first cache range",
        "short-lived stale data can appear after a reorg"
      ]
    },
    {
      id: "observability",
      label: "Public API observability",
      evidenceMeaning:
        "API evidence should include cache and heaviest-chain freshness signals when available.",
      observability: [
        "nockchain_public_grpc.*",
        "cache timings",
        "heaviest-chain freshness",
        "RPC success/error counts"
      ],
      limits: ["metrics prove service health context, not consensus finality"]
    }
  ],
  requiredReceiptFields: [
    "publicApiEndpoint",
    "apiSurface",
    "txId",
    "acceptedAt",
    "inclusionBlock",
    "cacheWarmupState",
    "heaviestChainFreshness",
    "reorgWindow",
    "metricsSnapshot",
    "nockchainCommit",
    "nockchainBuild"
  ],
  interpretationRules: [
    "Treat tx-accepted as node acceptance, not block inclusion.",
    "Treat pending transaction responses as pending status, not mempool streaming.",
    "Treat empty or missing explorer pages during warm-up as inconclusive until cache state and heaviest-chain freshness are recorded.",
    "Treat explorer results near reorg windows as provisional unless independently confirmed."
  ]
} as const;

const walletTransactionSourceContract = {
  releaseCommit: walletTransactionSourceCommit,
  releaseBuild: walletTransactionReleaseBuild,
  sourceAuthority: "current-released-nockchain-rust",
  crateSurfaces: ["wallet-tx-builder", "nockchain-wallet"],
  sourceAnchors: [
    {
      id: "wallet-tx-builder-planner",
      crate: "wallet-tx-builder",
      path: "crates/wallet-tx-builder/src/planner.rs",
      sourceUrl: `${walletTransactionBlobBase}/crates/wallet-tx-builder/src/planner.rs`,
      sha256: "bbb80bb18f47c20c4c095138b402d339787650ebe4428ef375f1c82c3bc795e8",
      bytes: 78573,
      lineAnchors: [
        "line 9: compute_bridge_fee, compute_minimum_fee, FeeInputs",
        "line 10: LockResolutionSource and ResolveLockRequest",
        "lines 12-13: CandidateVersionPolicy, ChainContext, PlanRequest, RawNoteDataEntry, SelectionMode",
        "line 16: WitnessWordInput and WordCountEstimator"
      ],
      evidenceUse:
        "Defines transaction planning, selection, fee recomputation, note-data propagation, lock resolution, and word-count inputs."
    },
    {
      id: "wallet-note-data",
      crate: "wallet-tx-builder",
      path: "crates/wallet-tx-builder/src/note_data.rs",
      sourceUrl: `${walletTransactionBlobBase}/crates/wallet-tx-builder/src/note_data.rs`,
      sha256: "4f47aab8658aff1f1eb996fbd65620cf269a7d72e1524c36d1afe660f6d68829",
      bytes: 32367,
      lineAnchors: [
        "line 17: RawNoteDataEntry impl",
        "line 29: from_bridge_withdrawal",
        "line 109: from_blob decodes %lock payloads",
        "line 313: from_raw_entry normalizes note data"
      ],
      evidenceUse:
        "Pins note-data key/blob normalization so receipts can name noteDataKeys without storing raw blobs."
    },
    {
      id: "wallet-lock-resolver",
      crate: "wallet-tx-builder",
      path: "crates/wallet-tx-builder/src/lock_resolver.rs",
      sourceUrl: `${walletTransactionBlobBase}/crates/wallet-tx-builder/src/lock_resolver.rs`,
      sha256: "02f0a048e224db8964c4e7344b6cfecb3dbc3d4dcb22529ed15d09fd7a9d1d77",
      bytes: 24172,
      lineAnchors: [
        "line 7: LockResolutionSource",
        "line 38: ResolveLockRequest",
        "line 86: NoteData resolution source",
        "line 164: LockRootFirstName resolution source"
      ],
      evidenceUse:
        "Explains whether a candidate lock came from note data, reconstruction, or lock-root matching."
    },
    {
      id: "wallet-fee",
      crate: "wallet-tx-builder",
      path: "crates/wallet-tx-builder/src/fee.rs",
      sourceUrl: `${walletTransactionBlobBase}/crates/wallet-tx-builder/src/fee.rs`,
      sha256: "88dcc863ab3ec13ea4c8eafd0aa63acc2dfa46689319f8e2a2b780880d29823e",
      bytes: 5447,
      lineAnchors: [
        "line 28: compute_bridge_fee",
        "line 37: compute_minimum_fee",
        "line 106: compute_minimum_fee pre-Bythos test",
        "line 170: compute_bridge_fee zero-amount test"
      ],
      evidenceUse:
        "Pins the fee computation surface behind feeInputs and feeBreakdown receipt fields."
    },
    {
      id: "wallet-word-count",
      crate: "wallet-tx-builder",
      path: "crates/wallet-tx-builder/src/word_count.rs",
      sourceUrl: `${walletTransactionBlobBase}/crates/wallet-tx-builder/src/word_count.rs`,
      sha256: "b68dbb80fb0bfd0582abf995b8d18be61086622b87a467c60dd3c9ca25cb6eb4",
      bytes: 36418,
      lineAnchors: [
        "line 34: WordCountEstimator",
        "line 43: estimate_seed_words",
        "line 81: estimate_witness_words",
        "line 95: estimate_v0_witness_words"
      ],
      evidenceUse:
        "Pins seed and witness word-count estimation for transaction size and fee explanations."
    },
    {
      id: "wallet-types",
      crate: "wallet-tx-builder",
      path: "crates/wallet-tx-builder/src/types.rs",
      sourceUrl: `${walletTransactionBlobBase}/crates/wallet-tx-builder/src/types.rs`,
      sha256: "4ae5fb18e586e0820ddf6894017fae96dfb021619c8acca94315b3e67a50f757",
      bytes: 15335,
      lineAnchors: [
        "line 13: SelectionMode",
        "line 30: CandidateVersionPolicy",
        "line 39: ChainContext",
        "line 258: CreateTxPlanningMode"
      ],
      evidenceUse:
        "Defines the planner vocabulary receipts use for selectionMode, candidateVersionPolicy, and createTxPlanningMode."
    },
    {
      id: "nockchain-wallet-create-tx",
      crate: "nockchain-wallet",
      path: "crates/nockchain-wallet/src/create_tx.rs",
      sourceUrl: `${walletTransactionBlobBase}/crates/nockchain-wallet/src/create_tx.rs`,
      sha256: "544d662fffc4b239cd0aa81ac23613fee621d0f790e91d3172a40486d5168fc8",
      bytes: 87565,
      lineAnchors: [
        "line 8: CandidateNote and CreateTxPlanningMode",
        "line 12: ensure_manual_planner_parity",
        "line 173: CreateTxRequest",
        "line 432: CandidateVersionPolicy resolver"
      ],
      evidenceUse:
        "Pins the create-tx CLI request boundary that turns recipients, fees, selection strategy, and planner mode into wallet transaction intent."
    },
    {
      id: "nockchain-wallet-command",
      crate: "nockchain-wallet",
      path: "crates/nockchain-wallet/src/command.rs",
      sourceUrl: `${walletTransactionBlobBase}/crates/nockchain-wallet/src/command.rs`,
      sha256: "7340d1c242e8f3317a124e856c5c3610afc9ea60d1ff74d22d8de43e26514784",
      bytes: 26527,
      lineAnchors: [
        "line 176: NoteSelectionStrategyCli",
        "line 432: recipients CLI option",
        "line 465: note_selection_strategy CLI option",
        "line 696: ascending selection default"
      ],
      evidenceUse:
        "Pins the command-line option surface for recipient parsing, note selection, and create-tx invocation."
    },
    {
      id: "nockchain-wallet-recipient",
      crate: "nockchain-wallet",
      path: "crates/nockchain-wallet/src/recipient.rs",
      sourceUrl: `${walletTransactionBlobBase}/crates/nockchain-wallet/src/recipient.rs`,
      sha256: "4fabfa51d9584840a876b54f9be7691c9efef713b9e017d73236dd7d186addf1",
      bytes: 18860,
      lineAnchors: [
        "line 17: RecipientSpecToken",
        "line 38: RecipientSpec",
        "line 56: from_cli_arg",
        "lines 69-75: from_json and from_legacy"
      ],
      evidenceUse:
        "Pins recipient JSON and legacy CLI parsing so receipts can classify recipientSpecKind without storing raw tx files."
    }
  ],
  sourceDriftCheck: {
    command: "npm run check:nockchain-wallet-source-drift -- --json",
    script: "scripts/check-nockchain-wallet-source-drift.mjs",
    testCommand: "npm run test:nockchain-wallet-source-drift-check",
    sourceAnchorIds: [
      "wallet-tx-builder-planner",
      "wallet-note-data",
      "wallet-lock-resolver",
      "wallet-fee",
      "wallet-word-count",
      "wallet-types",
      "nockchain-wallet-create-tx",
      "nockchain-wallet-command",
      "nockchain-wallet-recipient"
    ],
    compareFields: [
      "upstreamCommit",
      "sourceAnchorId",
      "sourceSha256",
      "requiredSymbols",
      "openPrSignal"
    ],
    interpretation:
      "Compares wallet transaction source anchors and PR #116 memo/blob early-warning metadata against current upstream Nockchain before receipts trust wallet transaction construction evidence."
  },
  receiptFields: [
    "walletTransactionSourceCommit",
    "walletTransactionSourceHash",
    "createTxPlanningMode",
    "selectionMode",
    "candidateVersionPolicy",
    "feeInputs",
    "feeBreakdown",
    "wordCountBreakdown",
    "lockResolutionSource",
    "noteDataKeys",
    "recipientSpecKind",
    "transactionName",
    "allowLowFee",
    "txId",
    "nockchainBuild"
  ],
  forbiddenFields: [
    "rawUnsignedTx",
    "rawSignedTx",
    "rawTransactionJam",
    "walletSeedPhrase",
    "walletPrivateKey",
    "keys.export",
    "walletDatabase",
    "privateSpendKey"
  ],
  verificationCommands: [
    "npm run test:nockchain-wallet-atlas",
    "npm run test:nockchain-upstream-drift-check",
    "npm run test:registry-checkpoint-api"
  ],
  openPrSignals: [
    {
      id: "wallet-memo-blob-pr-116",
      title: "feat(wallet): support blobs and memo on transactions in wallet cli",
      url: "https://github.com/nockchain/nockchain/pull/116",
      status: "open",
      sourceAuthority: "open-pr-early-warning",
      updatedAt: "2026-06-03T05:32:58Z",
      baseCommit: "5d022ced55040221e8b6fcfd78114189fbae91a0",
      headCommit: "4f82b570ee3c4197ffc31850f63d721deae16846",
      signals: ["memo", "blob"],
      targetReceiptFields: ["noteDataKeys", "recipientSpecKind", "transactionMemoHash", "transactionBlobHash"],
      interpretation:
        "Open PR #116 would add memo/blob transaction note data to the wallet CLI; track it as early warning, not released authority."
    }
  ],
  interpretationRules: [
    "Treat current released wallet transaction evidence as defined by these commit-pinned source anchors.",
    "Treat open PR #116 memo/blob support as watch-only until it lands in a released Nockchain build.",
    "Record planner and source-anchor metadata in receipts, not raw unsigned transactions, signed transactions, transaction jams, wallet databases, or keys.",
    "Tie transaction construction evidence to endpoint mode, chain context, wallet command, Nockchain build, and output hashes before comparing test results."
  ]
} as const;

export function createNockchainWalletAtlas() {
  const upstream = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/wallet`,
    generatedAt: "2026-06-06T00:30:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      docs: [
        "crates/nockchain-wallet/README.md",
        "crates/nockchain-api/README.md",
        "crates/nockapp/README.md",
        "PROTOCOL.md"
      ],
      crates: ["nockchain-wallet", "nockchain-api", "nockapp-grpc", "nockchain"]
    },
    walletCommands,
    endpointModes,
    publicApiEvidenceContract,
    walletTransactionSourceContract,
    localFakenetProfile: {
      walletAddress: localFakenetWalletAddress,
      endpoint: localFakenetEndpoint,
      clientMode: "private",
      commands: ["fakenock --balance", "npm run lab:local:balance", "npm run lab:local:chain"],
      upstreamEquivalentCommands: [
        "nockchain-wallet --client private show-balance",
        `nockchain-wallet --client private list-notes-by-address ${localFakenetWalletAddress}`,
        "nockchain-wallet --client private list-notes"
      ],
      evidenceUse:
        "Treat fakenock --balance as local wrapper evidence; preserve the upstream wallet command, endpoint, and output hash in receipts."
    },
    balanceEvidenceContract: {
      requiredFields: [
        "walletAddress",
        "endpoint",
        "endpointMode",
        "command",
        "outputHash",
        "noteCount",
        "totalNicks",
        "nockchainBuild",
        "nockchainCommit",
        "syncContext",
        "keyMode"
      ],
      keyModes: ["signing", "watch-only", "unknown"],
      preferredUnits: "nicks",
      conversion: "65536 nicks = 1 nock",
      receiptRule:
        "Store command transcript hashes and parsed totals, not seed phrases, private keys, exported key files, or raw wallet databases."
    },
    safety: {
      doNotStore: [
        "seed phrases",
        "private keys",
        "keys.export",
        "wallet databases",
        "unsigned transaction intent files",
        "signed transaction files unless explicitly public test artifacts"
      ],
      safeToStoreWithHashing: [
        "walletAddress",
        "endpoint",
        "endpointMode",
        "command",
        "outputHash",
        "noteCount",
        "totalNicks",
        "txId"
      ],
      publicApiWarnings: [
        "alpha/test-grade software",
        "no authentication",
        "no authorization",
        "no rate limiting",
        "cache warm-up and reorg windows can affect explorer-style responses"
      ]
    },
    triageScenarios,
    links: {
      upstream: upstream.canonicalUrl,
      repository: upstream.links.repository,
      release: upstream.links.release,
      localFakenetCommands: `${registryCanonicalBaseUrl}/api/fakenet/commands`,
      localDiagnostics: `${registryCanonicalBaseUrl}/api/fakenet/diagnostics`,
      operationsAtlas: `${registryCanonicalBaseUrl}/api/nockchain/operations`,
      rustAtlas: `${registryCanonicalBaseUrl}/api/nockchain/rust-atlas`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}
