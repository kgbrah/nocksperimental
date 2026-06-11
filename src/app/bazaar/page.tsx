import { ArrowLeft, ArrowUpRight, BadgeCheck, Coins, Store } from "lucide-react";
import Link from "next/link";
import { buildBazaarDirectory } from "@/lib/bazaar/aggregate";
import { defaultBazaarFilters } from "@/lib/bazaar/types";

export const dynamic = "force-dynamic";

export default async function BazaarPage() {
  const directory = await buildBazaarDirectory(defaultBazaarFilters());

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
                Agent discovery
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Verified Bazaar</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                Payable NockApp services an agent can both pay for (x402) and trust (verified
                registry badges): own metered endpoints, registry-backed solvers, compute providers,
                and token issuers, plus facilitator discoveries when a facilitator is online.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                <span>{directory.counts.total} listings</span>
                <span>{directory.counts.verified} verified</span>
                <span>{directory.counts.payable} payable</span>
                <span>facilitator {directory.facilitator.reachable ? "online" : "offline"}</span>
              </div>
            </div>
            {/* Links to a JSON API route, not a page — a plain anchor is correct here. */}
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href="/api/bazaar" target="_blank" rel="noreferrer"
            >
              <Store size={16} aria-hidden="true" />
              Bazaar JSON
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {directory.listings.map((listing) => (
          <article
            className="flex flex-col border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
            key={listing.id}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#536023]">
                {listing.kind}
              </span>
              {listing.trust.verified ? (
                <span className="inline-flex items-center gap-1 border border-[#242424] bg-[#dce8ee] px-2 py-1 font-mono text-xs uppercase">
                  <BadgeCheck size={13} aria-hidden="true" />
                  verified
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 text-lg font-semibold">{listing.service}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-[#44443d]">{listing.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
              <span className="border border-[#8b8b7a] bg-white px-2 py-1">{listing.source}</span>
              {listing.payable && listing.payment ? (
                <span className="inline-flex items-center gap-1 border border-[#242424] bg-[#f7f3ea] px-2 py-1">
                  <Coins size={13} aria-hidden="true" />
                  {listing.payment.priceNicks} nicks
                </span>
              ) : (
                <span className="border border-[#8b8b7a] bg-white px-2 py-1">trust-only</span>
              )}
              {listing.trust.score != null ? (
                <span className="text-[#3d3d35]">score {listing.trust.score}</span>
              ) : null}
            </div>
            <a
              className="mt-4 inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-3 py-2 text-sm font-medium text-white"
              href={`/api/bazaar/${encodeURIComponent(listing.id)}`} target="_blank" rel="noreferrer"
            >
              Listing JSON
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </article>
        ))}
      </section>
    </main>
  );
}
