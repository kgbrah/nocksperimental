// Server-side HOUSE operator for the on-chain ForfeitFlip game. Holds the house key (a Worker secret),
// signs openRound/reveal, and derives each round's serverSeed DETERMINISTICALLY from the key + roundId
// so the operator is stateless (no database): the seed is secret (depends on the key), unique per round,
// and re-derivable at reveal. Never expose a serverSeed before its round is settled.
//
// Safety: only openRound/reveal/cancel are house-signed here; nothing pushes player funds. A rare
// roundId-prediction race at open just yields an un-revealable round, which the contract's reveal-window
// timeout refunds to the player — so no funds are ever at risk from the operator.

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  encodePacked,
  decodeEventLog,
  type Hex,
  type Address
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { forfeitFlipAbi } from "@/lib/abi/forfeit-flip";
import { forfeitFlipAddress } from "@/lib/game-contracts";

const RPC = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const HOUSE_CHAIN_ID = 84532;
const SEED_DOMAIN = "nocksperimental/forfeit-flip/serverseed/v1";

export type HouseError = { ok: false; error: string };

function houseKey(): Hex | null {
  const k = (process.env.NOCKS_FLIP_HOUSE_KEY || "").trim();
  return /^0x[0-9a-fA-F]{64}$/.test(k) ? (k as Hex) : null;
}

export function houseConfigured(): boolean {
  return houseKey() !== null && forfeitFlipAddress(HOUSE_CHAIN_ID) !== undefined;
}

// serverSeed = keccak256(domain ‖ houseKey ‖ roundId). commit = keccak256(serverSeed) (the contract's
// reveal check is keccak256(abi.encodePacked(serverSeed)) == commit). The key never leaves the server.
function deriveServerSeed(key: Hex, roundId: bigint): Hex {
  return keccak256(encodePacked(["string", "bytes32", "uint256"], [SEED_DOMAIN, key, roundId]));
}

// Read-only public client (no key) for config/state the browser shows before connecting.
export async function readFlipState() {
  const address = forfeitFlipAddress(HOUSE_CHAIN_ID);
  if (!address) return { configured: false as const };
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
  const read = (functionName: "minStake" | "maxStake" | "revealWindow" | "houseBankroll" | "nextRoundId") =>
    publicClient.readContract({ address, abi: forfeitFlipAbi, functionName }) as Promise<bigint>;
  try {
    const [minStake, maxStake, revealWindow, bankroll, nextRoundId] = await Promise.all([
      read("minStake"),
      read("maxStake"),
      read("revealWindow"),
      read("houseBankroll"),
      read("nextRoundId")
    ]);
    return {
      configured: true as const,
      houseConfigured: houseConfigured(),
      address,
      chainId: HOUSE_CHAIN_ID,
      minStake: minStake.toString(),
      maxStake: maxStake.toString(),
      revealWindowSeconds: Number(revealWindow),
      bankroll: bankroll.toString(),
      nextRoundId: nextRoundId.toString()
    };
  } catch (error) {
    return { configured: true as const, houseConfigured: houseConfigured(), address, chainId: HOUSE_CHAIN_ID, error: error instanceof Error ? error.message : "read failed" };
  }
}

function clients(key: Hex) {
  const account = privateKeyToAccount(key);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
  return { account, publicClient, walletClient, address: forfeitFlipAddress(HOUSE_CHAIN_ID) as Address };
}

/// Open a fresh round: predict the next roundId, commit to its derived serverSeed, and submit.
/// Returns the actual roundId (parsed from the RoundOpened event) so the player can play it.
export async function openRound(): Promise<{ ok: true; roundId: string; commit: Hex } | HouseError> {
  const key = houseKey();
  const address = forfeitFlipAddress(HOUSE_CHAIN_ID);
  if (!key || !address) return { ok: false, error: "house not configured" };
  const { publicClient, walletClient } = clients(key);

  try {
    const predicted = (await publicClient.readContract({
      address,
      abi: forfeitFlipAbi,
      functionName: "nextRoundId"
    })) as bigint;
    const serverSeed = deriveServerSeed(key, predicted);
    const commit = keccak256(encodePacked(["bytes32"], [serverSeed]));

    const hash = await walletClient.writeContract({
      address,
      abi: forfeitFlipAbi,
      functionName: "openRound",
      args: [commit]
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    let actual: bigint | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: forfeitFlipAbi, data: log.data, topics: log.topics });
        if (decoded.eventName === "RoundOpened") {
          actual = (decoded.args as { roundId: bigint }).roundId;
          break;
        }
      } catch {
        /* not our event */
      }
    }
    if (actual === undefined) return { ok: false, error: "open succeeded but RoundOpened not found" };
    if (actual !== predicted) {
      // Rare roundId race: the committed seed won't match this id. Cancel it (housekeeping) and ask to retry.
      await walletClient
        .writeContract({ address, abi: forfeitFlipAbi, functionName: "cancelRound", args: [actual] })
        .catch(() => undefined);
      return { ok: false, error: "roundId race; please retry" };
    }
    return { ok: true, roundId: actual.toString(), commit };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "openRound failed" };
  }
}

/// Reveal a Played round so it settles on-chain. Idempotent + safe: re-derives the serverSeed, verifies
/// it matches the on-chain commit, and only reveals a Played round.
export async function revealRound(roundId: bigint): Promise<{ ok: true; txHash: Hex } | HouseError> {
  const key = houseKey();
  const address = forfeitFlipAddress(HOUSE_CHAIN_ID);
  if (!key || !address) return { ok: false, error: "house not configured" };
  const { publicClient, walletClient } = clients(key);

  try {
    const round = (await publicClient.readContract({
      address,
      abi: forfeitFlipAbi,
      functionName: "getRound",
      args: [roundId]
    })) as { status: number; commit: Hex };
    if (round.status !== 2) return { ok: false, error: "round is not awaiting reveal" }; // 2 == Played

    const serverSeed = deriveServerSeed(key, roundId);
    if (keccak256(encodePacked(["bytes32"], [serverSeed])) !== round.commit) {
      return { ok: false, error: "seed/commit mismatch (round not openable by this operator)" };
    }
    const hash = await walletClient.writeContract({
      address,
      abi: forfeitFlipAbi,
      functionName: "reveal",
      args: [roundId, serverSeed]
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return { ok: true, txHash: hash };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "reveal failed" };
  }
}
