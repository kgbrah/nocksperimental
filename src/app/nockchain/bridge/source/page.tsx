import {
  ArrowLeft,
  Code2,
  ExternalLink,
  Fingerprint,
  GitPullRequest,
  ListChecks,
  Network,
  RadioTower,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createNockchainBridgeSourceTrace } from "@/lib/nockchain-bridge-source-trace";

export const dynamic = "force-dynamic";

const priorityAnchorIds = [
  "bridge-withdrawals-spec",
  "runtime-loop-bootstrap",
  "execution-driver-effects",
  "assembly-tick",
  "submission-tick",
  "public-submitter",
  "confirmation-loop",
  "orphan-retry-loop",
  "sequencer-rpc-service",
  "sequencer-store",
  "sequencer-journal",
  "bridge-dev-scenario-readme",
  "bridge-dev-withdrawal-scenarios"
] as const;
const highlightedForbiddenFields = [
  "rawTransactionJam",
  "sequencerJournalSigningKey",
  "tenderlyAccessKey",
  "r2TestToken"
] as const;
const highlightedForbiddenFieldSet = new Set<string>(highlightedForbiddenFields);
const bridgePrLabel = "PR #127";

export default function NockchainBridgeSourcePage() {
  const trace = createNockchainBridgeSourceTrace();
  const orderedAnchors = priorityAnchorIds
    .map((id) => trace.sourceAnchors.find((anchor) => anchor.id === id))
    .filter((anchor): anchor is NonNullable<typeof anchor> => Boolean(anchor))
    .concat(
      trace.sourceAnchors.filter(
        (anchor) => !priorityAnchorIds.includes(anchor.id as (typeof priorityAnchorIds)[number])
      )
    );
  const orderedForbiddenFields: readonly string[] = [
    ...highlightedForbiddenFields.filter((field) =>
      trace.sourceTraceContract.forbiddenFields.includes(field)
    ),
    ...trace.sourceTraceContract.forbiddenFields.filter(
      (field) => !highlightedForbiddenFieldSet.has(field)
    )
  ];
  const bridgePr = trace.upstreamSignals.find((signal) => signal.prNumber === 127);
  const scenarioContract = trace.externalScenarioEvidenceContract;

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/nockchain/bridge">
            <ArrowLeft size={16} aria-hidden="true" />
            Bridge trace
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Rust execution source
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Bridge Source Trace</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Commit-pinned Rust and bridge-doc anchors for the current
                withdrawal path: kernel effects, proposal assembly, sequencer
                authorization, public Nockchain submission, confirmation polling,
                orphan retry, journal continuity, kernel reconciliation, and
                opt-in bridge-dev scenario evidence.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/bridge-source" target="_blank" rel="noreferrer"
              >
                <Code2 size={16} aria-hidden="true" />
                Source API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/bridge"
              >
                <Network size={16} aria-hidden="true" />
                Bridge Trace
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Commit" value={trace.upstream.commit.shortSha} />
        <Metric label="Source Anchors" value={trace.sourceAnchors.length.toString()} />
        <Metric label="Execution Flow" value={trace.executionFlow.length.toString()} />
        <Metric label="Signals" value={trace.upstreamSignals.length.toString()} />
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
                <h3 className="mt-1 font-semibold">{anchor.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                  {anchor.evidenceBoundary}
                </p>
                <Callout label="file" value={anchor.upstreamFile} />
                <Callout label="symbols" value={anchor.upstreamSymbols.join(", ")} />
                <Callout label="lineRange" value={anchor.lineRange} />
                <Callout label="receiptFields" value={anchor.receiptFields.join(", ")} />
                <a
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium"
                  href={anchor.upstreamUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  Upstream source
                </a>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Execution Flow</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.executionFlow.map((step) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={step.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {step.id}
                </p>
                <h3 className="mt-1 font-semibold">{step.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{step.interpretation}</p>
                <Callout label="sourceAnchorId" value={step.sourceAnchorId} />
                <Callout label="receiptImplication" value={step.receiptImplication} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Trace Contract</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout
              label="required"
              value={trace.sourceTraceContract.requiredFields.join(", ")}
            />
            <Callout label="forbidden" value={orderedForbiddenFields.join(", ")} />
            {trace.sourceTraceContract.interpretationRules.map((rule) => (
              <Callout key={rule} label="rule" value={rule} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Operator Invariants</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.operatorInvariants.map((item) => (
              <div className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6" key={item}>
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">External Scenario Contract</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="command" value={scenarioContract.command} />
            <Callout label="buildCommand" value={scenarioContract.buildCommand} />
            <Callout label="requiredEnv" value={scenarioContract.requiredEnv.join(", ")} />
            <Callout label="optionalEnv" value={scenarioContract.optionalEnv.join(", ")} />
            <Callout label="r2Env" value={scenarioContract.r2Env.join(", ")} />
            <Callout label="scenarioIds" value={scenarioContract.scenarioIds.join(", ")} />
            <Callout
              label="receiptSafeFields"
              value={scenarioContract.receiptSafeFields.join(", ")}
            />
            <Callout label="forbiddenFields" value={scenarioContract.forbiddenFields.join(", ")} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {scenarioContract.interpretationRules.map((rule) => (
              <div className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6" key={rule}>
                {rule}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <GitPullRequest size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Upstream Signals</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {bridgePr ? (
              <div className="border border-[#0B0B0B] bg-white p-3">
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {bridgePrLabel}
                </p>
                <h3 className="mt-1 font-semibold">{bridgePr.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{bridgePr.relevance}</p>
                <Callout label="status" value={bridgePr.status} />
              </div>
            ) : null}
            {trace.upstreamSignals
              .filter((signal) => signal.prNumber !== 127)
              .map((signal) => (
                <Callout
                  key={signal.prNumber}
                  label={`PR #${signal.prNumber}`}
                  value={`${signal.title}: ${signal.relevance}`}
                />
              ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Fingerprint size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Evidence Links</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="bridgeTrace" value={trace.links.bridgeTrace} />
            <Callout label="rustAtlas" value={trace.links.rustAtlas} />
            <Callout label="sourceDriftCheck" value={trace.sourceDriftCheck.command} />
            <Callout label="bridgePr127" value={trace.links.bridgePr127} />
            <Callout label="bridgeDevScenarios" value={trace.links.bridgeDevScenarios} />
            <Callout label="bridgeDocs" value={trace.links.bridgeDocs} />
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <RadioTower size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Next Uses</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {trace.nocksperimentalNextUses.map((item) => (
              <div className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6" key={item}>
                {item}
              </div>
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
    <div className="mt-3 border border-[#0B0B0B] bg-white p-3 first:mt-0">
      <div className="break-all font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        {label}
      </div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
