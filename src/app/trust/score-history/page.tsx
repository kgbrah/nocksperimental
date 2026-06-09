import { ArrowLeft, Code2, Gauge, TrendingUp } from "lucide-react";
import Link from "next/link";
import {
  scoreHistories,
  scoreHistoryRegistry,
  scoreHistorySummaries,
  type ScoreHistorySummary
} from "@/lib/trust-score-history";

export default function ScoreHistoryPage() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/trust">
            <ArrowLeft size={16} aria-hidden="true" />
            Trust signals
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Storage-backed score histories
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Score History</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Persisted score windows track solver quality, token compatibility, and compute
                reputation over time.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                <span>{scoreHistoryRegistry.storage.backend}</span>
                <span>{scoreHistoryRegistry.storage.source}</span>
              </div>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href="/api/trust/score-history" target="_blank" rel="noreferrer"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:px-8">
        {scoreHistorySummaries.map((summary) => {
          const history = scoreHistories.find((item) => item.id === summary.id);

          return (
            <article
              className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
              key={summary.id}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                    {summary.signalKind} / {summary.trend}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{summary.label}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
                    {summary.pointCount} points across {summary.sampleWindowDays} days from{" "}
                    {summary.storageSource}.
                  </p>
                </div>
                <div className="grid size-16 place-items-center bg-[#0B0B0B] text-2xl font-semibold text-white">
                  {summary.latestScore}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <Metric label="Latest" value={summary.latestScore.toString()} />
                <Metric label="Previous" value={summary.previousScore.toString()} />
                <Metric label="Delta" value={formatDelta(summary)} />
                <Metric label="Sparkline" value={summary.sparkline} />
              </div>

              {history ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="bg-[#0B0B0B] text-white">
                      <tr>
                        <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                          Recorded
                        </th>
                        <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                          Score
                        </th>
                        <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                          Status
                        </th>
                        <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                          Evidence
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.points.map((point) => (
                        <tr className="border-t border-[#0B0B0B] bg-white" key={point.recordedAt}>
                          <td className="px-4 py-3 font-mono text-xs">{point.recordedAt}</td>
                          <td className="px-4 py-3 font-semibold">{point.score}</td>
                          <td className="px-4 py-3">{point.status}</td>
                          <td className="break-all px-4 py-3 font-mono text-xs">
                            {point.evidenceHash}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <Gauge size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 flex items-center gap-2 break-all text-xl font-semibold">
        <TrendingUp size={16} aria-hidden="true" />
        {value}
      </p>
    </div>
  );
}

function formatDelta(summary: ScoreHistorySummary) {
  if (summary.delta > 0) {
    return `+${summary.delta}`;
  }
  return summary.delta.toString();
}
