"use client";

// Operator tool: turn one or more winners into a single ready-to-run `nockchain-wallet create-tx`
// command for native NOCK payouts. This is a ONE-WAY transfer (not a swap) — the page builds only the
// command string; the operator signs and broadcasts locally with their CLI wallet, so keys never touch
// the browser. Connecting Iris is optional and only shows which sending address the operator controls.

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, Coins, Copy, Plus, Puzzle, Terminal, Trash2 } from "lucide-react";
import { buildBatchPayoutCommand, totalPayoutNock, type PayoutRecipient } from "@/lib/nock-payout";
import { useNockWallet } from "@/components/web3/nock-wallet-provider";
import { useCopy } from "@/components/web3/use-copy";
import { IRIS_INSTALL_URL } from "@/lib/iris-provider";
import { shortNockAddress } from "@/lib/donation";

const BTN =
  "inline-flex items-center justify-center gap-1.5 border-2 border-[#0B0B0B] bg-[#FFFFFF] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] shadow-[3px_3px_0_#0B0B0B] transition hover:bg-[#0B0B0B] hover:text-[#FFFFFF] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";
const INPUT = "w-full border-2 border-[#0B0B0B] px-3 py-2 font-mono text-sm focus:outline-none";

type Row = { address: string; nock: string };

export default function PayoutsPage() {
  const nock = useNockWallet();
  const cmdCopy = useCopy();
  const [rows, setRows] = useState<Row[]>([{ address: "", nock: "" }]);
  const [fee, setFee] = useState("10");
  const [names, setNames] = useState("");

  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { address: "", nock: "" }]);
  const removeRow = (i: number) => setRows((rs) => (rs.length === 1 ? rs : rs.filter((_, idx) => idx !== i)));

  // Only recipients with both fields filled count toward the command/total.
  const recipients: PayoutRecipient[] = useMemo(
    () => rows.filter((r) => r.address.trim() && r.nock.trim()).map((r) => ({ address: r.address.trim(), nock: r.nock.trim() })),
    [rows]
  );

  const { command, total, error } = useMemo(() => {
    if (recipients.length === 0) return { command: "", total: "0", error: "" };
    try {
      return {
        command: buildBatchPayoutCommand(recipients, fee || "0", names || undefined),
        total: totalPayoutNock(recipients),
        error: ""
      };
    } catch (e) {
      return { command: "", total: "0", error: e instanceof Error ? e.message : "Invalid payout." };
    }
  }, [recipients, fee, names]);

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <div className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] text-[#737373] hover:text-[#0B0B0B]">
          <ArrowLeft size={13} aria-hidden="true" /> Home
        </Link>

        <h1 className="mt-4 inline-flex items-center gap-2 text-3xl font-semibold">
          <Coins size={26} aria-hidden="true" /> Native NOCK payouts
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#4A4A4A]">
          Pay winners in native NOCK with a one-way transfer (not a swap). Add recipients, then copy the
          generated <code className="font-mono">nockchain-wallet create-tx</code> command and run it with your
          CLI wallet. <strong>This page never touches your keys</strong> — you sign and broadcast locally.
        </p>

        {/* Optional: which operator address is connected (informational only). */}
        <div className="mt-6 border-2 border-[#0B0B0B] bg-[#F5F5F5] p-3">
          <p className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">
            <Puzzle size={12} aria-hidden="true" /> Paying from (optional)
          </p>
          {nock.kind === "iris" && nock.address ? (
            <span className="font-mono text-xs">Iris connected · {shortNockAddress(nock.address)}</span>
          ) : nock.irisAvailable ? (
            <button type="button" disabled={nock.isConnecting} className={BTN} onClick={nock.connectIris}>
              {nock.isConnecting ? "Connecting…" : "Connect Iris"}
            </button>
          ) : (
            <a href={IRIS_INSTALL_URL} target="_blank" rel="noreferrer" className="font-mono text-xs underline">
              Iris not detected — install it
            </a>
          )}
          {nock.error ? <p className="mt-1 text-xs text-[#0B0B0B]">{nock.error}</p> : null}
        </div>

        {/* Recipients */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">Recipients</p>
            <button type="button" className={BTN} onClick={addRow}>
              <Plus size={13} aria-hidden="true" /> Add
            </button>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
              <input
                className={INPUT}
                placeholder="winner Nock address (base58)"
                value={r.address}
                onChange={(e) => update(i, { address: e.target.value })}
              />
              <input
                className={`${INPUT} w-28`}
                inputMode="decimal"
                placeholder="NOCK"
                value={r.nock}
                onChange={(e) => update(i, { nock: e.target.value })}
              />
              <button
                type="button"
                aria-label="Remove recipient"
                className={`${BTN} px-2`}
                disabled={rows.length === 1}
                onClick={() => removeRow(i)}
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">Fee (nicks)</p>
            <input className={INPUT} inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">Input notes (--names)</p>
            <input className={INPUT} placeholder="[first1 last1]" value={names} onChange={(e) => setNames(e.target.value)} />
          </div>
        </div>

        {/* Output */}
        <div className="mt-6">
          <p className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">
            <Terminal size={12} aria-hidden="true" /> create-tx command
            {recipients.length > 0 && !error ? ` · ${recipients.length} recipient(s) · ${total} NOCK total` : ""}
          </p>
          {error ? (
            <p role="alert" aria-live="assertive" className="text-sm text-[#0B0B0B]">
              <AlertTriangle size={14} aria-hidden="true" className="mr-1 inline" />
              {error}
            </p>
          ) : command ? (
            <div className="flex items-stretch gap-2">
              <pre className="flex-1 overflow-x-auto border-2 border-[#0B0B0B] bg-[#0B0B0B] p-3 font-mono text-[11px] leading-5 text-[#FFFFFF]">
                {command}
              </pre>
              <button type="button" aria-label="Copy command" className={BTN} onClick={() => cmdCopy.copy(command)}>
                {cmdCopy.copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
              </button>
            </div>
          ) : (
            <p className="text-sm text-[#737373]">Add at least one recipient with an address and a NOCK amount.</p>
          )}
          <p className="mt-2 text-xs text-[#737373]">
            Replace <code className="font-mono">[first1 last1]</code> with your own input-note names from{" "}
            <code className="font-mono">nockchain-wallet list-notes</code>. Amounts are converted to nicks
            (65536 nicks = 1 NOCK); fees are nick-denominated.
          </p>
        </div>
      </div>
    </main>
  );
}
