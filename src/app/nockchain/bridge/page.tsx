import {
  AlertTriangle,
  ArrowLeft,
  Cable,
  CheckCircle2,
  Code2,
  GitBranch,
  ListChecks,
  RadioTower,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createNockchainBridgeTrace } from "@/lib/nockchain-bridge-trace";

export const dynamic = "force-dynamic";

const prioritySourceIds = [
  "bridge-withdrawals-spec",
  "bridge-runtime",
  "bridge-sequencer-crate"
] as const;

const highlightedFlowStepIds = ["sequencer-authorized"] as const;

export default function NockchainBridgePage() {
  const trace = createNockchainBridgeTrace();
  const prioritySources = trace.sourceAnchors.filter((source) =>
    prioritySourceIds.includes(source.id as (typeof prioritySourceIds)[number])
  );
  const remainingSources = trace.sourceAnchors.filter(
    (source) => !prioritySourceIds.includes(source.id as (typeof prioritySourceIds)[number])
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
                Bridge withdrawal runtime
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Bridge</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                A withdrawal execution trace for the new bridge runtime,
                sequencer authorization, journal persistence, Hoon kernel seams,
                and the default-branch-ahead-of-release state.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/bridge"
              >
                <Code2 size={16} aria-hidden="true" />
                Bridge API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/api/nockchain/watch"
              >
                <RadioTower size={16} aria-hidden="true" />
                Watch API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/api/nockchain/rust-atlas"
              >
                <GitBranch size={16} aria-hidden="true" />
                Rust Atlas
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Commit" value={trace.upstream.commit.shortSha} />
        <Metric label="Release" value={trace.releaseDrift.releaseCommitShortSha} />
        <Metric label="Sources" value={trace.sourceAnchors.length.toString()} />
        <Metric label="Released" value={String(trace.releaseDrift.latestCommitReleased)} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Release Drift</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#2F2A14]">{trace.releaseDrift.explanation}</p>
          <div className="mt-4 grid gap-3">
            <Callout label="latestCommitReleased" value={String(trace.releaseDrift.latestCommitReleased)} />
            <Callout label="releaseCommit" value={trace.releaseDrift.releaseCommitSha} />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Cable size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Priority Sources</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {prioritySources.map((source) => (
              <SourceCard source={source} key={source.id} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Withdrawal Flow</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.withdrawalFlow.map((step) => {
              const highlighted = highlightedFlowStepIds.includes(
                step.id as (typeof highlightedFlowStepIds)[number]
              );

              return (
                <div
                  className={`border border-[#0B0B0B] p-3 ${highlighted ? "bg-[#E6F4F1]" : "bg-white"}`}
                  key={step.id}
                >
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{step.id}</p>
                  <h3 className="mt-1 font-semibold">{step.actor}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{step.summary}</p>
                  <Callout label="receiptEvidence" value={step.receiptEvidence} />
                </div>
              );
            })}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Safety Invariants</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.safetyInvariants.map((item) => (
              <div className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6" key={item}>
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Code2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Additional Sources</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {remainingSources.map((source) => (
              <SourceCard source={source} key={source.id} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Receipt Fields</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {trace.receiptFields.map((field) => (
              <div className="border border-[#0B0B0B] bg-white p-3 font-mono text-sm" key={field}>
                {field}
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

function SourceCard({
  source
}: {
  source: ReturnType<typeof createNockchainBridgeTrace>["sourceAnchors"][number];
}) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{source.id}</p>
      <Callout label="path" value={source.path} />
      <Callout label="authority" value={source.authority} />
      <Callout label="role" value={source.role} />
      <Callout label="evidence" value={source.evidence} />
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
