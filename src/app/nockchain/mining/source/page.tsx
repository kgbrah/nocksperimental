import {
  ArrowLeft,
  Cable,
  Code2,
  Cpu,
  Gauge,
  ListChecks,
  Pickaxe,
  RadioTower,
  ShieldAlert,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { createNockchainMiningSourceTrace } from "@/lib/nockchain-mining-source-trace";

export const dynamic = "force-dynamic";

const priorityAnchorIds = [
  "fakenet-miner-script",
  "node-fakenet-script",
  "mainnet-miner-script",
  "mining-cli-flags",
  "fakenet-constants-poke",
  "fakenet-blockchain-constants",
  "mining-driver-bootstrap",
  "mining-wire-contract",
  "candidate-effect-handler",
  "mined-pow-poke",
  "miner-kernel-pow-check",
  "pow-library",
  "candidate-block-state",
  "structured-miner-traces",
  "libp2p-request-pow-separation"
] as const;
const highlightedCapabilityIds = [
  "operator-fakenet-miner-command",
  "fakenet-difficulty-controls",
  "proof-kernel-validation",
  "network-pow-separation"
] as const;
const highlightedSymbols = [
  "MiningWire::Candidate",
  "set-mining-key-advanced",
  "enable-mining",
  "check-target:mine",
  "new_heaviest_miner"
] as const;
const highlightedReceiptFields = ["miningPkh", "fakenetPowLen", "candidatePowLen"] as const;
const highlightedForbiddenFields = ["rawMinerJam", "rawPowProof", "walletSeedPhrase"] as const;
const highlightedModes = ["local-fakenet-hub", "local-fakenet-miner", "mainnet-miner"] as const;
const highlightedDiagnostics = ["wrong-block-commitment", "empty-routing-table"] as const;
const highlightedVerificationCommands = [
  "cargo check -p nockchain",
  "cargo check -p kernels-open-miner"
] as const;

export default function NockchainMiningSourcePage() {
  const trace = createNockchainMiningSourceTrace();
  const orderedAnchors = priorityAnchorIds
    .map((id) => trace.sourceAnchors.find((anchor) => anchor.id === id))
    .filter((anchor): anchor is NonNullable<typeof anchor> => Boolean(anchor));
  const orderedCapabilities = highlightedCapabilityIds
    .map((id) => trace.miningCapabilities.find((capability) => capability.id === id))
    .filter((capability): capability is NonNullable<typeof capability> => Boolean(capability));

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
                Mining and PoW provenance
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Mining/PoW Source Trace</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Source anchors for fakenet miner commands, mining public-key-hash
                configuration, candidate block refresh, miner-kernel proof checks,
                fakenet difficulty controls, structured miner traces, and network PoW
                separation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/mining-source"
              >
                <Code2 size={16} aria-hidden="true" />
                Source API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/operations"
              >
                <Terminal size={16} aria-hidden="true" />
                Operations
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/sync-gossip"
              >
                <RadioTower size={16} aria-hidden="true" />
                Sync/Gossip
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Commit" value={trace.upstream.commit.shortSha} />
        <Metric label="Anchors" value={trace.sourceAnchors.length.toString()} />
        <Metric label="Capabilities" value={trace.miningCapabilities.length.toString()} />
        <Metric label="Modes" value={trace.operationalModes.length.toString()} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Pickaxe size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Source Anchors</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {orderedAnchors.map((anchor) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={anchor.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {anchor.id}
                </p>
                <Callout label="file" value={anchor.file} />
                <Callout label="symbols" value={anchor.symbols.join(", ")} />
                <Callout label="lineRange" value={anchor.lineRange} />
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{anchor.role}</p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{anchor.evidence}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Gauge size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Mining Capabilities</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {orderedCapabilities.map((capability) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={capability.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {capability.id}
                </p>
                <h3 className="mt-1 font-semibold">{capability.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                  {capability.interpretation}
                </p>
                <Callout label="sourceAnchorIds" value={capability.sourceAnchorIds.join(", ")} />
                <Callout label="receiptFields" value={capability.receiptFields.join(", ")} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Receipt Contract</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {trace.receiptContract.requiredFields.map((field) => (
              <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-xs" key={field}>
                {field}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            {highlightedReceiptFields.map((field) => (
              <Callout key={field} label="highlightedField" value={field} />
            ))}
            {trace.receiptContract.interpretationRules.map((rule) => (
              <Callout key={rule} label="interpretationRule" value={rule} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Cable size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Operational Modes</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {highlightedModes.map((mode) => (
              <Callout key={mode} label="highlightedMode" value={mode} />
            ))}
            {trace.operationalModes.map((mode) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={mode.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {mode.id}
                </p>
                <h3 className="mt-1 font-semibold">{mode.label}</h3>
                <Callout label="commandSource" value={mode.commandSource} />
                <Callout label="expectedSignals" value={mode.expectedSignals.join(", ")} />
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{mode.receiptUse}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Cpu size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Diagnostic Scenarios</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {highlightedDiagnostics.map((diagnostic) => (
              <Callout key={diagnostic} label="highlightedDiagnostic" value={diagnostic} />
            ))}
            {trace.diagnosticScenarios.map((scenario) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={scenario.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {scenario.id}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{scenario.symptom}</p>
                <Callout label="requiredReceiptFields" value={scenario.requiredReceiptFields.join(", ")} />
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{scenario.operatorAction}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Local Verification</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="status" value={trace.localVerification.status} />
            <Callout label="inspectedSourceCommit" value={trace.localVerification.inspectedSourceCommit} />
            {highlightedVerificationCommands.map((command) => (
              <Callout key={command} label="highlightedCommand" value={command} />
            ))}
            {trace.localVerification.recommendedCommands.map((command) => (
              <Callout key={command} label="command" value={command} />
            ))}
            {highlightedSymbols.map((symbol) => (
              <Callout key={symbol} label="symbol" value={symbol} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Forbidden Evidence</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {trace.receiptContract.forbiddenFields.map((field) => (
              <Callout key={field} label="forbiddenField" value={field} />
            ))}
            {highlightedForbiddenFields.map((field) => (
              <Callout key={field} label="highlightedForbidden" value={field} />
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
        <Pickaxe size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-all text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 border border-[#0B0B0B] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
