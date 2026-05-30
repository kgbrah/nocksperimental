import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Cpu,
  Gauge,
  ShieldCheck,
  UsersRound,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import {
  computeBenchmarkProfiles,
  solverScorecards,
  tokenCompatibilityReports,
  trustConsumerCategories,
  trustConsumersForCategory,
  verifiedBadges
} from "@/lib/trust-signals";

const trustLinks = [
  {
    href: "/trust/badges",
    label: "Verified badges",
    value: verifiedBadges.length.toString(),
    icon: BadgeCheck
  },
  {
    href: "/trust/solver-scores",
    label: "Solver scores",
    value: solverScorecards.length.toString(),
    icon: Gauge
  },
  {
    href: "/trust/token-compatibility",
    label: "Token reports",
    value: tokenCompatibilityReports.length.toString(),
    icon: WalletCards
  },
  {
    href: "/trust/compute-benchmarks",
    label: "Compute profiles",
    value: computeBenchmarkProfiles.length.toString(),
    icon: Cpu
  }
];

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Lab dashboard
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Trust infrastructure
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Trust Signals</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                Verification badges, solver quality, token compatibility, and compute provider
                benchmarks built from NockApp lab evidence.
              </p>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href="/api/trust"
            >
              <ShieldCheck size={16} aria-hidden="true" />
              Trust JSON
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 lg:grid-cols-4 lg:px-8">
        {trustLinks.map((item) => {
          const Icon = item.icon;

          return (
            <a
              className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
              href={item.href}
              key={item.href}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="grid size-9 place-items-center bg-[#171717] text-white">
                  <Icon size={17} aria-hidden="true" />
                </div>
                <ArrowUpRight size={16} aria-hidden="true" />
              </div>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-semibold">{item.value}</p>
            </a>
          );
        })}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-10 place-items-center bg-[#171717] text-white">
            <UsersRound size={18} aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
              Adoption proof
            </p>
            <h2 className="text-2xl font-semibold">Who uses the trust signals</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {trustConsumerCategories.map((category) => (
            <article
              className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
              key={category}
            >
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#536023]">
                {category}
              </p>
              <div className="mt-3 grid gap-3">
                {trustConsumersForCategory(category).map((consumer) => (
                  <div className="border border-[#8b8b7a] bg-white p-3" key={consumer.id}>
                    <h3 className="font-semibold">{consumer.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#44443d]">
                      {consumer.uses.map((use) => use.purpose).join(" ")}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
