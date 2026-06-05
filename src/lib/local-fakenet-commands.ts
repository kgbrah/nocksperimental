import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";

type LocalFakenetCommand = {
  id: string;
  label: string;
  command: string;
  purpose: string;
};

type LocalFakenetReportOutput = {
  id: string;
  json: string;
  markdown: string;
};

const localFakenetWalletAddress =
  "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ";
const localFakenetEndpoint = "127.0.0.1:5555";
const localFakenetRunbookPath = "/api/fakenet/runbook.sh";

const refreshSequence = [
  "npm run lab:local",
  "npm run lab:local:balance",
  "npm run lab:local:chain",
  "npm run lab:local:peek",
  "npm run lab:local:poke"
];

const reportOutputs: LocalFakenetReportOutput[] = [
  {
    id: "health",
    json: ".nocklab/local-fakenet-health.report.json",
    markdown: ".nocklab/local-fakenet-health.report.md"
  },
  {
    id: "balance",
    json: ".nocklab/local-fakenet-balance.report.json",
    markdown: ".nocklab/local-fakenet-balance.report.md"
  },
  {
    id: "chain",
    json: ".nocklab/local-fakenet-chain.report.json",
    markdown: ".nocklab/local-fakenet-chain.report.md"
  },
  {
    id: "peek",
    json: ".nocklab/local-fakenet-peek.report.json",
    markdown: ".nocklab/local-fakenet-peek.report.md"
  },
  {
    id: "poke",
    json: ".nocklab/local-fakenet-poke.report.json",
    markdown: ".nocklab/local-fakenet-poke.report.md"
  }
];

const commands: LocalFakenetCommand[] = [
  {
    id: "start-fakenet",
    label: "Start fakenet",
    command: "fakenock --start",
    purpose: "Start or resume the local fakenet process."
  },
  {
    id: "refresh-readiness",
    label: "Refresh readiness",
    command: "npm run lab:local && npm run lab:local:balance && npm run lab:local:chain",
    purpose: "Regenerate health, wallet, and chain reports."
  },
  {
    id: "refresh-adapter-steps",
    label: "Refresh adapter steps",
    command: "npm run lab:local:peek && npm run lab:local:poke",
    purpose: "Regenerate command-backed peek and poke reports."
  },
  {
    id: "check-balance",
    label: "Check balance",
    command: "fakenock --balance",
    purpose: "Read the configured fakenet wallet balance."
  },
  {
    id: "open-readiness-api",
    label: "Readiness JSON",
    command: "curl http://127.0.0.1:3000/api/fakenet",
    purpose: "Inspect the local readiness summary from the Next.js app."
  }
];

export function createLocalFakenetCommandKit() {
  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/fakenet/commands`,
    runbookUrl: `${registryCanonicalBaseUrl}${localFakenetRunbookPath}`,
    endpoint: localFakenetEndpoint,
    wallet: {
      address: localFakenetWalletAddress
    },
    shell: "WSL",
    refreshSequence,
    commands,
    reportOutputs
  };
}

export function createLocalFakenetRunbook() {
  const commandKit = createLocalFakenetCommandKit();
  const refreshCommands = commandKit.refreshSequence.map((command) => `run_step ${JSON.stringify(command)}`);
  const reportLines = commandKit.reportOutputs.map(
    (report) => `printf '  - %s\\n' ${JSON.stringify(`${report.json} and ${report.markdown}`)}`
  );

  return `#!/usr/bin/env bash
set -euo pipefail

FAKENET_ENDPOINT="${commandKit.endpoint}"
FAKENET_WALLET="${commandKit.wallet.address}"

run_step() {
  printf '\\n> %s\\n' "$*"
  bash -lc "$*"
}

printf 'Nocksperimental local fakenet runbook\\n'
printf 'Endpoint: %s\\n' "$FAKENET_ENDPOINT"
printf 'Wallet:   %s\\n' "$FAKENET_WALLET"

if ! command -v fakenock >/dev/null 2>&1; then
  printf '\\nMissing fakenock on PATH. Run this from WSL after installing the local fakenet tooling.\\n' >&2
  exit 127
fi

if [[ "\${START_FAKENET:-0}" == "1" ]]; then
  printf '\\nStarting local fakenet in the background.\\n'
  fakenock --start &
fi

printf '\\nChecking wallet balance.\\n'
fakenock --balance

printf '\\nRefreshing Nocksperimental local fakenet report artifacts.\\n'
${refreshCommands.join("\n")}

printf '\\nGenerated report files:\\n'
${reportLines.join("\n")}

printf '\\nCurrent readiness JSON:\\n'
curl http://127.0.0.1:3000/api/fakenet
printf '\\n'
`;
}
