import { ArrowLeft, ArrowUpRight, Code2, ShieldCheck, WalletCards } from "lucide-react";
import Link from "next/link";
import { scoreLabel, tokenCompatibilityReports } from "@/lib/trust-signals";

export default function TokenCompatibilityPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/trust">
            <ArrowLeft size={16} aria-hidden="true" />
            Trust signals
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Native token compatibility reports
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Token Compatibility</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                Compatibility reports turn token issuance tests into wallet listing and issuer
                readiness signals.
              </p>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href="/api/trust/token-compatibility"
            >
              <Code2 size={16} aria-hidden="true" />
              JSON
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:px-8">
        {tokenCompatibilityReports.map((report) => (
          <article
            className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
            key={report.id}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#536023]">
                  {report.status} · {scoreLabel(report.score)}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{report.tokenSymbol}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#44443d]">
                  {report.fixtureId} supports wallet integration with badge {report.badgeId}.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="grid size-16 place-items-center bg-[#171717] text-2xl font-semibold text-white">
                  {report.score}
                </div>
                <Link
                  className="inline-flex items-center gap-2 border border-[#242424] bg-white px-3 py-2 text-sm font-medium"
                  href={`/trust/token-compatibility/${report.id}`}
                >
                  Open Detail
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {Object.entries(report.requirements).map(([name, passed]) => (
                <Metric key={name} label={name} value={passed ? "pass" : "fail"} />
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {report.wallets.map((wallet) => (
                <article className="border border-[#8b8b7a] bg-white p-3" key={wallet.name}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{wallet.name}</h3>
                    <span className="font-mono text-xs uppercase text-[#536023]">
                      {wallet.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#44443d]">{wallet.notes}</p>
                </article>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <WalletCards size={14} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 flex items-center gap-2 text-xl font-semibold">
        <ShieldCheck size={16} aria-hidden="true" />
        {value}
      </p>
    </div>
  );
}
