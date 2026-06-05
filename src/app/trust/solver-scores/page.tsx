import { ArrowLeft, ArrowUpRight, Code2, Gauge, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { percentage, scoreLabel, solverScorecards } from "@/lib/trust-signals";

export default function SolverScoresPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/trust">
            <ArrowLeft size={16} aria-hidden="true" />
            Trust signals
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Solver execution-quality scoring
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Solver Scores</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                Solver scorecards turn intent replay reports into routing-quality signals.
              </p>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href="/api/trust/solver-scores"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:px-8">
        {solverScorecards.map((scorecard) => (
          <article
            className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
            key={scorecard.id}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#536023]">
                  {scorecard.status} · grade {scorecard.grade}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{scorecard.solverName}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#44443d]">
                  {scoreLabel(scorecard.score)} score from {scorecard.metrics.replayCount} replay
                  runs against {scorecard.fixtureId}.
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-3">
                <div className="grid size-16 place-items-center bg-[#171717] text-2xl font-semibold text-white">
                  {scorecard.score}
                </div>
                <Link
                  className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-white px-3 py-2 text-sm font-medium text-[#171717]"
                  href={`/trust/solver-scores/${scorecard.id}`}
                >
                  Open Detail
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <Metric label="Fill rate" value={percentage(scorecard.metrics.fillRate)} />
              <Metric label="Failure rate" value={percentage(scorecard.metrics.failureRate)} />
              <Metric label="Median settle" value={`${scorecard.metrics.medianSettlementMs}ms`} />
              <Metric label="Proof latency" value={`${scorecard.metrics.proofLatencyMs}ms`} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
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
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <Gauge size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
