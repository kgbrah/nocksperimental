import launchEvidenceData from "@/data/launch-evidence.json";
import { loadGeneratedLabReports } from "@/lib/generated-lab-reports";
import { trustUpdateChainSummary } from "@/lib/trust-update-log";
import { trustSignals } from "@/lib/trust-signals";
import { resolveX402Config } from "@/lib/x402/config";
import { METERED_RESOURCES } from "@/lib/x402/pricing";

export const registryServiceName = "nocksperimental";
export const registrySubject = "nocksperimental.com";
export const registryCanonicalBaseUrl = `https://${registrySubject}`;

export const registryEndpoints = [
  {
    id: "registry",
    path: "/api/registry",
    description: "Public registry manifest"
  },
  {
    id: "registry-checkpoint",
    path: "/api/registry/checkpoint",
    description: "Registry integrity checkpoint"
  },
  {
    id: "verification-index",
    path: "/api/verify",
    description: "Verification endpoint index"
  },
  {
    id: "health",
    path: "/api/health",
    description: "Public runtime readiness probe"
  },
  {
    id: "nockchain-upstream",
    path: "/api/nockchain/upstream",
    description: "Nockchain upstream intelligence"
  },
  {
    id: "nockchain-docs-atlas",
    path: "/api/nockchain/docs-atlas",
    description: "Nockchain docs and protocol atlas"
  },
  {
    id: "nockchain-knowledge-spine",
    path: "/api/nockchain/knowledge-spine",
    description: "Nockchain knowledge spine integrity map"
  },
  {
    id: "nockchain-cargo-surface",
    path: "/api/nockchain/cargo-surface",
    description: "Nockchain Cargo manifest and target surface"
  },
  {
    id: "nockchain-hoon-kernels",
    path: "/api/nockchain/hoon-kernels",
    description: "Nockchain Hoon kernel and jam atlas"
  },
  {
    id: "nockchain-protocol-trace",
    path: "/api/nockchain/protocol",
    description: "Nockchain protocol authority trace"
  },
  {
    id: "nockchain-bridge-trace",
    path: "/api/nockchain/bridge",
    description: "Nockchain bridge withdrawal trace"
  },
  {
    id: "nockchain-bridge-source-trace",
    path: "/api/nockchain/bridge-source",
    description: "Nockchain bridge execution source trace"
  },
  {
    id: "nockchain-release-assets",
    path: "/api/nockchain/release-assets",
    description: "Nockchain release asset manifest"
  },
  {
    id: "zorp-upstream",
    path: "/api/nockchain/zorp",
    description: "Zorp/Nockchain upstream map"
  },
  {
    id: "nockchain-state-jams",
    path: "/api/nockchain/state-jams",
    description: "Nockchain state-jam provenance registry"
  },
  {
    id: "nockchain-rust-atlas",
    path: "/api/nockchain/rust-atlas",
    description: "Nockchain Rust workspace atlas"
  },
  {
    id: "nockchain-rust-source-guide",
    path: "/api/nockchain/rust-source",
    description: "Nockchain Rust source guide"
  },
  {
    id: "nockchain-nockapp-atlas",
    path: "/api/nockchain/nockapp-atlas",
    description: "Nockchain NockApp runtime atlas"
  },
  {
    id: "nockchain-nockapp-source-trace",
    path: "/api/nockchain/nockapp-source",
    description: "Nockchain NockApp source trace"
  },
  {
    id: "nockchain-operations-atlas",
    path: "/api/nockchain/operations",
    description: "Nockchain operations atlas"
  },
  {
    id: "nockchain-wallet-atlas",
    path: "/api/nockchain/wallet",
    description: "Nockchain wallet/API atlas"
  },
  {
    id: "nockchain-watch",
    path: "/api/nockchain/watch",
    description: "Nockchain upstream watch board"
  },
  {
    id: "nockchain-pr-radar",
    path: "/api/nockchain/pr-radar",
    description: "Nockchain open PR radar"
  },
  {
    id: "nockchain-sync-gossip-trace",
    path: "/api/nockchain/sync-gossip",
    description: "Nockchain sync/gossip source trace"
  },
  {
    id: "nockup-validation-submit",
    path: "/api/nockchain/nockup/submit",
    description: "Submit Nockup scaffold validation evidence"
  },
  {
    id: "nockup-validation-receipts",
    path: "/api/nockchain/nockup/receipts",
    description: "List persisted Nockup validation receipts"
  },
  {
    id: "local-fakenet-readiness",
    path: "/api/fakenet",
    description: "Local fakenet readiness summary"
  },
  {
    id: "bring-your-own-fakenet",
    path: "/api/fakenet/connect",
    description: "Bring your own fakenet connection profile"
  },
  {
    id: "local-fakenet-evidence",
    path: "/api/fakenet/evidence",
    description: "Local fakenet evidence capsule"
  },
  {
    id: "fakenet-evidence-submit",
    path: "/api/fakenet/evidence/submit",
    description: "Submit bring-your-own fakenet evidence"
  },
  {
    id: "fakenet-evidence-receipts",
    path: "/api/fakenet/evidence/receipts",
    description: "List persisted fakenet evidence receipts"
  },
  {
    id: "vesl-evidence-submit",
    path: "/api/vesl/evidence/submit",
    description: "Submit VESL lifecycle evidence"
  },
  {
    id: "vesl-evidence-receipts",
    path: "/api/vesl/evidence/receipts",
    description: "List persisted VESL evidence receipts"
  },
  {
    id: "launch-evidence",
    path: "/api/launch-evidence",
    description: "Launch Evidence report index"
  },
  {
    id: "launch-evidence-verifier",
    path: "/api/launch-evidence/verify",
    description: "Verify Launch Evidence report"
  },
  {
    id: "local-fakenet-evidence-verifier",
    path: "/api/fakenet/evidence/verify",
    description: "Local fakenet evidence verifier"
  },
  {
    id: "local-fakenet-commands",
    path: "/api/fakenet/commands",
    description: "Local fakenet command kit"
  },
  {
    id: "local-fakenet-diagnostics",
    path: "/api/fakenet/diagnostics",
    description: "Local fakenet diagnostics"
  },
  {
    id: "local-fakenet-support-bundle",
    path: "/api/fakenet/support-bundle",
    description: "Local fakenet support bundle"
  },
  {
    id: "local-fakenet-support-markdown",
    path: "/api/fakenet/support-bundle.md",
    description: "Local fakenet support bundle markdown"
  },
  {
    id: "local-fakenet-runbook",
    path: "/api/fakenet/runbook.sh",
    description: "Local fakenet shell runbook"
  },
  {
    id: "workspace-evidence",
    path: "/api/workspaces/launch-lab-private/evidence",
    description: "Workspace evidence capsule"
  },
  {
    id: "workspace-upload-policy",
    path: "/api/workspaces/launch-lab-private/upload-policy",
    description: "Workspace upload policy"
  },
  {
    id: "workspace-upload-token",
    path: "/api/workspaces/launch-lab-private/upload-token",
    description: "Workspace upload token gate"
  },
  {
    id: "workspace-upload-token-verifier",
    path: "/api/workspaces/upload-token/verify",
    description: "Workspace upload token verifier"
  },
  {
    id: "workspace-evidence-verifier",
    path: "/api/workspaces/evidence/verify",
    description: "Workspace evidence verifier"
  },
  {
    id: "trust-overview",
    path: "/api/trust",
    description: "Trust registry overview"
  },
  {
    id: "verified-badges",
    path: "/api/trust/badges",
    description: "Verified badge registry"
  },
  {
    id: "trust-feed",
    path: "/api/trust/feed",
    description: "Chronological trust registry event feed"
  },
  {
    id: "generated-reports",
    path: "/api/reports/generated",
    description: "Generated lab report index"
  },
  {
    id: "registry-updates",
    path: "/api/trust/updates",
    description: "Signed trust registry update log"
  },
  {
    id: "bazaar-directory",
    path: "/api/bazaar",
    description: "Verified Bazaar directory"
  }
];

export function createRegistryManifest() {
  const generatedReports = loadGeneratedLabReports();

  return {
    version: "v0",
    service: registryServiceName,
    canonicalBaseUrl: registryCanonicalBaseUrl,
    publishedAt: new Date().toISOString(),
    endpoints: registryEndpoints.map((endpoint) => ({
      ...endpoint,
      url: `${registryCanonicalBaseUrl}${endpoint.path}`
    })),
    counts: {
      badges: trustSignals.verifiedBadges.length,
      trustConsumers: trustSignals.trustConsumers.length,
      generatedReports: generatedReports.totals.reportCount,
      trustUpdates: trustUpdateChainSummary.entryCount,
      launchEvidenceCases: launchEvidenceData.cases.filter((entry) => entry.visibility !== "private").length
    },
    latestTrustUpdate: {
      status: trustUpdateChainSummary.isAppendOnly ? "verified" : "attention",
      rootHash: trustUpdateChainSummary.latestRoot,
      signedEntries: trustUpdateChainSummary.signedEntryCount,
      validSignatures: trustUpdateChainSummary.validSignatureCount
    }
  };
}

function toDiscoveryPath(pattern: string) {
  return pattern.replace(/\[([^\]]+)\]/g, "{$1}");
}

export function createX402Discovery() {
  const config = resolveX402Config();

  return {
    enabled: config.enabled,
    network: config.network,
    asset: config.asset,
    scheme: config.scheme,
    payTo: config.payTo,
    paymentRequestHeader: "PAYMENT-SIGNATURE",
    paymentResponseHeader: "X-PAYMENT-RESPONSE",
    facilitatorConfigured: Boolean(config.facilitatorUrl),
    freeAllowancePerDay: config.freeAllowancePerDay,
    resources: METERED_RESOURCES.map((resource) => ({
      slug: resource.slug,
      url: `${registryCanonicalBaseUrl}${toDiscoveryPath(resource.pathPattern)}`,
      method: resource.method,
      priceNicks: resource.priceNicks,
      description: resource.description
    }))
  };
}

export function createWellKnownRegistryManifest() {
  const manifest = createRegistryManifest();
  const endpointUrl = (id: string) =>
    manifest.endpoints.find((endpoint) => endpoint.id === id)?.url ?? registryCanonicalBaseUrl;

  return {
    ...manifest,
    subject: registrySubject,
    x402: createX402Discovery(),
    links: {
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      openApi: `${registryCanonicalBaseUrl}/openapi.json`,
      health: endpointUrl("health"),
      nockchainUpstream: endpointUrl("nockchain-upstream"),
      nockchainDocsAtlas: endpointUrl("nockchain-docs-atlas"),
      nockchainKnowledgeSpine: endpointUrl("nockchain-knowledge-spine"),
      nockchainCargoSurface: endpointUrl("nockchain-cargo-surface"),
      nockchainHoonKernels: endpointUrl("nockchain-hoon-kernels"),
      nockchainProtocolTrace: endpointUrl("nockchain-protocol-trace"),
      nockchainBridgeTrace: endpointUrl("nockchain-bridge-trace"),
      nockchainBridgeSourceTrace: endpointUrl("nockchain-bridge-source-trace"),
      nockchainReleaseAssets: endpointUrl("nockchain-release-assets"),
      zorpUpstream: endpointUrl("zorp-upstream"),
      nockchainStateJams: endpointUrl("nockchain-state-jams"),
      nockchainRustAtlas: endpointUrl("nockchain-rust-atlas"),
      nockchainRustSourceGuide: endpointUrl("nockchain-rust-source-guide"),
      nockchainNockAppAtlas: endpointUrl("nockchain-nockapp-atlas"),
      nockchainNockAppSourceTrace: endpointUrl("nockchain-nockapp-source-trace"),
      nockchainOperationsAtlas: endpointUrl("nockchain-operations-atlas"),
      nockchainWalletAtlas: endpointUrl("nockchain-wallet-atlas"),
      nockchainWatch: endpointUrl("nockchain-watch"),
      nockchainPrRadar: endpointUrl("nockchain-pr-radar"),
      nockchainSyncGossipTrace: endpointUrl("nockchain-sync-gossip-trace"),
      nockupValidationSubmit: endpointUrl("nockup-validation-submit"),
      nockupValidationReceipts: endpointUrl("nockup-validation-receipts"),
      checkpoint: endpointUrl("registry-checkpoint"),
      verification: endpointUrl("verification-index"),
      fakenet: endpointUrl("local-fakenet-readiness"),
      fakenetConnect: endpointUrl("bring-your-own-fakenet"),
      fakenetEvidence: endpointUrl("local-fakenet-evidence"),
      fakenetEvidenceSubmit: endpointUrl("fakenet-evidence-submit"),
      fakenetEvidenceReceipts: endpointUrl("fakenet-evidence-receipts"),
      veslEvidenceSubmit: endpointUrl("vesl-evidence-submit"),
      veslEvidenceReceipts: endpointUrl("vesl-evidence-receipts"),
      launchEvidence: endpointUrl("launch-evidence"),
      launchEvidenceVerifier: endpointUrl("launch-evidence-verifier"),
      fakenetEvidenceVerifier: endpointUrl("local-fakenet-evidence-verifier"),
      fakenetCommands: endpointUrl("local-fakenet-commands"),
      fakenetDiagnostics: endpointUrl("local-fakenet-diagnostics"),
      fakenetSupportBundle: endpointUrl("local-fakenet-support-bundle"),
      fakenetSupportMarkdown: endpointUrl("local-fakenet-support-markdown"),
      fakenetRunbook: endpointUrl("local-fakenet-runbook"),
      workspaceEvidence: endpointUrl("workspace-evidence"),
      workspaceUploadPolicy: endpointUrl("workspace-upload-policy"),
      workspaceUploadToken: endpointUrl("workspace-upload-token"),
      workspaceUploadTokenVerifier: endpointUrl("workspace-upload-token-verifier"),
      workspaceEvidenceVerifier: endpointUrl("workspace-evidence-verifier"),
      verifiedBadges: endpointUrl("verified-badges"),
      trustFeed: endpointUrl("trust-feed"),
      trustUpdates: endpointUrl("registry-updates"),
      bazaar: endpointUrl("bazaar-directory")
    },
    capabilities: [
      "verified-badges",
      "append-only-trust-updates",
      "registry-checkpoints",
      "public-verification-index",
      "nockchain-upstream-intelligence",
      "nockchain-docs-protocol-atlas",
      "nockchain-knowledge-spine",
      "nockchain-cargo-surface",
      "nockchain-hoon-kernel-atlas",
      "nockchain-protocol-trace",
      "nockchain-bridge-withdrawal-trace",
      "nockchain-bridge-source-trace",
      "nockchain-release-asset-manifest",
      "zorp-nockchain-upstream-map",
      "nockchain-state-jam-provenance",
      "nockchain-rust-workspace-atlas",
      "nockchain-rust-source-guide",
      "nockchain-nockapp-runtime-atlas",
      "nockchain-nockapp-source-trace",
      "nockchain-operations-atlas",
      "nockchain-wallet-api-atlas",
      "nockchain-upstream-watch",
      "nockchain-pr-radar",
      "nockchain-sync-gossip-trace",
      "nockup-validation-submit",
      "nockup-validation-receipts",
      "bring-your-own-fakenet",
      "local-fakenet-evidence",
      "fakenet-evidence-submit",
      "fakenet-evidence-receipts",
      "vesl-evidence-bridge",
      "vesl-evidence-receipts",
      "launch-evidence-reports",
      "launch-evidence-verifier",
      "local-fakenet-evidence-verifier",
      "local-fakenet-command-kit",
      "local-fakenet-diagnostics",
      "local-fakenet-support-bundle",
      "local-fakenet-support-markdown",
      "local-fakenet-runbook",
      "workspace-evidence-capsule",
      "workspace-upload-policy",
      "workspace-upload-token-gate",
      "workspace-upload-token-verifier",
      "workspace-evidence-verifier",
      "generated-lab-reports",
      "cloudflare-workers",
      "x402-metered-trust-api",
      "verified-bazaar"
    ]
  };
}
