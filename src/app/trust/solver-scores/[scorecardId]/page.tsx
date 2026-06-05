import {
  ArrowLeft,
  ArrowUpRight,
  Gauge,
  ShieldCheck,
  Workflow
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  percentage,
  scoreLabel,
  solverScorecards
} from "@/lib/trust-signals";

export const dynamic = "force-dynamic";

type SolverScoreDetailPageProps = {
  params: Promise<{
    scorecardId: string;
  }>;
};

export default async function SolverScoreDetailPage({
  params
}: SolverScoreDetailPageProps) {
  const { scorecardId } = await params;
  const scorecard = solverScorecards.find((candidate) => candidate.id === scorecardId);

  if (!scorecard) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/trust/solver-scores">
            <ArrowLeft size={16} aria-hidden="true" />
            Solver scores
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Solver Score Detail
              </p>
              <h1 className="mt-2 text-4xl font-semibold">{scorecard.solverName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                {scoreLabel(scorecard.score)} score from {scorecard.metrics.replayCount} replay
                runs against {scorecard.fixtureId}. This scorecard supports solver routing and
                execution-quality decisions.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                <span>{scorecard.status}</span>
                <span>grade {scorecard.grade}</span>
                <span>{scorecard.reportSlug}</span>
              </div>
            </div>
            <div className="grid size-20 place-items-center bg-[#171717] text-3xl font-semibold text-white">
              {scorecard.score}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-5 lg:px-8">
        <Metric label="Fill rate" value={percentage(scorecard.metrics.fillRate)} />
        <Metric label="Failure rate" value={percentage(scorecard.metrics.failureRate)} />
        <Metric label="Median settle" value={`${scorecard.metrics.medianSettlementMs}ms`} />
        <Metric label="Proof latency" value={`${scorecard.metrics.proofLatencyMs}ms`} />
        <Metric label="Replays" value={scorecard.metrics.replayCount.toString()} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Verification Actions</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/trust/solver-scores/${scorecard.id}`}
            >
              Scorecard API
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-white px-4 py-3 text-sm font-medium"
              href={`/reports/generated/${scorecard.reportSlug}`}
            >
              Generated Report
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-[#171717] px-4 py-3 text-sm font-medium text-white"
              href={`/api/reports/generated/${scorecard.reportSlug}/evidence`}
            >
              Report Evidence
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="Scorecard id" value={scorecard.id} />
            <Callout label="Solver slug" value={scorecard.solverSlug} />
            <Callout label="Report slug" value={scorecard.reportSlug} />
            <Callout label="Fixture" value={scorecard.fixtureId} />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="border border-[#242424] bg-[#fdfbf4] p-5">
          <div className="flex items-center gap-2">
            <Workflow size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Routing Quality</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="Status" value={scorecard.status} />
            <Callout label="Grade" value={scorecard.grade} />
            <Callout label="Score label" value={scoreLabel(scorecard.score)} />
            <Callout label="Replay sample" value={scorecard.metrics.replayCount.toString()} />
          </div>
        </article>

        <article className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Signals</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {scorecard.signals.map((signal) => (
              <div className="border border-[#8b8b7a] bg-white p-3" key={signal}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck size={15} aria-hidden="true" />
                  {signal}
                </div>
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
    <div className="border border-[#242424] bg-[#fdfbf4] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <Gauge size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-all text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#3f3f38]">{value}</p>
    </div>
  );
}
