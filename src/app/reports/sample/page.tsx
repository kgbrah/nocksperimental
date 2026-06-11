import { ArrowLeft, Code2, FileCheck2, History, RadioTower, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { sampleLabReport } from "@/lib/lab-report";

export default function SampleReportPage() {
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
                Hosted report viewer
              </p>
              <h1 className="mt-2 text-4xl font-semibold">{sampleLabReport.app.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Fixture {sampleLabReport.fixtureId} generated a {sampleLabReport.summary.status}
                report for {sampleLabReport.app.kernel}.
              </p>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href="/api/reports/sample" target="_blank" rel="noreferrer"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:grid-cols-4 lg:px-8">
        <Metric label="Status" value={sampleLabReport.summary.status} />
        <Metric
          label="Steps"
          value={`${sampleLabReport.summary.stepsPassed}/${sampleLabReport.steps.length}`}
        />
        <Metric
          label="Invariants"
          value={`${sampleLabReport.summary.invariantsPassed}/${sampleLabReport.invariants.length}`}
        />
        <Metric
          label="Snapshots"
          value={sampleLabReport.summary.snapshotsCaptured.toString()}
        />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Run Steps</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {sampleLabReport.steps.map((step) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={step.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-1 font-mono text-xs text-[#0B0B0B]">{step.type}</p>
                  </div>
                  <span className="font-mono text-xs uppercase text-[#0B0B0B]">{step.status}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{step.observed}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Invariant Results</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {sampleLabReport.invariants.map((invariant) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={invariant.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{invariant.title}</p>
                    <p className="mt-1 font-mono text-xs text-[#0B0B0B]">
                      {invariant.severity}
                    </p>
                  </div>
                  <span className="font-mono text-xs uppercase text-[#0B0B0B]">
                    {invariant.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                  Observed {invariant.observed}; expected {invariant.expected}.
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <RadioTower size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Adapter Observations</h2>
          </div>
          {sampleLabReport.adapterObservations.length === 0 ? (
            <p className="mt-4 border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]">
              No adapter observations captured.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-[#0B0B0B] text-white">
                  <tr>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                      Step
                    </th>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                      Capability
                    </th>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                      Status
                    </th>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                      Summary
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sampleLabReport.adapterObservations.map((observation) => (
                    <tr
                      className="border-t border-[#0B0B0B] bg-white"
                      key={`${observation.stepId}-${observation.capability}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{observation.stepId}</td>
                      <td className="px-4 py-3">{observation.capability}</td>
                      <td className="px-4 py-3 font-mono text-xs uppercase">
                        {observation.status}
                      </td>
                      <td className="px-4 py-3">{observation.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <h2 className="text-xl font-semibold">State Diffs</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-[#0B0B0B] text-white">
                <tr>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">Path</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">Before</th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">After</th>
                </tr>
              </thead>
              <tbody>
                {sampleLabReport.stateDiffs.map((diff) => (
                  <tr className="border-t border-[#0B0B0B] bg-white" key={diff.path}>
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

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <History size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Snapshot Timeline</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {sampleLabReport.stateSnapshots.map((snapshot) => (
              <div className="border border-[#0B0B0B] bg-white p-3" key={snapshot.label}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{snapshot.label}</p>
                  <span className="font-mono text-xs uppercase text-[#0B0B0B]">
                    {snapshot.stepId ?? "initial"}
                  </span>
                </div>
                <p className="mt-2 font-mono text-xs text-[#0B0B0B]">{snapshot.stateHash}</p>
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
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold capitalize">{value}</div>
    </div>
  );
}
