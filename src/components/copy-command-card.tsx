"use client";

import { Check, Copy } from "lucide-react";

import { useCopy } from "@/components/web3/use-copy";

type CopyCommandCardProps = {
  readonly label: string;
  readonly description: string;
  readonly command: string;
};

export function CopyCommandCard({ label, description, command }: CopyCommandCardProps) {
  const { copied, copy } = useCopy();
  const Icon = copied ? Check : Copy;

  return (
    <article className="flex h-full flex-col border border-[#404040] bg-[#171717] p-4 text-[#FFFFFF]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{label}</h3>
          <p className="mt-1 max-w-md text-xs leading-5 text-[#A3A3A3]">{description}</p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-2 border border-[#737373] bg-[#FFFFFF] px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#0B0B0B] transition hover:bg-[#D4D4D4]"
          onClick={() => copy(command)}
          aria-label={`Copy ${label} command`}
        >
          <Icon size={14} aria-hidden="true" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="mt-4 min-h-24 overflow-x-auto whitespace-pre border border-[#404040] bg-[#0B0B0B] p-3 font-mono text-xs leading-5 text-[#FFFFFF]"
      ><code>{command}</code></pre>
    </article>
  );
}
