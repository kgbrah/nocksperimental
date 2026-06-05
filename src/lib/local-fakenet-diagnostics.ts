import { createLocalFakenetCommandKit } from "@/lib/local-fakenet-commands";
import { createLocalFakenetReadiness } from "@/lib/local-fakenet-readiness";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

type LocalFakenetDiagnosticSeverity = "blocker" | "warning" | "info";

type LocalFakenetDiagnostic = {
  id: string;
  severity: LocalFakenetDiagnosticSeverity;
  title: string;
  evidence: string;
  action: string;
  command: string;
};

type LocalFakenetDiagnosticsOptions = {
  rootDir?: string;
};

type LocalFakenetReadiness = ReturnType<typeof createLocalFakenetReadiness>;

type NockchainTriageIssueStatus = "observed" | "not-observed" | "needs-evidence";

type NockchainTriageIssue = {
  id: string;
  title: string;
  status: NockchainTriageIssueStatus;
  interpretation: string;
  evidence: string;
  checks: string[];
};

export function createLocalFakenetDiagnostics(
  options: LocalFakenetDiagnosticsOptions = {}
) {
  const readiness = createLocalFakenetReadiness(options);
  const commandKit = createLocalFakenetCommandKit();
  const commandById = (id: string) =>
    commandKit.commands.find((command) => command.id === id)?.command ?? "";
  const diagnostics: LocalFakenetDiagnostic[] = [];
  const failureText = readiness.failures.join("\n");
  const walletError = readiness.wallet.error ?? "";
  const chainError = readiness.chain.error ?? "";
  const evidenceText = [failureText, walletError, chainError].filter(Boolean).join("\n");

  if (readiness.reportCount === 0 || readiness.status === "missing") {
    diagnostics.push({
      id: "reports-missing",
      severity: "warning",
      title: "No local fakenet reports found",
      evidence: "No local fakenet report artifacts were found in .nocklab.",
      action: "Generate the local health report first, then refresh the full fakenet evidence set.",
      command: "npm run lab:local"
    });
  } else {
    if (readiness.checks.health === "fail" || /ECONNREFUSED|not reachable|connection refused/i.test(evidenceText)) {
      diagnostics.push({
        id: "grpc-unreachable",
        severity: "blocker",
        title: "Local fakenet gRPC is unreachable",
        evidence: firstMatchingEvidence(readiness.failures, /ECONNREFUSED|not reachable|connection refused/i),
        action: "Start or resume the local fakenet process, then regenerate readiness reports.",
        command: commandById("start-fakenet")
      });
    }

    if (/spawn fakenock ENOENT|fakenock.*not found|missing fakenock/i.test(evidenceText)) {
      diagnostics.push({
        id: "fakenock-missing",
        severity: "blocker",
        title: "fakenock is not available on PATH",
        evidence: firstMatchingEvidence([walletError, ...readiness.failures], /spawn fakenock ENOENT|not found|missing fakenock/i),
        action: "Run the checks from WSL or a shell where fakenock is installed and on PATH.",
        command: commandById("check-balance")
      });
    }

    if (readiness.checks.balance === "fail") {
      diagnostics.push({
        id: "balance-check-failed",
        severity: "blocker",
        title: "Wallet balance check failed",
        evidence: readiness.wallet.error ?? firstMatchingEvidence(readiness.failures, /balance/i),
        action: "Check the configured fakenet wallet directly before refreshing the balance report.",
        command: commandById("check-balance")
      });
    }

    if (readiness.checks.chain === "missing") {
      diagnostics.push({
        id: "chain-report-missing",
        severity: "warning",
        title: "Chain metadata report is missing",
        evidence: "No local-fakenet-chain report was found in .nocklab.",
        action: "Generate chain metadata so peer count, height, and block commitment can be checked.",
        command: "npm run lab:local:chain"
      });
    }

    if (readiness.chain.peerCount === 0 || /routing table is empty|no connected peers/i.test(evidenceText)) {
      diagnostics.push({
        id: "no-connected-peers",
        severity: "warning",
        title: "No connected fakenet peers",
        evidence: firstMatchingEvidence([chainError, ...readiness.failures], /routing table is empty|no connected peers/i),
        action: "Let the node continue syncing or verify fakenet peer/bootstrap configuration.",
        command: "npm run lab:local:chain"
      });
    }

    if (/wrong block commitment/i.test(evidenceText)) {
      diagnostics.push({
        id: "block-commitment-mismatch",
        severity: "blocker",
        title: "Block commitment mismatch",
        evidence: firstMatchingEvidence(readiness.failures, /wrong block commitment/i),
        action: "Wait for the node to sync to the expected fakenet tip, then refresh chain evidence.",
        command: "npm run lab:local:chain"
      });
    }
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      id: "local-fakenet-ready",
      severity: "info",
      title: "Local fakenet evidence is ready",
      evidence: `Readiness status is ${readiness.status}.`,
      action: "Keep the generated local fakenet reports with the current test run.",
      command: commandById("open-readiness-api")
    });
  }

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/fakenet/diagnostics`,
    generatedAt: readiness.generatedAt,
    readiness: {
      status: readiness.status,
      reportCount: readiness.reportCount,
      endpoint: readiness.endpoint,
      checks: readiness.checks
    },
    activeCount: diagnostics.filter((diagnostic) => diagnostic.severity !== "info").length,
    diagnostics,
    nockchainTriage: createNockchainTriage(readiness, evidenceText),
    links: {
      readiness: `${registryCanonicalBaseUrl}/api/fakenet`,
      commands: `${registryCanonicalBaseUrl}/api/fakenet/commands`,
      runbook: commandKit.runbookUrl
    }
  };
}

function firstMatchingEvidence(evidence: string[], pattern: RegExp) {
  return evidence.find((item) => pattern.test(item)) ?? evidence.find(Boolean) ?? "No detailed evidence was captured.";
}

function createNockchainTriage(
  readiness: LocalFakenetReadiness,
  evidenceText: string
) {
  const upstream = nockchainUpstreamIntelligence;
  const issues: NockchainTriageIssue[] = [
    createEmptyRoutingTableIssue(readiness, evidenceText),
    createNoConnectedPeersIssue(readiness, evidenceText),
    createWrongCommitmentIssue(readiness, evidenceText)
  ];

  return {
    version: "v0",
    upstream: {
      repository: upstream.repository.fullName,
      commit: upstream.latestCommit,
      release: upstream.latestRelease,
      protocol: {
        authority: upstream.protocol.authority,
        next: upstream.protocol.currentTrack.next,
        previous: upstream.protocol.currentTrack.previous,
        draft: upstream.protocol.currentTrack.draft
      },
      latestSignal: upstream.latestCommit.message
    },
    summary: summarizeNockchainTriage(issues),
    issues,
    operatorChecks: [
      "Confirm the node is caught up to the fakenet tip before mining or interpreting block commitments.",
      "Check fakenet node and miner use the same data dirs, bootstrap peer, bind address, and wallet endpoint mode.",
      "Verify peer multiaddrs plus UDP/QUIC ports are reachable from the laptop and WSL network namespace.",
      "Regenerate chain evidence after sync changes with npm run lab:local:chain."
    ],
    stateArtifactSafety: {
      posture: upstream.safety.stateArtifacts.posture,
      doNotStore: upstream.safety.stateArtifacts.doNotStore,
      metadataToTrack: upstream.safety.stateArtifacts.metadataToTrack
    },
    docs: {
      policy: upstream.docs.policy,
      canonicalSources: upstream.docs.canonicalSpine.map((source) => source.path)
    },
    links: {
      upstream: upstream.canonicalUrl,
      repository: upstream.links.repository,
      release: upstream.links.release,
      runbook: `${registryCanonicalBaseUrl}/api/fakenet/runbook.sh`
    }
  };
}

function createEmptyRoutingTableIssue(
  readiness: LocalFakenetReadiness,
  evidenceText: string
): NockchainTriageIssue {
  const observed = /routing table is empty/i.test(evidenceText);

  return {
    id: "empty-routing-table",
    title: "Routing table has no fakenet peers",
    status: observed ? "observed" : readiness.checks.chain === "missing" ? "needs-evidence" : "not-observed",
    interpretation: observed
      ? "The node has not discovered usable fakenet peers yet; with current upstream behavior, a behind-tip node may also suppress outgoing gossip while it catches up."
      : "No empty routing-table symptom was found in the current chain evidence.",
    evidence: observed
      ? firstMatchingEvidence([readiness.chain.error ?? "", ...readiness.failures], /routing table is empty/i)
      : readiness.checks.chain === "missing"
        ? "No local-fakenet-chain report was available."
        : "Current chain evidence did not include an empty routing table message.",
    checks: [
      "Confirm the fakenet node has a bootstrap peer or persisted peer table for this fakenet.",
      "Check the fakenet bind and advertised multiaddr match the process you are mining against.",
      "Re-run npm run lab:local:chain after the fakenet node has had time to discover peers."
    ]
  };
}

function createNoConnectedPeersIssue(
  readiness: LocalFakenetReadiness,
  evidenceText: string
): NockchainTriageIssue {
  const observed = readiness.chain.peerCount === 0 || /no connected peers/i.test(evidenceText);
  const hasPeerEvidence = typeof readiness.chain.peerCount === "number";

  return {
    id: "no-connected-peers",
    title: "No connected fakenet peers",
    status: observed ? "observed" : hasPeerEvidence ? "not-observed" : "needs-evidence",
    interpretation: observed
      ? "Mining against a node with zero connected fakenet peers can produce stale tip context and misleading commitment checks."
      : hasPeerEvidence
        ? `Current chain evidence reports ${readiness.chain.peerCount} connected fakenet peers.`
        : "The diagnostics do not yet have a peer-count observation.",
    evidence: observed
      ? firstMatchingEvidence([readiness.chain.error ?? "", ...readiness.failures], /no connected peers|routing table is empty/i)
      : hasPeerEvidence
        ? `peerCount=${readiness.chain.peerCount}`
        : "No peer-count evidence was captured.",
    checks: [
      "Confirm fakenet peer count is greater than zero before treating miner output as valid test evidence.",
      "Check WSL firewall, localhost forwarding, and UDP/QUIC reachability for the fakenet process.",
      "Compare the fakenet node peer configuration with scripts/run_nockchain_node_fakenet.sh upstream."
    ]
  };
}

function createWrongCommitmentIssue(
  readiness: LocalFakenetReadiness,
  evidenceText: string
): NockchainTriageIssue {
  const observed = /wrong block commitment/i.test(evidenceText);
  const hasCommitmentEvidence = Boolean(readiness.chain.blockCommitment);

  return {
    id: "wrong-block-commitment",
    title: "Block commitment does not match the expected fakenet tip",
    status: observed ? "observed" : hasCommitmentEvidence ? "not-observed" : "needs-evidence",
    interpretation: observed
      ? "A wrong commitment usually means the miner, wallet, or test expectation is looking at a different fakenet tip or state artifact than the node."
      : hasCommitmentEvidence
        ? "A block commitment was captured and no mismatch text was found."
        : "The diagnostics do not yet have block-commitment evidence.",
    evidence: observed
      ? firstMatchingEvidence([readiness.chain.error ?? "", ...readiness.failures], /wrong block commitment/i)
      : hasCommitmentEvidence
        ? `blockCommitment=${readiness.chain.blockCommitment}`
        : "No block commitment was captured.",
    checks: [
      "Confirm the fakenet node is caught up before comparing mined block commitments.",
      "Verify checkpoint or state-jam provenance matches the network, height, and Nockchain commit under test.",
      "Regenerate fakenet chain evidence immediately before submitting a test receipt."
    ]
  };
}

function summarizeNockchainTriage(issues: NockchainTriageIssue[]) {
  const observed = issues.filter((issue) => issue.status === "observed").map((issue) => issue.id);
  const needsEvidence = issues.filter((issue) => issue.status === "needs-evidence").map((issue) => issue.id);

  if (observed.length > 0) {
    return `Observed ${observed.join(", ")}; verify sync, peers, and state artifact provenance before mining tests.`;
  }

  if (needsEvidence.length > 0) {
    return `Needs more chain evidence for ${needsEvidence.join(", ")}.`;
  }

  return "No Nockchain peer, routing-table, or block-commitment symptoms were found in the current diagnostics.";
}
