"use client";

import { useState } from "react";
import { Activity, CheckCircle2, Circle, RefreshCw, ShieldCheck } from "lucide-react";
import type { BridgeStatus } from "@/lib/base-bridge";
import { explorerAddress } from "@/lib/networks";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-2 border-[#0B0B0B] p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

export function BridgeStatePanel({ initial }: { initial: BridgeStatus }) {
  const [status, setStatus] = useState<BridgeStatus>(initial);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/base/state?chainId=${status.chainId}`, { cache: "no-store" });
      setStatus(await res.json());
    } catch {
      /* keep last status */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {status.live ? (
            <CheckCircle2 aria-hidden="true" size={18} />
          ) : (
            <Circle aria-hidden="true" size={18} className="text-[#737373]" />
          )}
          <p className="font-mono text-xs uppercase tracking-[0.12em]">
            {status.network} bridge · {status.live ? "live" : "unreachable"}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0B] bg-[#FFFFFF] px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.12em] shadow-[3px_3px_0_#0B0B0B] transition hover:bg-[#0B0B0B] hover:text-[#FFFFFF] disabled:opacity-40"
        >
          <RefreshCw aria-hidden="true" size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {status.error ? (
        <p className="border-2 border-[#0B0B0B] bg-[#F5F5F5] p-3 text-sm text-[#4A4A4A]">{status.error}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Head block">
          <span className="font-mono">{status.headBlock.toLocaleString()}</span>
        </Field>
        <Field label="Federation">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck aria-hidden="true" size={14} />
            {status.threshold}-of-{status.signers.length}
          </span>
        </Field>
        <Field label="Withdrawals">
          {status.withdrawalsEnabled == null ? "—" : status.withdrawalsEnabled ? "enabled" : "disabled"}
        </Field>
        <Field label={`Events (last ${(status.window.toBlock - status.window.fromBlock).toLocaleString()} blocks)`}>
          <span className="inline-flex items-center gap-1.5">
            <Activity aria-hidden="true" size={14} />
            {status.eventCounts.mints} mint · {status.eventCounts.burns} burn
          </span>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="MessageInbox (mints)">
          <a
            href={explorerAddress(status.chainId, status.inbox)}
            target="_blank"
            rel="noreferrer"
            className="break-all font-mono text-xs underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]"
          >
            {status.inbox || "—"}
          </a>
        </Field>
        <Field label="Nock.sol (burns / withdrawals)">
          <a
            href={explorerAddress(status.chainId, status.nock)}
            target="_blank"
            rel="noreferrer"
            className="break-all font-mono text-xs underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]"
          >
            {status.nock || "—"}
          </a>
        </Field>
      </div>

      {status.signers.length > 0 ? (
        <Field label="Live bridge-node roster (read fresh on-chain)">
          <ul className="mt-1 space-y-1">
            {status.signers.map((s, i) => (
              <li key={s} className="break-all font-mono text-xs text-[#4A4A4A]">
                <span className="text-[#737373]">node {i}</span>{" "}
                <a
                  href={explorerAddress(status.chainId, s)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]"
                >
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </Field>
      ) : null}

      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#737373]">
        Read-only · checked {new Date(status.checkedAt).toLocaleString()} · testnet
      </p>
    </div>
  );
}
