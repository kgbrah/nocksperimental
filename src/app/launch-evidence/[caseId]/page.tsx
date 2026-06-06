import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  FileJson,
  Gauge,
  Hash,
  Link2,
  ShieldCheck,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  launchEvidenceCaseForId,
  type LaunchEvidenceCheck,
  type LaunchEvidenceCheckStatus
} from "@/lib/launch-evidence";

export const dynamic = "force-dynamic";

type LaunchEvidenceCasePageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function LaunchEvidenceCasePage({
  params
}: LaunchEvidenceCasePageProps) {
  const { caseId } = await params;
  const launchCase = launchEvidenceCaseForId(caseId);

  if (!launchCase || launchCase.visibility === "private") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/launch-evidence">
            <ArrowLeft size={16} aria-hidden="true" />
            Launch Evidence
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="break-all font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                {launchCase.caseId}
              </p>
              <h1 className="mt-2 text-4xl font-semibold">{launchCase.subjectName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                {launchCase.report.publicSummary}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                <span>{launchCase.customerLane}</span>
                <span>{launchCase.subjectType}</span>
                <span>{launchCase.visibility}</span>
                <span>{launchCase.workspaceName ?? launchCase.workspaceSlug}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href={toSameOriginHref(launchCase.links.verifier)}
              >
                <ShieldCheck size={16} aria-hidden="true" />
                Verifier
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium"
                href={toSameOriginHref(launchCase.links.api)}
              >
                <FileJson size={16} aria-hidden="true" />
                Case JSON
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Report status" value={launchCase.report.summaryStatus} />
        <Metric label="Score" value={launchCase.report.score.toString()} />
        <Metric label="Case status" value={launchCase.status} />
        <Metric label="Evidence" value={launchCase.submissions.length.toString()} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <BadgeCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Readiness Report</h2>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
            {launchCase.report.evidenceSummary}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
            {launchCase.report.reviewerNotes}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Callout label="Generated" value={launchCase.report.generatedAt} />
            <Callout label="Report slug" value={launchCase.report.reportSlug} />
            <Callout label="Report hash" value={launchCase.report.reportHash} />
            <Callout label="Snapshot root" value={launchCase.report.snapshotRoot} />
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-8 lg:grid-cols-2 lg:px-8">
        <CheckList title="Required Checks" checks={launchCase.report.requiredChecks} />
        <CheckList title="Recommended Checks" checks={launchCase.report.recommendedChecks} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardCheck size={18} aria-hidden="true" />
          <h2 className="text-xl font-semibold">Evidence Sources</h2>
        </div>
        <div className="grid gap-4">
          {launchCase.submissions.map((submission) => (
            <article
              className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
              key={submission.evidenceId}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="break-all font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                    {submission.evidenceId}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{submission.sourceKind}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
                    {submission.redactionSummary}
                  </p>
                </div>
                <span className="w-fit border border-[#0B0B0B] bg-white px-2 py-1 font-mono text-xs uppercase">
                  {submission.status}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Callout label="Submitted" value={submission.submittedAt} />
                <Callout label="Submitted by" value={submission.submittedBy} />
                <Callout label="Report hash" value={submission.reportHash} />
                <Callout label="Snapshot root" value={submission.snapshotRoot} />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {submission.sourceUrl ? (
                  <Link
                    className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                    href={toSameOriginHref(submission.sourceUrl)}
                  >
                    Source
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                ) : null}
                {submission.receiptId ? (
                  <span className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium">
                    <Hash size={14} aria-hidden="true" />
                    {submission.receiptId}
                  </span>
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
        <Gauge size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-words text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <Link2 size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 break-all text-sm leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}

function CheckList({ title, checks }: { title: string; checks: LaunchEvidenceCheck[] }) {
  return (
    <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={18} aria-hidden="true" />
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {checks.map((check) => (
          <div className="border border-[#0B0B0B] bg-white p-4" key={check.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {check.id}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{check.label}</h3>
              </div>
              <CheckStatus status={check.status} />
            </div>
            <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">{check.summary}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function CheckStatus({ status }: { status: LaunchEvidenceCheckStatus }) {
  const Icon = status === "pass" ? CheckCircle2 : status === "warn" ? AlertTriangle : XCircle;

  return (
    <span className="inline-flex w-fit items-center gap-1 border border-[#0B0B0B] bg-white px-2 py-1 font-mono text-xs uppercase">
      <Icon size={13} aria-hidden="true" />
      {status}
    </span>
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
