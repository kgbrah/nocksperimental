import {
  AlertTriangle,
  ArrowLeft,
  Code2,
  KeyRound,
  ListChecks,
  RadioTower,
  ShieldAlert,
  ShieldCheck,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { createNockchainWalletAtlas } from "@/lib/nockchain-wallet-atlas";

export const dynamic = "force-dynamic";

const priorityCommandIds = ["show-balance", "list-notes", "list-notes-by-address", "watch-address"];
const priorityScenarioIds = [
  "balance-unknown",
  "watch-only-missing",
  "private-grpc-unreachable",
  "public-api-exposure-risk"
];
const secretSafetyAnchors = ["seed phrases", "private keys", "keys.export"];

export default function NockchainWalletPage() {
  const atlas = createNockchainWalletAtlas();
  const priorityCommands = priorityCommandIds
    .map((id) => atlas.walletCommands.find((command) => command.id === id))
    .filter((command): command is NonNullable<typeof command> => Boolean(command));
  const remainingCommands = atlas.walletCommands.filter(
    (command) => !priorityCommandIds.includes(command.id)
  );
  const priorityScenarios = priorityScenarioIds
    .map((id) => atlas.triageScenarios.find((scenario) => scenario.id === id))
    .filter((scenario): scenario is NonNullable<typeof scenario> => Boolean(scenario));
  const remainingScenarios = atlas.triageScenarios.filter(
    (scenario) => !priorityScenarioIds.includes(scenario.id)
  );

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/nockchain">
            <ArrowLeft size={16} aria-hidden="true" />
            Nockchain evidence
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Wallet and API evidence
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Wallet</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Wallet command, endpoint mode, fakenet balance, watch-only,
                public API exposure, and key-material safety context for
                Nocksperimental receipts.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/wallet"
              >
                <Code2 size={16} aria-hidden="true" />
                Wallet API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/api/fakenet/commands"
              >
                <Wallet size={16} aria-hidden="true" />
                Fakenet Commands
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Build" value={atlas.upstream.commit.shortSha} />
        <Metric label="Commands" value={atlas.walletCommands.length.toString()} />
        <Metric label="Endpoint Modes" value={atlas.endpointModes.length.toString()} />
        <Metric label="Unit" value={atlas.balanceEvidenceContract.preferredUnits} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Wallet size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Balance Commands</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {priorityCommands.map((command) => (
              <CommandCard command={command} key={command.id} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Wallet Triage</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {priorityScenarios.map((scenario) => (
              <ScenarioCard scenario={scenario} key={scenario.id} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <RadioTower size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Endpoint Modes</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {atlas.endpointModes.map((mode) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={mode.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {mode.id}
                </p>
                <h3 className="mt-1 font-semibold">{mode.label}</h3>
                <Callout label="endpoint" value={mode.endpoint} />
                <Callout label="commandPattern" value={mode.commandPattern} />
                <Callout label="risk" value={mode.riskNotes.join(", ")} />
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Balance Evidence Contract</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="walletAddress" value={atlas.localFakenetProfile.walletAddress} />
            <Callout label="endpoint" value={atlas.localFakenetProfile.endpoint} />
            <Callout label="conversion" value={atlas.balanceEvidenceContract.conversion} />
            <Callout label="requiredFields" value={atlas.balanceEvidenceContract.requiredFields.join(", ")} />
            <Callout label="receiptRule" value={atlas.balanceEvidenceContract.receiptRule} />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <KeyRound size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Local Fakenet Profile</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="localWrapper" value={atlas.localFakenetProfile.commands.join(", ")} />
            <Callout
              label="upstreamEquivalents"
              value={atlas.localFakenetProfile.upstreamEquivalentCommands.join(", ")}
            />
            <Callout label="evidenceUse" value={atlas.localFakenetProfile.evidenceUse} />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Safety Boundary</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="secretAnchors" value={secretSafetyAnchors.join(", ")} />
            <Callout label="doNotStore" value={atlas.safety.doNotStore.join(", ")} />
            <Callout label="safeWithHashing" value={atlas.safety.safeToStoreWithHashing.join(", ")} />
            <Callout label="publicApiWarnings" value={atlas.safety.publicApiWarnings.join(", ")} />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Wallet size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Additional Commands</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {remainingCommands.map((command) => (
              <CommandCard command={command} key={command.id} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Additional Scenarios</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {remainingScenarios.map((scenario) => (
              <ScenarioCard scenario={scenario} key={scenario.id} />
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <ShieldCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-all text-2xl font-semibold">{value}</div>
    </div>
  );
}

function CommandCard({
  command
}: {
  command: ReturnType<typeof createNockchainWalletAtlas>["walletCommands"][number];
}) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{command.id}</p>
      <h3 className="mt-1 font-semibold">{command.command}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{command.description}</p>
      <Callout label="evidenceUse" value={command.evidenceUse} />
      <Callout label="risk" value={command.risk} />
    </div>
  );
}

function ScenarioCard({
  scenario
}: {
  scenario: ReturnType<typeof createNockchainWalletAtlas>["triageScenarios"][number];
}) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{scenario.id}</p>
      <h3 className="mt-1 font-semibold">{scenario.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{scenario.interpretation}</p>
      <Callout label="symptom" value={scenario.symptom} />
      <Callout label="checks" value={scenario.checks.join(", ")} />
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 border border-[#0B0B0B] bg-white p-3 first:mt-0">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
