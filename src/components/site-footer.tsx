"use client";

// Global footer, mounted once in layout.tsx so it appears on EVERY page. Shows the project's Nockchain
// (base58) donation address (truncated + copy) and a Donate button that opens the connect/donate modal.
// When the address is unset, it fails closed to an "owner: set your address" hint instead of a chip.

import { useState } from "react";
import { Copy, Check, Heart } from "lucide-react";
import { DonateDialog } from "@/components/web3/donate-dialog";
import { useCopy } from "@/components/web3/use-copy";
import { NOCK_DONATION_ADDRESS, isPlaceholder, shortNockAddress } from "@/lib/donation";

const BTN =
  "inline-flex items-center gap-1.5 border-2 border-[#0B0B0B] bg-[#FFFFFF] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] shadow-[3px_3px_0_#0B0B0B] transition hover:bg-[#0B0B0B] hover:text-[#FFFFFF]";

export function SiteFooter() {
  const [open, setOpen] = useState(false);
  const { copied, copy } = useCopy();
  const unconfigured = isPlaceholder(NOCK_DONATION_ADDRESS);

  return (
    <footer className="mt-auto border-t-2 border-[#0B0B0B] bg-[#FFFFFF]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em]">Nocksperimental</p>
          <p className="max-w-md text-xs leading-5 text-[#737373]">
            A NockApp testing &amp; evidence lab. Testnet-first; not a security guarantee. Donations fund development.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">Donate NOCK</span>
          <div className="flex items-center gap-2">
            {unconfigured ? (
              <span className="border-2 border-dashed border-[#0B0B0B] px-2.5 py-1.5 font-mono text-[11px] text-[#737373]">
                owner: set your address
              </span>
            ) : (
              <button
                type="button"
                aria-label="Copy Nockchain donation address"
                className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0B] px-2.5 py-1.5 font-mono text-[11px] transition hover:bg-[#F5F5F5]"
                title={NOCK_DONATION_ADDRESS}
                onClick={() => copy(NOCK_DONATION_ADDRESS)}
              >
                {shortNockAddress(NOCK_DONATION_ADDRESS)}
                {copied ? <Check aria-hidden="true" size={12} /> : <Copy aria-hidden="true" size={12} />}
              </button>
            )}
            <button type="button" className={BTN} onClick={() => setOpen(true)}>
              <Heart aria-hidden="true" size={13} /> Donate
            </button>
          </div>
        </div>
      </div>

      <DonateDialog open={open} onClose={() => setOpen(false)} defaultTab="native" />
    </footer>
  );
}
