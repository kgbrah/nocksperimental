import { ArrowLeft, GitBranch, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { readBridgeStatus } from "@/lib/base-bridge";
import { DEFAULT_CHAIN_ID } from "@/lib/networks";
import { BridgeStatePanel } from "@/components/web3/bridge-state-panel";

export const dynamic = "force-dynamic";

export default async function BridgePage() {
  const status = await readBridgeStatus(DEFAULT_CHAIN_ID);

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
              Nockchain &lt;-&gt; Base bridge · live testnet
            </span>
          </div>
          <h1 className="mt-2 text-4xl font-semibold">Cross-chain Bridge</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#4A4A4A]">
            The real Nockchain&lt;-&gt;Base federated bridge (3-of-5 mint-and-burn) deployed and verified on
            Base Sepolia. This panel reads its live on-chain state directly — the federation roster, the
            signature threshold, withdrawal status, and recent mint/burn activity — exactly what the
            cross-chain invariants check, now visible in the browser. Read-only; mainnet stays gated.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <BridgeStatePanel initial={status} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 lg:px-8">
        <div className="border-2 border-dashed border-[#0B0B0B] bg-[#F5F5F5] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} aria-hidden="true" />
            <p className="font-mono text-xs uppercase tracking-[0.12em]">Withdraw (burn-to-Nockchain) — next</p>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A4A4A]">
            The connected-wallet burn-to-withdraw flow (calling Nock.sol from your own wallet, with the
            Nockchain destination encoded into the lock root) is the real cross-chain WRITE this surface
            is built toward. It lands once the testnet write path + lock-root derivation are wired and
            funded — and stays testnet-only until proven, mirroring the live-base promotion gate.
          </p>
        </div>
      </section>
    </main>
  );
}
