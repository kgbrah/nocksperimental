"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { formatUnits, parseUnits, keccak256, encodePacked, type Hex } from "viem";
import { Coins, Loader2, ShieldCheck, Wallet, ArrowRight, ArrowUpRight, Check, X } from "lucide-react";
import { forfeitFlipAbi } from "@/lib/abi/forfeit-flip";
import { forfeitFlipTokenAbi } from "@/lib/abi/forfeit-flip-token";
import {
  forfeitFlipAddress,
  tNockAddress,
  flipAssetAvailable,
  FlipStatus,
  TNOCK_DECIMALS,
  type FlipAsset
} from "@/lib/game-contracts";
import { DEFAULT_CHAIN_ID, explorerTx } from "@/lib/networks";

type FlipConfig = {
  minStake: string;
  maxStake: string;
  bankroll?: string;
  houseConfigured?: boolean;
  error?: string;
};

type Phase = "idle" | "opening" | "playing" | "revealing" | "settled" | "error";

type Result = {
  roundId: string;
  // Did the round reach terminal Settled on-chain? When false the outcome is NOT yet known — the UI must
  // never present a not-yet-settled round as a loss ("house won").
  settled: boolean;
  clientSeed: Hex;
  serverSeed?: Hex;
  outcome?: Hex;
  playerWon: boolean;
  playTx?: Hex;
  // The house's reveal/settlement tx — where the RoundSettled event records this round's fair outcome on-chain.
  settleTx?: Hex;
};

// Minimal ERC20 surface for the tNOCK stake asset (allowance check + approve + withdrawable balance).
const erc20Abi = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] }
] as const;

function randomSeed(): Hex {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return ("0x" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")) as Hex;
}

const BTN =
  "inline-flex items-center justify-center gap-1.5 border-2 border-[#0B0B0B] px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] shadow-[3px_3px_0_#0B0B0B] transition disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";

const ASSETS: { id: FlipAsset; label: string; unit: string; decimals: number; defaultStake: string }[] = [
  { id: "eth", label: "ETH", unit: "ETH", decimals: 18, defaultStake: "0.001" },
  { id: "tnock", label: "tNOCK", unit: "tNOCK", decimals: TNOCK_DECIMALS, defaultStake: "10" }
];

export function ForfeitFlipOnchain() {
  const { address: player } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [asset, setAsset] = useState<FlipAsset>("eth");
  const meta = ASSETS.find((a) => a.id === asset)!;
  const { unit, decimals } = meta;
  const contract = forfeitFlipAddress(DEFAULT_CHAIN_ID, asset);
  const abi = asset === "tnock" ? forfeitFlipTokenAbi : forfeitFlipAbi;
  const tokenAddr = tNockAddress(DEFAULT_CHAIN_ID);

  const [config, setConfig] = useState<FlipConfig | null>(null);
  const [stake, setStake] = useState(meta.defaultStake);
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [credits, setCredits] = useState<bigint>(BigInt(0));

  // Switch stake assets: reset transient state in the handler (not an effect) so one game's result never
  // bleeds into the other, then the [asset] effect refetches that game's config.
  function selectAsset(next: FlipAsset) {
    if (next === asset || busy) return;
    setAsset(next);
    setConfig(null);
    setResult(null);
    setCredits(BigInt(0));
    setPhase("idle");
    setStatusMsg("");
    setStake(ASSETS.find((a) => a.id === next)!.defaultStake);
  }

  // Refetch config when the asset changes (setConfig runs only in the async resolution, never synchronously).
  useEffect(() => {
    let active = true;
    fetch(`/api/game/flip/state?asset=${asset}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((c) => {
        if (active) setConfig(c);
      })
      .catch(() => {
        if (active) setConfig({ minStake: "0", maxStake: "0", error: "config unavailable" });
      });
    return () => {
      active = false;
    };
  }, [asset]);

  const refreshCredits = useCallback(async () => {
    if (!publicClient || !contract || !player) return;
    const c = (await publicClient.readContract({
      address: contract,
      abi,
      functionName: "credits",
      args: [player]
    })) as bigint;
    setCredits(c);
  }, [publicClient, contract, abi, player]);

  useEffect(() => {
    // Sync credits from the chain (an external system) when the player/contract/asset becomes available.
    // setCredits runs only after the awaited read resolves, so this is not a synchronous setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCredits();
  }, [refreshCredits]);

  const busy = phase === "opening" || phase === "playing" || phase === "revealing";

  async function play() {
    if (!publicClient || !contract || !player || !config) return;
    setResult(null);

    // Validate the stake against min/max/bankroll BEFORE prompting the wallet (avoids a doomed tx).
    let stakeAmt: bigint;
    try {
      stakeAmt = parseUnits(stake as `${number}`, decimals);
    } catch {
      setPhase("error");
      setStatusMsg("Invalid stake amount.");
      return;
    }
    const min = BigInt(config.minStake);
    const max = BigInt(config.maxStake);
    const bank = config.bankroll ? BigInt(config.bankroll) : max;
    if (stakeAmt < min || stakeAmt > max) {
      setPhase("error");
      setStatusMsg(`Stake must be between ${formatUnits(min, decimals)} and ${formatUnits(max, decimals)} ${unit}.`);
      return;
    }
    if (stakeAmt > bank) {
      setPhase("error");
      setStatusMsg("Stake exceeds the house bankroll right now — try a smaller amount.");
      return;
    }

    const clientSeed = randomSeed();
    try {
      // tNOCK (ERC20) requires an allowance for the contract to pull the stake. Approve up-front (once the
      // allowance is sufficient, repeat plays skip this), BEFORE opening a round so we don't strand an open round.
      if (asset === "tnock" && tokenAddr) {
        setPhase("playing");
        setStatusMsg("Checking tNOCK allowance…");
        const allowance = (await publicClient.readContract({
          address: tokenAddr,
          abi: erc20Abi,
          functionName: "allowance",
          args: [player, contract]
        })) as bigint;
        if (allowance < stakeAmt) {
          setStatusMsg("Approve tNOCK spending in your wallet…");
          const approveHash = await writeContractAsync({
            address: tokenAddr,
            abi: erc20Abi,
            functionName: "approve",
            args: [contract, stakeAmt]
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      // open -> play, retrying once if a concurrent/front-running player took the round (WrongStatus).
      let roundId: bigint | undefined;
      let playHash: Hex | undefined;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        setPhase("opening");
        setStatusMsg(attempt === 0 ? "House is opening a round…" : "Round was taken — retrying with a fresh one…");
        const open = await fetch("/api/game/flip/open", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ asset })
        }).then((r) => r.json());
        if (!open.ok) throw new Error(open.error || "could not open a round");
        roundId = BigInt(open.roundId);

        setPhase("playing");
        setStatusMsg("Confirm the bet in your wallet…");
        try {
          playHash =
            asset === "tnock"
              ? await writeContractAsync({
                  address: contract,
                  abi: forfeitFlipTokenAbi,
                  functionName: "play",
                  args: [roundId, clientSeed, stakeAmt]
                })
              : await writeContractAsync({
                  address: contract,
                  abi: forfeitFlipAbi,
                  functionName: "play",
                  args: [roundId, clientSeed],
                  value: stakeAmt
                });
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          // Round taken between open and play -> re-open + retry once; otherwise surface it.
          if (attempt === 0 && /WrongStatus|reverted|0x[0-9a-f]/i.test(msg)) continue;
          throw err;
        }
      }
      if (playHash === undefined || roundId === undefined) throw new Error("could not place the bet — please retry");

      setStatusMsg("Waiting for your bet to confirm…");
      await publicClient.waitForTransactionReceipt({ hash: playHash });

      // House reveals -> on-chain settlement (branch on whether the reveal actually succeeded).
      setPhase("revealing");
      setStatusMsg("House is revealing the seed and settling…");
      const reveal = await fetch("/api/game/flip/reveal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roundId: roundId.toString(), asset })
      })
        .then((r) => r.json())
        .catch(() => ({ ok: false }));

      // POLL for settlement. Our wallet's RPC node can lag the node the house used to mine the reveal,
      // so a SINGLE read can still return Played even though the round just settled — which previously
      // made the UI show "house won" for rounds the player actually won. Poll getRound until it reaches
      // terminal Settled (or we find the RoundSettled event), with a bounded retry window.
      let status = FlipStatus.None as number;
      let structPlayerWon = false;
      let serverSeed: Hex | undefined;
      let outcome: Hex | undefined;
      let eventPlayerWon: boolean | undefined;
      let settleTx: Hex | undefined;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          const round = (await publicClient.readContract({
            address: contract,
            abi,
            functionName: "getRound",
            args: [roundId]
          })) as { status: number; playerWon: boolean };
          status = round.status;
          structPlayerWon = round.playerWon;
        } catch {
          /* transient RPC error — retry */
        }
        try {
          const logs = await publicClient.getContractEvents({
            address: contract,
            abi,
            eventName: "RoundSettled",
            args: { roundId },
            fromBlock: "earliest"
          });
          const lastLog = logs[logs.length - 1];
          const ev = lastLog?.args as { serverSeed?: Hex; outcome?: Hex; playerWon?: boolean } | undefined;
          if (ev) {
            serverSeed = ev.serverSeed;
            outcome = ev.outcome;
            eventPlayerWon = ev.playerWon;
            settleTx = lastLog?.transactionHash ?? undefined;
          }
        } catch {
          /* fairness recompute is best-effort; the struct read is the primary settled signal */
        }
        if (status === FlipStatus.Settled || eventPlayerWon !== undefined) break;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Settled iff the round reached terminal Settled OR the authoritative RoundSettled event was seen.
      const settled = status === FlipStatus.Settled || eventPlayerWon !== undefined;
      // Winner from the event (authoritative) when available, else the struct — only meaningful once settled.
      const playerWon = eventPlayerWon ?? structPlayerWon;
      // Settlement tx: prefer the tx that emitted RoundSettled; fall back to the hash the house returned.
      const settleTxHash: Hex | undefined =
        settleTx ?? (reveal?.ok && typeof reveal.txHash === "string" ? (reveal.txHash as Hex) : undefined);

      setResult({
        roundId: roundId.toString(),
        settled,
        clientSeed,
        serverSeed,
        outcome,
        playerWon: settled ? playerWon : false,
        playTx: playHash,
        settleTx: settleTxHash
      });
      setPhase("settled");
      setStatusMsg(
        settled
          ? playerWon
            ? "You won! Withdraw your winnings below."
            : "House won this round."
          : reveal.ok
            ? "Still settling — your bet is in. Refresh in a moment to see the result; your funds are safe."
            : "The house did not settle this round. You can reclaim your FULL stake via the contract's timeout after the reveal window."
      );
      await refreshCredits();
    } catch (error) {
      setPhase("error");
      setStatusMsg(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  async function withdraw() {
    if (!publicClient || !contract) return;
    try {
      setStatusMsg("Confirm the withdrawal in your wallet…");
      const hash = await writeContractAsync({ address: contract, abi, functionName: "withdraw" });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatusMsg("Withdrawn.");
      await refreshCredits();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : "Withdrawal failed.");
    }
  }

  // Off-chain fairness recompute the player can check against the on-chain outcome AND winner. We verify
  // both that the outcome hash binds to the revealed seeds AND that the reported win/loss follows from
  // the outcome's parity (the contract's rule), so a malicious node can't report a winner inconsistent
  // with a truthful outcome and still look "verified".
  const recomputed =
    result?.serverSeed && result?.outcome
      ? keccak256(encodePacked(["bytes32", "bytes32", "uint256"], [result.serverSeed, result.clientSeed, BigInt(result.roundId)]))
      : undefined;
  const playerWonRecomputed = recomputed ? (BigInt(recomputed) & BigInt(1)) === BigInt(1) : undefined;
  const fairnessOk =
    recomputed && result?.outcome
      ? recomputed.toLowerCase() === result.outcome.toLowerCase() && playerWonRecomputed === result.playerWon
      : undefined;

  const tnockAvailable = flipAssetAvailable(DEFAULT_CHAIN_ID, "tnock");

  return (
    <div className="space-y-5">
      {/* Stake-asset toggle: native ETH or tNOCK (bridged, mined fakenet NOCK). */}
      <div className="inline-flex border-2 border-[#0B0B0B] shadow-[3px_3px_0_#0B0B0B]">
        {ASSETS.map((a) => {
          const disabled = a.id === "tnock" && !tnockAvailable;
          const active = asset === a.id;
          return (
            <button
              key={a.id}
              type="button"
              disabled={disabled || busy}
              onClick={() => selectAsset(a.id)}
              className={`px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-40 ${
                active ? "bg-[#0B0B0B] text-[#FFFFFF]" : "bg-[#FFFFFF] text-[#0B0B0B] hover:bg-[#F0F0F0]"
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </div>
      {asset === "tnock" ? (
        <p className="font-mono text-[11px] text-[#4A4A4A]">
          tNOCK is mined fakenet NOCK, bridged to Base via our own 3-of-5 MessageInbox. Staking pulls tNOCK
          (an approve + a bet); winnings settle in tNOCK.
        </p>
      ) : null}

      {config && config.houseConfigured === false ? (
        <div className="border-2 border-dashed border-[#0B0B0B] bg-[#F5F5F5] p-5 text-sm text-[#4A4A4A]">
          The on-chain house operator is not configured on this deployment yet. The contract is live, but
          rounds can&apos;t be opened until the house key is set server-side.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Min stake" value={config ? `${formatUnits(BigInt(config.minStake), decimals)} ${unit}` : "…"} />
            <Stat label="Max stake" value={config ? `${formatUnits(BigInt(config.maxStake), decimals)} ${unit}` : "…"} />
            <Stat label="House bankroll" value={config?.bankroll ? `${formatUnits(BigInt(config.bankroll), decimals)} ${unit}` : "…"} />
          </div>

          <div className="border-2 border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
            <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]" htmlFor="stake">
              Your stake ({unit}) · even money
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                id="stake"
                type="text"
                inputMode="decimal"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                disabled={busy}
                className="w-40 border-2 border-[#0B0B0B] px-3 py-2 font-mono text-sm focus:outline-none disabled:opacity-50"
              />
              <button type="button" onClick={play} disabled={busy} className={`${BTN} bg-[#0B0B0B] text-[#FFFFFF]`}>
                {busy ? <Loader2 aria-hidden="true" size={14} className="animate-spin" /> : <Coins aria-hidden="true" size={14} />}
                {busy ? "Working…" : "Flip"}
              </button>
            </div>
            {statusMsg ? <p className="mt-3 text-sm text-[#4A4A4A]">{statusMsg}</p> : null}
          </div>
        </>
      )}

      {result && phase === "settled" ? (
        <div className="border-2 border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            {!result.settled ? (
              <Loader2 aria-hidden="true" size={18} className="animate-spin" />
            ) : result.playerWon ? (
              <Check aria-hidden="true" size={18} />
            ) : (
              <X aria-hidden="true" size={18} />
            )}
            <p className="font-mono text-xs uppercase tracking-[0.12em]">
              {!result.settled
                ? `Round #${result.roundId} · still settling — refresh to see the result`
                : `Round #${result.roundId} · ${result.playerWon ? "player won" : "house won"}`}
            </p>
          </div>
          <dl className="mt-3 space-y-1 font-mono text-[11px] text-[#4A4A4A]">
            <Row k="clientSeed (yours)" v={result.clientSeed} />
            {result.serverSeed ? <Row k="serverSeed (house, revealed)" v={result.serverSeed} /> : null}
            {result.outcome ? <Row k="outcome = keccak(server, client, id)" v={result.outcome} /> : null}
            {result.playTx ? (
              <Row
                k="bet tx"
                v={
                  <a className="underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]" href={explorerTx(DEFAULT_CHAIN_ID, result.playTx)} target="_blank" rel="noreferrer">
                    {result.playTx.slice(0, 18)}…
                  </a>
                }
              />
            ) : null}
            {result.settleTx ? (
              <Row
                k="settlement tx (reveal)"
                v={
                  <a className="underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]" href={explorerTx(DEFAULT_CHAIN_ID, result.settleTx)} target="_blank" rel="noreferrer">
                    {result.settleTx.slice(0, 18)}…
                  </a>
                }
              />
            ) : null}
          </dl>
          {fairnessOk !== undefined ? (
            <div className="mt-3 space-y-1.5">
              <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em]">
                <ShieldCheck aria-hidden="true" size={13} />
                {fairnessOk ? "Fairness verified: recomputed outcome matches on-chain" : "Mismatch — do not trust this round"}
              </p>
              {result.settleTx ? (
                <a
                  className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] underline decoration-[#737373] underline-offset-2 hover:decoration-[#0B0B0B]"
                  href={explorerTx(DEFAULT_CHAIN_ID, result.settleTx)}
                  target="_blank"
                  rel="noreferrer"
                >
                  See the on-chain settlement (RoundSettled event) <ArrowUpRight aria-hidden="true" size={12} />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {credits > BigInt(0) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-[#0B0B0B] bg-[#F5F5F5] p-4">
          <p className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em]">
            <Wallet aria-hidden="true" size={14} /> Withdrawable: {formatUnits(credits, decimals)} {unit}
          </p>
          <button type="button" onClick={withdraw} className={`${BTN} bg-[#FFFFFF] hover:bg-[#0B0B0B] hover:text-[#FFFFFF]`}>
            Withdraw <ArrowRight aria-hidden="true" size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-[#0B0B0B] p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]">{label}</p>
      <p className="mt-1 font-mono text-sm">{value}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="text-[#737373]">{k}:</dt>
      <dd className="break-all">{v}</dd>
    </div>
  );
}
