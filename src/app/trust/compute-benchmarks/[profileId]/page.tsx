import {
  ArrowLeft,
  ArrowUpRight,
  Cpu,
  Gauge,
  ServerCog,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  computeBenchmarkProfiles,
  percentage,
  scoreLabel
} from "@/lib/trust-signals";

export const dynamic = "force-dynamic";

type ComputeBenchmarkDetailPageProps = {
  params: Promise<{
    profileId: string;
  }>;
};

export default async function ComputeBenchmarkDetailPage({
  params
}: ComputeBenchmarkDetailPageProps) {
  const { profileId } = await params;
  const profile = computeBenchmarkProfiles.find((candidate) => candidate.id === profileId);

  if (!profile) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/trust/compute-benchmarks">
            <ArrowLeft size={16} aria-hidden="true" />
            Compute benchmarks
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Compute Benchmark Detail
              </p>
              <h1 className="mt-2 text-4xl font-semibold">{profile.providerName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                {scoreLabel(profile.score)} provider benchmark profile for{" "}
                {profile.benchmarkReportSlug}. This profile supports compute routing,
                SLA review, and provider reputation decisions.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                <span>{profile.status}</span>
                <span>{profile.providerSlug}</span>
                <span>{profile.badgeId}</span>
              </div>
            </div>
            <div className="grid size-20 place-items-center bg-[#171717] text-3xl font-semibold text-white">
              {profile.score}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-3 lg:px-8">
        <Metric label="Uptime" value={percentage(profile.sla.uptime)} />
        <Metric label="Failure rate" value={percentage(profile.sla.failureRate)} />
        <Metric label="Sample size" value={profile.sla.sampleSize.toString()} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Verification Actions</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/trust/compute-benchmarks/${profile.id}`}
            >
              Profile API
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-white px-4 py-3 text-sm font-medium"
              href={`/trust/badges/${profile.badgeId}`}
            >
              Badge Detail
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-white px-4 py-3 text-sm font-medium"
              href={`/reports/generated/${profile.benchmarkReportSlug}`}
            >
              Generated Report
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#242424] bg-[#171717] px-4 py-3 text-sm font-medium text-white"
              href={`/api/reports/generated/${profile.benchmarkReportSlug}/evidence`}
            >
              Report Evidence
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="Profile id" value={profile.id} />
            <Callout label="Provider slug" value={profile.providerSlug} />
            <Callout label="Benchmark report" value={profile.benchmarkReportSlug} />
            <Callout label="Badge" value={profile.badgeId} />
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <article className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex items-center gap-2">
            <ServerCog size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Job Classes</h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-[#171717] text-white">
                <tr>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                    Job class
                  </th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                    Score
                  </th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                    P50
                  </th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                    P95
                  </th>
                  <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                    Reproducibility
                  </th>
                </tr>
              </thead>
              <tbody>
                {profile.jobClasses.map((jobClass) => (
                  <tr className="border-t border-[#242424] bg-white" key={jobClass.name}>
                    <td className="px-4 py-3 font-medium">{jobClass.name}</td>
                    <td className="px-4 py-3">{jobClass.score}</td>
                    <td className="px-4 py-3">{jobClass.p50Ms}ms</td>
                    <td className="px-4 py-3">{jobClass.p95Ms}ms</td>
                    <td className="px-4 py-3">{percentage(jobClass.reproducibility)}</td>
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
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <Gauge size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 flex items-center gap-2 text-xl font-semibold">
        <Cpu size={16} aria-hidden="true" />
        {value}
      </p>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#3f3f38]">{value}</p>
    </div>
  );
}
