import { ArrowLeft, ArrowLeftRight, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { WalletGate } from "@/components/web3/wallet-controls";
import { NockSwapFlow } from "@/components/web3/nock-swap-flow";
import { swapVaultAddress } from "@/lib/swap-contracts";
import { tNockAddress } from "@/lib/game-contracts";
import { DEFAULT_CHAIN_ID, explorerAddress } from "@/lib/networks";

export const dynamic = "force-dynamic";

export default function SwapPage() {
  const vault = swapVaultAddress(DEFAULT_CHAIN_ID);
  const tnock = tNockAddress(DEFAULT_CHAIN_ID);

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/bridge">
              <ArrowLeft size={16} aria-hidden="true" />
              Bridge
            </Link>
            <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/swap/out">
              <ArrowLeftRight size={16} aria-hidden="true" />
              Swap out to ETH
            </Link>
          </div>
          <div className="mt-5 flex items-center gap-2">
            <ArrowLeftRight size={18} aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#4A4A4A]">
              Swap · Base Sepolia → Nockchain fakenet
            </span>
          </div>
          <h1 className="mt-2 text-4xl font-semibold">Swap into native NOCK</h1>
          <p className="mt-3 text-base leading-7 text-[#4A4A4A]">
            Three legs, no minimum: swap Base Sepolia ETH for <code>tNOCK</code> from the vault&apos;s
            on-chain reserves, burn the <code>tNOCK</code> through our bridge token with your fakenet
            payout address committed in the burn&apos;s lock root, and redeem the burn for native NOCK
            paid out on the Nockchain fakenet. The burn transaction is the receipt — one burn redeems
            exactly once, and the payout address can&apos;t be changed after the burn.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            {vault ? (
              <a
                href={explorerAddress(DEFAULT_CHAIN_ID, vault)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]"
              >
                <ShieldCheck size={13} aria-hidden="true" /> Vault {vault.slice(0, 10)}…{vault.slice(-6)}
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            ) : null}
            {tnock ? (
              <a
                href={explorerAddress(DEFAULT_CHAIN_ID, tnock)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]"
              >
                <ShieldCheck size={13} aria-hidden="true" /> tNOCK {tnock.slice(0, 10)}…{tnock.slice(-6)}
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
        <WalletGate message="Connect a wallet on Base Sepolia to swap testnet ETH into native NOCK.">
          <NockSwapFlow />
        </WalletGate>

        <div className="mt-6 border border-[#0B0B0B] bg-[#F6F6F6] px-4 py-3 text-sm leading-6 text-[#4A4A4A]">
          <p>
            <strong className="text-[#0B0B0B]">What is and isn&apos;t trustless here:</strong> the swap
            and the burn are plain on-chain transactions you sign yourself; the burn&apos;s{" "}
            <code>lockRoot</code> binds your payout address on-chain. The final payout is made by our
            co-located orchestrator after it verifies the burn against Base Sepolia — a testnet stand-in
            for the bridge&apos;s withdrawal sequencer. Everything is testnet value: Base Sepolia ETH,
            test tNOCK, fakenet NOCK.
          </p>
        </div>
      </section>
    </main>
  );
}
