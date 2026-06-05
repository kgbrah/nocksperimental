import { ArrowLeft, ArrowUpRight, Code2, Cpu, Gauge } from "lucide-react";
import Link from "next/link";
import {
  computeBenchmarkProfiles,
  percentage,
  scoreLabel
} from "@/lib/trust-signals";

export default function ComputeBenchmarksPage() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/trust">
            <ArrowLeft size={16} aria-hidden="true" />
            Trust signals
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Compute provider benchmark profiles
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Compute Benchmarks</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Provider profiles convert repeatable benchmark classes into reputation evidence.
              </p>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href="/api/trust/compute-benchmarks"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:px-8">
        {computeBenchmarkProfiles.map((profile) => (
          <article
            className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
            key={profile.id}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                  {profile.status} · {scoreLabel(profile.score)}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{profile.providerName}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
                  {profile.benchmarkReportSlug} · {profile.sla.sampleSize} sampled jobs.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="grid size-16 place-items-center bg-[#0B0B0B] text-2xl font-semibold text-white">
                  {profile.score}
                </div>
                <Link
                  className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-white px-3 py-2 text-sm font-medium"
                  href={`/trust/compute-benchmarks/${profile.id}`}
                >
                  Open Detail
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Metric label="Uptime" value={percentage(profile.sla.uptime)} />
              <Metric label="Failure rate" value={percentage(profile.sla.failureRate)} />
              <Metric label="Samples" value={profile.sla.sampleSize.toString()} />
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-[#0B0B0B] text-white">
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
                    <tr className="border-t border-[#0B0B0B] bg-white" key={jobClass.name}>
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
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
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
