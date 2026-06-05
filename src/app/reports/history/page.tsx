import { ArrowLeft, Code2, FileClock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { reportHistory, reportStages, stageLabel } from "@/lib/report-history";

export default function ReportHistoryPage() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Lab dashboard
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Hosted report history
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Report History</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Private workspace report records across launch, audit, upgrade, and integration
                stages.
              </p>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
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
              className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
              key={report.id}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-[#0B0B0B] bg-[#F5F5F5] px-2 py-1 font-mono text-xs uppercase">
                      {stageLabel(report.stage)}
                    </span>
                    <span className="border border-[#0B0B0B] bg-white px-2 py-1 font-mono text-xs uppercase">
                      {report.status}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">{report.appName}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
                    {report.summary}
                  </p>
                </div>
                <div className="grid gap-2 font-mono text-xs text-[#4A4A4A] md:text-right">
                  <span>{report.generatedAt}</span>
                  <span>{report.fixtureId}</span>
                  <span>{report.workspaceName}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                <Callout label="Badge" value={report.verification?.badgeId ?? "Unlinked"} />
                <Callout
                  label="Signature"
                  value={report.verification?.signature ?? "No registry signature"}
                />
                <Callout
                  label="Snapshot Root"
                  value={report.verification?.snapshotRoot ?? "No registry root"}
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
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <FileClock size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <ShieldCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 break-all text-sm leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
