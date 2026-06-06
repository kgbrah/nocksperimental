import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  ClipboardCheck,
  FileJson,
  Gauge,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createLaunchEvidenceIndex } from "@/lib/launch-evidence";

export const dynamic = "force-dynamic";

export default function LaunchEvidencePage() {
  const index = createLaunchEvidenceIndex();
  const cases = index.cases.filter((launchCase) => launchCase.visibility !== "private");
  const verifiedCount = cases.filter((launchCase) => launchCase.report.summaryStatus === "verified").length;
  const watchCount = cases.filter((launchCase) => launchCase.report.summaryStatus === "watch").length;
  const blockedCount = cases.filter((launchCase) => launchCase.report.summaryStatus === "blocked").length;

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
                Launch readiness registry
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Launch Evidence</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                {cases.length} public or shared Launch Evidence cases for {index.service}, with
                report hashes, snapshot roots, verifier links, and readiness checks ready to inspect.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                <span>{index.version}</span>
                <span>{index.subject}</span>
                <span>{index.capabilities.length} capabilities</span>
              </div>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href={toSameOriginHref(index.canonicalUrl)}
            >
              <FileJson size={16} aria-hidden="true" />
              JSON
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Cases" value={cases.length.toString()} />
        <Metric label="Verified" value={verifiedCount.toString()} />
        <Metric label="Watch" value={watchCount.toString()} />
        <Metric label="Blocked" value={blockedCount.toString()} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <div className="grid gap-4">
          {cases.map((launchCase) => (
            <article
              className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
              key={launchCase.caseId}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="break-all font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                    {launchCase.caseId}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{launchCase.subjectName}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
                    {launchCase.report.publicSummary}
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-1 border border-[#0B0B0B] bg-white px-2 py-1 font-mono text-xs uppercase">
                  <BadgeCheck size={13} aria-hidden="true" />
                  {launchCase.report.summaryStatus}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Callout label="Score" value={launchCase.report.score.toString()} />
                <Callout label="Lane" value={launchCase.customerLane} />
                <Callout label="Evidence" value={launchCase.submissions.length.toString()} />
                <Callout label="Updated" value={launchCase.updatedAt} />
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
                  href={toSameOriginHref(launchCase.links.verifier)}
                >
                  Verifier
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
                <Link
                  className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium"
                  href={toSameOriginHref(launchCase.links.api)}
                >
                  Case JSON
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
                {launchCase.links.workspace ? (
                  <Link
                    className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium"
                    href={toSameOriginHref(launchCase.links.workspace)}
                  >
                    Workspace
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
        <Gauge size={14} aria-hidden="true" />
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
        {label === "Evidence" ? (
          <ClipboardCheck size={14} aria-hidden="true" />
        ) : (
          <ShieldCheck size={14} aria-hidden="true" />
        )}
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
