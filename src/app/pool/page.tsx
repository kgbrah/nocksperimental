import { ArrowLeft, Droplets, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { WalletGate } from "@/components/web3/wallet-controls";
import { NockAmm } from "@/components/web3/nock-amm";
import { ammAddress, AMM_DONATION_FEE_BPS, AMM_LP_FEE_BPS, bpsToPercent } from "@/lib/amm-contracts";
import { BASE_DONATION_ADDRESS } from "@/lib/donation";
import { DEFAULT_CHAIN_ID, explorerAddress } from "@/lib/networks";

export const dynamic = "force-dynamic";

export default function PoolPage() {
  const amm = ammAddress(DEFAULT_CHAIN_ID);

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/swap">
            <ArrowLeft size={16} aria-hidden="true" />
            Swap
          </Link>
          <div className="mt-5 flex items-center gap-2">
            <Droplets size={18} aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#4A4A4A]">
              Liquidity pool · Base Sepolia
            </span>
          </div>
          <h1 className="mt-2 text-4xl font-semibold">ETH / tNOCK liquidity pool</h1>
          <p className="mt-3 text-base leading-7 text-[#4A4A4A]">
            A real constant-product (<code>x·y=k</code>) automated market maker on Base Sepolia, the
            same mechanism behind Uniswap. Provide ETH + tNOCK liquidity to earn the trading fee, or
            swap either direction against the pool. From tNOCK you can reach native NOCK through the{" "}
            <Link href="/swap" className="underline decoration-[#737373] underline-offset-2">
              bridge swap
            </Link>
            .
          </p>
          <div className="mt-4 border border-[#0B0B0B] bg-[#F6F6F6] px-4 py-3 text-sm leading-6 text-[#4A4A4A]">
            <strong className="text-[#0B0B0B]">Fee disclosure.</strong> Every swap charges{" "}
            {bpsToPercent(AMM_LP_FEE_BPS)}% to liquidity providers (retained in the pool, the standard
            AMM LP incentive) plus a {bpsToPercent(AMM_DONATION_FEE_BPS)}% donation routed on-chain to
            the project donation wallet{" "}
            <a
              href={explorerAddress(DEFAULT_CHAIN_ID, BASE_DONATION_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs underline decoration-[#737373] underline-offset-2"
            >
              {BASE_DONATION_ADDRESS.slice(0, 10)}…{BASE_DONATION_ADDRESS.slice(-6)}
            </a>
            . Providing liquidity carries impermanent-loss risk. This is testnet value only — Base
            Sepolia ETH and test tNOCK, with no monetary value.
          </div>
          {amm ? (
            <a
              href={explorerAddress(DEFAULT_CHAIN_ID, amm)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]"
            >
              <ShieldCheck size={13} aria-hidden="true" /> Pool {amm.slice(0, 10)}…{amm.slice(-6)}
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-md px-5 py-8 lg:px-8">
        <WalletGate message="Connect a wallet on Base Sepolia to provide liquidity or swap.">
          <NockAmm />
        </WalletGate>
      </section>
    </main>
  );
}
