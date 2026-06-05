import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Fingerprint,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  resolvedTrustConsumers,
  type ResolvedTrustConsumerUse
} from "@/lib/trust-signals";

export const dynamic = "force-dynamic";

type TrustConsumerDetailPageProps = {
  params: Promise<{
    consumerId: string;
  }>;
};

export default async function TrustConsumerDetailPage({
  params
}: TrustConsumerDetailPageProps) {
  const { consumerId } = await params;
  const consumer = resolvedTrustConsumers.find((candidate) => candidate.id === consumerId);

  if (!consumer) {
    notFound();
  }

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
                Consumer Detail
              </p>
              <h1 className="mt-2 text-4xl font-semibold">{consumer.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                {consumer.category} adoption proof showing which Nocksperimental evidence this
                consumer uses before routing value, listing tokens, funding diligence, or
                publishing provider reputation.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                <span>{consumer.category}</span>
                <span>{consumer.evidenceCount} evidence links</span>
                <span>{consumer.verifiedBadgeCount} verified badges</span>
              </div>
            </div>
            <div className="grid size-20 place-items-center bg-[#0B0B0B] text-white">
              <UsersRound size={28} aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-3 lg:px-8">
        <Metric label="Evidence" value={consumer.evidenceCount.toString()} />
        <Metric label="Verified badges" value={consumer.verifiedBadgeCount.toString()} />
        <Metric label="Uses" value={consumer.resolvedUses.length.toString()} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Evidence Actions</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-sm font-medium text-white"
              href={`/api/trust/consumers/${consumer.id}`}
            >
              Consumer API
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href="/api/trust"
            >
              Trust API
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href="/verify"
            >
              Verifiers
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {consumer.resolvedUses.map((use) => (
            <article
              className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
              key={`${consumer.id}-${use.kind}-${use.purpose}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="grid size-9 place-items-center bg-[#0B0B0B] text-white">
                  <BadgeCheck size={17} aria-hidden="true" />
                </div>
                <span className="border border-[#0B0B0B] bg-white px-2 py-1 font-mono text-xs uppercase">
                  {use.evidenceStatus ?? "missing"}
                </span>
              </div>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                {use.kind}
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                {use.evidenceLabel ?? "Unresolved evidence"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">{use.purpose}</p>
              <div className="mt-4 grid gap-3">
                <Callout label="Report" value={use.reportSlug ?? "n/a"} />
                <Callout label="Snapshot root" value={use.snapshotRoot ?? "n/a"} />
                {typeof use.score === "number" ? (
                  <Callout label="Score" value={use.score.toString()} />
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                  href={evidenceHrefForUse(use)}
                >
                  Evidence Detail
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
                {use.reportSlug ? (
                  <Link
                    className="inline-flex items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium"
                    href={`/reports/generated/${use.reportSlug}`}
                  >
                    Generated Report
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

function evidenceHrefForUse(use: ResolvedTrustConsumerUse) {
  if (use.kind === "badge" && use.badgeId) {
    return `/trust/badges/${use.badgeId}`;
  }

  if (use.kind === "solver-score" && use.scorecardId) {
    return `/trust/solver-scores/${use.scorecardId}`;
  }

  if (use.kind === "token-compatibility" && use.compatibilityReportId) {
    return `/trust/token-compatibility/${use.compatibilityReportId}`;
  }

  if (use.kind === "compute-benchmark" && use.benchmarkProfileId) {
    return `/trust/compute-benchmarks/${use.benchmarkProfileId}`;
  }

  return "/trust";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <Fingerprint size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
