import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  scoreLabel,
  tokenCompatibilityReports
} from "@/lib/trust-signals";

export const dynamic = "force-dynamic";

type TokenCompatibilityDetailPageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

export default async function TokenCompatibilityDetailPage({
  params
}: TokenCompatibilityDetailPageProps) {
  const { reportId } = await params;
  const report = tokenCompatibilityReports.find((candidate) => candidate.id === reportId);

  if (!report) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/trust/token-compatibility">
            <ArrowLeft size={16} aria-hidden="true" />
            Token compatibility
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Token Compatibility Detail
              </p>
              <h1 className="mt-2 text-4xl font-semibold">{report.tokenSymbol}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                {scoreLabel(report.score)} compatibility for {report.issuerWorkspace} against{" "}
                {report.fixtureId}. This report supports wallet listing and issuer readiness
                decisions.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                <span>{report.status}</span>
                <span>{report.reportSlug}</span>
                <span>{report.badgeId}</span>
              </div>
            </div>
            <div className="grid size-20 place-items-center bg-[#0B0B0B] text-3xl font-semibold text-white">
              {report.score}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        {Object.entries(report.requirements).map(([name, passed]) => (
          <Metric key={name} label={formatRequirementName(name)} value={passed ? "pass" : "fail"} />
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Verification Actions</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={`/api/trust/token-compatibility/${report.id}`}
            >
              Report API
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={`/trust/badges/${report.badgeId}`}
            >
              Badge Detail
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-white px-4 py-3 text-sm font-medium"
              href={`/reports/generated/${report.reportSlug}`}
            >
              Generated Report
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex items-center justify-between gap-3 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-3 text-sm font-medium text-white"
              href={`/api/reports/generated/${report.reportSlug}/evidence`}
            >
              Report Evidence
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Callout label="Report id" value={report.id} />
            <Callout label="Issuer workspace" value={report.issuerWorkspace} />
            <Callout label="Fixture" value={report.fixtureId} />
            <Callout label="Badge" value={report.badgeId} />
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <WalletCards size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Wallet Checks</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {report.wallets.map((wallet) => (
              <article className="border border-[#0B0B0B] bg-white p-3" key={wallet.name}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{wallet.name}</h3>
                  <span className="font-mono text-xs uppercase text-[#0B0B0B]">
                    {wallet.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{wallet.notes}</p>
              </article>
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
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <BadgeCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 flex items-center gap-2 text-xl font-semibold">
        <ShieldCheck size={16} aria-hidden="true" />
        {value}
      </p>
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

function formatRequirementName(name: string) {
  return name.replace(/([A-Z])/g, " $1").toLowerCase();
}
