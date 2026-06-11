import {
  ArrowLeft,
  ArrowUpRight,
  Code2,
  FileCheck2,
  ListChecks,
  RadioTower,
  ShieldCheck,
  Terminal,
  TriangleAlert
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadGeneratedLabReport } from "@/lib/generated-lab-reports";

export const dynamic = "force-dynamic";

type GeneratedReportDetailPageProps = {
  params: Promise<{
    appSlug: string;
  }>;
};

export default async function GeneratedReportDetailPage({
  params
}: GeneratedReportDetailPageProps) {
  const { appSlug } = await params;
  const detail = loadGeneratedLabReport({ appSlug });

  if (!detail) {
    notFound();
  }

  const { entry, report } = detail;
  const verificationHref = `/api/reports/generated/verify?reportHash=${encodeURIComponent(entry.reportHash)}&snapshotRoot=${encodeURIComponent(entry.snapshotRoot)}&appSlug=${encodeURIComponent(entry.appSlug)}`;

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/reports/generated">
            <ArrowLeft size={16} aria-hidden="true" />
            Generated reports
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Generated report detail
              </p>
              <h1 className="mt-2 text-4xl font-semibold">{report.app.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Fixture {report.fixtureId} generated {report.summary.status} at{" "}
                {report.generatedAt}.
              </p>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href={`/api/reports/generated/${entry.appSlug}`} target="_blank" rel="noreferrer"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:grid-cols-4 lg:px-8">
        <Metric label="Status" value={report.summary.status} />
        <Metric label="Steps" value={`${report.summary.stepsPassed}/${report.steps.length}`} />
        <Metric
          label="Invariants"
          value={`${report.summary.invariantsPassed}/${report.invariants.length}`}
        />
        <Metric label="Snapshots" value={report.summary.snapshotsCaptured.toString()} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Verification Actions</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/reports/generated/${entry.appSlug}/evidence`} target="_blank" rel="noreferrer"
            >
              Evidence Bundle
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/reports/generated/${entry.appSlug}/provenance`} target="_blank" rel="noreferrer"
            >
              Provenance
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-sm font-medium text-white"
              href={verificationHref} target="_blank" rel="noreferrer"
            >
              Verify Hash
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="Report Hash" value={entry.reportHash} />
            <Callout label="Snapshot Root" value={entry.snapshotRoot || "none"} />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <Terminal size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Environment</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="Mode" value={report.environment.mode} />
            <Callout label="gRPC Endpoint" value={report.environment.grpcEndpoint} />
            <Callout label="Fakenet Command" value={report.environment.fakenetCommand} />
          </div>
          {report.environment.notes.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {report.environment.notes.map((note) => (
                <p
                  className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]"
                  key={note}
                >
                  {note}
                </p>
              ))}
            </div>
          ) : null}
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Next Actions</h2>
          </div>
          {report.nextActions.length === 0 ? (
            <p className="mt-4 border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]">
              No next actions recorded.
            </p>
          ) : (
            <ol className="mt-4 grid list-decimal gap-3 pl-5">
              {report.nextActions.map((action) => (
                <li
                  className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]"
                  key={action}
                >
                  {action}
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Invariant Packs</h2>
          </div>
          {report.invariantPacks.length === 0 ? (
            <p className="mt-4 border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]">
              No invariant packs referenced.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {report.invariantPacks.map((pack) => (
                <div className="border border-[#0B0B0B] bg-white p-3" key={`${pack.id}-${pack.path}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{pack.name}</p>
                      <p className="mt-1 font-mono text-xs text-[#0B0B0B]">{pack.id}</p>
                    </div>
                    <span className="font-mono text-xs uppercase text-[#0B0B0B]">
                      {pack.version ?? "unversioned"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm leading-6 text-[#4A4A4A] sm:grid-cols-2">
                    <p>
                      <span className="font-mono text-xs uppercase text-[#0B0B0B]">Domain</span>
                      <span className="block break-words">{pack.domain ?? "unspecified"}</span>
                    </p>
                    <p>
                      <span className="font-mono text-xs uppercase text-[#0B0B0B]">Path</span>
                      <span className="block break-words">{pack.path}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Run Steps</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {report.steps.map((step) => (
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
            {report.invariants.length === 0 ? (
              <p className="border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]">
                No invariants configured.
              </p>
            ) : (
              report.invariants.map((invariant) => (
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
              ))
            )}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <TriangleAlert size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Alerts</h2>
          </div>
          {report.alerts.length === 0 ? (
            <p className="mt-4 border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]">
              No alert policies configured.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {report.alerts.map((alert) => (
                <div className="border border-[#0B0B0B] bg-white p-3" key={alert.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="mt-1 font-mono text-xs text-[#0B0B0B]">
                        {alert.severity}
                      </p>
                    </div>
                    <span className="font-mono text-xs uppercase text-[#0B0B0B]">
                      {alert.state}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{alert.message}</p>
                  <p className="mt-2 font-mono text-xs text-[#0B0B0B]">
                    {alert.observed} / {alert.condition}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <RadioTower size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Adapter Observations</h2>
          </div>
          {report.adapterObservations.length === 0 ? (
            <p className="mt-4 border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]">
              No adapter observations captured.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
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
                  {report.adapterObservations.map((observation) => (
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
          {report.stateDiffs.length === 0 ? (
            <p className="mt-4 border border-[#0B0B0B] bg-white p-3 text-sm leading-6 text-[#4A4A4A]">
              No state diffs captured.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="bg-[#0B0B0B] text-white">
                  <tr>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                      Path
                    </th>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                      Before
                    </th>
                    <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                      After
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.stateDiffs.map((diff) => (
                    <tr className="border-t border-[#0B0B0B] bg-white" key={diff.path}>
                      <td className="px-4 py-3 font-mono text-xs">{diff.path}</td>
                      <td className="px-4 py-3">{diff.before}</td>
                      <td className="px-4 py-3">{diff.after}</td>
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
          <h2 className="text-xl font-semibold">Snapshot Timeline</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {report.stateSnapshots.map((snapshot) => (
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

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <h2 className="text-xl font-semibold">Artifacts</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="Report ID" value={report.reportId} />
            <Callout label="Report Hash" value={entry.reportHash} />
            <Callout label="Snapshot Root" value={entry.snapshotRoot || "none"} />
            <Callout label="JSON Path" value={entry.jsonPath} />
            <Callout label="Markdown Path" value={entry.markdownPath ?? "none"} />
            <Callout label="Markdown Bytes" value={detail.markdown.length.toString()} />
            <Callout label="Changed Paths" value={detail.evidence.changedPaths.join(", ") || "none"} />
            <Callout label="Markdown Preview" value={detail.evidence.markdownPreview || "none"} />
            <Callout
              label="Alert Summary"
              value={`${detail.evidence.triggeredAlertCount} triggered, ${detail.evidence.clearAlertCount} clear`}
            />
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <h2 className="text-xl font-semibold">Verification Candidate</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="Candidate" value={entry.badgeCandidate.label} />
            <Callout label="Status" value={entry.badgeCandidate.status} />
            <Callout label="Signature" value={entry.badgeCandidate.signatureStatus} />
            <Callout
              label="Invariant Packs"
              value={
                entry.badgeCandidate.evidence.invariantPacks.length > 0
                  ? entry.badgeCandidate.evidence.invariantPacks.join(", ")
                  : "none"
              }
            />
            <Callout label="Report Hash" value={entry.badgeCandidate.evidence.reportHash} />
            <Callout label="Snapshot Root" value={entry.badgeCandidate.evidence.snapshotRoot || "none"} />
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

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        {label}
      </div>
      <p className="mt-2 break-all text-sm leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
