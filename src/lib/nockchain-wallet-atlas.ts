import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const localFakenetWalletAddress =
  "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ";
const localFakenetEndpoint = "127.0.0.1:5555";

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
