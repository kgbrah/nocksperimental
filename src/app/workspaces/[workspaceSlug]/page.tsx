import {
  ArrowLeft,
  ArrowUpRight,
  Code2,
  FileCheck2,
  LockKeyhole,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { launchEvidenceCasesForWorkspace } from "@/lib/launch-evidence";
import {
  privateWorkspaces,
  reportsForWorkspace,
  workspaceStageCoverage,
  workspaceVerificationSummary
} from "@/lib/report-history";
import { createWorkspaceEvidenceCapsule } from "@/lib/workspace-evidence";

export const dynamic = "force-dynamic";

type WorkspaceDetailPageProps = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export default async function WorkspaceDetailPage({
  params
}: WorkspaceDetailPageProps) {
  const { workspaceSlug } = await params;
  const workspace = privateWorkspaces.find((candidate) => candidate.slug === workspaceSlug);

  if (!workspace) {
    notFound();
  }

  const reports = reportsForWorkspace(workspace.slug);
  const verification = workspaceVerificationSummary(workspace.slug);
  const evidence = createWorkspaceEvidenceCapsule(workspace.slug);
  const launchEvidenceCases = launchEvidenceCasesForWorkspace(workspace.slug).filter(
    (launchCase) => launchCase.visibility !== "private"
  );

  if (!evidence) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/workspaces">
            <ArrowLeft size={16} aria-hidden="true" />
            Workspaces
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Workspace Detail
              </p>
              <h1 className="mt-2 text-4xl font-semibold">{workspace.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                {workspaceStageCoverage(workspace)} report history with {workspace.retentionDays}{" "}
                day retention for private NockApp launch, audit, upgrade, and integration work.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                <span>{workspace.plan}</span>
                <span>{workspace.seats} seats</span>
                <span>{reports.length} reports</span>
                <span>{verification.verifiedReportCount} verified</span>
              </div>
            </div>
            <div className="grid size-20 place-items-center bg-[#0B0B0B] text-white">
              <LockKeyhole size={28} aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Reports" value={verification.reportCount.toString()} />
        <Metric label="Verified" value={verification.verifiedReportCount.toString()} />
        <Metric label="Unlinked" value={verification.unlinkedReportCount.toString()} />
        <Metric label="Retention" value={`${workspace.retentionDays}d`} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <Code2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Report Actions</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-sm font-medium text-white"
              href={`/api/workspaces/${workspace.slug}`} target="_blank" rel="noreferrer"
            >
              Workspace API
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/workspaces/${workspace.slug}/evidence`} target="_blank" rel="noreferrer"
            >
              Evidence Capsule
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/workspaces/${workspace.slug}/upload-policy`} target="_blank" rel="noreferrer"
            >
              Upload Policy
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/workspaces/${workspace.slug}/upload-token`} target="_blank" rel="noreferrer"
            >
              Token Gate
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={toSameOriginHref(evidence.links.verify)} target="_blank" rel="noreferrer"
            >
              Verify Evidence
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href="/launch-evidence"
            >
              Launch Evidence
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href="/api/workspaces" target="_blank" rel="noreferrer"
            >
              Workspace Index
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href="/reports/history"
            >
              Report History
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>

      {launchEvidenceCases.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
          <div className="mb-4 flex items-center gap-2">
            <FileCheck2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Launch Evidence</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {launchEvidenceCases.map((launchCase) => (
              <article
                className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
                key={launchCase.caseId}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="break-all font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                      {launchCase.caseId}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold">{launchCase.subjectName}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                      {launchCase.report.publicSummary}
                    </p>
                  </div>
                  <span className="w-fit border border-[#0B0B0B] bg-white px-2 py-1 font-mono text-xs uppercase">
                    {launchCase.report.summaryStatus}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Callout label="Score" value={launchCase.report.score.toString()} />
                  <Callout label="Status" value={launchCase.status} />
                  <Callout label="Evidence" value={launchCase.submissions.length.toString()} />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                    href={toSameOriginHref(launchCase.links.page)}
                  >
                    Open Case
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                  <Link
                    className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium"
                    href={toSameOriginHref(launchCase.links.verifier)} target="_blank" rel="noreferrer"
                  >
                    Verifier
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <div className="grid gap-4">
          {reports.map((report) => (
            <article
              className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
              key={report.id}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                    {report.stage}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{report.appName}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
                    {report.summary}
                  </p>
                </div>
                <span className="border border-[#0B0B0B] bg-white px-2 py-1 font-mono text-xs uppercase">
                  {report.status}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Callout label="Fixture" value={report.fixtureId} />
                <Callout label="Generated" value={report.generatedAt} />
                <Callout label="Snapshots" value={report.snapshotsCaptured.toString()} />
                <Callout label="Badge" value={report.verification?.badgeId ?? "No linked badge"} />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                  href={`/reports/generated/${report.reportSlug}`}
                >
                  Generated Report
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
                {report.verification ? (
                  <Link
                    className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium"
                    href={`/trust/badges/${report.verification.badgeId}`}
                  >
                    Badge Detail
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                ) : null}
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
        <LockKeyhole size={14} aria-hidden="true" />
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
        <UsersRound size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 break-all text-sm leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}

function toSameOriginHref(url: string) {
  try {
    const parsed = new URL(url);

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}
