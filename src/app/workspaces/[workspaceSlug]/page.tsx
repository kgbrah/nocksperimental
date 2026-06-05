import {
  ArrowLeft,
  ArrowUpRight,
  Code2,
  LockKeyhole,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
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

  if (!evidence) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/workspaces">
            <ArrowLeft size={16} aria-hidden="true" />
            Workspaces
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Workspace Detail
              </p>
              <h1 className="mt-2 text-4xl font-semibold">{workspace.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                {workspaceStageCoverage(workspace)} report history with {workspace.retentionDays}{" "}
                day retention for private NockApp launch, audit, upgrade, and integration work.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                <span>{workspace.plan}</span>
                <span>{workspace.seats} seats</span>
                <span>{reports.length} reports</span>
                <span>{verification.verifiedReportCount} verified</span>
              </div>
            </div>
            <div className="grid size-20 place-items-center bg-[#171717] text-white">
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
        <article className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex items-center gap-2">
            <Code2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Report Actions</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-[#171717] px-4 py-3 text-sm font-medium text-white"
              href={`/api/workspaces/${workspace.slug}`}
            >
              Workspace API
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/workspaces/${workspace.slug}/evidence`}
            >
              Evidence Capsule
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/workspaces/${workspace.slug}/upload-policy`}
            >
              Upload Policy
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/workspaces/${workspace.slug}/upload-token`}
            >
              Token Gate
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-white px-4 py-3 text-sm font-medium"
              href={toSameOriginHref(evidence.links.verify)}
            >
              Verify Evidence
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-white px-4 py-3 text-sm font-medium"
              href="/api/workspaces"
            >
              Workspace Index
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-white px-4 py-3 text-sm font-medium"
              href="/reports/history"
            >
              Report History
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <div className="grid gap-4">
          {reports.map((report) => (
            <article
              className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
              key={report.id}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                    {report.stage}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{report.appName}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#44443d]">
                    {report.summary}
                  </p>
                </div>
                <span className="border border-[#242424] bg-white px-2 py-1 font-mono text-xs uppercase">
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
                  className="inline-flex items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
                  href={`/reports/generated/${report.reportSlug}`}
                >
                  Generated Report
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
                {report.verification ? (
                  <Link
                    className="inline-flex items-center gap-2 border border-[#242424] bg-white px-4 py-2 text-sm font-medium"
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
    <div className="border border-[#242424] bg-[#fdfbf4] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <LockKeyhole size={14} aria-hidden="true" />
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
        <UsersRound size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 break-all text-sm leading-6 text-[#3f3f38]">{value}</p>
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
