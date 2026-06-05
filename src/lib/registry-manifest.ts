import { loadGeneratedLabReports } from "@/lib/generated-lab-reports";
import { trustUpdateChainSummary } from "@/lib/trust-update-log";
import { trustSignals } from "@/lib/trust-signals";

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
      trustUpdates: trustUpdateChainSummary.entryCount
    },
    latestTrustUpdate: {
      status: trustUpdateChainSummary.isAppendOnly ? "verified" : "attention",
      rootHash: trustUpdateChainSummary.latestRoot,
      signedEntries: trustUpdateChainSummary.signedEntryCount,
      validSignatures: trustUpdateChainSummary.validSignatureCount
    }
  };
}

export function createWellKnownRegistryManifest() {
  const manifest = createRegistryManifest();
  const endpointUrl = (id: string) =>
    manifest.endpoints.find((endpoint) => endpoint.id === id)?.url ?? registryCanonicalBaseUrl;

  return {
    ...manifest,
    subject: registrySubject,
    links: {
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      openApi: `${registryCanonicalBaseUrl}/openapi.json`,
      health: endpointUrl("health"),
      checkpoint: endpointUrl("registry-checkpoint"),
      verification: endpointUrl("verification-index"),
      fakenet: endpointUrl("local-fakenet-readiness"),
      fakenetConnect: endpointUrl("bring-your-own-fakenet"),
      fakenetEvidence: endpointUrl("local-fakenet-evidence"),
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
      trustUpdates: endpointUrl("registry-updates")
    },
    capabilities: [
      "verified-badges",
      "append-only-trust-updates",
      "registry-checkpoints",
      "public-verification-index",
      "bring-your-own-fakenet",
      "local-fakenet-evidence",
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
      "cloudflare-workers"
    ]
  };
}
