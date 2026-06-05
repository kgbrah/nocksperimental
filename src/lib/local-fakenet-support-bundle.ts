import { createLocalFakenetCommandKit } from "@/lib/local-fakenet-commands";
import { createLocalFakenetDiagnostics } from "@/lib/local-fakenet-diagnostics";
import { createLocalFakenetReadiness } from "@/lib/local-fakenet-readiness";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";

type LocalFakenetSupportBundleOptions = {
  rootDir?: string;
};

export function createLocalFakenetSupportBundle(
  options: LocalFakenetSupportBundleOptions = {}
) {
  const readiness = createLocalFakenetReadiness(options);
  const diagnostics = createLocalFakenetDiagnostics(options);
  const commandKit = createLocalFakenetCommandKit();
  const nextCommands = uniqueCommands(
    diagnostics.diagnostics.map((diagnostic) => diagnostic.command).filter(Boolean)
  );

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/fakenet/support-bundle`,
    bundleId: `local_fakenet_${readiness.generatedAt.replace(/[-:.TZ]/g, "")}`,
    generatedAt: readiness.generatedAt,
    summary: {
      status: readiness.status,
      reportCount: readiness.reportCount,
      activeDiagnostics: diagnostics.activeCount,
      endpoint: readiness.endpoint,
      walletAddress: readiness.wallet.address
    },
    readiness,
    diagnostics,
    commandKit,
    artifacts: {
      reportDir: readiness.reportDir,
      reports: readiness.reports,
      reportOutputs: commandKit.reportOutputs
    },
    nextCommands,
    links: {
      readiness: `${registryCanonicalBaseUrl}/api/fakenet`,
      commands: `${registryCanonicalBaseUrl}/api/fakenet/commands`,
      diagnostics: `${registryCanonicalBaseUrl}/api/fakenet/diagnostics`,
      runbook: commandKit.runbookUrl
    }
  };
}

export function createLocalFakenetSupportBundleMarkdown(
  options: LocalFakenetSupportBundleOptions = {}
) {
  const bundle = createLocalFakenetSupportBundle(options);
  const diagnostics = bundle.diagnostics.diagnostics
    .map(
      (diagnostic) => [
        `### ${diagnostic.title}`,
        "",
        `- Severity: \`${diagnostic.severity}\``,
        `- Evidence: ${diagnostic.evidence}`,
        `- Action: ${diagnostic.action}`,
        "",
        "```bash",
        diagnostic.command,
        "```"
      ].join("\n")
    )
    .join("\n\n");
  const commands = bundle.nextCommands
    .map((command) => ["```bash", command, "```"].join("\n"))
    .join("\n\n");
  const artifacts = bundle.artifacts.reports.length === 0
    ? "- No generated local fakenet reports were found."
    : bundle.artifacts.reports
        .map((report) => `- \`${report.appSlug}\` ${report.status}: \`${report.path}\``)
        .join("\n");

  return [
    "# Local Fakenet Support Bundle",
    "",
    `- Bundle: \`${bundle.bundleId}\``,
    `- Status: \`${bundle.summary.status}\``,
    `- Active diagnostics: \`${bundle.summary.activeDiagnostics}\``,
    `- Report count: \`${bundle.summary.reportCount}\``,
    `- Endpoint: \`${bundle.summary.endpoint ?? "missing"}\``,
    `- Wallet: \`${bundle.summary.walletAddress ?? "missing"}\``,
    `- Generated: \`${bundle.generatedAt}\``,
    "",
    "## Diagnostics",
    "",
    diagnostics,
    "",
    "## Next Commands",
    "",
    commands,
    "",
    "## Report Artifacts",
    "",
    artifacts,
    "",
    "## Links",
    "",
    `- JSON bundle: ${bundle.canonicalUrl}`,
    `- Readiness: ${bundle.links.readiness}`,
    `- Diagnostics: ${bundle.links.diagnostics}`,
    `- Commands: ${bundle.links.commands}`,
    `- Runbook: ${bundle.links.runbook}`,
    ""
  ].join("\n");
}

function uniqueCommands(commands: string[]) {
  return Array.from(new Set(commands));
}
