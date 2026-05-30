import { ArrowLeft, Code2, FileClock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { reportHistory, reportStages, stageLabel } from "@/lib/report-history";

export default function ReportHistoryPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Lab dashboard
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Hosted report history
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Report History</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                Private workspace report records across launch, audit, upgrade, and integration
                stages.
              </p>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href="/api/history"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:grid-cols-4 lg:px-8">
        {reportStages.map((stage) => (
          <Metric
            key={stage}
            label={stageLabel(stage)}
            value={reportHistory.filter((report) => report.stage === stage).length.toString()}
          />
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <div className="grid gap-4">
          {reportHistory.map((report) => (
            <article
              className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
              key={report.id}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-[#242424] bg-[#e8ead7] px-2 py-1 font-mono text-xs uppercase">
                      {stageLabel(report.stage)}
                    </span>
                    <span className="border border-[#242424] bg-white px-2 py-1 font-mono text-xs uppercase">
                      {report.status}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">{report.appName}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#44443d]">
                    {report.summary}
                  </p>
                </div>
                <div className="grid gap-2 font-mono text-xs text-[#3d3d35] md:text-right">
                  <span>{report.generatedAt}</span>
                  <span>{report.fixtureId}</span>
                  <span>{report.workspaceName}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Callout label="Report" value={report.reportSlug} />
                <Callout label="Snapshots" value={report.snapshotsCaptured.toString()} />
                <Callout
                  label="Packs"
                  value={
                    report.invariantPacks.length > 0
                      ? report.invariantPacks.join(", ")
                      : "Fixture local"
                  }
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#242424] bg-[#fdfbf4] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <FileClock size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <ShieldCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-[#3f3f38]">{value}</p>
    </div>
  );
}
