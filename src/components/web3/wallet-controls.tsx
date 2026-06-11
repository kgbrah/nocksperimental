"use client";

import type { ReactNode } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { AlertTriangle, ChevronRight, Lock, Wallet } from "lucide-react";
import {
  APP_NETWORKS,
  DEFAULT_CHAIN_ID,
  appNetwork,
  chainLabel,
  isChainEnabled,
  isKnownChain
} from "@/lib/networks";

const BTN =
  "inline-flex items-center gap-1.5 border-2 border-[#0B0B0B] bg-[#FFFFFF] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] shadow-[3px_3px_0_#0B0B0B] transition hover:bg-[#0B0B0B] hover:text-[#FFFFFF] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";

function shortAddr(a?: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

// Connect / account button. Opens the Reown AppKit modal (WalletConnect + injected + mobile QR).
export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();

  if (!isConnected) {
    return (
      <button type="button" className={BTN} onClick={() => open()}>
        <Wallet aria-hidden="true" size={14} /> Connect wallet
      </button>
    );
  }
  return (
    <button type="button" className={BTN} onClick={() => open({ view: "Account" })}>
      <Wallet aria-hidden="true" size={14} /> {shortAddr(address)}
    </button>
  );
}

// Current network + switch controls. Both chains are switchable so a user can SEE mainnet, but a gated
// chain is labelled and its writes are blocked downstream (WalletGate / action layer).
export function NetworkSwitcher() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) return null;

  const known = isKnownChain(chainId);
  const enabled = isChainEnabled(chainId);
  const current = appNetwork(chainId);

  const statusLabel = !known ? "unsupported" : enabled ? "live" : "gated";
  const dotClass = !known || !enabled ? "bg-[#737373]" : "bg-[#0B0B0B]";

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0B] px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.12em]">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dotClass}`} />
        {known ? current?.shortLabel : `Chain ${chainId}`}
        <span className="text-[#737373]">· {statusLabel}</span>
      </span>
      {Object.values(APP_NETWORKS).map((net) =>
        net.chainId === chainId ? null : (
          <button
            key={net.chainId}
            type="button"
            className={BTN}
            disabled={isPending}
            onClick={() => switchChain({ chainId: net.chainId })}
            title={net.enabled ? `Switch to ${net.label}` : net.gateReason}
          >
            {net.enabled ? null : <Lock aria-hidden="true" size={12} />}
            {net.shortLabel}
          </button>
        )
      )}
    </div>
  );
}

// Banner shown when the wallet is on a gated mainnet or an unsupported chain. Explains the gate and
// offers a one-click switch to the default (live testnet) chain.
export function ChainGateBanner({ chainId }: { chainId: number | undefined }) {
  const { switchChain, isPending } = useSwitchChain();
  const known = isKnownChain(chainId);
  const net = appNetwork(chainId);

  return (
    <div className="border-2 border-[#0B0B0B] bg-[#F5F5F5] p-4 shadow-[4px_4px_0_#0B0B0B]">
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-[0.12em]">
            {known ? `${net?.label} is gated` : `Chain ${chainId} is not supported`}
          </p>
          <p className="text-sm text-[#4A4A4A]">
            {known
              ? net?.gateReason
              : "Connect to Base Sepolia (testnet) to play and test. Mainnet is gated until native + cross-chain flows are proven."}
          </p>
          <button
            type="button"
            className={`${BTN} mt-1`}
            disabled={isPending}
            onClick={() => switchChain({ chainId: DEFAULT_CHAIN_ID })}
          >
            Switch to {chainLabel(DEFAULT_CHAIN_ID)} <ChevronRight aria-hidden="true" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ConnectPrompt({ message }: { message?: string }) {
  return (
    <div className="border-2 border-dashed border-[#0B0B0B] bg-[#FFFFFF] p-5 text-center">
      <Wallet aria-hidden="true" size={20} className="mx-auto mb-2" />
      <p className="mb-3 text-sm text-[#4A4A4A]">{message ?? "Connect a wallet to play and test on testnet."}</p>
      <ConnectButton />
    </div>
  );
}

// Wraps any real (write) interaction: prompts to connect when disconnected, shows the gate banner when
// on a gated/unsupported chain, otherwise renders children. Centralizing the gate here means a gated
// chain can never render the action that would submit a transaction.
export function WalletGate({
  children,
  requireEnabledChain = true,
  message
}: {
  children: ReactNode;
  requireEnabledChain?: boolean;
  message?: string;
}) {
  const { isConnected, chainId } = useAccount();

  if (!isConnected) return <ConnectPrompt message={message} />;
  if (requireEnabledChain && !isChainEnabled(chainId)) return <ChainGateBanner chainId={chainId} />;
  return <>{children}</>;
}
