"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { formatEther, parseEther, keccak256, encodePacked, type Hex } from "viem";
import { Coins, Loader2, ShieldCheck, Wallet, ArrowRight, Check, X } from "lucide-react";
import { forfeitFlipAbi } from "@/lib/abi/forfeit-flip";
import { forfeitFlipAddress } from "@/lib/game-contracts";
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
  clientSeed: Hex;
  serverSeed?: Hex;
  outcome?: Hex;
  playerWon: boolean;
  playTx?: Hex;
};

function randomSeed(): Hex {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return ("0x" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")) as Hex;
}

const BTN =
  "inline-flex items-center justify-center gap-1.5 border-2 border-[#0B0B0B] px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] shadow-[3px_3px_0_#0B0B0B] transition disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";

export function ForfeitFlipOnchain() {
  const { address: player } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const contract = forfeitFlipAddress(DEFAULT_CHAIN_ID);

  const [config, setConfig] = useState<FlipConfig | null>(null);
  const [stake, setStake] = useState("0.001");
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [credits, setCredits] = useState<bigint>(BigInt(0));

  useEffect(() => {
    fetch("/api/game/flip/state", { cache: "no-store" })
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({ minStake: "0", maxStake: "0", error: "config unavailable" }));
  }, []);

  const refreshCredits = useCallback(async () => {
    if (!publicClient || !contract || !player) return;
    const c = (await publicClient.readContract({
      address: contract,
      abi: forfeitFlipAbi,
      functionName: "credits",
      args: [player]
    })) as bigint;
    setCredits(c);
  }, [publicClient, contract, player]);

  useEffect(() => {
    // Sync credits from the chain (an external system) when the player/contract becomes available.
    // setCredits runs only after the awaited read resolves, so this is not a synchronous setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCredits();
  }, [refreshCredits]);

  const busy = phase === "opening" || phase === "playing" || phase === "revealing";

  async function play() {
    if (!publicClient || !contract || !player) return;
    setResult(null);
    let stakeWei: bigint;
    try {
      stakeWei = parseEther(stake as `${number}`);
    } catch {
      setPhase("error");
      setStatusMsg("Invalid stake amount.");
      return;
    }

    try {
      // 1) House opens a round.
      setPhase("opening");
      setStatusMsg("House is opening a round…");
      const open = await fetch("/api/game/flip/open", { method: "POST" }).then((r) => r.json());
      if (!open.ok) throw new Error(open.error || "could not open a round");
      const roundId = BigInt(open.roundId);
      const clientSeed = randomSeed();

      // 2) Player stakes + supplies entropy (their wallet signs).
      setPhase("playing");
      setStatusMsg("Confirm the bet in your wallet…");
      const playHash = await writeContractAsync({
        address: contract,
        abi: forfeitFlipAbi,
        functionName: "play",
        args: [roundId, clientSeed],
        value: stakeWei
      });
      setStatusMsg("Waiting for your bet to confirm…");
      await publicClient.waitForTransactionReceipt({ hash: playHash });

      // 3) House reveals -> on-chain settlement.
      setPhase("revealing");
      setStatusMsg("House is revealing the seed and settling…");
      await fetch("/api/game/flip/reveal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roundId: roundId.toString() })
      }).then((r) => r.json());

      // 4) Read the settlement + the revealed serverSeed (for the fairness recompute).
      const round = (await publicClient.readContract({
        address: contract,
        abi: forfeitFlipAbi,
        functionName: "getRound",
        args: [roundId]
      })) as { status: number; playerWon: boolean };

      let serverSeed: Hex | undefined;
      let outcome: Hex | undefined;
      try {
        const logs = await publicClient.getContractEvents({
          address: contract,
          abi: forfeitFlipAbi,
          eventName: "RoundSettled",
          args: { roundId },
          fromBlock: "earliest"
        });
        const ev = logs[logs.length - 1]?.args as { serverSeed?: Hex; outcome?: Hex } | undefined;
        serverSeed = ev?.serverSeed;
        outcome = ev?.outcome;
      } catch {
        /* fairness recompute is best-effort */
      }

      const settled = round.status === 3; // Settled
      setResult({ roundId: roundId.toString(), clientSeed, serverSeed, outcome, playerWon: settled && round.playerWon, playTx: playHash });
      setPhase("settled");
      setStatusMsg(
        settled
          ? round.playerWon
            ? "You won! Withdraw your winnings below."
            : "House won this round."
          : "Settlement is pending — if the house does not reveal, you can reclaim your stake after the timeout."
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
      const hash = await writeContractAsync({ address: contract, abi: forfeitFlipAbi, functionName: "withdraw" });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatusMsg("Withdrawn.");
      await refreshCredits();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : "Withdrawal failed.");
    }
  }

  // Off-chain fairness recompute the player can check against the on-chain outcome.
  const recomputed =
    result?.serverSeed && result?.outcome
      ? keccak256(encodePacked(["bytes32", "bytes32", "uint256"], [result.serverSeed, result.clientSeed, BigInt(result.roundId)]))
      : undefined;
  const fairnessOk = recomputed && result?.outcome ? recomputed.toLowerCase() === result.outcome.toLowerCase() : undefined;

  if (config && config.houseConfigured === false) {
    return (
      <div className="border-2 border-dashed border-[#0B0B0B] bg-[#F5F5F5] p-5 text-sm text-[#4A4A4A]">
        The on-chain house operator is not configured on this deployment yet. The contract is live, but
        rounds can&apos;t be opened until the house key is set server-side.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Min stake" value={config ? `${formatEther(BigInt(config.minStake))} ETH` : "…"} />
        <Stat label="Max stake" value={config ? `${formatEther(BigInt(config.maxStake))} ETH` : "…"} />
        <Stat label="House bankroll" value={config?.bankroll ? `${formatEther(BigInt(config.bankroll))} ETH` : "…"} />
      </div>

      <div className="border-2 border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
        <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#737373]" htmlFor="stake">
          Your stake (ETH) · even money
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

      {result && phase === "settled" ? (
        <div className="border-2 border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            {result.playerWon ? <Check aria-hidden="true" size={18} /> : <X aria-hidden="true" size={18} />}
            <p className="font-mono text-xs uppercase tracking-[0.12em]">
              Round #{result.roundId} · {result.playerWon ? "player won" : "house won"}
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
          </dl>
          {fairnessOk !== undefined ? (
            <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em]">
              <ShieldCheck aria-hidden="true" size={13} />
              {fairnessOk ? "Fairness verified: recomputed outcome matches on-chain" : "Mismatch — do not trust this round"}
            </p>
          ) : null}
        </div>
      ) : null}

      {credits > BigInt(0) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-[#0B0B0B] bg-[#F5F5F5] p-4">
          <p className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em]">
            <Wallet aria-hidden="true" size={14} /> Withdrawable: {formatEther(credits)} ETH
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
