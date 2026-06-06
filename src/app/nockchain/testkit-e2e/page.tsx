import {
  ArrowLeft,
  Boxes,
  Code2,
  FileJson,
  GitBranch,
  ListChecks,
  RadioTower,
  ShieldCheck,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { createNockchainTestkitE2eTrace } from "@/lib/nockchain-testkit-e2e-trace";

export const dynamic = "force-dynamic";

const priorityAnchorIds = [
  "scenario-yaml-schema",
  "runner-scenario-lifecycle",
  "node-manager-process-docker",
  "node-command-args",
  "grpc-readiness-height",
  "grpc-transaction-lifecycle",
  "private-poke-mining-controls",
  "report-json-contract",
  "peer-speedup-report",
  "upgrade-cluster-harness",
  "nous-gen2-scenarios"
] as const;
const highlightedCapabilityIds = [
  "process-and-docker-nodes",
  "wallet-command-capture-and-retry",
  "transaction-accepted-and-in-block",
  "partition-reorg-and-upgrade",
  "gen2-req-res-peer-speedup"
] as const;
const highlightedSymbols = [
  "Scenario::load_from_path",
  "NodeManager::start_nodes",
  "submit_raw_tx",
  "wait_for_tx_in_block",
  "Report::write_json",
  "NockchainCluster"
] as const;
const highlightedReceiptFields = [
  "scenarioName",
  "scenarioSeed",
  "nodeMode",
  "stepRecords",
  "assertOutcomes",
  "artifactHash"
] as const;
const highlightedForbiddenFields = [
  "walletSeedPhrase",
  "rawWalletExport",
  "rawStateJam",
  "rawTransactionPayload"
] as const;
const highlightedVerificationCommands = ["cargo check -p nockchain-e2e"] as const;

export default function NockchainTestkitE2ePage() {
  const trace = createNockchainTestkitE2eTrace();
  const orderedAnchors = priorityAnchorIds
    .map((id) => trace.sourceAnchors.find((anchor) => anchor.id === id))
    .filter((anchor): anchor is NonNullable<typeof anchor> => Boolean(anchor));
  const orderedCapabilities = highlightedCapabilityIds
    .map((id) => trace.scenarioCapabilities.find((capability) => capability.id === id))
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
                Scenario evidence source map
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Testkit/E2E Trace</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Upstream source anchors for YAML scenarios, process and Docker node orchestration,
                gRPC readiness, transaction lifecycle checks, report JSON, gen2 peer-speedup, and
                upgrade harness behavior.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/testkit-e2e"
              >
                <Code2 size={16} aria-hidden="true" />
                Testkit API
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
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/runtime-safety"
              >
                <ShieldCheck size={16} aria-hidden="true" />
                Runtime Safety
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Commit" value={trace.upstream.commit.shortSha} />
        <Metric label="Anchors" value={trace.sourceAnchors.length.toString()} />
        <Metric label="Capabilities" value={trace.scenarioCapabilities.length.toString()} />
        <Metric label="Crates" value={trace.upstream.crateSurfaces.join(", ")} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Code2 size={18} aria-hidden="true" />
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

        <article className="border border-[#0B0B0B] bg-[#EAF8F0] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Boxes size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Scenario Capabilities</h2>
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
            <FileJson size={18} aria-hidden="true" />
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
            {trace.receiptContract.reviewRules.map((rule) => (
              <Callout key={rule} label="reviewRule" value={rule} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Nocksperimental Implications</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.nocksperimentalImplications.map((implication) => (
              <div className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6" key={implication}>
                {implication}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
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
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <GitBranch size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Forbidden Evidence</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.receiptContract.forbiddenFields.map((field) => (
              <Callout key={field} label="forbiddenField" value={field} />
            ))}
            {highlightedForbiddenFields.map((field) => (
              <Callout key={field} label="highlightedForbidden" value={field} />
            ))}
            {highlightedSymbols.map((symbol) => (
              <Callout key={symbol} label="symbol" value={symbol} />
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

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 border border-[#0B0B0B] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
