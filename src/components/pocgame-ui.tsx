"use client";

import { Check, X } from "lucide-react";

// Shared building blocks for the /pocgames commit-reveal components. Extracted from
// the original flip/dice components so every game renders the same Step accordion,
// monospace Field, and verification CheckRow.

export function Step({
  index,
  title,
  done,
  icon,
  children
}: {
  index: number;
  title: string;
  done: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#FFFFFF] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center bg-[#0B0B0B] text-xs font-semibold text-[#FFFFFF]">
            {index}
          </span>
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <span className={done ? "text-[#0B0B0B]" : "text-[#BFBFBF]"}>
          {done ? <Check size={16} aria-hidden="true" /> : icon}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#4A4A4A]">{label}</div>
      <div className="mt-1 break-all font-mono text-xs text-[#0B0B0B]">{value}</div>
    </div>
  );
}

export function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className={ok ? "text-[#0B0B0B]" : "text-[#B91C1C]"}>
        {ok ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
      </span>
      <span className="font-mono text-xs text-[#0B0B0B]">{label}</span>
    </li>
  );
}

export function VerdictBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={`px-2 py-1 text-xs font-semibold uppercase ${
        verified ? "bg-[#0B0B0B] text-[#FFFFFF]" : "bg-[#B91C1C] text-[#FFFFFF]"
      }`}
    >
      {verified ? "verified" : "rejected"}
    </span>
  );
}

export function TamperToggle({
  tamper,
  onChange
}: {
  tamper: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="mt-3 flex cursor-pointer items-center gap-2 border border-[#0B0B0B] bg-[#F5F5F5] px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={tamper}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#0B0B0B]"
      />
      Tamper with the revealed seed
    </label>
  );
}

/** flip the last hex digit of a seed — the canonical tamper used by every game's audit demo. */
export function tamperSeed(seed: string): string {
  return seed.slice(0, -1) + (seed.endsWith("0") ? "1" : "0");
}
