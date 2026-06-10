"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeftRight, Coins, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import type { BridgeSupply } from "@/lib/bridge-supply";

export function BridgeSupplyPanel() {
  const [data, setData] = useState<BridgeSupply | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/bridge/supply", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (active) setData(d);
        })
        .catch(() => {
          if (active) setErr(true);
        });
    load();
    const t = setInterval(load, 30000); // keep it live
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const d = data;

  return (
    <div className="space-y-4">
      {/* DISCLOSURE — always visible, prominent. */}
      <div className="border-2 border-[#0B0B0B] bg-[#FFF4D6] p-4 shadow-[4px_4px_0_#0B0B0B]">
        <p className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.12em]">
          <AlertTriangle size={15} aria-hidden="true" /> {d?.disclosure.headline ?? "Unofficial bridge"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#3A3A3A]">
          {d?.disclosure.body ??
            "This is NOT an official Nockchain testnet bridge. We deployed the contracts and run all five bridge operator nodes ourselves. No affiliation with Zorp or the official Nockchain project — we just think they're super cool. tNOCK is a self-issued testnet token backed by fakenet NOCK we mine; it has no real value."}
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#737373]">
          {d?.disclosure.signature ?? "Vibecoded by kg & Claude."}
        </p>
      </div>

      <div className="border-2 border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
        <div className="flex items-center justify-between">
          <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em]">
            <ArrowLeftRight size={15} aria-hidden="true" /> Testnet supply &amp; conservation
          </p>
          {!d && !err ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
        </div>

        {err ? (
          <p className="mt-3 text-sm text-[#737373]">Supply metrics are unavailable right now.</p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Metric icon={<Coins size={13} />} label="NOCK mined (testnet total)" value={d ? `${d.nock.mined.nock} NOCK` : "…"} sub={d ? `${d.nock.chainHeight.toLocaleString()} blocks × ${d.nock.blockRewardNock.toLocaleString()} NOCK` : undefined} />
              <Metric icon={<Coins size={13} />} label="NOCK spendable" value={d ? `${d.nock.spendable.nock} NOCK` : "…"} sub="unlocked, miner-controlled" />
              <Metric icon={<ArrowLeftRight size={13} />} label="NOCK locked in bridge" value={d ? `${d.bridge.lockedNock} NOCK` : "…"} sub={d ? `${d.bridge.depositsMinted} deposit(s) · ${d.bridge.operatorModel}` : undefined} />
              <Metric icon={<Coins size={13} />} label="tNOCK total supply (Base)" value={d ? `${d.tnock.totalSupply.tnock.toLocaleString("en-US", { maximumFractionDigits: 4 })} tNOCK` : "…"} sub="wrapped on Base Sepolia" />
              <Metric icon={<ShieldCheck size={13} />} label="tNOCK minted / burned" value={d ? `${d.tnock.mintedNock} / ${d.tnock.burnedNock}` : "…"} sub="cumulative (withdrawals disabled → 0 burns)" />
              <Metric icon={<ArrowLeftRight size={13} />} label="Bridge fee retained" value={d ? `${d.bridge.bridgeFeeNock} NOCK` : "…"} sub="locked, not minted" />
            </div>

            {/* Conservation invariant */}
            <div className="mt-4 border-t-2 border-dashed border-[#0B0B0B] pt-4">
              <div className="flex flex-wrap items-center gap-2">
                {d ? (
                  d.conservation.backed && d.conservation.conserved ? (
                    <ShieldCheck size={16} aria-hidden="true" />
                  ) : (
                    <ShieldAlert size={16} aria-hidden="true" />
                  )
                ) : null}
                <p className="font-mono text-[11px] uppercase tracking-[0.12em]">
                  {d
                    ? `Backing: every tNOCK is backed by locked NOCK — ${d.conservation.backed ? "VERIFIED" : "CHECK"}` +
                      (d.conservation.conserved ? "" : " · CONSERVATION BROKEN (negative residual)")
                    : "Backing: …"}
                </p>
              </div>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#4A4A4A]">
                {d
                  ? `Conservation: spendable + locked = ${d.conservation.consistencyPct.toFixed(2)}% of mined ` +
                    `(residual ${d.conservation.residualNock} NOCK = genesis + immature coinbase). ` +
                    `Spendable NOCK + tNOCK = ${d.conservation.spendablePlusTnockNock} NOCK; mined = ${d.conservation.minedNock} NOCK. ` +
                    `NOCK is only ever created by mining — a bridge-deposit MOVES it (spendable → locked) and mints an equal tNOCK minus fee.`
                  : "…"}
              </p>
              {d ? (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#737373]">
                  Base: live · Nockchain: snapshot {new Date(d.asOf.nock).toISOString().slice(0, 10)}
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="border-2 border-[#0B0B0B] p-3">
      <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#737373]">
        {icon} {label}
      </p>
      <p className="mt-1 font-mono text-base font-semibold">{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-[#9A9A9A]">{sub}</p> : null}
    </div>
  );
}
