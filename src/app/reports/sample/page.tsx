import { ArrowLeft, Code2, FileCheck2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { sampleLabReport } from "@/lib/lab-report";

export default function SampleReportPage() {
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
                Hosted report viewer
              </p>
              <h1 className="mt-2 text-4xl font-semibold">{sampleLabReport.app.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                Fixture {sampleLabReport.fixtureId} generated a {sampleLabReport.summary.status}
                report for {sampleLabReport.app.kernel}.
              </p>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href="/api/reports/sample"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:grid-cols-3 lg:px-8">
        <Metric label="Status" value={sampleLabReport.summary.status} />
        <Metric
          label="Steps"
          value={`${sampleLabReport.summary.stepsPassed}/${sampleLabReport.steps.length}`}
        />
        <Metric
          label="Invariants"
          value={`${sampleLabReport.summary.invariantsPassed}/${sampleLabReport.invariants.length}`}
        />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Run Steps</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {sampleLabReport.steps.map((step) => (
              <div className="border border-[#8b8b7a] bg-white p-3" key={step.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-1 font-mono text-xs text-[#6c3324]">{step.type}</p>
                  </div>
                  <span className="font-mono text-xs uppercase text-[#536023]">{step.status}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#44443d]">{step.observed}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Invariant Results</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {sampleLabReport.invariants.map((invariant) => (
              <div className="border border-[#8b8b7a] bg-white p-3" key={invariant.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{invariant.title}</p>
                    <p className="mt-1 font-mono text-xs text-[#6c3324]">
                      {invariant.severity}
                    </p>
                  </div>
                  <span className="font-mono text-xs uppercase text-[#536023]">
                    {invariant.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#44443d]">
                  Observed {invariant.observed}; expected {invariant.expected}.
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <article className="border border-[#242424] bg-[#fdfbf4] p-5">
          <h2 className="text-xl font-semibold">State Diffs</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-[#171717] text-white">
                <tr>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">Path</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">Before</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">After</th>
                </tr>
              </thead>
              <tbody>
                {sampleLabReport.stateDiffs.map((diff) => (
                  <tr className="border-t border-[#242424] bg-white" key={diff.path}>
                    <td className="px-4 py-3 font-mono text-xs">{diff.path}</td>
                    <td className="px-4 py-3">{diff.before}</td>
                    <td className="px-4 py-3">{diff.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#242424] bg-[#fdfbf4] p-5">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold capitalize">{value}</div>
    </div>
  );
}
