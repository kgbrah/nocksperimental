import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

const repositoryUrl = "https://github.com/nockchain/nockchain";

const riskClasses = [
  {
    id: "nockup-fixture-manifest",
    label: "Nockup fixture manifests",
    escalation: "high",
    sourceAuthority: "canonical-nockchain-open-pr",
    targetSurfaces: ["nockupValidation", "generatedLabReports", "fixtureDocs"],
    receiptImpact:
      "Template manifest rendering can change which scaffold files, generated manifests, and fixture hashes a Nockup receipt should cite.",
    verificationCommand: "npm run test:nockup-validation && npm run test:generated-reports"
  },
  {
    id: "compute-proof-puzzle",
    label: "Compute/proof puzzle",
    escalation: "high",
    sourceAuthority: "canonical-nockchain-open-pr",
    targetSurfaces: ["computeBenchmarkProfiles", "trustSignals", "x402MeteredTrustApi"],
    receiptImpact:
      "AI PoW puzzle changes could become a new compute benchmark or trust signal rather than a Nockchain runtime claim.",
    verificationCommand: "npm run test:compute-benchmark-detail-page && npm run test:x402"
  },
  {
    id: "benchmarking",
    label: "Nockchain benchmarking",
    escalation: "high",
    sourceAuthority: "canonical-nockchain-open-pr",
    targetSurfaces: ["nockchainRustAtlas", "generatedReports", "computeBenchmarkProfiles"],
    receiptImpact:
      "Benchmark harnesses can change which Rust crate gates and performance evidence belong in generated lab reports.",
    verificationCommand: "npm run test:nockchain-rust-atlas-api && npm run test:generated-reports"
  },
  {
    id: "wallet-transaction-metadata",
    label: "Wallet transaction metadata",
    escalation: "high",
    sourceAuthority: "canonical-nockchain-open-pr",
    targetSurfaces: ["nockchainWalletAtlas", "localFakenetCommands", "balanceEvidence"],
    receiptImpact:
      "Wallet blobs and memos add transaction metadata that receipts must hash and classify without leaking note or key material.",
    verificationCommand: "npm run test:nockchain-wallet-atlas && npm run test:local-fakenet-commands-api"
  },
  {
    id: "nockapp-state-export",
    label: "NockApp state export",
    escalation: "high",
    sourceAuthority: "canonical-nockchain-open-pr",
    targetSurfaces: ["nockchainNockAppSourceTrace", "stateJamRegistry", "localFakenetEvidence"],
    receiptImpact:
      "Public live-app export state can improve snapshot receipts, but raw export jams must stay out of public APIs and git.",
    verificationCommand: "npm run test:nockchain-nockapp-source-api && npm run test:nockchain-state-jams-api"
  },
  {
    id: "runtime-stack-size",
    label: "Runtime stack size",
    escalation: "high",
    sourceAuthority: "canonical-nockchain-open-pr",
    targetSurfaces: ["nockchainOperationsAtlas", "localFakenetReadiness", "localFakenetDiagnostics"],
    receiptImpact:
      "Stack-size behavior affects operator runbooks and failure triage for local fakenet and heavy NockApp runs.",
    verificationCommand:
      "npm run test:nockchain-operations-atlas && npm run test:local-fakenet-diagnostics-api"
  },
  {
    id: "nockup-install-path",
    label: "Nockup install paths",
    escalation: "medium",
    sourceAuthority: "canonical-nockchain-open-pr",
    targetSurfaces: ["nockupValidation", "workspaceEvidence", "fixtureDocs"],
    receiptImpact:
      "Install-path support and nested symlinks can change scaffold portability and workspace evidence paths.",
    verificationCommand: "npm run test:nockup-validation && npm run test:workspace-evidence"
  },
  {
    id: "nockup-extension-hooks",
    label: "Nockup extension hooks",
    escalation: "medium",
    sourceAuthority: "canonical-nockchain-open-pr",
    targetSurfaces: ["fixtureDocs", "nockupValidation", "generatedLabReports"],
    receiptImpact:
      "Downstream-owned templates and subcommands could become first-class Nocksperimental extension points.",
    verificationCommand: "npm run test:nockup-validation && npm run test:generated-reports"
  },
  {
    id: "consensus-height-bounds",
    label: "Consensus height bounds",
    escalation: "medium",
    sourceAuthority: "canonical-nockchain-open-pr",
    targetSurfaces: ["nockchainProtocolTrace", "localFakenetEvidence", "nockchainOperationsAtlas"],
    receiptImpact:
      "Height-bound validation belongs in protocol-sensitive receipts once it lands, especially for worker-thread panic triage.",
    verificationCommand: "npm run test:nockchain-protocol-trace && npm run test:local-fakenet-evidence-api"
  },
  {
    id: "template-pinning",
    label: "Template dependency pinning",
    escalation: "medium",
    sourceAuthority: "canonical-nockchain-open-pr",
    targetSurfaces: ["nockupValidation", "generatedReportProvenance", "fixtureDocs"],
    receiptImpact:
      "Template dependency pins affect reproducible scaffold receipts and generated report provenance.",
    verificationCommand: "npm run test:nockup-validation && npm run test:generated-report-provenance-api"
  },
  {
    id: "hoon-app-surface",
    label: "Hoon app surface",
    escalation: "watch",
    sourceAuthority: "canonical-nockchain-open-pr",
    targetSurfaces: ["nockchainDocsAtlas", "nockchainNockAppAtlas", "fixtureDocs"],
    receiptImpact:
      "New Hoon app surfaces should be reviewed as fixture inspiration until canonical docs promote them.",
    verificationCommand: "npm run test:nockchain-docs-atlas-api && npm run test:nockchain-nockapp-atlas-api"
  }
] as const;

const pullRequests = [
  createPullRequest({
    number: 125,
    title: "fix(nockup): render template manifests from hbs sources",
    draft: true,
    updatedAt: "2026-06-06T00:07:44Z",
    author: "davetist",
    riskClass: "nockup-fixture-manifest",
    priority: "high",
    receiptFields: ["templateManifestSource", "templateManifestHash", "renderedTemplateInputs"],
    forbiddenFields: ["rawTemplateArchive"],
    nocksperimentalAction:
      "Review PR #125 before changing Nockup validation fixture manifest assumptions; template manifest rendering should become hashed receipt metadata."
  }),
  createPullRequest({
    number: 124,
    title: "AI PoW Puzzle for AI Compute Network",
    draft: false,
    updatedAt: "2026-06-05T15:49:25Z",
    author: "tacryt-socryp",
    riskClass: "compute-proof-puzzle",
    priority: "high",
    receiptFields: ["puzzleId", "proofDifficulty", "solverOutputHash"],
    forbiddenFields: ["privateSolverKey"],
    nocksperimentalAction:
      "Review PR #124 as compute/proof benchmark material before adding any trust or x402 evidence class."
  }),
  createPullRequest({
    number: 126,
    title: "nockchain-bench",
    draft: false,
    updatedAt: "2026-06-04T20:13:25Z",
    author: "drbeefsupreme",
    riskClass: "benchmarking",
    priority: "high",
    receiptFields: ["benchmarkSuite", "crateUnderTest", "criterionOutputHash"],
    forbiddenFields: ["rawBenchmarkCache"],
    nocksperimentalAction:
      "Review PR #126 before claiming Rust performance expertise or adding benchmark receipts."
  }),
  createPullRequest({
    number: 116,
    title: "feat(wallet): support blobs and memo on transactions in wallet cli",
    draft: false,
    updatedAt: "2026-06-03T05:32:58Z",
    author: "nocktoshi",
    riskClass: "wallet-transaction-metadata",
    priority: "high",
    receiptFields: ["transactionBlobHash", "memoPresence", "walletCommand", "endpointMode"],
    forbiddenFields: ["walletSeedPhrase", "privateSpendKey", "rawBlobPayload"],
    nocksperimentalAction:
      "Review PR #116 before publishing wallet transaction metadata receipts; blobs and memos must be hashed or summarized."
  }),
  createPullRequest({
    number: 119,
    title: "feat(nockapp): public NockApp::export_state for live-app snapshot",
    draft: false,
    updatedAt: "2026-05-19T00:58:50Z",
    author: "sobchek",
    riskClass: "nockapp-state-export",
    priority: "high",
    receiptFields: ["exportStateCommit", "exportStateHash", "stateJamFingerprint"],
    forbiddenFields: ["rawExportJam", "rawStateJam", "rawPmaSlab"],
    nocksperimentalAction:
      "Review PR #119 before trusting live NockApp state export snapshots; export jams stay metadata-only."
  }),
  createPullRequest({
    number: 122,
    title: "feat(nockup): install_path support and nested symlink fixes",
    draft: false,
    updatedAt: "2026-05-18T02:01:41Z",
    author: "nocktoshi",
    riskClass: "nockup-install-path",
    priority: "medium",
    receiptFields: ["installPath", "symlinkPolicy", "workspaceRoot"],
    forbiddenFields: ["absolutePrivatePath"],
    nocksperimentalAction:
      "Review PR #122 before treating Nockup install paths as portable workspace evidence."
  }),
  createPullRequest({
    number: 120,
    title: "feat(nockup): extension hooks for downstream-owned templates and subcommands",
    draft: false,
    updatedAt: "2026-05-09T18:44:14Z",
    author: "sobchek",
    riskClass: "nockup-extension-hooks",
    priority: "medium",
    receiptFields: ["extensionHook", "downstreamTemplateId", "subcommandName"],
    forbiddenFields: ["rawExtensionSecret"],
    nocksperimentalAction:
      "Review PR #120 before designing downstream-owned Nocksperimental Nockup templates."
  }),
  createPullRequest({
    number: 118,
    title: "Respect --stack-size flag",
    draft: false,
    updatedAt: "2026-05-07T21:20:18Z",
    author: "mopfel-winrux",
    riskClass: "runtime-stack-size",
    priority: "high",
    receiptFields: ["stackSizeFlag", "runtimeProfile", "failureMode"],
    forbiddenFields: ["rawCoreDump"],
    nocksperimentalAction:
      "Review PR #118 before changing local fakenet stack-size runbooks or diagnosing runtime stack failures."
  }),
  createPullRequest({
    number: 117,
    title: "feat(nockup): declarative post-install [[patches]]",
    draft: false,
    updatedAt: "2026-05-03T19:11:15Z",
    author: "sobchek",
    riskClass: "nockup-extension-hooks",
    priority: "medium",
    receiptFields: ["postInstallPatch", "patchHash", "templateId"],
    forbiddenFields: ["rawPatchWithSecrets"],
    nocksperimentalAction:
      "Review PR #117 before accepting post-install patch evidence from Nockup templates."
  }),
  createPullRequest({
    number: 114,
    title:
      "fix(nockup): pin `basic` template's nockchain deps to a real commit / proposed addition to nockup architecture",
    draft: false,
    updatedAt: "2026-05-03T17:11:38Z",
    author: "sobchek",
    riskClass: "template-pinning",
    priority: "medium",
    receiptFields: ["templateDependencyCommit", "templateDependencyHash", "nockchainBuild"],
    forbiddenFields: ["floatingDependencyRef"],
    nocksperimentalAction:
      "Review PR #114 before marking scaffold dependency provenance reproducible."
  }),
  createPullRequest({
    number: 111,
    title: "Add h-zoon",
    draft: false,
    updatedAt: "2026-05-01T23:02:40Z",
    author: "h33p",
    riskClass: "hoon-app-surface",
    priority: "watch",
    receiptFields: ["hoonAppName", "sourceCommit", "fixtureRole"],
    forbiddenFields: ["rawKernelState"],
    nocksperimentalAction:
      "Watch PR #111 as Hoon app surface context until canonical docs or Nockup fixtures promote it."
  }),
  createPullRequest({
    number: 88,
    title: "fix: validate height bounds to prevent worker thread panic",
    draft: false,
    updatedAt: "2026-04-14T23:17:27Z",
    author: "gitwormq",
    riskClass: "consensus-height-bounds",
    priority: "medium",
    receiptFields: ["heightBoundsChecked", "workerThreadFailureMode", "validationError"],
    forbiddenFields: ["rawPanicDump"],
    nocksperimentalAction:
      "Review PR #88 before treating worker-thread panic prevention as current protocol/runtime behavior."
  })
] as const;

const reviewContract = {
  requiredFields: [
    "prNumber",
    "title",
    "updatedAt",
    "riskClass",
    "priority",
    "targetSurfaces",
    "receiptImpact",
    "verificationCommand"
  ],
  forbiddenFields: [
    "rawStateJam",
    "rawPmaSlab",
    "rawExportJam",
    "walletSeedPhrase",
    "privateSpendKey",
    "rawBenchmarkCache"
  ],
  reviewRules: [
    "Draft PRs can shape future tests but cannot be treated as merged behavior.",
    "Open PRs are early-warning signals, not canonical protocol authority.",
    "Every merged PR that touches a target surface should refresh the matching Nocksperimental atlas, receipt contract, and tests.",
    "Receipt-impacting PRs must name the upstream commit, PR number, affected paths, and verification command before evidence is trusted."
  ]
} as const;

export function createNockchainPrRadar() {
  const upstream = nockchainUpstreamIntelligence;
  const highPriorityPrs = pullRequests.filter((pullRequest) => pullRequest.priority === "high");
  const targetSurfaces = Array.from(
    new Set(pullRequests.flatMap((pullRequest) => pullRequest.targetSurfaces))
  );

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/pr-radar`,
    observedAt: "2026-06-06T05:18:00.000Z",
    upstream: {
      repository: upstream.repository,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      openPullRequestsUrl: `${repositoryUrl}/pulls`,
      sourceAuthority: "open-pr-early-warning"
    },
    snapshot: {
      openPullRequestCount: pullRequests.length,
      draftCount: pullRequests.filter((pullRequest) => pullRequest.draft).length,
      highPriorityCount: highPriorityPrs.length,
      latestUpdatedAt: pullRequests
        .map((pullRequest) => pullRequest.updatedAt)
        .sort()
        .at(-1)
    },
    pullRequests,
    riskClasses,
    reviewContract,
    operatorQueue: [
      "Review PR #125 before changing Nockup validation fixture manifest assumptions.",
      "Review PR #116 before publishing wallet transaction metadata receipts.",
      "Review PR #119 before trusting live NockApp state export snapshots.",
      "Review PR #126 before claiming Rust benchmarking coverage.",
      "Review PR #124 as compute/proof benchmark material, not current Nockchain runtime authority.",
      "Review PR #118 before changing stack-size runbooks or runtime failure triage."
    ],
    targetSurfaceSummary: targetSurfaces.map((surface) => ({
      surface,
      pullRequestNumbers: pullRequests
        .filter((pullRequest) =>
          (pullRequest.targetSurfaces as readonly string[]).includes(surface)
        )
        .map((pullRequest) => pullRequest.number)
    })),
    links: {
      page: `${registryCanonicalBaseUrl}/nockchain/pr-radar`,
      repository: repositoryUrl,
      pulls: `${repositoryUrl}/pulls`,
      watch: `${registryCanonicalBaseUrl}/api/nockchain/watch`,
      nockup: `${registryCanonicalBaseUrl}/api/nockchain/nockup/submit`,
      wallet: `${registryCanonicalBaseUrl}/api/nockchain/wallet`,
      nockappSource: `${registryCanonicalBaseUrl}/api/nockchain/nockapp-source`,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}

function createPullRequest({
  number,
  title,
  draft,
  updatedAt,
  author,
  riskClass,
  priority,
  receiptFields,
  forbiddenFields,
  nocksperimentalAction
}: {
  number: number;
  title: string;
  draft: boolean;
  updatedAt: string;
  author: string;
  riskClass: (typeof riskClasses)[number]["id"];
  priority: "high" | "medium" | "watch";
  receiptFields: string[];
  forbiddenFields: string[];
  nocksperimentalAction: string;
}) {
  const risk = riskClasses.find((candidate) => candidate.id === riskClass);

  if (!risk) {
    throw new Error(`Unknown Nockchain PR risk class: ${riskClass}`);
  }

  return {
    number,
    title,
    url: `${repositoryUrl}/pull/${number}`,
    status: "open",
    draft,
    updatedAt,
    author,
    riskClass,
    priority,
    sourceAuthority: risk.sourceAuthority,
    targetSurfaces: risk.targetSurfaces,
    receiptImpact: risk.receiptImpact,
    verificationCommand: risk.verificationCommand,
    receiptFields,
    forbiddenFields,
    nocksperimentalAction
  };
}
