import { ArrowLeft, ArrowUpRight, Code2, FileClock, RadioTower } from "lucide-react";
import Link from "next/link";
import { loadGeneratedLabReports } from "@/lib/generated-lab-reports";

export const dynamic = "force-dynamic";

export default function GeneratedReportsPage() {
  const generatedReports = loadGeneratedLabReports();

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
                Generated lab artifacts
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Generated Reports</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                {generatedReports.reports.length} report artifacts from{" "}
                {generatedReports.reportDir ?? ".nocklab"}.
              </p>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href="/api/reports/generated"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:grid-cols-4 lg:px-8">
        <Metric label="Status" value={generatedReports.status} />
        <Metric label="Reports" value={generatedReports.totals.reportCount.toString()} />
        <Metric label="Warnings" value={generatedReports.totals.warnCount.toString()} />
        <Metric
          label="Adapter Obs"
          value={generatedReports.totals.adapterObservationCount.toString()}
        />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#242424] bg-[#fdfbf4] p-5">
          <div className="flex items-center gap-2">
            <FileClock size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Run Totals</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Callout
              label="Steps"
              value={`${generatedReports.totals.stepsPassed}/${generatedReports.totals.stepsTotal}`}
            />
            <Callout
              label="Invariants"
              value={`${generatedReports.totals.invariantsPassed}/${generatedReports.totals.invariantsTotal}`}
            />
            <Callout
              label="Alerts Triggered"
              value={generatedReports.totals.alertsTriggered.toString()}
            />
            <Callout
              label="Snapshots"
              value={generatedReports.totals.snapshotsCaptured.toString()}
            />
            <Callout
              label="Invariant Packs"
              value={generatedReports.totals.invariantPackCount.toString()}
            />
            <Callout
              label="Status Split"
              value={`${generatedReports.totals.passCount} pass, ${generatedReports.totals.warnCount} warn, ${generatedReports.totals.failCount} fail`}
            />
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#242424] bg-[#fdfbf4] p-5">
          <div className="flex items-center gap-2">
            <FileClock size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">CI Summary</h2>
          </div>
          {generatedReports.summary ? (
            <>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Callout label="Summary Path" value={generatedReports.summary.path} />
                <Callout
                  label="Summary Lines"
                  value={generatedReports.summary.lineCount.toString()}
                />
                <Callout label="Preview" value={generatedReports.summary.markdownPreview} />
              </div>
              <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap border border-[#8b8b7a] bg-white p-4 font-mono text-xs leading-6 text-[#3f3f38]">
                {generatedReports.summary.markdown}
              </pre>
            </>
          ) : (
            <p className="mt-4 border border-[#8b8b7a] bg-white p-3 text-sm leading-6 text-[#44443d]">
              No CI summary markdown found next to the generated manifest.
            </p>
          )}
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        {generatedReports.reports.length === 0 ? (
          <article className="border border-[#242424] bg-[#fdfbf4] p-5">
            <div className="flex items-center gap-2">
              <FileClock size={18} aria-hidden="true" />
              <h2 className="text-xl font-semibold">No Generated Reports</h2>
            </div>
            <p className="mt-4 font-mono text-xs text-[#6c3324]">
              {generatedReports.manifestPath}
            </p>
          </article>
        ) : (
          <div className="grid gap-4">
            {generatedReports.reports.map((report) => (
              <article
                className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
                key={report.reportId}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border border-[#242424] bg-[#e8ead7] px-2 py-1 font-mono text-xs uppercase">
                        {report.status}
                      </span>
                      <span className="border border-[#242424] bg-white px-2 py-1 font-mono text-xs uppercase">
                        {report.fixtureId}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold">{report.appName}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#44443d]">
                      {report.stepsPassed}/{report.stepsTotal} steps, {report.invariantsPassed}/
                      {report.invariantsTotal} invariants, {report.alertsTriggered} triggered
                      alerts, {report.snapshotsCaptured} snapshots.
                    </p>
                  </div>
                  <div className="grid gap-2 font-mono text-xs text-[#3d3d35] md:text-right">
                    <span>{report.generatedAt}</span>
                    <span>{report.reportId}</span>
                    <span>{report.appSlug}</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Callout label="Adapter Observations" value={report.adapterObservationCount.toString()} />
                  <Callout label="Invariant Packs" value={report.invariantPackCount.toString()} />
                  <Callout label="Snapshot Root" value={report.snapshotRoot || "none"} />
                  <Callout label="Report Hash" value={report.reportHash} />
                  <Callout label="Badge Candidate" value={report.badgeCandidate.status} />
                  <Callout label="Signature" value={report.badgeCandidate.signatureStatus} />
                  <Callout label="JSON Path" value={report.jsonPath} />
                </div>
                <Link
                  className="mt-5 inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
                  href={`/reports/generated/${report.appSlug}`}
                >
                  Open Detail
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        )}
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
      <div className="mt-2 text-2xl font-semibold capitalize">{value}</div>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <RadioTower size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 break-all text-sm leading-6 text-[#3f3f38]">{value}</p>
    </div>
  );
}
