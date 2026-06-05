import { createLocalFakenetCommandKit } from "@/lib/local-fakenet-commands";
import { createLocalFakenetReadiness } from "@/lib/local-fakenet-readiness";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";

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
