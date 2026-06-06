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
    id: "api-readme-contract",
    file: "crates/nockchain-api/README.md",
    lineRange: "1-93",
    symbols: [
      "nockchain-api",
      "NockchainService",
      "NockchainBlockService",
      "GetBlocks",
      "GetTransactionDetails"
    ],
    sourceUrls: [sourceUrl("crates/nockchain-api/README.md", 1, 93)],
    role:
      "Defines nockchain-api as alpha Tier 1 authority for public API runtime, deployment guidance, risk posture, cache limits, and PMA quickstart.",
    evidence:
      "The README says public gRPC is enabled by --bind-public-grpc-addr, has no auth/authz/rate limiting, exposes NockchainService and NockchainBlockService, and serves block explorer responses from a heaviest-chain cache.",
    receiptFields: ["apiEndpoint", "apiEndpointMode", "accessControlPosture", "cacheWarmupState"]
  },
  {
    id: "api-binary-bootstrap",
    file: "crates/nockchain-api/src/main.rs",
    lineRange: "24-45",
    symbols: ["NockchainAPIConfig::EnablePublicServer", "produce_prover_hot_state", "init_with_kernel"],
    sourceUrls: [sourceUrl("crates/nockchain-api/src/main.rs", 24, 45)],
    role:
      "Boots the public API binary with the normal Nockchain kernel and prover hot state, enabling the public server only when a bind address is supplied.",
    evidence:
      "The binary parses normal Nockchain CLI flags, maps bind_public_grpc_addr into NockchainAPIConfig, initializes with the Nockchain kernel, and runs the NockApp.",
    receiptFields: ["nockchainCommit", "nockchainBuild", "apiEndpoint", "proverHotStateEnabled"]
  },
  {
    id: "public-grpc-cli-flag",
    file: "crates/nockchain/src/config.rs",
    lineRange: "217-231",
    symbols: ["bind_public_grpc_addr", "bind_private_grpc_addr", "bind_private_grpc_port"],
    sourceUrls: [sourceUrl("crates/nockchain/src/config.rs", 217, 231)],
    role:
      "Declares the public gRPC bind flag and private gRPC bind controls that decide endpoint exposure mode.",
    evidence:
      "The public API bind is off by default and recommends 127.0.0.1:5555, while private gRPC defaults to port 5555 unless explicitly overridden.",
    receiptFields: ["apiEndpoint", "apiEndpointMode", "privateGrpcEndpoint", "publicGrpcBindAddress"]
  },
  {
    id: "api-config-driver-toggle",
    file: "crates/nockchain/src/lib.rs",
    lineRange: "147-178,542-557",
    symbols: ["NockchainAPIConfig", "deploy_public", "grpc_server_driver", "private_nockapp"],
    sourceUrls: [
      sourceUrl("crates/nockchain/src/lib.rs", 147, 178),
      sourceUrl("crates/nockchain/src/lib.rs", 542, 557)
    ],
    role:
      "Toggles public gRPC driver installation while always adding the private NockApp gRPC driver.",
    evidence:
      "NockchainAPIConfig distinguishes EnablePublicServer from DisablePublicServer, and init adds public_nockchain::grpc_server_driver only when deploy_public is true.",
    receiptFields: ["apiEndpointMode", "publicGrpcEnabled", "privateGrpcEndpoint", "driverInstalled"]
  },
  {
    id: "public-grpc-driver",
    file: "crates/nockapp-grpc/src/services/public_nockchain/v2/driver.rs",
    lineRange: "14-90",
    symbols: ["PublicNockchainEffect", "grpc_server_driver", "grpc_listener_driver"],
    sourceUrls: [sourceUrl("crates/nockapp-grpc/src/services/public_nockchain/v2/driver.rs", 14, 90)],
    role:
      "Connects public gRPC server/listener behavior to NockApp effects, including send-tx effects from wallet/public client flows.",
    evidence:
      "The driver decodes nockchain-grpc send-tx effects and starts a PublicNockchainGrpcServer on the configured socket.",
    receiptFields: ["grpcService", "requestMethod", "rawTxHash", "sendTxEffectObserved"]
  },
  {
    id: "public-service-startup",
    file: "crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs",
    lineRange: "140-212",
    symbols: [
      "PublicNockchainGrpcServer::serve",
      "NockchainServiceServer",
      "NockchainBlockServiceServer",
      "NockchainMetricsService"
    ],
    sourceUrls: [sourceUrl("crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs", 140, 212)],
    role:
      "Starts health, reflection, NockchainService, NockchainBlockService, metrics service, gRPC-Web, CORS, and IP blocklist layers.",
    evidence:
      "The service marks NockchainService serving immediately, block service not-serving until cache seed, installs reflection, API, block explorer, metrics, CORS, gRPC-Web, and blocklist layers.",
    receiptFields: ["grpcService", "healthServingState", "grpcWebEnabled", "accessControlPosture"]
  },
  {
    id: "block-explorer-refresh",
    file: "crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs",
    lineRange: "263-330",
    symbols: ["start_heaviest_chain_refresh", "start_block_explorer_refresh", "initialize"],
    sourceUrls: [sourceUrl("crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs", 263, 330)],
    role:
      "Refreshes heaviest-chain state and initializes the block explorer cache before marking block service as serving.",
    evidence:
      "The refresh worker retries cache initialization, only sets NockchainBlockService serving after initialization succeeds, and treats decode errors as fatal.",
    receiptFields: ["cacheWarmupState", "heaviestChainFreshness", "blockExplorerServing", "fatalDecodeState"]
  },
  {
    id: "transaction-accepted-server",
    file: "crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs",
    lineRange: "1408-1524",
    symbols: ["transaction_accepted", "tx-accepted", "TransactionAcceptedResponse"],
    sourceUrls: [sourceUrl("crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs", 1408, 1524)],
    role:
      "Serves TransactionAccepted by peeking the kernel's tx-accepted path and returning accepted/error, with metrics for invalid, decode, peek, and NockApp failures.",
    evidence:
      "The method validates tx_id, builds a tx-accepted peek path, decodes Option<Option<bool>>, and returns accepted false when the peek is empty.",
    receiptFields: ["txId", "acceptedByNode", "requestMethod", "peekPath", "apiErrorClass"]
  },
  {
    id: "block-explorer-get-blocks",
    file: "crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs",
    lineRange: "1527-1680",
    symbols: ["NockchainBlockService", "get_blocks", "GetBlocksRequest"],
    sourceUrls: [sourceUrl("crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs", 1527, 1680)],
    role:
      "Serves paginated GetBlocks from the block explorer cache and reports current cached height.",
    evidence:
      "GetBlocks requires a page request, clamps client limit to max page size, decodes cursor tokens, reads cache pages, and records latency metrics.",
    receiptFields: ["currentHeight", "pageToken", "returnedBlockCount", "cacheWarmupState"]
  },
  {
    id: "block-explorer-transaction-details",
    file: "crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs",
    lineRange: "1900-2008",
    symbols: ["get_transaction_details", "GetTransactionDetailsRequest", "TransactionPending"],
    sourceUrls: [sourceUrl("crates/nockapp-grpc/src/services/public_nockchain/v2/server.rs", 1900, 2008)],
    role:
      "Serves transaction details or pending/not-found state through the block explorer cache.",
    evidence:
      "Transaction details resolve tx_id, load details from cache/kernel, return pending when the cache reports TxPending, and keep pending separate from details.",
    receiptFields: ["txId", "includedBlock", "transactionPending", "apiErrorClass"]
  },
  {
    id: "public-api-proto",
    file: "crates/nockapp-grpc-proto/proto/nockchain/public/v2/nockchain.proto",
    lineRange: "12-170",
    symbols: ["NockchainService", "NockchainBlockService", "NockchainMetricsService"],
    sourceUrls: [
      sourceUrl("crates/nockapp-grpc-proto/proto/nockchain/public/v2/nockchain.proto", 12, 170)
    ],
    role:
      "Defines the public v2 gRPC service contract for wallet balance/send, tx acceptance, block explorer, transaction details, and metrics.",
    evidence:
      "The proto separates wallet APIs, block explorer APIs, and metrics APIs; transaction responses can be accepted, pending, details, or error depending on method.",
    receiptFields: ["grpcService", "requestMethod", "responseVariant", "apiSchemaVersion"]
  },
  {
    id: "public-api-metrics",
    file: "crates/nockapp-grpc/src/services/public_nockchain/v2/metrics.rs",
    lineRange: "6-287",
    symbols: [
      "NockchainGrpcApiMetrics",
      "nockchain_public_grpc.tx_accepted_success",
      "nockchain_public_grpc.block_explorer.seed_ready",
      "nockchain_public_grpc.api_request_blocked"
    ],
    sourceUrls: [sourceUrl("crates/nockapp-grpc/src/services/public_nockchain/v2/metrics.rs", 6, 287)],
    role:
      "Names the observability contract for public API balance, send, tx-accepted, heaviest-chain, block explorer cache, latency, and request blocking.",
    evidence:
      "Metrics include cache seed readiness, heaviest-chain age, cache span/coverage, refresh/backfill success, endpoint latency, and request-blocked counts.",
    receiptFields: ["metricsSnapshot", "heaviestChainFreshness", "cacheWarmupState", "accessControlPosture"]
  },
  {
    id: "wallet-public-tx-accepted",
    file: "crates/nockchain-wallet/src/main.rs",
    lineRange: "1690-1765",
    symbols: ["run_transaction_accepted", "format_transaction_accepted_markdown"],
    sourceUrls: [sourceUrl("crates/nockchain-wallet/src/main.rs", 1690, 1765)],
    role:
      "Enforces wallet tx-accepted checks through the public client and formats accepted/not-yet-accepted output.",
    evidence:
      "The wallet rejects tx-accepted unless --client public is selected, validates the tx id as base58 hash, queries the public gRPC server, and renders accepted-by-node status.",
    receiptFields: ["clientMode", "apiEndpoint", "txId", "acceptedByNode"]
  }
] as const;

const apiCapabilities = [
  {
    id: "public-server-enablement",
    label: "Public server enablement",
    sourceAnchorIds: ["api-binary-bootstrap", "public-grpc-cli-flag", "api-config-driver-toggle"],
    receiptFields: ["apiEndpoint", "apiEndpointMode", "publicGrpcEnabled", "nockchainBuild"],
    interpretation:
      "A receipt should prove whether public gRPC was actually enabled and which bind address was used."
  },
  {
    id: "public-endpoint-security-posture",
    label: "Public endpoint security posture",
    sourceAnchorIds: ["api-readme-contract", "public-service-startup", "public-api-metrics"],
    receiptFields: ["apiEndpoint", "accessControlPosture", "metricsSnapshot"],
    interpretation:
      "Public API evidence needs explicit access-control posture because upstream documents no built-in auth, authorization, or rate limiting."
  },
  {
    id: "wallet-public-client",
    label: "Wallet public client",
    sourceAnchorIds: ["wallet-public-tx-accepted", "public-api-proto"],
    receiptFields: ["clientMode", "apiEndpoint", "txId", "acceptedByNode"],
    interpretation:
      "Wallet tx-accepted evidence belongs to public-client receipts, while local balance sync may still use private gRPC."
  },
  {
    id: "tx-accepted-not-inclusion",
    label: "Transaction accepted is not inclusion",
    sourceAnchorIds: ["transaction-accepted-server", "wallet-public-tx-accepted", "api-readme-contract"],
    receiptFields: ["txId", "acceptedByNode", "includedBlock", "verificationStatus"],
    interpretation:
      "accepted=true means the node accepted the transaction request; it does not prove mempool residency, block inclusion, or settlement."
  },
  {
    id: "block-explorer-cache",
    label: "Block explorer cache",
    sourceAnchorIds: ["block-explorer-refresh", "block-explorer-get-blocks", "block-explorer-transaction-details"],
    receiptFields: ["cacheWarmupState", "currentHeight", "includedBlock", "transactionPending"],
    interpretation:
      "Explorer responses are cache-backed heaviest-chain views and can be inconclusive during warm-up, backfill, or reorg windows."
  },
  {
    id: "metrics-and-health",
    label: "Metrics and health",
    sourceAnchorIds: ["public-service-startup", "public-api-metrics"],
    receiptFields: ["metricsSnapshot", "healthServingState", "heaviestChainFreshness"],
    interpretation:
      "API receipts should include metrics/health freshness when using hosted or public API evidence."
  },
  {
    id: "browser-grpc-web-guardrails",
    label: "Browser gRPC-Web guardrails",
    sourceAnchorIds: ["public-service-startup"],
    receiptFields: ["grpcWebEnabled", "accessControlPosture", "apiEndpoint"],
    interpretation:
      "Browser-facing access depends on CORS allowlists and IP blocklist posture, not merely on the gRPC service existing."
  }
] as const;

const endpointModes = [
  {
    id: "private-grpc",
    label: "Private local gRPC",
    endpointShape: "http://127.0.0.1:5555",
    hostedProbePolicy: "blocked-private-or-loopback",
    receiptUse:
      "Use for local fakenet balance and private peeks/pokes when the endpoint is not exposed to public clients."
  },
  {
    id: "public-grpc",
    label: "Public gRPC",
    endpointShape: "https://nockchain-api.zorp.io or controlled host:port",
    hostedProbePolicy: "client-side-or-controlled-proxy",
    receiptUse:
      "Use for public wallet balance, send-tx, tx-accepted, block explorer, and metrics evidence after recording access controls."
  },
  {
    id: "hosted-http-manifest",
    label: "Hosted HTTP manifest",
    endpointShape: "https://example.com/.well-known/nocksperimental-fakenet.json",
    hostedProbePolicy: "allowed-public-http-only",
    receiptUse:
      "Use when Nocksperimental fetches a public manifest describing a user's fakenet while keeping direct gRPC probes client-side."
  }
] as const;

const receiptContract = {
  requiredFields: [
    "nockchainCommit",
    "nockchainBuild",
    "apiEndpoint",
    "apiEndpointMode",
    "apiSurface",
    "clientMode",
    "grpcService",
    "requestMethod",
    "txId",
    "acceptedByNode",
    "includedBlock",
    "currentHeight",
    "cacheWarmupState",
    "heaviestChainFreshness",
    "metricsSnapshot",
    "accessControlPosture",
    "observedAt",
    "verificationStatus"
  ],
  forbiddenFields: [
    "rawTransactionJam",
    "rawAuthorizedRawTx",
    "rawNounSlab",
    "privateGrpcPokePayload",
    "walletSeedPhrase",
    "walletPrivateKey",
    "apiServerPrivateKey",
    "sequencerJournalSigningKey"
  ],
  interpretationRules: [
    "Treat public API docs as Tier 1 scoped authority for API deployment and risk posture, not protocol authority.",
    "Treat tx-accepted as node acceptance and require block explorer or independent evidence before claiming inclusion.",
    "Treat cache misses during warm-up/backfill as inconclusive rather than negative proof.",
    "Record access-control posture for every public or hosted endpoint before accepting API evidence.",
    "Represent raw transaction and noun data with hashes or summaries, never raw payloads."
  ]
} as const;

const localVerification = {
  status: "source-inspected",
  inspectedSourceCommit: "33ba97b1e206dd89b15c61b72b7802caf2136c18",
  recommendedCommands: [
    "cargo check -p nockchain-api",
    "cargo check -p nockapp-grpc",
    "cargo test -p nockapp-grpc public_nockchain",
    "cargo check -p nockchain-wallet"
  ],
  notes: [
    "Nocksperimental records source-level API provenance and does not claim hosted endpoints are safe by default.",
    "Run public API checks behind trusted access controls and capture metrics freshness before treating responses as evidence."
  ]
} as const;

export function createNockchainApiSourceTrace() {
  const upstream = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/api-source`,
    generatedAt: "2026-06-06T11:35:00.000Z",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      sourceCommitUrl: upstream.latestCommit.url,
      crates: ["nockchain-api", "nockapp-grpc", "nockapp-grpc-proto", "nockchain-wallet", "nockchain"]
    },
    sourceAnchors,
    apiCapabilities,
    endpointModes,
    receiptContract,
    localVerification,
    nocksperimentalImplications: [
      "BYO fakenet receipts can now classify endpoints as private gRPC, public gRPC, or hosted HTTP manifest before probing.",
      "Balance and transaction evidence can separate public wallet/client checks from private local peeks and pokes.",
      "tx-accepted receipts can explicitly avoid claiming block inclusion without block explorer or independent confirmation evidence.",
      "Hosted API evidence should include cache warm-up, heaviest-chain freshness, metrics, and access-control posture.",
      "Public API source anchors give Nocksperimental a Rust-side map for future fakenet balance and explorer test functions."
    ],
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/api/source`,
      upstream: upstream.links.repository,
      repository: upstream.links.repository,
      walletAtlas: `${registryCanonicalBaseUrl}/api/nockchain/wallet`,
      fakenetConnect: `${registryCanonicalBaseUrl}/api/fakenet/connect`,
      fakenetDiagnostics: `${registryCanonicalBaseUrl}/api/fakenet/diagnostics`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}
