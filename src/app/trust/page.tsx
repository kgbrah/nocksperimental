import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Cpu,
  Database,
  GitBranch,
  Gauge,
  RadioTower,
  ShieldCheck,
  UsersRound,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { createTrustEventFeed } from "@/lib/trust-event-feed";
import { scoreHistorySummaries } from "@/lib/trust-score-history";
import { trustUpdateChainSummary } from "@/lib/trust-update-log";
import {
  badgeIssuanceReceipts,
  badgeRevocations,
  computeBenchmarkProfiles,
  resolvedBadges,
  resolvedTrustConsumersForCategory,
  solverScorecards,
  tokenCompatibilityReports,
  trustConsumerCategories,
} from "@/lib/trust-signals";
import { createVerificationIndex } from "@/lib/verification-index";

export const dynamic = "force-dynamic";

const verificationIndex = createVerificationIndex();

export default function TrustPage() {
  const trustFeed = createTrustEventFeed();
  const trustLinks = createTrustLinks(trustFeed);

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
                Trust infrastructure
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Trust Signals</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Verification badges, signed issuance receipts, revocation records, solver quality,
                token compatibility, and compute provider benchmarks built from NockApp lab
                evidence.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                <span>{badgeIssuanceReceipts.length} signed issuance receipts</span>
                <span>{badgeRevocations.length} badge revocation record</span>
                <span>{scoreHistorySummaries.length} score histories</span>
                <span>{trustUpdateChainSummary.entryCount} append-only updates</span>
                <span>{trustFeed.eventCount} trust feed events</span>
              </div>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
              href="/api/trust"
            >
              <ShieldCheck size={16} aria-hidden="true" />
              Trust JSON
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {trustLinks.map((item) => {
          const Icon = item.icon;

          return (
            <a
              className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
              href={item.href}
              key={item.href}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="grid size-9 place-items-center bg-[#0B0B0B] text-white">
                  <Icon size={17} aria-hidden="true" />
                </div>
                <ArrowUpRight size={16} aria-hidden="true" />
              </div>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-semibold">{item.value}</p>
            </a>
          );
        })}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-10 place-items-center bg-[#0B0B0B] text-white">
            <UsersRound size={18} aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
              Adoption proof
            </p>
            <h2 className="text-2xl font-semibold">Who uses the trust signals</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {trustConsumerCategories.map((category) => (
            <article
              className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]"
              key={category}
            >
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                {category}
              </p>
              <div className="mt-3 grid gap-3">
                {resolvedTrustConsumersForCategory(category).map((consumer) => (
                  <div className="border border-[#0B0B0B] bg-white p-3" key={consumer.id}>
                    <h3 className="font-semibold">{consumer.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
                      {consumer.uses.map((use) => use.purpose).join(" ")}
                    </p>
                    <div className="mt-3 grid gap-2 border-t border-[#0B0B0B] pt-3">
                      {consumer.resolvedUses.map((use) => (
                        <div className="grid gap-1" key={`${consumer.id}-${use.kind}-${use.purpose}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
                              {use.evidenceLabel ?? "Unresolved evidence"}
                            </span>
                            <span className="border border-[#0B0B0B] bg-[#FFFFFF] px-2 py-1 font-mono text-xs uppercase">
                              {use.evidenceStatus ?? "missing"}
                            </span>
                            {typeof use.score === "number" ? (
                              <span className="font-mono text-xs text-[#4A4A4A]">
                                score {use.score}
                              </span>
                            ) : null}
                          </div>
                          <p className="break-all font-mono text-xs leading-5 text-[#4A4A4A]">
                            {use.snapshotRoot ?? use.reportSlug ?? use.badgeId ?? use.kind}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Link
                      className="mt-3 inline-flex items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-3 py-2 text-sm font-medium text-white"
                      href={`/trust/consumers/${consumer.id}`}
                    >
                      Open Consumer
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
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

function createTrustLinks(trustFeed: ReturnType<typeof createTrustEventFeed>) {
  return [
    {
      href: "/verify",
      label: "Verify evidence",
      value: verificationIndex.verifierCount.toString(),
      icon: ShieldCheck
    },
    {
      href: "/trust/badges",
      label: "Badge records",
      value: resolvedBadges.length.toString(),
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
    },
    {
      href: "/trust/score-history",
      label: "Score histories",
      value: scoreHistorySummaries.length.toString(),
      icon: Database
    },
    {
      href: "/trust/updates",
      label: "Update log",
      value: trustUpdateChainSummary.entryCount.toString(),
      icon: GitBranch
    },
    {
      href: "/trust/feed",
      label: "Event feed",
      value: trustFeed.eventCount.toString(),
      icon: RadioTower
    }
  ];
}
