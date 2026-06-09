"use client";

// The unified Donate surface. Two lanes, two tabs:
//   - EVM:    connect via the existing Reown AppKit modal, then transfer NOCK (ERC20) or native ETH to
//             the project's Base receiving address. Allowed on Base mainnet (8453) AND Base Sepolia
//             (84532) via isDonationAllowed — even though mainnet stays gated for bridge/game WRITES.
//   - Native: show the project's Nockchain (base58) address + a ready-to-run `nockchain-wallet create-tx`
//             command, plus an Isis-extension connect button (feature-detected, degrades gracefully).
//
// Safety: every send is gated on isPlaceholder() so funds can never flow to an unset/sentinel address;
// the NOCK ERC20 decimals are read LIVE on-chain before scaling (mainnet NOCK is 16-dec, not 18, so a
// hardcoded 18 would 100x a real transfer); and the wallet is switched to the chosen chain before sending.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useSendTransaction, useSwitchChain, useWriteContract } from "wagmi";
import { erc20Abi, parseEther, parseUnits, type Hex } from "viem";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Coins,
  Copy,
  Heart,
  Loader2,
  Puzzle,
  Terminal,
  Wallet,
  X
} from "lucide-react";
import { ConnectButton } from "@/components/web3/wallet-controls";
import { useNockWallet } from "@/components/web3/nock-wallet-provider";
import { useCopy } from "@/components/web3/use-copy";
import {
  BASE_DONATION_ADDRESS,
  buildCreateTxCommand,
  CREATE_TX_NAMES_PLACEHOLDER,
  isPlaceholder,
  nockToNicks,
  NOCK_DONATION_ADDRESS,
  nockToken,
  shortNockAddress
} from "@/lib/donation";
import { chainLabel, explorerTx, isDonationAllowed } from "@/lib/networks";

const BASE_MAINNET = 8453;
const BASE_SEPOLIA = 84532;
const DONATION_TARGETS = [BASE_MAINNET, BASE_SEPOLIA] as const;
type DonationTarget = (typeof DONATION_TARGETS)[number];

const BTN =
  "inline-flex items-center justify-center gap-1.5 border-2 border-[#0B0B0B] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] shadow-[3px_3px_0_#0B0B0B] transition hover:bg-[#0B0B0B] hover:text-[#FFFFFF] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";
const TAB =
  "flex-1 border-2 border-[#0B0B0B] px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] transition";
const AMOUNT_RE = /^\d*\.?\d+$/;

export type DonateTab = "evm" | "native";

export function DonateDialog({
  open,
  onClose,
  defaultTab = "native"
}: {
  open: boolean;
  onClose: () => void;
  defaultTab?: DonateTab;
}) {
  const [tab, setTab] = useState<DonateTab>(defaultTab);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset to the caller's default tab each time the dialog opens (sync from an external trigger).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  // Focus management: move focus into the dialog on open, restore it to the trigger on close, and trap
  // Tab within the dialog so keyboard/screen-reader users can't tab out behind an aria-modal surface.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0B0B0B]/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Donate to Nocksperimental"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="mt-10 w-full max-w-lg border-2 border-[#0B0B0B] bg-[#FFFFFF] shadow-[6px_6px_0_#0B0B0B] outline-none sm:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[#0B0B0B] px-4 py-3">
          <p className="inline-flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-[0.14em]">
            <Heart aria-hidden="true" size={16} /> Fund development
          </p>
          <button type="button" aria-label="Close" className="p-1 transition hover:opacity-60" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <p className="px-4 pt-4 text-sm leading-6 text-[#4A4A4A]">
          Donations fund Nocksperimental&apos;s development. Give <strong>NOCK on Base</strong> with any EVM
          wallet, or <strong>native NOCK on Nockchain mainnet</strong> via the CLI or the Isis extension.
        </p>

        <div className="flex gap-2 px-4 pt-4">
          <button
            type="button"
            className={`${TAB} ${tab === "native" ? "bg-[#0B0B0B] text-[#FFFFFF]" : "bg-[#FFFFFF]"}`}
            onClick={() => setTab("native")}
          >
            Nockchain NOCK
          </button>
          <button
            type="button"
            className={`${TAB} ${tab === "evm" ? "bg-[#0B0B0B] text-[#FFFFFF]" : "bg-[#FFFFFF]"}`}
            onClick={() => setTab("evm")}
          >
            Base NOCK / ETH
          </button>
        </div>

        <div className="p-4">{tab === "evm" ? <DonateEvmPanel /> : <DonateNativePanel />}</div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------------------------
// EVM lane
// ----------------------------------------------------------------------------------------------------

type Phase = "idle" | "switching" | "sending" | "confirming" | "done" | "error";

function DonateEvmPanel() {
  const { isConnected, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();

  const [target, setTarget] = useState<DonationTarget>(BASE_MAINNET);
  const [asset, setAsset] = useState<"NOCK" | "ETH">("NOCK");
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [txHash, setTxHash] = useState<Hex | null>(null);

  // A public client bound to the SELECTED chain (not the wallet's current chain), so decimals() reads and
  // receipt waits always hit the right network even right after a switch.
  const targetClient = usePublicClient({ chainId: target });

  const receiver = BASE_DONATION_ADDRESS;
  const unconfigured = isPlaceholder(receiver);
  const busy = phase === "switching" || phase === "sending" || phase === "confirming";
  const token = nockToken(target);

  const donate = useCallback(async () => {
    setTxHash(null);
    setStatusMsg("");
    if (unconfigured) {
      setPhase("error");
      setStatusMsg("The maintainer hasn't set a Base receiving address yet (NEXT_PUBLIC_BASE_DONATION_ADDRESS).");
      return;
    }
    if (!isDonationAllowed(target)) {
      setPhase("error");
      setStatusMsg("Donations are not enabled on this network.");
      return;
    }
    if (!AMOUNT_RE.test(amount) || Number(amount) <= 0) {
      setPhase("error");
      setStatusMsg("Enter an amount greater than zero.");
      return;
    }

    try {
      // 1) Make sure the wallet is on the chosen donation chain before we prompt for a transfer.
      if (chainId !== target) {
        setPhase("switching");
        setStatusMsg(`Confirm the switch to ${chainLabel(target)} in your wallet…`);
        await switchChainAsync({ chainId: target });
      }

      setPhase("sending");
      let hash: Hex;
      if (asset === "ETH") {
        let value: bigint;
        try {
          value = parseEther(amount as `${number}`);
        } catch {
          setPhase("error");
          setStatusMsg("Invalid ETH amount.");
          return;
        }
        setStatusMsg("Confirm the donation in your wallet…");
        hash = await sendTransactionAsync({ chainId: target, to: receiver, value });
      } else {
        if (!token) throw new Error("No NOCK token is configured on this network.");
        // Read decimals LIVE — never trust a constant for a real-value transfer.
        let decimals = token.decimals;
        try {
          if (targetClient) {
            decimals = Number(
              await targetClient.readContract({ address: token.address, abi: erc20Abi, functionName: "decimals" })
            );
          }
        } catch {
          /* fall back to the configured decimals if the read fails */
        }
        let value: bigint;
        try {
          value = parseUnits(amount as `${number}`, decimals);
        } catch {
          setPhase("error");
          setStatusMsg("Invalid NOCK amount.");
          return;
        }
        setStatusMsg("Confirm the NOCK transfer in your wallet…");
        hash = await writeContractAsync({
          chainId: target,
          address: token.address,
          abi: erc20Abi,
          functionName: "transfer",
          args: [receiver, value]
        });
      }

      setTxHash(hash); // show the explorer link as soon as we have a hash, confirmed or not
      if (targetClient) {
        setPhase("confirming");
        setStatusMsg("Waiting for the donation to confirm…");
        await targetClient.waitForTransactionReceipt({ hash });
        setPhase("done");
        setStatusMsg("Thank you! Your donation is confirmed.");
      } else {
        // No client for the target chain to wait on — report submitted, don't claim confirmation.
        setPhase("done");
        setStatusMsg("Donation submitted — check your wallet or the explorer to confirm.");
      }
    } catch (err) {
      setPhase("error");
      setStatusMsg(err instanceof Error ? err.message : "The donation could not be completed.");
    }
  }, [amount, asset, chainId, receiver, switchChainAsync, sendTransactionAsync, writeContractAsync, target, targetClient, token, unconfigured]);

  if (!isConnected) {
    return (
      <div className="space-y-3">
        <div className="border-2 border-dashed border-[#0B0B0B] bg-[#FFFFFF] p-5 text-center">
          <Wallet aria-hidden="true" size={20} className="mx-auto mb-2" />
          <p className="mb-3 text-sm text-[#4A4A4A]">
            Connect any EVM wallet (MetaMask, mobile via WalletConnect QR, etc.) to donate on Base.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (unconfigured) {
    return <OwnerUnsetNotice what="Base receiving address" envVar="NEXT_PUBLIC_BASE_DONATION_ADDRESS" />;
  }

  const explorer = txHash ? explorerTx(target, txHash) : undefined;

  return (
    <div className="space-y-4">
      <Field label="Network">
        <div className="flex gap-2">
          {DONATION_TARGETS.map((t) => (
            <button
              key={t}
              type="button"
              disabled={busy}
              onClick={() => setTarget(t)}
              className={`${BTN} ${target === t ? "bg-[#0B0B0B] text-[#FFFFFF]" : "bg-[#FFFFFF]"}`}
            >
              {chainLabel(t)}
            </button>
          ))}
        </div>
        {target === BASE_SEPOLIA ? (
          <p className="mt-1.5 text-xs text-[#737373]">Base Sepolia is a testnet — tokens here have no real value.</p>
        ) : null}
      </Field>

      <Field label="Asset">
        <div className="flex gap-2">
          {(["NOCK", "ETH"] as const).map((a) => (
            <button
              key={a}
              type="button"
              disabled={busy}
              onClick={() => setAsset(a)}
              className={`${BTN} ${asset === a ? "bg-[#0B0B0B] text-[#FFFFFF]" : "bg-[#FFFFFF]"}`}
            >
              {a === "NOCK" ? <Coins aria-hidden="true" size={13} /> : null}
              {a === "NOCK" ? "NOCK (ERC20)" : "ETH"}
            </button>
          ))}
        </div>
      </Field>

      <Field label={`Amount (${asset})`}>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          disabled={busy}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          className="w-full border-2 border-[#0B0B0B] px-3 py-2 font-mono text-sm focus:outline-none disabled:opacity-50"
        />
      </Field>

      <div className="border-2 border-[#0B0B0B] bg-[#F5F5F5] p-3 font-mono text-[11px] leading-5 text-[#4A4A4A]">
        To: {shortNockAddress(receiver, 8, 8)} · {asset === "NOCK" && token ? "NOCK ERC20" : "native ETH"} on {chainLabel(target)}
      </div>

      <button type="button" onClick={donate} disabled={busy} className={`${BTN} w-full bg-[#0B0B0B] py-2.5 text-[#FFFFFF]`}>
        {busy ? <Loader2 aria-hidden="true" size={14} className="animate-spin" /> : <Heart aria-hidden="true" size={14} />}
        {busy ? "Working…" : `Donate ${asset}`}
      </button>

      {statusMsg ? (
        <p
          role={phase === "error" ? "alert" : "status"}
          aria-live={phase === "error" ? "assertive" : "polite"}
          className={`text-sm ${phase === "error" ? "text-[#0B0B0B]" : "text-[#4A4A4A]"}`}
        >
          {phase === "error" ? <AlertTriangle aria-hidden="true" size={14} className="mr-1 inline" /> : null}
          {statusMsg}
        </p>
      ) : null}

      {phase === "done" && explorer ? (
        <a
          href={explorer}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]"
        >
          View transaction <ArrowUpRight aria-hidden="true" size={13} />
        </a>
      ) : null}
    </div>
  );
}

// ----------------------------------------------------------------------------------------------------
// Native Nockchain lane (CLI + Isis)
// ----------------------------------------------------------------------------------------------------

function DonateNativePanel() {
  const nock = useNockWallet();
  const addrCopy = useCopy(); // separate transient "copied" state per button so only the clicked one confirms
  const cmdCopy = useCopy();
  const [amount, setAmount] = useState("1");
  const [fee, setFee] = useState("10");

  const receiver = NOCK_DONATION_ADDRESS;
  const unconfigured = isPlaceholder(receiver);

  const { command, nicks, error } = useMemo(() => {
    if (unconfigured) return { command: "", nicks: "", error: "" };
    try {
      return {
        command: buildCreateTxCommand({ address: receiver, nock: amount || "0", feeNicks: fee || "0" }),
        nicks: `${nockToNicks(amount || "0").toString()} nicks`,
        error: ""
      };
    } catch (e) {
      return { command: "", nicks: "", error: e instanceof Error ? e.message : "Invalid amount." };
    }
  }, [amount, fee, receiver, unconfigured]);

  if (unconfigured) {
    return <OwnerUnsetNotice what="Nockchain donation address" envVar="NEXT_PUBLIC_NOCK_DONATION_ADDRESS" />;
  }

  return (
    <div className="space-y-4">
      <Field label="Send native NOCK to">
        <div className="flex items-center gap-2 border-2 border-[#0B0B0B] bg-[#F5F5F5] p-2.5">
          <code className="flex-1 break-all font-mono text-xs">{receiver}</code>
          <button type="button" aria-label="Copy address" className={BTN} onClick={() => addrCopy.copy(receiver)}>
            {addrCopy.copied ? <Check aria-hidden="true" size={13} /> : <Copy aria-hidden="true" size={13} />}
          </button>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (NOCK)">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border-2 border-[#0B0B0B] px-3 py-2 font-mono text-sm focus:outline-none"
          />
        </Field>
        <Field label="Fee (nicks)">
          <input
            type="text"
            inputMode="numeric"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="w-full border-2 border-[#0B0B0B] px-3 py-2 font-mono text-sm focus:outline-none"
          />
        </Field>
      </div>

      <div>
        <p className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">
          <Terminal aria-hidden="true" size={12} /> CLI wallet — copy &amp; run {nicks ? `· ${nicks}` : ""}
        </p>
        {error ? (
          <p role="alert" aria-live="assertive" className="text-sm text-[#0B0B0B]">
            <AlertTriangle aria-hidden="true" size={14} className="mr-1 inline" />
            {error}
          </p>
        ) : (
          <div className="flex items-stretch gap-2">
            <pre className="flex-1 overflow-x-auto border-2 border-[#0B0B0B] bg-[#0B0B0B] p-3 font-mono text-[11px] leading-5 text-[#FFFFFF]">
              {command}
            </pre>
            <button type="button" aria-label="Copy command" className={BTN} onClick={() => cmdCopy.copy(command)}>
              {cmdCopy.copied ? <Check aria-hidden="true" size={13} /> : <Copy aria-hidden="true" size={13} />}
            </button>
          </div>
        )}
        <p className="mt-1.5 text-xs text-[#737373]">
          Replace <code className="font-mono">{CREATE_TX_NAMES_PLACEHOLDER}</code> with your own note names from{" "}
          <code className="font-mono">nockchain-wallet list-notes</code>, then run it in your terminal. The site never
          touches your keys — you sign and broadcast locally.
        </p>
      </div>

      <div className="border-t-2 border-[#0B0B0B] pt-4">
        <p className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">
          <Puzzle aria-hidden="true" size={12} /> Isis browser extension
        </p>
        {nock.kind === "isis" && nock.address ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-[#0B0B0B] bg-[#F5F5F5] p-2.5">
            <span className="font-mono text-xs">Connected · {shortNockAddress(nock.address)}</span>
            <button type="button" className={BTN} onClick={nock.disconnect}>
              Disconnect
            </button>
          </div>
        ) : nock.isisAvailable ? (
          <button type="button" disabled={nock.isConnecting} className={`${BTN} w-full`} onClick={nock.connectIsis}>
            {nock.isConnecting ? <Loader2 aria-hidden="true" size={13} className="animate-spin" /> : <Puzzle aria-hidden="true" size={13} />}
            {nock.isConnecting ? "Connecting…" : "Connect Isis"}
          </button>
        ) : (
          <a
            href="https://www.nockchain.org/"
            target="_blank"
            rel="noreferrer"
            className={`${BTN} w-full`}
            title="Isis extension not detected in this browser"
          >
            Install Isis <ArrowUpRight aria-hidden="true" size={13} />
          </a>
        )}
        {nock.error ? <p className="mt-2 text-xs text-[#0B0B0B]">{nock.error}</p> : null}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------------------------
// Shared bits
// ----------------------------------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">{label}</p>
      {children}
    </div>
  );
}

function OwnerUnsetNotice({ what, envVar }: { what: string; envVar: string }) {
  return (
    <div className="border-2 border-dashed border-[#0B0B0B] bg-[#F5F5F5] p-5 text-sm text-[#4A4A4A]">
      <AlertTriangle aria-hidden="true" size={18} className="mb-2" />
      <p>
        The maintainer hasn&apos;t set a {what} yet. Set <code className="font-mono">{envVar}</code> to enable this
        donation method.
      </p>
    </div>
  );
}
