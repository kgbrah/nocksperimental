import { ArrowLeft, Coins, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { WalletGate } from "@/components/web3/wallet-controls";
import { ForfeitFlipOnchain } from "@/components/web3/forfeit-flip-onchain";
import { forfeitFlipAddress } from "@/lib/game-contracts";
import { DEFAULT_CHAIN_ID, explorerAddress } from "@/lib/networks";

export const dynamic = "force-dynamic";

export default function ForfeitFlipOnchainPage() {
  const contract = forfeitFlipAddress(DEFAULT_CHAIN_ID);

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/play">
            <ArrowLeft size={16} aria-hidden="true" />
            Arcade
          </Link>
          <div className="mt-5 flex items-center gap-2">
            <Coins size={18} aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#4A4A4A]">
              Forfeit Flip · on-chain · Base Sepolia
            </span>
          </div>
          <h1 className="mt-2 text-4xl font-semibold">Forfeit Flip (on-chain)</h1>
          <p className="mt-3 text-base leading-7 text-[#4A4A4A]">
            Real testnet-ETH stakes settled by a deployed, audited contract. The house commits to a random
            seed before you bet (it can&apos;t grind), you add your own entropy and stake, the house
            reveals, and the contract settles — even money. Every outcome is recomputable from the revealed
            seeds, and if the house stalls you reclaim your full stake after the timeout.
          </p>
          {contract ? (
            <a
              href={explorerAddress(DEFAULT_CHAIN_ID, contract)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]"
            >
              <ShieldCheck size={13} aria-hidden="true" /> Contract {contract.slice(0, 10)}…{contract.slice(-6)}
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
        <WalletGate message="Connect a wallet on Base Sepolia to play for real testnet ETH.">
          <ForfeitFlipOnchain />
        </WalletGate>
      </section>
    </main>
  );
}
