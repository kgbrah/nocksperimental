"use client";

import { useAccount } from "wagmi";
import { Gamepad2, Wallet } from "lucide-react";
import { chainLabel, isChainEnabled } from "@/lib/networks";
import { ConnectButton } from "./wallet-controls";

// Player identity strip for the arcade: shows the connected wallet + chain (the player's testnet
// identity) and the connect prompt when disconnected. Settlement itself is gated by the action layer.
export function PlayerBar() {
  const { isConnected, address, chainId } = useAccount();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-[#0B0B0B] bg-[#F5F5F5] p-4 shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-center gap-2">
        <Gamepad2 size={16} aria-hidden="true" />
        {isConnected ? (
          <p className="font-mono text-xs uppercase tracking-[0.12em]">
            Player {address?.slice(0, 6)}…{address?.slice(-4)}
            <span className="text-[#737373]">
              {" "}
              · {chainLabel(chainId)} {isChainEnabled(chainId) ? "(live)" : "(gated)"}
            </span>
          </p>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-sm text-[#4A4A4A]">
            <Wallet size={14} aria-hidden="true" /> Connect a wallet to identify as a player on testnet.
          </p>
        )}
      </div>
      <ConnectButton />
    </div>
  );
}
