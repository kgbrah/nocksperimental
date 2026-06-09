"use client";

import Link from "next/link";
import { ConnectButton, NetworkSwitcher } from "@/components/web3/wallet-controls";

const NAV = [
  { href: "/play", label: "Play" },
  { href: "/lab/run", label: "Lab" },
  { href: "/bridge", label: "Bridge" },
  { href: "/trust", label: "Trust" },
  { href: "/nockchain", label: "Nockchain" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#0B0B0B] bg-[#FFFFFF]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-5">
          <Link href="/" className="font-mono text-sm font-semibold uppercase tracking-[0.14em]">
            Nocksperimental
          </Link>
          <nav className="hidden items-center gap-4 md:flex" aria-label="Primary">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="font-mono text-xs uppercase tracking-[0.12em] text-[#4A4A4A] transition hover:text-[#0B0B0B]"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <NetworkSwitcher />
          </div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
