import path from "node:path";
import { createLocalFakenetDiagnostics } from "@/lib/local-fakenet-diagnostics";
import { createLocalFakenetReadiness } from "@/lib/local-fakenet-readiness";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";

type LocalFakenetEvidenceOptions = {
  rootDir?: string;
};

type LocalFakenetEvidenceVerificationInput = {
  generatedAt: string;
  reportIds: string[];
  grpcEndpoint?: string | null;
  walletAddress?: string | null;
  blockCommitment?: string | null;
};

export function createLocalFakenetEvidenceCapsule(
  options: LocalFakenetEvidenceOptions = {}
) {
  const readiness = createLocalFakenetReadiness(options);
  const diagnostics = createLocalFakenetDiagnostics(options);
  const noBlockers = diagnostics.diagnostics.every((diagnostic) => diagnostic.severity !== "blocker");
  const checks = {
    reportsAvailable: readiness.reportCount > 0,
    healthReportFound: readiness.checks.health !== "missing",
    balanceReportFound: readiness.checks.balance !== "missing",
    chainReportFound: readiness.checks.chain !== "missing",
    noBlockers,
    endpointPresent: Boolean(readiness.endpoint),
    walletAddressPresent: Boolean(readiness.wallet.address)
  };

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/fakenet/evidence`,
    evidenceId: `local_fakenet_evidence_${readiness.generatedAt.replace(/[-:.TZ]/g, "")}`,
    generatedAt: readiness.generatedAt,
    status: readiness.status,
    summary: {
      status: readiness.status,
      reportCount: readiness.reportCount,
      artifactCount: readiness.reports.length,
      activeDiagnostics: diagnostics.activeCount,
      endpoint: readiness.endpoint,
      walletAddress: readiness.wallet.address
    },
    readiness: {
      status: readiness.status,
      checks: readiness.checks,
      failures: readiness.failures,
      wallet: readiness.wallet,
      chain: readiness.chain
    },
    diagnostics: {
      activeCount: diagnostics.activeCount,
      diagnostics: diagnostics.diagnostics
    },
    verifier: {
      ready: readiness.status === "ready" && Object.values(checks).every(Boolean),
      checks,
      inputs: {
        generatedAt: readiness.generatedAt,
        grpcEndpoint: readiness.endpoint,
        walletAddress: readiness.wallet.address,
        balanceAmount: readiness.wallet.amount,
        balanceUnit: readiness.wallet.unit,
        chainHeight: readiness.chain.height,
        peerCount: readiness.chain.peerCount,
        blockId: readiness.chain.blockId,
        blockCommitment: readiness.chain.blockCommitment,
        reportIds: readiness.reports.map((report) => report.reportId)
      }
    },
    artifacts: {
      reportDir: readiness.reportDir,
      reports: readiness.reports.map((report) => ({
        appSlug: report.appSlug,
        fixtureId: report.fixtureId,
        reportId: report.reportId,
        generatedAt: report.generatedAt,
        status: report.status,
        sourcePath: displayPath(report.path)
      }))
    },
    links: {
      readiness: `${registryCanonicalBaseUrl}/api/fakenet`,
      diagnostics: `${registryCanonicalBaseUrl}/api/fakenet/diagnostics`,
      commands: `${registryCanonicalBaseUrl}/api/fakenet/commands`,
      supportBundle: `${registryCanonicalBaseUrl}/api/fakenet/support-bundle`,
      supportMarkdown: `${registryCanonicalBaseUrl}/api/fakenet/support-bundle.md`,
      runbook: `${registryCanonicalBaseUrl}/api/fakenet/runbook.sh`
    }
  };
}

export function verifyLocalFakenetEvidenceCapsule(
  input: LocalFakenetEvidenceVerificationInput,
  options: LocalFakenetEvidenceOptions = {}
) {
  const capsule = createLocalFakenetEvidenceCapsule(options);
  const generatedAtMatched = capsule.generatedAt === input.generatedAt;
  const reportIdsMatched =
    input.reportIds.length > 0 &&
    input.reportIds.every((reportId) => capsule.verifier.inputs.reportIds.includes(reportId));
  const grpcEndpointMatched = input.grpcEndpoint
    ? capsule.verifier.inputs.grpcEndpoint === input.grpcEndpoint
    : true;
  const walletAddressMatched = input.walletAddress
    ? capsule.verifier.inputs.walletAddress === input.walletAddress
    : true;
  const blockCommitmentMatched = input.blockCommitment
    ? capsule.verifier.inputs.blockCommitment === input.blockCommitment
    : true;
  const exactInputMatch =
    generatedAtMatched &&
    reportIdsMatched &&
    grpcEndpointMatched &&
    walletAddressMatched &&
    blockCommitmentMatched;

  return {
    version: "v0",
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/fakenet/evidence/verify`,
    verified: exactInputMatch && capsule.verifier.ready,
    query: {
      generatedAt: input.generatedAt,
      reportIds: input.reportIds,
      grpcEndpoint: input.grpcEndpoint ?? null,
      walletAddress: input.walletAddress ?? null,
      blockCommitment: input.blockCommitment ?? null
    },
    checks: {
      generatedAtProvided: input.generatedAt.length > 0,
      reportIdsProvided: input.reportIds.length > 0,
      generatedAtMatched,
      reportIdsMatched,
      grpcEndpointMatched,
      walletAddressMatched,
      blockCommitmentMatched,
      exactInputMatch,
      evidenceReady: capsule.verifier.ready,
      localEvidenceAvailable: capsule.summary.reportCount > 0
    },
    match: exactInputMatch
      ? {
          evidenceId: capsule.evidenceId,
          generatedAt: capsule.generatedAt,
          status: capsule.status,
          reportCount: capsule.summary.reportCount,
          activeDiagnostics: capsule.summary.activeDiagnostics,
          reportIds: capsule.verifier.inputs.reportIds,
          links: {
            evidence: capsule.canonicalUrl,
            supportBundle: capsule.links.supportBundle,
            runbook: capsule.links.runbook
          }
        }
      : null
  };
}

function displayPath(filePath: string) {
  const relativePath = path.relative(process.cwd(), filePath);

  if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
    return relativePath;
  }

  return filePath;
}
