import { ArrowLeft, ArrowLeftRight, GitBranch } from "lucide-react";
import Link from "next/link";
import { BridgeSupplyPanel } from "@/components/bridge-supply-panel";
import { WalletGate } from "@/components/web3/wallet-controls";
import { NockWithdrawFlow } from "@/components/web3/nock-withdraw-flow";

export const dynamic = "force-dynamic";

export default function BridgePage() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Lab dashboard
          </Link>

          <div className="mt-5 flex items-center gap-2">
            <GitBranch size={18} aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#4A4A4A]">
              NOCK &lt;-&gt; tNOCK bridge · self-run testnet
            </span>
          </div>
          <h1 className="mt-2 text-4xl font-semibold">Cross-chain Bridge</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#4A4A4A]">
            Live stats for the NOCK&lt;-&gt;tNOCK bridge we built and operate ourselves: fakenet NOCK we
            mine gets locked by a bridge-deposit on Nockchain, and an equal tNOCK (minus the bridge fee)
            is minted on Base Sepolia by our 3-of-5 operator federation. The Base side is read live
            on-chain; the Nockchain side comes from the conservation audit snapshot. Read-only; mainnet
            stays gated.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <BridgeSupplyPanel />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={16} aria-hidden="true" />
              <p className="font-mono text-xs uppercase tracking-[0.12em]">Withdraw · burn tNOCK → native NOCK</p>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
              The cross-chain WRITE: burn your <code>tNOCK</code> on Base Sepolia with your fakenet payout
              address committed in the burn&apos;s lock root, then redeem the burn for native NOCK paid on
              the Nockchain fakenet. The burn is the receipt — it redeems exactly once and the destination
              can&apos;t change after the burn. Testnet-only; mainnet stays gated.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 border border-[#0B0B0B] px-3 py-2 text-sm font-medium"
            href="/swap"
          >
            Deposit (ETH → NOCK)
            <ArrowLeftRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <WalletGate message="Connect a wallet on Base Sepolia to burn tNOCK and withdraw native NOCK.">
          <NockWithdrawFlow />
        </WalletGate>
      </section>
    </main>
  );
}
