import { ArrowLeft, ArrowUpRight, Code2, LockKeyhole, UsersRound } from "lucide-react";
import Link from "next/link";
import {
  privateWorkspaces,
  reportsForWorkspace,
  workspaceVerificationSummary,
  workspaceStageCoverage
} from "@/lib/report-history";

export default function WorkspacesPage() {
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
                Private team workspaces
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Workspaces</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Team-scoped report storage for NockApp launch, audit, upgrade, and integration
                workflows.
              </p>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href="/api/workspaces" target="_blank" rel="noreferrer"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <Metric label="Private spaces" value={privateWorkspaces.length.toString()} />
        <Metric
          label="Total seats"
          value={privateWorkspaces
            .reduce((sum, workspace) => sum + workspace.seats, 0)
            .toString()}
        />
        <Metric
          label="Stored reports"
          value={privateWorkspaces
            .reduce((sum, workspace) => sum + reportsForWorkspace(workspace.slug).length, 0)
            .toString()}
        />
        <Metric
          label="Verified reports"
          value={privateWorkspaces
            .reduce(
              (sum, workspace) =>
                sum + workspaceVerificationSummary(workspace.slug).verifiedReportCount,
              0
            )
            .toString()}
        />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <div className="grid gap-4">
          {privateWorkspaces.map((workspace) => {
            const reports = reportsForWorkspace(workspace.slug);
            const verification = workspaceVerificationSummary(workspace.slug);

            return (
              <article
                className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
                key={workspace.id}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border border-[#0B0B0B] bg-[#F5F5F5] px-2 py-1 font-mono text-xs uppercase">
                        {workspace.visibility}
                      </span>
                      <span className="border border-[#0B0B0B] bg-white px-2 py-1 font-mono text-xs uppercase">
                        {workspace.plan}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold">{workspace.name}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
                      {workspaceStageCoverage(workspace)} report history with{" "}
                      {workspace.retentionDays} day retention.
                    </p>
                  </div>
                  <div className="grid gap-2 font-mono text-xs text-[#4A4A4A] md:text-right">
                    <span>{workspace.slug}</span>
                    <span>{workspace.seats} seats</span>
                    <span>{reports.length} reports</span>
                    <span>{verification.verifiedReportCount} verified</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Callout label="Environments" value={workspace.environments.join(", ")} />
                  <Callout
                    label="Members"
                    value={workspace.members
                      .map((member) => `${member.count} ${member.role}`)
                      .join(", ")}
                  />
                  <Callout
                    label="Latest reports"
                    value={reports.map((report) => report.fixtureId).join(", ") || "None"}
                  />
                  <Callout
                    label="Verification"
                    value={`${verification.verifiedReportCount} verified / ${verification.unlinkedReportCount} unlinked`}
                  />
                  <Callout
                    label="Latest badge"
                    value={verification.latestBadgeId ?? "No linked badge"}
                  />
                  <Callout
                    label="Snapshot root"
                    value={verification.latestSnapshotRoot ?? "No linked root"}
                  />
                </div>
                <Link
                  className="mt-4 inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                  href={`/workspaces/${workspace.slug}`}
                >
                  Open Workspace
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </article>
            );
          })}
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
