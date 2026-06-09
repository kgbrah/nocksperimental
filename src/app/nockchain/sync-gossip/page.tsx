import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Code2,
  GitBranch,
  ListChecks,
  RadioTower,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createNockchainSyncGossipTrace } from "@/lib/nockchain-sync-gossip-trace";

export const dynamic = "force-dynamic";

const priorityScenarioIds = [
  "wrong-block-commitment-while-catching-up",
  "empty-routing-table-with-quiet-node",
  "miner-output-not-gossiped"
] as const;
const prioritySourceAnchorIds = ["catch-up-signal", "driver-gossip-effect"] as const;

export default function NockchainSyncGossipPage() {
  const trace = createNockchainSyncGossipTrace();
  const priorityScenarios = priorityScenarioIds
    .map((id) => trace.triageScenarios.find((scenario) => scenario.id === id))
    .filter((scenario): scenario is NonNullable<typeof scenario> => Boolean(scenario));
  const remainingScenarios = trace.triageScenarios.filter(
    (scenario) => !priorityScenarioIds.includes(scenario.id as (typeof priorityScenarioIds)[number])
  );
  const orderedSourceAnchors = trace.sourceAnchors
    .filter((anchor) => prioritySourceAnchorIds.includes(anchor.id as (typeof prioritySourceAnchorIds)[number]))
    .concat(
      trace.sourceAnchors.filter(
        (anchor) => !prioritySourceAnchorIds.includes(anchor.id as (typeof prioritySourceAnchorIds)[number])
      )
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
                Source-level sync trace
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain Sync/Gossip</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                A source-anchored read of the latest Nockchain libp2p catch-up gate:
                when a node is behind tip, the driver intentionally suppresses
                outbound gossip so wrong commitments, quiet mining output, and peer
                symptoms can be interpreted with sync context attached.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/sync-gossip" target="_blank" rel="noreferrer"
              >
                <Code2 size={16} aria-hidden="true" />
                Sync API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/watch"
              >
                <RadioTower size={16} aria-hidden="true" />
                Watch
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/api/nockchain/zorp" target="_blank" rel="noreferrer"
              >
                <GitBranch size={16} aria-hidden="true" />
                Zorp Map
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Commit" value={trace.upstream.commit.shortSha} />
        <Metric label="Anchors" value={trace.sourceAnchors.length.toString()} />
        <Metric label="Scenarios" value={trace.triageScenarios.length.toString()} />
        <Metric label="Crate" value={trace.upstream.crate} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Priority Triage</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {priorityScenarios.map((scenario) => (
              <ScenarioCard scenario={scenario} key={scenario.id} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Behavior Invariants</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.behaviorInvariants.map((invariant) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={invariant.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {invariant.id}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{invariant.rule}</p>
                <Callout label="sourceAnchorIds" value={invariant.sourceAnchorIds.join(", ")} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Code2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Source Anchors</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {orderedSourceAnchors.map((anchor) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={anchor.id}>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {anchor.id}
                </p>
                <Callout label="file" value={anchor.file} />
                <Callout label="symbol" value={anchor.symbol} />
                <Callout label="role" value={anchor.role} />
                <Callout label="evidence" value={anchor.evidence} />
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
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
          <div className="mt-5 grid gap-3">
            <Callout label="verificationStatus" value={trace.localVerification.status} />
            <Callout
              label="attemptedCommand"
              value={trace.localVerification.attemptedCommands.join(" && ")}
            />
            <Callout label="result" value={trace.localVerification.result} />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <RadioTower size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Additional Scenarios</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {remainingScenarios.map((scenario) => (
              <ScenarioCard scenario={scenario} key={scenario.id} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Operator Checklist</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {trace.operatorChecklist.map((item) => (
              <div className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6" key={item}>
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            <Callout label="watch" value={trace.links.watch} />
            <Callout label="operations" value={trace.links.operations} />
            <Callout label="zorpMap" value={trace.links.zorpMap} />
            <Callout label="stateJams" value={trace.links.stateJams} />
            <Callout label="commit" value={trace.links.commit} />
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

function ScenarioCard({
  scenario
}: {
  scenario: ReturnType<typeof createNockchainSyncGossipTrace>["triageScenarios"][number];
}) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{scenario.id}</p>
      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{scenario.symptom}</p>
      <Callout label="likelyMeaning" value={scenario.likelyMeaning} />
      <Callout label="firstChecks" value={scenario.firstChecks.join(", ")} />
      <Callout label="nextAction" value={scenario.nextAction} />
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
